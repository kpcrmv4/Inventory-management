const thaiFormatter = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** format จำนวนเงินเป็นบาท เช่น "฿1,234.56" */
export function formatBaht(amount: number): string {
  return thaiFormatter.format(amount)
}

/** format ตัวเลขพร้อม comma เช่น "1,234.56" */
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/** format เป็นเปอร์เซ็นต์ เช่น "12.34%" */
export function formatPercent(value: number, decimals = 2): string {
  return `${formatNumber(value, decimals)}%`
}

/** safe division — คืน 0 ถ้าหารด้วย 0 */
export function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return numerator / denominator
}
