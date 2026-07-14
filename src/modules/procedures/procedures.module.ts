import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProceduresController } from './procedures.controller';
import { ProceduresService } from './procedures.service';
import { ProceduresRepository } from './procedures.repository';

@Module({
  imports: [PrismaModule],
  controllers: [ProceduresController],
  providers: [ProceduresService, ProceduresRepository],
  exports: [ProceduresService],
})
export class ProceduresModule {}
