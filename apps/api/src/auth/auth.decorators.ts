import { SetMetadata } from '@nestjs/common';
export const URBIS_ROLES='urbis_roles';
export const Roles=(...roles:string[])=>SetMetadata(URBIS_ROLES,roles.map(r=>r.toUpperCase()));
