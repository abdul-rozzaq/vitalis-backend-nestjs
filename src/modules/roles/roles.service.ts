import { Injectable } from "@nestjs/common";
import { RolesRepository } from "./roles.repository";
import { AppException } from "../../common/exceptions/app.exception";

type CreateRoleDto = {
  name: string;
  description?: string | null;
};

type UpdateRoleDto = Partial<CreateRoleDto>;

@Injectable()
export class RolesService {
  constructor(private readonly repo: RolesRepository) {}

  async list() {
    return this.repo.list();
  }

  async retrieve(id: string) {
    const role = await this.repo.retrieve(id);
    if (!role) throw new AppException("Role not found", 404);
    return role;
  }

  async create(data: CreateRoleDto) {
    const existing = await this.repo.findByName(data.name);
    if (existing) throw new AppException(`Role "${data.name}" already exists`, 409);
    return this.repo.create(data);
  }

  async update(id: string, data: UpdateRoleDto) {
    await this.retrieve(id);
    if (data.name) {
      const existing = await this.repo.findByName(data.name);
      if (existing && existing.id !== id) {
        throw new AppException(`Role "${data.name}" already exists`, 409);
      }
    }
    return this.repo.update(id, data);
  }

  async delete(id: string) {
    await this.retrieve(id);
    return this.repo.delete(id);
  }
}
