export type Role = 'CUSTOMER' | 'SUPPORT' | 'OPERATIONS' | 'COMPLIANCE' | 'ADMIN';

const permissions: Record<Role, readonly string[]> = {
  CUSTOMER: ['account:read', 'transfer:create', 'transfer:read', 'beneficiary:manage'],
  SUPPORT: ['account:read', 'transfer:read', 'customer:read'],
  OPERATIONS: ['account:read', 'transfer:read', 'transfer:review', 'transfer:operate'],
  COMPLIANCE: ['customer:read', 'kyc:review', 'transfer:review', 'risk:review'],
  ADMIN: ['*'],
};

export function hasPermission(role: Role, permission: string): boolean {
  return permissions[role].includes('*') || permissions[role].includes(permission);
}

export function requirePermission(role: Role, permission: string): void {
  if (!hasPermission(role, permission)) throw new Error('Forbidden');
}
