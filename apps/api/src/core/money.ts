export type CurrencyCode = string;

export type Money = Readonly<{
  amountMinor: bigint;
  currency: CurrencyCode;
}>;

export function money(amountMinor: bigint | number | string, currency: CurrencyCode): Money {
  const amount = typeof amountMinor === 'bigint' ? amountMinor : BigInt(amountMinor);
  if (!currency || !/^[A-Z]{3}$/.test(currency)) {
    throw new Error('Currency must be an ISO-style 3-letter code');
  }
  return Object.freeze({ amountMinor: amount, currency });
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor + b.amountMinor, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor - b.amountMinor, a.currency);
}

export function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) throw new Error('Currency mismatch');
}
