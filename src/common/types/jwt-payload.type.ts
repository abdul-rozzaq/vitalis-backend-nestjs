export interface JwtPayload {
  userId: string;
  roleId: string;
  roleName: string;
  isSuperUser: boolean;
}
