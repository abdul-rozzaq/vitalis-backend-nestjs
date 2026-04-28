import { RoleName } from "../enums/role-name.enum";

export interface JwtPayload {
  userId: string;
  role: RoleName;
}
