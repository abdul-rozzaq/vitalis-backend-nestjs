import { Injectable } from "@nestjs/common";
import { PatientSourcesRepository } from "./patient-sources.repository";

@Injectable()
export class PatientSourcesService {
  constructor(private readonly repository: PatientSourcesRepository) {}

  list(search?: string) {
    return this.repository.findAll(search);
  }

  upsert(name: string) {
    return this.repository.upsert(name);
  }
}
