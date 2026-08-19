import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { readFile } from "fs/promises";
import { join } from "path";
import { RoleName } from "../../common/enums/role-name.enum";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { LabItemStatus, Prisma } from "../../generated/prisma/client";
import { InvoiceItemSourceType, InvoiceSourceType, InvoiceStatus } from "../../generated/prisma/enums";
import { PrismaService } from "../../prisma/prisma.service";
import { unpackRowsPayload } from "../lab-common/result-layout";
import { generateDocx, generateCombinedDocx } from "./generators/docx-generator";
import { generatePdf, generateCombinedPdf } from "./generators/pdf-generator";
import {
  AddLabOrderItemsDto,
  ApplyLabResultTemplateDto,
  AddLabOrderItemFileDto,
  BulkSaveLabResultsDto,
  CreateLabOrderInvoiceDto,
  UpdateLabOrderItemDto,
  UpsertLabResultTableDto,
} from "./lab-orders.dto";
import { LabOrdersRepository } from "./lab-orders.repository";

export type DocumentFormat = "pdf" | "docx";

type ResultInputRow = { code?: string; indicator: string; result?: string; norm?: string; unit?: string; sortOrder?: number };

function mergeRowsWithServiceTemplate(inputRows: ResultInputRow[], serviceName: string, rawDefaultRows: unknown): ResultInputRow[] {
  const { rows: templateRows } = unpackRowsPayload(rawDefaultRows, serviceName);
  if (!templateRows.length) return inputRows;

  return templateRows.map((templateRow: any, index: number) => {
    const existing =
      inputRows.find((row) => templateRow.code && row.code && row.code === templateRow.code) ??
      inputRows.find((row) => row.indicator === templateRow.indicator) ??
      inputRows[index];

    return {
      code: templateRow.code,
      indicator: templateRow.indicator,
      norm: templateRow.norm,
      unit: templateRow.unit,
      result: existing?.result ?? "",
      sortOrder: index,
    };
  });
}

@Injectable()
export class LabOrdersService {
  constructor(
    private readonly repo: LabOrdersRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findMyOrders(user: JwtPayload) {
    if (user.role === RoleName.ADMIN) {
      return this.repo.findAll();
    }
    const labAssignments = await this.prisma.laboratoryAssignment.findMany({
      where: { userId: user.userId, isActive: true },
      select: { laboratoryId: true },
    });
    const laboratoryIds = labAssignments.map((a) => a.laboratoryId);
    if (laboratoryIds.length === 0) return [];
    return this.repo.findByLaboratoryIds(laboratoryIds);
  }

  async findById(id: string) {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundException("Lab order not found");
    return order;
  }

  async updateItem(orderId: string, itemId: string, dto: UpdateLabOrderItemDto) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException("Lab order not found");

    const item = order.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("Lab order item not found");

    const updated = await this.repo.updateItem(itemId, {
      status: dto.status,
      note: dto.note,
    });

    await this.repo.recalcOrderStatus(orderId);
    return updated;
  }

  /**
   * Buyurtma kartasidagi YAGONA "Keyingi bosqich" tugmasi — endi har bir
   * xizmat o'zining alohida tugmasiga muhtoj emas. Bosilganda buyurtmadagi
   * barcha faol (DELIVERED/CANCELLED bo'lmagan) xizmatlar bir vaqtda bir
   * bosqich oldinga suriladi (masalan hammasi "Kutilmoqda"dan "Jarayonda"ga).
   */
  /**
   * Buyurtma kartasidagi YAGONA qo'lda bosiladigan amal — "Bemorga
   * topshirildi". Faqat "Tayyor" (READY) holatidagi xizmatlarni "Yetkazilgan"
   * (DELIVERED)ga o'tkazadi. PENDING → IN_PROGRESS → READY o'tishlari bunga
   * kirmaydi — ular natija sahifasida natija saqlanganda/yuborilganda
   * avtomatik sodir bo'ladi (qarang: saveResultTables). Agar bu yerda ham
   * PENDING/IN_PROGRESS'ni ilgarilatib yuborsak, laborant haqiqatda natija
   * kiritmasdan "tayyor" deb belgilab qo'yishi mumkin bo'lib qolardi.
   */
  async deliverOrder(orderId: string, user: JwtPayload) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException("Lab order not found");

    const readyItems = order.items.filter((item) => item.status === "READY");
    if (readyItems.length === 0) {
      throw new BadRequestException("Buyurtmada topshirish uchun tayyor xizmat yo'q");
    }

    await this.repo.advanceItems(
      readyItems.map((item) => ({ id: item.id, nextStatus: "DELIVERED" as LabItemStatus })),
      user.userId,
    );
    await this.repo.recalcOrderStatus(orderId);
    return this.repo.findById(orderId);
  }

  /**
   * Natija kiritish sahifasida laborant buyurtmaga bir nechta qo'shimcha
   * xizmat qo'shishi mumkin (masalan tekshiruv jarayonida yana bir nechta
   * ko'rsatkich kerak bo'lib qolsa). isPaid=true bo'lsa xizmatlar narxi
   * buyurtmaning umumiy hisobiga (invoice) qo'shiladi, false bo'lsa bepul deb
   * belgilanadi. `dto.totalPrice` berilgan bo'lsa (masalan chegirma berish
   * uchun), xizmatlar narxlari yig'indisi o'rniga shu summa hisobga
   * qo'shiladi — farq alohida qator sifatida invoice'ga qo'shiladi, shunda
   * har bir xizmat o'z nominal narxida ko'rinib turadi.
   */
  async addItems(orderId: string, dto: AddLabOrderItemsDto, user: JwtPayload) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException("Lab order not found");

    const uniqueServiceIds = Array.from(new Set(dto.serviceIds));
    const existingIds = new Set(order.items.filter((i) => i.status !== "CANCELLED").map((i) => i.serviceId));

    const services = await this.prisma.laboratoryService.findMany({ where: { id: { in: uniqueServiceIds } } });
    if (services.length !== uniqueServiceIds.length) throw new NotFoundException("Xizmat topilmadi");

    for (const service of services) {
      if (service.laboratoryId !== order.laboratoryId) {
        throw new BadRequestException("Bu xizmat ushbu laboratoriyaga tegishli emas");
      }
      if (existingIds.has(service.id)) {
        throw new BadRequestException(`"${service.name}" xizmati allaqachon qo'shilgan`);
      }
    }

    const isPaid = dto.isPaid ?? true;
    const items = [];
    for (const serviceId of uniqueServiceIds) {
      items.push(await this.repo.createItem(orderId, serviceId, isPaid));
    }

    if (isPaid) {
      const nominalTotal = services.reduce((sum, s) => sum.add(new Prisma.Decimal(s.price ?? 0)), new Prisma.Decimal(0));
      const finalTotal = dto.totalPrice != null ? new Prisma.Decimal(dto.totalPrice) : nominalTotal;

      const invoiceItemsData: {
        description: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        totalPrice: Prisma.Decimal;
        sourceType: InvoiceItemSourceType;
        sourceId?: string;
      }[] = services.map((service) => {
        const price = new Prisma.Decimal(service.price ?? 0);
        return {
          description: service.name,
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
          sourceType: InvoiceItemSourceType.LAB_SERVICE,
          sourceId: service.id,
        };
      });

      const diff = finalTotal.sub(nominalTotal);
      if (!diff.isZero()) {
        invoiceItemsData.push({
          description: diff.isNegative() ? "Chegirma" : "Qo'shimcha to'lov",
          quantity: 1,
          unitPrice: diff,
          totalPrice: diff,
          sourceType: InvoiceItemSourceType.MANUAL,
        });
      }

      // Eski invoice'ga qo'shib yubormaymiz — u allaqachon to'langan/qisman
      // to'langan bo'lishi mumkin, shu sababli qo'shimcha xizmatlar uchun
      // har doim alohida yangi invoice ochamiz (bitta caseStep bo'yicha bir
      // nechta invoice bo'lishi tizimda normal holat, qarang: getInvoicesBySource).
      await this.prisma.invoice.create({
        data: {
          patientId: order.patientId,
          sourceType: InvoiceSourceType.LAB_ORDER,
          sourceId: order.caseStep.id,
          totalAmount: finalTotal,
          status: InvoiceStatus.ISSUED,
          createdById: user.userId,
          items: { create: invoiceItemsData },
        },
      });
    }

    await this.repo.recalcOrderStatus(orderId);
    return items;
  }

  /**
   * Bemorni laboratoriyaga yuborishda invois kechiktirilgan bo'lsa
   * (cases moduli: deferLabInvoice=true), labarant narxni ko'rib chiqqach
   * shu metod orqali hali hisoblanmagan (invoiced=false) xizmatlar uchun
   * invoisni o'zi yaratadi. `dto.totalPrice` berilsa (masalan chegirma
   * uchun), xizmatlar narxlari yig'indisi o'rniga shu summa hisobga
   * qo'shiladi — farq alohida qator sifatida invoice'ga qo'shiladi.
   */
  async createOrderInvoice(orderId: string, dto: CreateLabOrderInvoiceDto, user: JwtPayload) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException("Lab order not found");

    const pendingItems = order.items.filter((i) => !i.invoiced);
    if (!pendingItems.length) {
      throw new BadRequestException("Ushbu buyurtmada hisoblanmagan xizmat yo'q");
    }

    const nominalTotal = pendingItems.reduce(
      (sum, i) => sum.add(new Prisma.Decimal(i.service.price ?? 0)),
      new Prisma.Decimal(0),
    );
    const finalTotal = dto.totalPrice != null ? new Prisma.Decimal(dto.totalPrice) : nominalTotal;

    const invoiceItemsData: {
      description: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
      sourceType: InvoiceItemSourceType;
      sourceId?: string;
    }[] = pendingItems.map((item) => {
      const price = new Prisma.Decimal(item.service.price ?? 0);
      return {
        description: item.service.name,
        quantity: 1,
        unitPrice: price,
        totalPrice: price,
        sourceType: InvoiceItemSourceType.LAB_SERVICE,
        sourceId: item.service.id,
      };
    });

    const diff = finalTotal.sub(nominalTotal);
    if (!diff.isZero()) {
      invoiceItemsData.push({
        description: diff.isNegative() ? "Chegirma" : "Qo'shimcha to'lov",
        quantity: 1,
        unitPrice: diff,
        totalPrice: diff,
        sourceType: InvoiceItemSourceType.MANUAL,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.invoice.create({
        data: {
          patientId: order.patientId,
          sourceType: InvoiceSourceType.LAB_ORDER,
          sourceId: order.caseStep.id,
          totalAmount: finalTotal,
          status: InvoiceStatus.ISSUED,
          createdById: user.userId,
          items: { create: invoiceItemsData },
        },
      });

      await tx.labOrderItem.updateMany({
        where: { id: { in: pendingItems.map((i) => i.id) } },
        data: { invoiced: true },
      });
    });

    return this.repo.findById(orderId);
  }

  async addFile(orderId: string, itemId: string, dto: AddLabOrderItemFileDto) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException("Lab order not found");
    const item = order.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("Lab order item not found");

    const file = await this.repo.addFile(itemId, dto.url, dto.name);
    if (item.status === "PENDING" || item.status === "IN_PROGRESS") {
      await this.repo.updateItem(itemId, { status: "READY" });
      await this.repo.recalcOrderStatus(orderId);
    }

    return file;
  }

  /**
   * Natija jadvalini saqlaydi. Ikki holat bor:
   *  - dto.submit = false/berilmagan ("Saqlash"): bu — qoralama. Laborant natijani
   *    bir necha bosqichda kiritishi mumkin (masalan bugun bir qismini, ertaga
   *    qolganini), har safar shu yerga PUT qilib turadi. Holat READY'ga o'tmaydi,
   *    faqat ish boshlangani uchun PENDING bo'lsa IN_PROGRESS'ga ko'tariladi.
   *  - dto.submit = true ("Yuborish"): bu — yakuniy tasdiqlash. Natija tayyor va
   *    bemorga/shifokorga ko'rsatishga tayyor deb belgilanadi (status = READY).
   */
  async saveResultTable(orderId: string, itemId: string, dto: UpsertLabResultTableDto, user: JwtPayload) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException("Lab order not found");
    const item = order.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("Lab order item not found");

    const rows = mergeRowsWithServiceTemplate(dto.rows, item.service.name, item.service.defaultRows);
    const table = await this.repo.upsertResultTable(itemId, rows);

    // Natijani kim kiritgani/tasdiqlaganini saqlab qo'yamiz, hujjat generatsiyasida
    // shu odam "laborant" sifatida ko'rsatiladi.
    const itemUpdate: { status?: "READY" | "IN_PROGRESS"; performedById: string } = { performedById: user.userId };

    if (dto.submit) {
      // Yakuniy yuborish — qaysi holatda bo'lishidan qat'i nazar (qoralama saqlangan
      // bo'lsa ham) endi "Tayyor" deb belgilaymiz.
      if (item.status === "PENDING" || item.status === "IN_PROGRESS") {
        itemUpdate.status = "READY";
      }
    } else if (item.status === "PENDING") {
      // Qoralama saqlanmoqda, lekin hali ishga kirishilmagan edi — endi jarayon
      // boshlandi deb belgilaymiz. READY'ga esa hali o'tmaydi.
      itemUpdate.status = "IN_PROGRESS";
    }

    await this.repo.updateItem(itemId, itemUpdate);
    await this.repo.recalcOrderStatus(orderId);

    return table;
  }

  /**
   * "Umumiy" natija saqlash — bitta buyurtmadagi bir nechta itemning natija
   * jadvalini bitta so'rovda saqlaydi (laborant butun buyurtmani bitta
   * ekranda to'ldiradi). Har bir item uchun xuddi saveResultTable'dagi kabi
   * holat mantiqi qo'llanadi, lekin buyurtma holati oxirida bir marta
   * qayta hisoblanadi.
   */
  async saveResultTables(orderId: string, dto: BulkSaveLabResultsDto, user: JwtPayload) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException("Lab order not found");

    const tables = [];
    for (const entry of dto.items) {
      const item = order.items.find((i) => i.id === entry.itemId);
      if (!item) throw new NotFoundException(`Lab order item not found: ${entry.itemId}`);

      const rows = mergeRowsWithServiceTemplate(entry.rows, item.service.name, item.service.defaultRows);
      const table = await this.repo.upsertResultTable(entry.itemId, rows);
      tables.push(table);

      const itemUpdate: { status?: "READY" | "IN_PROGRESS"; performedById: string } = { performedById: user.userId };
      if (dto.submit) {
        if (item.status === "PENDING" || item.status === "IN_PROGRESS") {
          itemUpdate.status = "READY";
        }
      } else if (item.status === "PENDING") {
        itemUpdate.status = "IN_PROGRESS";
      }
      await this.repo.updateItem(entry.itemId, itemUpdate);
    }

    await this.repo.recalcOrderStatus(orderId);
    return tables;
  }


  /**
   * Laborant natija jadvalini to'ldirayotganda mustaqil shablonlar ro'yxatidan
   * (LabResultTemplate — hech qanday xizmatga tayinlanmagan) birini tanlaydi.
   * Shu metod tanlangan shablonning qatorlarini item'ning natija jadvaliga
   * nusxalaydi ("result" ustuni bo'sh — "-" bilan boshlanadi), shundan keyin
   * laborant odatdagidek saveResultTable orqali qiymatlarni to'ldirib boradi.
   */
  async applyTemplate(orderId: string, itemId: string, dto: ApplyLabResultTemplateDto, user: JwtPayload) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException("Lab order not found");
    const item = order.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("Lab order item not found");

    const template = await this.prisma.labResultTemplate.findUnique({ where: { id: dto.templateId } });
    if (!template) throw new NotFoundException("Natija shabloni topilmadi");

    const templatePayload = unpackRowsPayload(template.rows, template.name);
    const templateRows = templatePayload.rows as {
      code?: string;
      indicator: string;
      norm?: string;
      unit?: string;
    }[];

    const rows = templateRows.map((r, index) => ({
      code: r.code,
      indicator: r.indicator,
      norm: r.norm,
      unit: r.unit,
      sortOrder: index,
    }));

    const table = await this.repo.upsertResultTable(itemId, rows);

    // Shablon tanlash — ish boshlanganini bildiradi, lekin hali yakuniy
    // tasdiqlash emas, shuning uchun faqat PENDING bo'lsa IN_PROGRESS'ga o'tadi.
    if (item.status === "PENDING") {
      await this.repo.updateItem(itemId, { status: "IN_PROGRESS" });
      await this.repo.recalcOrderStatus(orderId);
    }

    return table;
  }

  /**
   * Bemor natijasini PDF yoki DOCX ko'rinishida generatsiya qiladi.
   * Barcha ma'lumotlar (bemor, sana, tartib raqami, laborant) backend'dan olinadi —
   * hech narsa hardcoded emas.
   */
  async generateDocument(orderId: string, itemId: string, format: DocumentFormat, user: JwtPayload) {
    if (format !== "pdf" && format !== "docx") {
      throw new BadRequestException("Format faqat 'pdf' yoki 'docx' bo'lishi mumkin");
    }

    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException("Buyurtma topilmadi");

    // Ruxsat tekshiruvi: findMyOrders bilan bir xil mantiq — o'z laboratoriyasi
    // bo'lmagan buyurtmani hech kim (ADMIN'dan tashqari) yuklab ololmasligi kerak.
    if (user.role !== RoleName.ADMIN) {
      const hasAccess = await this.prisma.laboratoryAssignment.findFirst({
        where: { userId: user.userId, laboratoryId: order.laboratory.id, isActive: true },
      });
      if (!hasAccess) throw new ForbiddenException("Bu buyurtmaga ruxsatingiz yo'q");
    }

    const item = order.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("Lab order item not found");
    if (!item.resultTable) throw new NotFoundException("Natija topilmadi");

    // Laborant ismi: avval item'ni bajargan xodim, topilmasa so'rovni yuborayotgan foydalanuvchi
    const performer =
      item.performedBy ??
      (await this.prisma.user.findUnique({
        where: { id: user.userId },
        select: { first_name: true, last_name: true },
      }));

    const logoBuffer = await this.fetchLogoBuffer();

    const data = {
      patientName: `${order.patient.first_name} ${order.patient.last_name}`,
      patientBirthYear: order.patient.birth_date ? new Date(order.patient.birth_date).getFullYear() : "—",
      orderNumber: order.orderNumber ?? order.id.slice(-4).toUpperCase(),
      sampleDate: order.sampleTakenAt
        ? new Date(order.sampleTakenAt).toLocaleDateString("uz-UZ")
        : new Date(order.createdAt).toLocaleDateString("uz-UZ"),
      analysisTitle: item.service.name,
      doctorName: performer ? `${performer.first_name} ${performer.last_name}` : "—",
      logoBuffer,
      rows: item.resultTable.rows,
      resultLayout: item.service.resultLayout,
    };

    return format === "pdf" ? generatePdf(data) : generateDocx(data);
  }


  /**
   * "Umumiy" hujjat — buyurtmadagi barcha (natijasi kiritilgan) xizmatlarning
   * natijasini bitta PDF/DOCX faylida chiqaradi. Bemor ma'lumotlari va
   * laboratoriya nomi (masalan "КОАГУЛОГРАММА") bitta marta yuqorida
   * ko'rsatiladi, har bir xizmat esa o'z sarlavhasi va jadvali bilan
   * ketma-ket joylanadi.
   */
  async generateOrderDocument(orderId: string, format: DocumentFormat, user: JwtPayload) {
    if (format !== "pdf" && format !== "docx") {
      throw new BadRequestException("Format faqat 'pdf' yoki 'docx' bo'lishi mumkin");
    }

    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException("Buyurtma topilmadi");

    if (user.role !== RoleName.ADMIN) {
      const hasAccess = await this.prisma.laboratoryAssignment.findFirst({
        where: { userId: user.userId, laboratoryId: order.laboratory.id, isActive: true },
      });
      if (!hasAccess) throw new ForbiddenException("Bu buyurtmaga ruxsatingiz yo'q");
    }

    const itemsWithResults = order.items.filter((i) => i.resultTable);
    if (!itemsWithResults.length) throw new NotFoundException("Natija topilmadi");

    // Har xil xizmatlarni har xil laborant bajargan bo'lishi mumkin —
    // takrorlanmas F.I.Sh ro'yxatini yig'amiz.
    const seenPerformerIds = new Set<string>();
    const performerNames: string[] = [];
    for (const item of itemsWithResults) {
      if (item.performedBy && !seenPerformerIds.has(item.performedBy.id)) {
        seenPerformerIds.add(item.performedBy.id);
        performerNames.push(`${item.performedBy.first_name} ${item.performedBy.last_name}`);
      }
    }
    if (!performerNames.length) {
      const me = await this.prisma.user.findUnique({
        where: { id: user.userId },
        select: { first_name: true, last_name: true },
      });
      if (me) performerNames.push(`${me.first_name} ${me.last_name}`);
    }

    const logoBuffer = await this.fetchLogoBuffer();

    const data = {
      patientName: `${order.patient.first_name} ${order.patient.last_name}`,
      patientBirthYear: order.patient.birth_date ? new Date(order.patient.birth_date).getFullYear() : "—",
      orderNumber: order.orderNumber ?? order.id.slice(-4).toUpperCase(),
      sampleDate: order.sampleTakenAt
        ? new Date(order.sampleTakenAt).toLocaleDateString("uz-UZ")
        : new Date(order.createdAt).toLocaleDateString("uz-UZ"),
      documentTitle: order.laboratory.name,
      doctorName: performerNames.join(", ") || "—",
      logoBuffer,
      sections: itemsWithResults.map((item) => ({
        title: item.service.name,
        rows: item.resultTable!.rows,
        resultLayout: item.service.resultLayout,
      })),
    };

    return format === "pdf" ? generateCombinedPdf(data) : generateCombinedDocx(data);
  }

  private readonly logoPath = join(__dirname, "assets", "logo.png");

  private async fetchLogoBuffer(): Promise<Buffer | null> {
    try {
      return await readFile(this.logoPath);
    } catch {
      return null;
    }
  }

  async removeFile(orderId: string, itemId: string, fileId: string) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException("Lab order not found");
    if (!order.items.find((i) => i.id === itemId)) throw new NotFoundException("Lab order item not found");
    const file = await this.repo.findFile(fileId);
    if (!file || file.labOrderItemId !== itemId) throw new NotFoundException("File not found");
    return this.repo.removeFile(fileId);
  }
}