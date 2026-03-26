import { Module } from '@nestjs/common';
import { DistrictsController } from './districts.controller';
import { DistrictsService } from './districts.service';
import { DistrictsRepository } from './districts.repository';

@Module({
  controllers: [DistrictsController],
  providers: [DistrictsService, DistrictsRepository],
})
export class DistrictsModule {}
