import { Injectable } from "@nestjs/common";
import { MedicinesRepository } from "./medicines.repository";

@Injectable()
export class MedicinesService {
  constructor(private readonly repository: MedicinesRepository) {}

  list(search?: string) {
    return this.repository.findAll(search);
  }

  upsert(name: string) {
    return this.repository.upsert(name);
  }
}
