<script setup>
import { computed } from 'vue'
import { useMasterData } from '../../composables/useMasterData'
import { usePeriodFilter } from '../../composables/usePeriodFilter'
import { useNavigation } from '../../composables/useNavigation'
import { formatCurrency } from '../../utils/format'
import PeriodFilter from '../PeriodFilter.vue'

const { goTo } = useNavigation()
const { allCustomers, invoiceHistory } = useMasterData()
const { filter, matches } = usePeriodFilter()

const keyOf = (name) => (name || '').trim().toLowerCase()

const groupedCustomers = computed(() => {
  // Statistik kunjungan per pelanggan pada periode terpilih (nama dicocokkan tanpa peduli huruf besar/kecil).
  const stats = {}
  invoiceHistory.value.filter((inv) => matches(inv.invoice_date)).forEach((inv) => {
    const key = keyOf(inv.customer_name)
    stats[key] ||= { count: 0, total: 0, lastDate: inv.invoice_date || '-' }
    stats[key].count += 1
    stats[key].total += Number(inv.total_amount) || 0
    if (inv.invoice_date && inv.invoice_date > stats[key].lastDate) stats[key].lastDate = inv.invoice_date
  })

  const rows = allCustomers.value
    .filter((c) => filter.period === 'semua' || stats[keyOf(c.name)])
    .map((c) => {
      const s = stats[keyOf(c.name)] || { count: 0, total: 0, lastDate: '-' }
      return { ...c, visitCount: s.count, totalSpent: s.total, lastVisit: s.lastDate }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const groups = {}
  rows.forEach((cust) => {
    const letter = cust.name.charAt(0).toUpperCase() || '#'
    ;(groups[letter] ||= []).push(cust)
  })
  return groups
})
</script>

<template>
  <div class="max-w-4xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-[#ebdcc3] space-y-6 print:hidden">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#f4ecd8] pb-4 gap-4">
      <div>
        <h3 class="font-serif text-xl font-bold text-[#5a4633]">👥 Rekod Daftar Pelanggan Berdasarkan Periode</h3>
        <p class="text-xs text-[#8c7355]">Pantau daftar kunjungan dan total belanja pelanggan per harian, mingguan, bulanan, tahunan, atau semua</p>
      </div>
      <button type="button" @click="goTo('form')" class="text-xs font-bold bg-[#b48a57] text-white px-4 py-2.5 rounded-xl shadow">Kembali ke Form</button>
    </div>

    <PeriodFilter :filter="filter" accent="bg-[#2d7a4f]">Menampilkan pelanggan yang aktif pada periode ini</PeriodFilter>

    <div v-if="Object.keys(groupedCustomers).length === 0" class="text-center py-10 text-gray-500 text-xs italic">
      Tiada rekod kunjungan pelanggan pada periode ini.
    </div>

    <div v-else class="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      <div v-for="(group, letter) in groupedCustomers" :key="letter" class="space-y-2">
        <div class="font-serif font-bold text-sm text-[#2d7a4f] border-b border-[#ebdcc3] pb-1 sticky top-0 bg-white z-10">{{ letter }}</div>
        <div v-for="cust in group" :key="cust.id" class="p-4 rounded-xl border border-[#ebdcc3] bg-[#fffdfa] text-xs space-y-1 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <p class="font-bold text-[#5a4633] text-sm">{{ cust.name }}</p>
            <p class="text-gray-600">📞 {{ cust.phone || '–' }} · 📍 {{ cust.address || '–' }}</p>
            <p class="text-gray-400 text-[11px]">📅 Kunjungan Terakhir: {{ cust.lastVisit }}</p>
          </div>
          <div class="text-right">
            <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">{{ cust.visitCount }}x Kunjungan</span>
            <p class="font-serif font-bold text-sm text-[#b48a57] mt-1">{{ formatCurrency(cust.totalSpent) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
