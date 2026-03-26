import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.payment.findMany({
      include: {
        patient: true,
        department: true,
      },
    });
  }

  async retrieve(id: string) {
    return this.prisma.payment.findUnique({
      where: { id },
      include: {
        patient: true,
        department: true,
      },
    });
  }

  async create(data: Prisma.PaymentCreateInput) {
    return this.prisma.payment.create({
      data,
      include: {
        patient: true,
        department: true,
      },
    });
  }

  async update(id: string, data: Prisma.PaymentUpdateInput) {
    return this.prisma.payment.update({
      where: { id },
      data,
      include: {
        patient: true,
        department: true,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.payment.delete({ where: { id } });
  }
}
