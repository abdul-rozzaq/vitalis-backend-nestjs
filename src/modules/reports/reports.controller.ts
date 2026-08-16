import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { InvoiceSourceType } from "../../generated/prisma/enums";
import { ReportsService } from "./reports.service";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diffToMonday);
  return x;
}

/**
 * Davr tugmalari (bugun/hafta/oy/o'tgan oy) har doim SERVER vaqtidan
 * hisoblanadi — mijoz (brauzer) tizim soati bilan bog'liq emas. Aks holda
 * mijoz qurilmasining soati/sanasi serverdan farq qilsa, filtr noto'g'ri
 * oraliqni so'rab, ma'lumot topilmay qolishi mumkin edi.
 */
function presetRange(preset: string): { from: Date; to: Date } | null {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "week":
      return { from: startOfWeek(now), to: endOfDay(now) };
    case "month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
    case "lastMonth":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      };
    default:
      return null;
  }
}

@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("revenue")
  getRevenue(@Query("preset") preset?: string, @Query("from") from?: string, @Query("to") to?: string) {
    const resolved = preset ? presetRange(preset) : null;
    const fromDate = resolved?.from ?? (from ? new Date(from) : presetRange("month")!.from);
    const toDate = resolved?.to ?? (to ? new Date(to) : new Date());
    return this.reportsService.getRevenue(fromDate, toDate);
  }

  @Get("revenue/monthly")
  getMonthlyRevenue(@Query("months") months?: string) {
    const parsed = months ? parseInt(months, 10) : 6;
    const clamped = Number.isFinite(parsed) ? Math.min(24, Math.max(1, parsed)) : 6;
    return this.reportsService.getMonthlyRevenue(clamped);
  }

  @Get("revenue/by-source-detail")
  getSourceDetail(
    @Query("sourceType") sourceType?: string,
    @Query("preset") preset?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    if (!sourceType || !(sourceType in InvoiceSourceType)) {
      throw new BadRequestException("sourceType noto'g'ri yoki berilmagan");
    }
    const resolved = preset ? presetRange(preset) : null;
    const fromDate = resolved?.from ?? (from ? new Date(from) : presetRange("month")!.from);
    const toDate = resolved?.to ?? (to ? new Date(to) : new Date());
    return this.reportsService.getSourceDetail(sourceType as InvoiceSourceType, fromDate, toDate);
  }
}
