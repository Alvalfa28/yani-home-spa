import { computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useMasterData } from './useMasterData'
import { useToast } from './useToast'
import { usePeriodFilter } from './usePeriodFilter'
import { categorizePayment } from '../utils/payment'
import { effectivePaid, remainingOf, round2 } from '../utils/receivable'
import { looksLikeMissingColumn, friendlyDbError, MIGRATION_HINT } from '../utils/db'
import { DEFAULT_SOURCES, NO_SOURCE, SOURCE_BY_PAYMENT } from '../utils/constants'

const sum = (rows, key) => rows.reduce((acc, row) => acc + (Number(row[key]) || 0), 0)

/** Tampilan Keuangan: pemasukan/pengeluaran, DP & pelunasan, saldo per sumber uang, dan CRUD catatan manual. */
export function useFinance() {
  const { invoiceHistory, expenseList, incomeList, fetchData } = useMasterData()
  const { showToast } = useToast()
  const { filter, matches } = usePeriodFilter()

  const filteredExpenses = computed(() => expenseList.value.filter((e) => matches(e.expense_date)))
  const filteredIncomes = computed(() => incomeList.value.filter((i) => matches(i.income_date)))
  const periodInvoices = computed(() => invoiceHistory.value.filter((i) => matches(i.invoice_date)))

  // Pemasukan dari invois = uang yang benar-benar diterima (lunas atau DP), bukan total tagihan.
  const invoiceIncomeTotal = computed(() => round2(periodInvoices.value.reduce((acc, inv) => acc + effectivePaid(inv), 0)))
  const manualIncomeTotal = computed(() => sum(filteredIncomes.value, 'amount'))
  const totalIncome = computed(() => invoiceIncomeTotal.value + manualIncomeTotal.value)
  const expenseTotal = computed(() => sum(filteredExpenses.value, 'amount'))
  const netBalance = computed(() => totalIncome.value - expenseTotal.value)

  const remainingFor = (inv, excludeIncomeId = null) => remainingOf(inv, incomeList.value, excludeIncomeId)

  // Tagihan yang belum lunas (semua periode, karena tetap ditagih sampai dibayar).
  const outstandingInvoices = computed(() =>
    invoiceHistory.value
      .map((inv) => ({ inv, remaining: remainingFor(inv) }))
      .filter((row) => row.remaining > 0)
      .sort((a, b) => String(a.inv.invoice_date).localeCompare(String(b.inv.invoice_date))),
  )
  const outstandingTotal = computed(() => round2(outstandingInvoices.value.reduce((acc, r) => acc + r.remaining, 0)))

  // Rincian per cara bayar. Cash/BIBD/... = uang yang sudah diterima; "Belum Lunas" = sisa tagihan.
  const paymentBreakdown = computed(() => {
    const result = {
      cash: { total: 0, count: 0 },
      bibd: { total: 0, count: 0 },
      baiduri: { total: 0, count: 0 },
      debit: { total: 0, count: 0 },
      belumLunas: { total: 0, count: 0 },
    }
    periodInvoices.value.forEach((inv) => {
      const paid = effectivePaid(inv)
      const cat = categorizePayment(inv.payment_method)
      if (paid > 0 && cat !== 'belumLunas') {
        result[cat].total += paid
        result[cat].count += 1
      }
      const remaining = remainingFor(inv)
      if (remaining > 0) {
        result.belumLunas.total += remaining
        result.belumLunas.count += 1
      }
    })
    return result
  })

  // Saldo per sumber uang: invois masuk ke sumber sesuai cara bayar; catatan manual memakai kolom `source`.
  const sourceBalances = computed(() => {
    const map = {}
    const add = (name, key, amount) => {
      const k = (name || '').trim() || NO_SOURCE
      ;(map[k] ||= { income: 0, expense: 0 })[key] += amount
    }
    periodInvoices.value.forEach((inv) => {
      const paid = effectivePaid(inv)
      const cat = categorizePayment(inv.payment_method)
      if (paid > 0 && cat !== 'belumLunas') add(SOURCE_BY_PAYMENT[cat], 'income', paid)
    })
    filteredIncomes.value.forEach((i) => add(i.source, 'income', Number(i.amount) || 0))
    filteredExpenses.value.forEach((e) => add(e.source, 'expense', Number(e.amount) || 0))

    return Object.entries(map)
      .map(([name, v]) => ({ name, income: v.income, expense: v.expense, balance: v.income - v.expense }))
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  const sourceSuggestions = computed(() => [
    ...new Set([
      ...DEFAULT_SOURCES,
      ...incomeList.value.map((i) => (i.source || '').trim()),
      ...expenseList.value.map((e) => (e.source || '').trim()),
    ].filter(Boolean)),
  ])

  // ---- Sinkron status invois setelah pelunasan dicatat/diubah/dihapus ----
  const syncInvoiceStatus = async (invoiceId) => {
    const inv = invoiceHistory.value.find((i) => String(i.id) === String(invoiceId))
    if (!inv) return
    const wanted = remainingFor(inv) > 0 ? 'Pending' : 'Full Payment'
    if (inv.payment_status === wanted) return
    await supabase.from('yhs_invoices').update({ payment_status: wanted }).eq('id', inv.id)
    await fetchData()
  }

  // ---- CRUD ----
  const saveRecord = async ({ table, form, editingId, label, dateKey, extra = {} }) => {
    if (!form.title.trim() || !(Number(form.amount) > 0)) {
      showToast(`Mohon isi Keterangan dan Jumlah ${label} yang sah.`, 'error')
      return false
    }
    try {
      const base = {
        title: form.title.trim(),
        amount: Number(form.amount),
        [dateKey]: form[dateKey],
        category: form.category,
        notes: (form.notes || '').trim(),
      }
      const optional = { source: (form.source || '').trim() || null }

      const write = (record) =>
        editingId
          ? supabase.from(table).update(record).eq('id', editingId)
          : supabase.from(table).insert([record])

      let { error } = await write({ ...base, ...optional, ...extra })
      let droppedSource = false
      if (error && looksLikeMissingColumn(error)) {
        // Tautan ke invois tidak boleh hilang diam-diam; sumber uang boleh ditunda sampai migrasi.
        if (Object.keys(extra).length) throw new Error(`${error.message}. ${MIGRATION_HINT}`)
        const retry = await write(base)
        error = retry.error
        droppedSource = !retry.error
      }
      if (error) throw error

      showToast(
        droppedSource
          ? `⚠️ ${label} tersimpan, tetapi sumber uang belum bisa disimpan. ${MIGRATION_HINT}`
          : `${label} berhasil ${editingId ? 'diperbarui' : 'dicatat'}!`,
        droppedSource ? 'error' : 'success',
      )
      await fetchData()
      if (extra.invoice_id) await syncInvoiceStatus(extra.invoice_id)
      return true
    } catch (err) {
      showToast(`Gagal menyimpan ${label.toLowerCase()}: ${friendlyDbError(err)}`, 'error')
      return false
    }
  }

  const deleteRecord = async ({ table, id, title, label, invoiceId = null }) => {
    if (!confirm(`Adakah anda pasti ingin memadam rekod ${label.toLowerCase()} "${title}"?`)) return
    try {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
      showToast(`${label} "${title}" berhasil dipadam!`)
      await fetchData()
      if (invoiceId) await syncInvoiceStatus(invoiceId)
    } catch (err) {
      showToast(`Gagal memadam ${label.toLowerCase()}: ${err.message}`, 'error')
    }
  }

  const saveExpense = (form, editingId) =>
    saveRecord({ table: 'yhs_expenses', form, editingId, label: 'Pengeluaran', dateKey: 'expense_date' })

  const saveIncome = (form, editingId) => {
    const extra = {}
    if (form.invoice_id) {
      const inv = invoiceHistory.value.find((i) => String(i.id) === String(form.invoice_id))
      if (!inv) {
        showToast('Invois yang dipilih tidak ditemukan.', 'error')
        return false
      }
      const remaining = remainingFor(inv, editingId)
      if (Number(form.amount) > remaining + 0.005) {
        showToast(`Jumlah melebihi sisa tagihan invois ini (sisa ${remaining.toFixed(2)}).`, 'error')
        return false
      }
      extra.invoice_id = String(inv.id)
    }
    return saveRecord({ table: 'yhs_incomes', form, editingId, label: 'Pemasukan', dateKey: 'income_date', extra })
  }

  const deleteExpense = (id, title) => deleteRecord({ table: 'yhs_expenses', id, title, label: 'Pengeluaran' })
  const deleteIncome = (inc) =>
    deleteRecord({ table: 'yhs_incomes', id: inc.id, title: inc.title, label: 'Pemasukan', invoiceId: inc.invoice_id })

  return {
    filter, filteredExpenses, filteredIncomes,
    invoiceIncomeTotal, manualIncomeTotal, totalIncome, expenseTotal, netBalance,
    outstandingInvoices, outstandingTotal, remainingFor,
    paymentBreakdown, sourceBalances, sourceSuggestions,
    saveExpense, saveIncome, deleteExpense, deleteIncome,
  }
}
