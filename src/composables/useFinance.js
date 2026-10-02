import { computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useMasterData } from './useMasterData'
import { useToast } from './useToast'
import { usePeriodFilter } from './usePeriodFilter'
import { categorizePayment, isUnpaid } from '../utils/payment'

/** Tampilan Keuangan: total pemasukan/pengeluaran, rincian pembayaran, dan CRUD catatan manual. */
export function useFinance() {
  const { invoiceHistory, expenseList, incomeList, fetchData } = useMasterData()
  const { showToast } = useToast()
  const { filter, matches } = usePeriodFilter()

  const filteredExpenses = computed(() => expenseList.value.filter((e) => matches(e.expense_date)))
  const filteredIncomes = computed(() => incomeList.value.filter((i) => matches(i.income_date)))
  const periodInvoices = computed(() => invoiceHistory.value.filter((i) => matches(i.invoice_date)))

  const sum = (rows, key) => rows.reduce((acc, row) => acc + (Number(row[key]) || 0), 0)

  // Invois "Belum Lunas" belum menjadi kas masuk.
  const invoiceIncomeTotal = computed(() =>
    sum(periodInvoices.value.filter((i) => !isUnpaid(i.payment_method)), 'total_amount'),
  )
  const manualIncomeTotal = computed(() => sum(filteredIncomes.value, 'amount'))
  const totalIncome = computed(() => invoiceIncomeTotal.value + manualIncomeTotal.value)
  const expenseTotal = computed(() => sum(filteredExpenses.value, 'amount'))
  const netBalance = computed(() => totalIncome.value - expenseTotal.value)

  const paymentBreakdown = computed(() => {
    const result = {
      cash: { total: 0, count: 0 },
      bibd: { total: 0, count: 0 },
      baiduri: { total: 0, count: 0 },
      debit: { total: 0, count: 0 },
      belumLunas: { total: 0, count: 0 },
    }
    periodInvoices.value.forEach((inv) => {
      const bucket = result[categorizePayment(inv.payment_method)]
      bucket.total += Number(inv.total_amount) || 0
      bucket.count += 1
    })
    return result
  })

  // ---- CRUD ----
  const saveRecord = async ({ table, form, editingId, label, dateKey }) => {
    if (!form.title.trim() || !(Number(form.amount) > 0)) {
      showToast(`Mohon isi Keterangan dan Jumlah ${label} yang sah.`, 'error')
      return false
    }
    try {
      const payload = {
        title: form.title.trim(),
        amount: Number(form.amount),
        [dateKey]: form[dateKey],
        category: form.category,
        notes: (form.notes || '').trim(),
      }
      const { error } = editingId
        ? await supabase.from(table).update(payload).eq('id', editingId)
        : await supabase.from(table).insert([payload])
      if (error) throw error

      showToast(`${label} berhasil ${editingId ? 'diperbarui' : 'dicatat'}!`)
      await fetchData()
      return true
    } catch (err) {
      showToast(`Gagal menyimpan ${label.toLowerCase()}: ${err.message}`, 'error')
      return false
    }
  }

  const deleteRecord = async ({ table, id, title, label }) => {
    if (!confirm(`Adakah anda pasti ingin memadam rekod ${label.toLowerCase()} "${title}"?`)) return
    try {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
      showToast(`${label} "${title}" berhasil dipadam!`)
      await fetchData()
    } catch (err) {
      showToast(`Gagal memadam ${label.toLowerCase()}: ${err.message}`, 'error')
    }
  }

  const saveExpense = (form, editingId) =>
    saveRecord({ table: 'yhs_expenses', form, editingId, label: 'Pengeluaran', dateKey: 'expense_date' })
  const saveIncome = (form, editingId) =>
    saveRecord({ table: 'yhs_incomes', form, editingId, label: 'Pemasukan', dateKey: 'income_date' })
  const deleteExpense = (id, title) => deleteRecord({ table: 'yhs_expenses', id, title, label: 'Pengeluaran' })
  const deleteIncome = (id, title) => deleteRecord({ table: 'yhs_incomes', id, title, label: 'Pemasukan' })

  return {
    filter, filteredExpenses, filteredIncomes,
    invoiceIncomeTotal, manualIncomeTotal, totalIncome, expenseTotal, netBalance, paymentBreakdown,
    saveExpense, saveIncome, deleteExpense, deleteIncome,
  }
}
