import { Module } from "@nestjs/common";
import { MedicinesController } from "./medicines.controller";
import { MedicinesService } from "./medicines.service";
import { MedicinesRepository } from "./medicines.repository";

@Module({
  controllers: [MedicinesController],
  providers: [MedicinesService, MedicinesRepository],
  exports: [MedicinesService],
})
export class MedicinesModule {}
