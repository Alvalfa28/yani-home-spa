import { isUnpaid } from './payment'

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

/**
 * Uang yang benar-benar diterima saat invois dibuat.
 * `paid_amount` kosong (invois lama) -> lunas = total, "Belum Lunas" = 0.
 */
export const effectivePaid = (inv) => {
  const v = inv.paid_amount
  if (v !== null && v !== undefined && v !== '') return Number(v) || 0
  return isUnpaid(inv.payment_method) ? 0 : Number(inv.total_amount) || 0
}

/** Total pemasukan pelunasan yang dikaitkan ke invois (yhs_incomes.invoice_id). */
export const settledAmount = (invoiceId, incomes, excludeIncomeId = null) =>
  round2(
    incomes
      .filter((i) => i.invoice_id != null && i.invoice_id !== '' && String(i.invoice_id) === String(invoiceId))
      .filter((i) => excludeIncomeId == null || String(i.id) !== String(excludeIncomeId))
      .reduce((acc, i) => acc + (Number(i.amount) || 0), 0),
  )

/** Sisa tagihan sebuah invois. */
export const remainingOf = (inv, incomes, excludeIncomeId = null) =>
  Math.max(0, round2((Number(inv.total_amount) || 0) - effectivePaid(inv) - settledAmount(inv.id, incomes, excludeIncomeId)))

/** Ringkasan status bayar untuk tampilan. */
export const paymentStatusOf = (inv, incomes) => {
  const remaining = remainingOf(inv, incomes)
  const paid = effectivePaid(inv)
  return { remaining, paid, outstanding: remaining > 0, isDownPayment: remaining > 0 && paid > 0 }
}
