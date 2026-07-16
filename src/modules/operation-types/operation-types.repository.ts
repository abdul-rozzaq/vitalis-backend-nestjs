import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { CreateOperationTypeDto, UpdateOperationTypeDto } from './operation-type.dto';

@Injectable()
export class OperationTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

 findAll(onlyActive?: boolean, departmentId?: string) {
  return this.prisma.operationType.findMany({
    where: {
      ...(onlyActive ? { isActive: true } : {}),
      ...(departmentId ? { departmentId } : {}),
    },
    include: {
      items: {
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      },
      doctors: {
        include: {
          doctor: {
            select: { id: true, first_name: true, last_name: true, role: true },
          },
        },
      },
      department: {
        select: { id: true, name: true },
      },
      _count: { select: { operations: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

findOne(id: string) {
  return this.prisma.operationType.findUnique({
    where: { id },
    include: {
      items: { orderBy: { createdAt: 'asc' } },
      doctors: {                          
        include: {
          doctor: {
            select: { id: true, first_name: true, last_name: true, role: true },
          },
        },
      },
      department: {
        select: { id: true, name: true },
      },
      _count: { select: { operations: true } },
    },
  });
}

  create(dto: CreateOperationTypeDto) {
    const { departmentId, items, ...rest } = dto;
    return this.prisma.operationType.create({
      data: {
        ...rest,
        basePrice: dto.basePrice ?? 0,
        isActive: dto.isActive ?? true,
        department: departmentId
          ? { connect: { id: departmentId } }
          : undefined,
        items: items?.length
          ? { create: items.map((item) => ({ ...item })) }
          : undefined,
      },
      include: { items: true, department: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateOperationTypeDto) {
    const { items, departmentId, ...typeData } = dto;

    return this.prisma.$transaction(async (tx) => {
      await tx.operationType.update({
        where: { id },
        data: {
          ...typeData,
          ...(departmentId !== undefined
            ? {
                department: departmentId
                  ? { connect: { id: departmentId } }
                  : { disconnect: true },
              }
            : {}),
        },
      });

      if (items !== undefined) {
        const incomingIds = items
          .filter((i) => i.id)
          .map((i) => i.id as string);

        await tx.operationTypeItem.deleteMany({
          where: {
            operationTypeId: id,
            id: { notIn: incomingIds },
          },
        });

        for (const item of items) {
          if (item.id) {
            await tx.operationTypeItem.update({
              where: { id: item.id },
              data: {
                name: item.name,
                price: item.price,
                isActive: item.isActive ?? true,
              },
            });
          } else {
            await tx.operationTypeItem.create({
              data: {
                operationTypeId: id,
                name: item.name,
                price: item.price,
                isActive: item.isActive ?? true,
              },
            });
          }
        }
      }

      return tx.operationType.findUnique({
        where: { id },
        include: {
          items: { orderBy: { createdAt: 'asc' } },
          department: { select: { id: true, name: true } },
        },
      });
    });
  }

  delete(id: string) {
    return this.prisma.operationType.delete({ where: { id } });
  }

  deleteItem(itemId: string) {
    return this.prisma.operationTypeItem.delete({ where: { id: itemId } });
  }

  addDoctor(operationTypeId: string, doctorId: string) {
  return this.prisma.operationTypeDoctor.create({
    data: { operationTypeId, doctorId },
    include: {
      doctor: {
        select: { id: true, first_name: true, last_name: true, role: true },
      },
    },
  });
}

removeDoctor(operationTypeId: string, doctorId: string) {
  return this.prisma.operationTypeDoctor.delete({
    where: { operationTypeId_doctorId: { operationTypeId, doctorId } },
  });
}
}