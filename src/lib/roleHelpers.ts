import type { UserRole } from './database.types';

export const ALL_CEO_ROLES: UserRole[] = ['group_ceo', 'ceo_commercial', 'ceo_manufacturing'];
export const COMMERCIAL_CEO_ROLES: UserRole[] = ['group_ceo', 'ceo_commercial'];
export const MANUFACTURING_CEO_ROLES: UserRole[] = ['group_ceo', 'ceo_manufacturing'];

export function isAnyCeoRole(role: string | undefined | null): boolean {
  return !!role && (ALL_CEO_ROLES as string[]).includes(role);
}

export function isCommercialCeo(role: string | undefined | null): boolean {
  return !!role && (COMMERCIAL_CEO_ROLES as string[]).includes(role);
}

export function isManufacturingCeo(role: string | undefined | null): boolean {
  return !!role && (MANUFACTURING_CEO_ROLES as string[]).includes(role);
}
