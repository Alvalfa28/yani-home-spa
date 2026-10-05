import { computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useMasterData } from './useMasterData'
import { useToast } from './useToast'
import { usePeriodFilter } from './usePeriodFilter'
import { looksLikeMissingColumn, friendlyDbError } from '../utils/db'
import { DEFAULT_SOURCES, NO_SOURCE } from '../utils/constants'

/** Pengeluaran pribadi: tabel sendiri (personal_expenses), tidak masuk laporan Yani Home & Spa. */
export function usePersonalExpenses() {
  const { personalExpenseList, fetchData } = useMasterData()
  const { showToast } = useToast()
  const { filter, matches } = usePeriodFilter()

  const filtered = computed(() =>
    personalExpenseList.value
      .filter((e) => matches(e.expense_date))
      .slice()
      .sort((a, b) =>
        String(b.expense_date).localeCompare(String(a.expense_date)) ||
        String(b.created_at || '').localeCompare(String(a.created_at || '')),
      ),
  )

  const total = computed(() => filtered.value.reduce((acc, e) => acc + (Number(e.amount) || 0), 0))

  const groupBy = (keyFn) => {
    const groups = {}
    filtered.value.forEach((e) => {
      const k = keyFn(e)
      groups[k] ||= { total: 0, count: 0 }
      groups[k].total += Number(e.amount) || 0
      groups[k].count += 1
    })
    const rows = Object.entries(groups).sort((a, b) => b[1].total - a[1].total)
    const max = rows.length ? rows[0][1].total : 1
    return rows.map(([name, g]) => ({ name, total: g.total, count: g.count, percentage: Math.round((g.total / max) * 100) }))
  }

  const byCategory = computed(() => groupBy((e) => e.category || 'Lain-lain'))
  const bySource = computed(() => groupBy((e) => (e.source || '').trim() || NO_SOURCE))

  const sourceSuggestions = computed(() => [
    ...new Set([...DEFAULT_SOURCES, ...personalExpenseList.value.map((e) => (e.source || '').trim())].filter(Boolean)),
  ])

  const saveExpense = async (form, editingId) => {
    if (!form.title.trim() || !(Number(form.amount) > 0)) {
      showToast('Mohon isi Keterangan dan Jumlah Pengeluaran Pribadi yang sah.', 'error')
      return false
    }
    try {
      const base = {
        title: form.title.trim(),
        amount: Number(form.amount),
        expense_date: form.expense_date,
        category: form.category,
        notes: (form.notes || '').trim(),
      }
      const record = { ...base, source: (form.source || '').trim() || null }
      const write = (r) =>
        editingId
          ? supabase.from('personal_expenses').update(r).eq('id', editingId)
          : supabase.from('personal_expenses').insert([r])

      let { error } = await write(record)
      if (error && looksLikeMissingColumn(error)) ({ error } = await write(base))
      if (error) throw error

      showToast(`🧾 Pengeluaran pribadi berhasil ${editingId ? 'diperbarui' : 'dicatat'}!`)
      await fetchData()
      return true
    } catch (err) {
      showToast('Gagal menyimpan pengeluaran pribadi: ' + friendlyDbError(err), 'error')
      return false
    }
  }

  const deleteExpense = async (id, title) => {
    if (!confirm(`Adakah anda pasti ingin memadam pengeluaran pribadi "${title}"?`)) return
    try {
      const { error } = await supabase.from('personal_expenses').delete().eq('id', id)
      if (error) throw error
      showToast(`Pengeluaran pribadi "${title}" berhasil dipadam!`)
      await fetchData()
    } catch (err) {
      showToast('Gagal memadam pengeluaran pribadi: ' + err.message, 'error')
    }
  }

  return { filter, filtered, total, byCategory, bySource, sourceSuggestions, saveExpense, deleteExpense }
}
