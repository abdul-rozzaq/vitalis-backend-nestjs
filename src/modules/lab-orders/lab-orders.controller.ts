import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Put, Res } from "@nestjs/common";
import { Response } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import {
  AddLabOrderItemsDto,
  ApplyLabResultTemplateDto,
  AddLabOrderItemFileDto,
  BulkSaveLabResultsDto,
  CreateLabOrderInvoiceDto,
  UpdateLabOrderItemDto,
  UpsertLabResultTableDto,
} from "./lab-orders.dto";
import { LabOrdersService } from "./lab-orders.service";

@Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.LABARANT)
@Controller("lab-orders")
export class LabOrdersController {
  constructor(private readonly service: LabOrdersService) {}

  @Get()
  findMyOrders(@CurrentUser() user: JwtPayload) {
    return this.service.findMyOrders(user);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findById(id);
  }

  @Patch(":id/items/:itemId")
  updateItem(@Param("id") id: string, @Param("itemId") itemId: string, @Body() dto: UpdateLabOrderItemDto) {
    return this.service.updateItem(id, itemId, dto);
  }

  // Buyurtma darajasidagi yagona qo'lda bosiladigan amal — faqat "Tayyor"
  // xizmatlarni "Bemorga topshirildi" deb belgilaydi.
  @Post(":id/deliver")
  deliverOrder(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.service.deliverOrder(id, user);
  }

  // Natija kiritish sahifasidan buyurtmaga bir nechta yangi xizmat qo'shish (to'lovli/bepul).
  @Post(":id/items")
  addItems(@Param("id") id: string, @Body() dto: AddLabOrderItemsDto, @CurrentUser() user: JwtPayload) {
    return this.service.addItems(id, dto, user);
  }

  // Yuborishda invois kechiktirilgan bo'lsa (deferLabInvoice=true), labarant
  // shu amal orqali hali hisoblanmagan xizmatlar uchun invoisni o'zi yaratadi,
  // kerak bo'lsa narxni o'zgartirib (masalan chegirma uchun).
  @Post(":id/create-invoice")
  createOrderInvoice(@Param("id") id: string, @Body() dto: CreateLabOrderInvoiceDto, @CurrentUser() user: JwtPayload) {
    return this.service.createOrderInvoice(id, dto, user);
  }

  // "Umumiy" natija kiritish — bitta buyurtmadagi bir nechta xizmat natijasini
  // bitta so'rovda saqlaydi (laborant hammasini bitta ekranda to'ldiradi).
  @Put(":id/results")
  saveResultTables(@Param("id") id: string, @Body() dto: BulkSaveLabResultsDto, @CurrentUser() user: JwtPayload) {
    return this.service.saveResultTables(id, dto, user);
  }

  // "Umumiy" hujjat — buyurtmadagi barcha xizmatlarning natijasi bitta PDF/DOCX faylida.
  @Get(":id/download/:format")
  async downloadOrderDocument(
    @Param("id") id: string,
    @Param("format") format: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    if (format !== "pdf" && format !== "docx") {
      throw new BadRequestException("Format faqat 'pdf' yoki 'docx' bo'lishi mumkin");
    }

    const buffer = await this.service.generateOrderDocument(id, format, user);

    res.set({
      "Content-Type":
        format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename=umumiy-natija-${id}.${format}`,
      "Content-Length": buffer.length,
    });

    res.send(buffer);
  }

  @Put(":id/items/:itemId/result-table")
  saveResultTable(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpsertLabResultTableDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.saveResultTable(id, itemId, dto, user);
  }

  @Put(":id/items/:itemId/result-table/apply-template")
  applyTemplate(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() dto: ApplyLabResultTemplateDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.applyTemplate(id, itemId, dto, user);
  }

  @Get(":id/items/:itemId/download/:format")
  async downloadDocument(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Param("format") format: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    if (format !== "pdf" && format !== "docx") {
      throw new BadRequestException("Format faqat 'pdf' yoki 'docx' bo'lishi mumkin");
    }

    const buffer = await this.service.generateDocument(id, itemId, format, user);

    res.set({
      "Content-Type":
        format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename=natija-${itemId}.${format}`,
      "Content-Length": buffer.length,
    });

    res.send(buffer);
  }

  @Post(":id/items/:itemId/files")
  addFile(@Param("id") id: string, @Param("itemId") itemId: string, @Body() dto: AddLabOrderItemFileDto) {
    return this.service.addFile(id, itemId, dto);
  }

  @Delete(":id/items/:itemId/files/:fileId")
  removeFile(@Param("id") id: string, @Param("itemId") itemId: string, @Param("fileId") fileId: string) {
    return this.service.removeFile(id, itemId, fileId);
  }
}