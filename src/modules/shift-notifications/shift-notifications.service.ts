import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ShiftNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyNotifications(userId: string) {
    return this.prisma.shiftNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.shiftNotification.count({
      where: { userId, readAt: null },
    });
  }

  async markRead(id: string, userId: string) {
    const notif = await this.prisma.shiftNotification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException("Bildirishnoma topilmadi");
    if (notif.userId !== userId) throw new NotFoundException("Bildirishnoma topilmadi");

    return this.prisma.shiftNotification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.shiftNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }
}
