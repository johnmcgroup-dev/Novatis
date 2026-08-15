export const TRANSFER_STATES = [
  'INITIATED', 'VALIDATING', 'AUTHORIZED', 'PROCESSING', 'SUBMITTED',
  'PROVIDER_ACCEPTED', 'SETTLED', 'FAILED', 'REJECTED', 'EXPIRED',
  'CANCELLED', 'REVERSED', 'REQUIRES_REVIEW',
] as const;

export type TransferState = typeof TRANSFER_STATES[number];

const transitions: Record<TransferState, readonly TransferState[]> = {
  INITIATED: ['VALIDATING', 'CANCELLED', 'EXPIRED'],
  VALIDATING: ['AUTHORIZED', 'REJECTED', 'REQUIRES_REVIEW'],
  AUTHORIZED: ['PROCESSING', 'CANCELLED', 'REQUIRES_REVIEW'],
  PROCESSING: ['SUBMITTED', 'FAILED', 'REQUIRES_REVIEW'],
  SUBMITTED: ['PROVIDER_ACCEPTED', 'FAILED', 'REQUIRES_REVIEW'],
  PROVIDER_ACCEPTED: ['SETTLED', 'FAILED', 'REQUIRES_REVIEW'],
  SETTLED: ['REVERSED'],
  FAILED: [],
  REJECTED: [],
  EXPIRED: [],
  CANCELLED: [],
  REVERSED: [],
  REQUIRES_REVIEW: ['PROCESSING', 'CANCELLED', 'REJECTED'],
};

export function canTransition(from: TransferState, to: TransferState): boolean {
  return transitions[from].includes(to);
}

export function transition(from: TransferState, to: TransferState): TransferState {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid transfer transition: ${from} -> ${to}`);
  }
  return to;
}
