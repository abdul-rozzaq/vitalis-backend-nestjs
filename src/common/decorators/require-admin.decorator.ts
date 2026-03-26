import { SetMetadata } from '@nestjs/common';

export const RequireAdmin = () => SetMetadata('requireAdmin', true);
