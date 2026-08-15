export const transferStatuses = [
  'INITIATED',
  'VALIDATING',
  'AUTHORIZED',
  'PROCESSING',
  'SUBMITTED',
  'PROVIDER_ACCEPTED',
  'SETTLED',
  'FAILED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
  'REVERSED',
  'REQUIRES_REVIEW',
] as const;

export type TransferStatus = typeof transferStatuses[number];

const transitions: Record<TransferStatus, readonly TransferStatus[]> = {
  INITIATED: ['VALIDATING', 'CANCELLED'],
  VALIDATING: ['AUTHORIZED', 'REJECTED', 'REQUIRES_REVIEW'],
  AUTHORIZED: ['PROCESSING', 'CANCELLED', 'REQUIRES_REVIEW'],
  PROCESSING: ['SUBMITTED', 'FAILED', 'REQUIRES_REVIEW'],
  SUBMITTED: ['PROVIDER_ACCEPTED', 'FAILED', 'REQUIRES_REVIEW'],
  PROVIDER_ACCEPTED: ['SETTLED', 'REVERSED', 'REQUIRES_REVIEW'],
  SETTLED: ['REVERSED'],
  FAILED: ['PROCESSING', 'REVERSED'],
  REJECTED: [],
  EXPIRED: [],
  CANCELLED: [],
  REVERSED: [],
  REQUIRES_REVIEW: ['PROCESSING', 'CANCELLED', 'REVERSED', 'SETTLED'],
};

export function canTransition(from: TransferStatus, to: TransferStatus): boolean {
  return transitions[from].includes(to);
}

export function assertTransition(from: TransferStatus, to: TransferStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid transfer transition: ${from} -> ${to}`);
  }
}
