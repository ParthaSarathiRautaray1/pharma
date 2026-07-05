const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const inrCompact = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** ₹1,23,456.00 */
export function formatCurrency(value: number): string {
  return inr.format(value);
}

/** ₹1.2L — for tight spaces like stat cards and axes. */
export function formatCurrencyCompact(value: number): string {
  return inrCompact.format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}
