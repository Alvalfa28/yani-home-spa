import { computed } from 'vue'
import { useMasterData } from './useMasterData'
import { usePeriodFilter } from './usePeriodFilter'
import { parseLocalDate } from '../utils/period'
import { NO_THERAPIST, THERAPIST_BONUS_RATE } from '../utils/constants'

const DAY_LABELS = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Khamis', 5: 'Jumaat', 6: 'Sabtu', 0: 'Ahad' }
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function useDashboard() {
  const { invoiceHistory } = useMasterData()
  const { filter, matches } = usePeriodFilter()

  const invoices = computed(() => invoiceHistory.value.filter((inv) => matches(inv.invoice_date)))

  const invoiceCount = computed(() => invoices.value.length)
  const totalAmount = computed(() => invoices.value.reduce((acc, inv) => acc + (Number(inv.total_amount) || 0), 0))
  const averageAmount = computed(() => (invoiceCount.value === 0 ? 0 : totalAmount.value / invoiceCount.value))

  const popularServices = computed(() => {
    const counts = {}
    invoices.value.forEach((inv) => {
      if (!Array.isArray(inv.treatments)) return
      inv.treatments.forEach((t) => {
        const name = t.name || 'Lainnya'
        counts[name] = (counts[name] || 0) + (Number(t.qty) || 1)
      })
    })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    const max = sorted.length ? sorted[0][1] : 1
    return sorted.map(([name, count]) => ({ name, count, percentage: Math.round((count / max) * 100) }))
  })

  const therapistStats = computed(() => {
    const data = {}
    invoices.value.forEach((inv) => {
      const name = inv.therapist || NO_THERAPIST
      data[name] ||= { count: 0, revenue: 0 }
      data[name].count += 1
      data[name].revenue += Number(inv.total_amount) || 0
    })
    const sorted = Object.entries(data).sort((a, b) => b[1].count - a[1].count)
    const max = sorted.length ? sorted[0][1].count : 1
    return sorted.map(([name, d]) => ({
      name,
      count: d.count,
      revenue: d.revenue,
      bonus: d.revenue * THERAPIST_BONUS_RATE,
      percentage: Math.round((d.count / max) * 100),
    }))
  })

  const revenueByDay = computed(() => {
    const totals = Object.fromEntries(DAY_ORDER.map((k) => [k, 0]))
    invoices.value.forEach((inv) => {
      if (!inv.invoice_date) return
      totals[parseLocalDate(inv.invoice_date).getDay()] += Number(inv.total_amount) || 0
    })
    const rows = DAY_ORDER.map((k) => ({ day: DAY_LABELS[k], total: totals[k] }))
    const max = Math.max(...rows.map((r) => r.total), 1)
    return rows.map((r) => ({ ...r, percentage: Math.round((r.total / max) * 100) }))
  })

  return { filter, invoiceCount, totalAmount, averageAmount, popularServices, therapistStats, revenueByDay }
}
