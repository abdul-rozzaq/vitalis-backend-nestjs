import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class MedicinesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string) {
    return this.prisma.medicine.findMany({
      where: search ? { name: { contains: search, mode: "insensitive" } } : undefined,
      orderBy: { name: "asc" },
    });
  }

  async upsert(name: string) {
    const trimmed = name.trim();
    const existing = await this.prisma.medicine.findFirst({
      where: { name: { equals: trimmed, mode: "insensitive" } },
    });
    if (existing) return existing;
    return this.prisma.medicine.create({ data: { name: trimmed } });
  }
}
