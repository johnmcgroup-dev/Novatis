export type AccountStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED';

export interface CustomerAccount {
  id: string;
  customerId: string;
  currency: string;
  status: AccountStatus;
}

export function canDebit(account: CustomerAccount): boolean {
  return account.status === 'ACTIVE';
}

export function canCredit(account: CustomerAccount): boolean {
  return account.status !== 'CLOSED';
}
