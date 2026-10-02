<script setup>
import { useDashboard } from '../../composables/useDashboard'
import { useNavigation } from '../../composables/useNavigation'
import { formatCurrency } from '../../utils/format'
import PeriodFilter from '../PeriodFilter.vue'

const { goTo } = useNavigation()
const { filter, invoiceCount, totalAmount, averageAmount, popularServices, therapistStats, revenueByDay } = useDashboard()
</script>

<template>
  <div class="max-w-4xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-[#ebdcc3] space-y-6 print:hidden">

    <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#f4ecd8] pb-4 gap-4">
      <div>
        <h3 class="font-serif text-xl font-bold text-[#5a4633]">📊 Dashboard Statistik & Analitik</h3>
        <p class="text-xs text-[#8c7355]">Analisis mendalam laporan harian, mingguan, bulanan, tahunan, atau semua</p>
      </div>
      <button type="button" @click="goTo('form')" class="text-xs font-bold bg-[#3e3529] text-white px-4 py-2 rounded-xl shadow">Kembali ke Form</button>
    </div>

    <PeriodFilter :filter="filter" accent="bg-[#b48a57]">Menampilkan data terpilih</PeriodFilter>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="p-4 rounded-xl bg-[#fdfbf7] border border-[#ebdcc3] text-center space-y-1">
        <p class="text-xs font-bold text-[#8c7355] uppercase">📋 Total Invois</p>
        <p class="text-2xl font-serif font-bold text-[#5a4633]">{{ invoiceCount }}</p>
        <p class="text-[10px] text-gray-500">Jumlah transaksi</p>
      </div>
      <div class="p-4 rounded-xl bg-[#fdfbf7] border border-[#ebdcc3] text-center space-y-1">
        <p class="text-xs font-bold text-[#8c7355] uppercase">💰 Total Pendapatan</p>
        <p class="text-2xl font-serif font-bold text-[#b48a57]">{{ formatCurrency(totalAmount) }}</p>
        <p class="text-[10px] text-gray-500">Akumulasi pendapatan (termasuk belum lunas)</p>
      </div>
      <div class="p-4 rounded-xl bg-[#fdfbf7] border border-[#ebdcc3] text-center space-y-1">
        <p class="text-xs font-bold text-[#8c7355] uppercase">📈 Rata-rata Invois</p>
        <p class="text-2xl font-serif font-bold text-[#3e3529]">{{ formatCurrency(averageAmount) }}</p>
        <p class="text-[10px] text-gray-500">Per transaksi rata-rata</p>
      </div>
    </div>

    <div class="p-5 rounded-2xl bg-[#fffdfa] border border-[#ebdcc3] space-y-4">
      <div class="flex justify-between items-center">
        <h4 class="font-serif text-sm font-bold text-[#5a4633]">🔥 Grafik Perkhidmatan Paling Populer</h4>
        <span class="text-[10px] font-bold text-[#8c7355] uppercase">Berdasarkan Qty Terjual</span>
      </div>
      <div v-if="popularServices.length === 0" class="text-xs text-gray-500 text-center py-4">Belum ada data layanan pada periode ini.</div>
      <div v-else class="space-y-3">
        <div v-for="serv in popularServices" :key="serv.name" class="space-y-1">
          <div class="flex justify-between text-xs font-semibold text-[#3e3529]">
            <span>{{ serv.name }}</span>
            <span class="text-[#b48a57] font-bold">{{ serv.count }}x dipesan</span>
          </div>
          <div class="w-full bg-[#f4ecd8] h-3 rounded-full overflow-hidden">
            <div class="bg-[#b48a57] h-full rounded-full transition-all duration-500" :style="{ width: serv.percentage + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Statistik ini sudah dihitung di kode lama tetapi belum pernah ditampilkan -->
    <div class="p-5 rounded-2xl bg-[#fffdfa] border border-[#ebdcc3] space-y-4">
      <div class="flex justify-between items-center">
        <h4 class="font-serif text-sm font-bold text-[#5a4633]">👩‍⚕️ Performa Terapis</h4>
        <span class="text-[10px] font-bold text-[#8c7355] uppercase">Bonus 10% dari pendapatan</span>
      </div>
      <div v-if="therapistStats.length === 0" class="text-xs text-gray-500 text-center py-4">Belum ada data terapis pada periode ini.</div>
      <div v-else class="space-y-3">
        <div v-for="t in therapistStats" :key="t.name" class="space-y-1">
          <div class="flex justify-between text-xs font-semibold text-[#3e3529]">
            <span>{{ t.name }} · {{ t.count }} invois</span>
            <span class="text-[#b48a57] font-bold">{{ formatCurrency(t.revenue) }} · bonus {{ formatCurrency(t.bonus) }}</span>
          </div>
          <div class="w-full bg-[#f4ecd8] h-3 rounded-full overflow-hidden">
            <div class="bg-[#2d7a4f] h-full rounded-full transition-all duration-500" :style="{ width: t.percentage + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="p-5 rounded-2xl bg-[#fffdfa] border border-[#ebdcc3] space-y-4">
      <h4 class="font-serif text-sm font-bold text-[#5a4633]">📅 Pendapatan per Hari</h4>
      <div class="space-y-3">
        <div v-for="d in revenueByDay" :key="d.day" class="space-y-1">
          <div class="flex justify-between text-xs font-semibold text-[#3e3529]">
            <span>{{ d.day }}</span>
            <span class="text-[#b48a57] font-bold">{{ formatCurrency(d.total) }}</span>
          </div>
          <div class="w-full bg-[#f4ecd8] h-3 rounded-full overflow-hidden">
            <div class="bg-[#725c43] h-full rounded-full transition-all duration-500" :style="{ width: d.percentage + '%' }"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
