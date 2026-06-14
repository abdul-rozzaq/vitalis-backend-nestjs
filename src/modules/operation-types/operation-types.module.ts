import { Module } from '@nestjs/common';
import { OperationTypesController } from './operation-types.controller';
import { OperationTypesRepository } from './operation-types.repository';
import { OperationTypesService } from './operation-types.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OperationTypesController],
  providers: [OperationTypesService, OperationTypesRepository],
  exports: [OperationTypesService],
})
export class OperationTypesModule {}