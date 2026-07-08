import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { readFile } from "fs/promises";
import { join } from "path";
import { RoleName } from "../../common/enums/role-name.enum";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { PrismaService } from "../../prisma/prisma.service";
import { generateDocx } from "./generators/docx-generator";
import { generatePdf } from "./generators/pdf-generator";
import { ApplyLabResultTemplateDto, AddLabOrderItemFileDto, UpdateLabOrderItemDto, UpsertLabResultTableDto } from "./lab-orders.dto";
import { LabOrdersRepository } from "./lab-orders.repository";

export type DocumentFormat = "pdf" | "docx";

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

    const table = await this.repo.upsertResultTable(itemId, dto.rows);

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

    const templateRows = (template.rows as unknown as {
      code?: string;
      indicator: string;
      norm?: string;
      unit?: string;
    }[]) ?? [];

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
    };

    return format === "pdf" ? generatePdf(data) : generateDocx(data);
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