<script setup>
import { formatCurrency } from '../utils/format'

defineProps({
  periodLabel: { type: String, required: true },
  totalIncome: { type: Number, required: true },
  totalExpense: { type: Number, required: true },
  netBalance: { type: Number, required: true },
  breakdown: { type: Object, required: true },
})

const rows = [
  ['cash', 'Cash / Tunai', 'text-[#b48a57]'],
  ['bibd', 'BIBD', 'text-blue-700'],
  ['baiduri', 'Baiduri', 'text-purple-700'],
  ['debit', 'Debit Card', 'text-gray-700'],
  ['belumLunas', 'Belum Lunas', 'text-red-600'],
]
</script>

<template>
  <div id="financial-report-print" class="hidden print:block bg-white text-[#3e3529] p-8 space-y-6 w-full">
    <div class="text-center border-b border-[#ebdcc3] pb-4 mb-4 flex flex-col items-center">
      <h2 class="font-serif text-2xl font-bold uppercase text-[#3e3529]">Yani Home & Spa</h2>
      <p class="text-xs text-[#8c7355]">LAPORAN KECILAN KEUANGAN (FINANCIAL REPORT)</p>
      <p class="text-[11px] text-gray-500 mt-1">Periode: <span class="font-bold">{{ periodLabel }}</span></p>
    </div>

    <div class="grid grid-cols-3 gap-4 border border-[#ebdcc3] p-4 rounded-xl text-xs">
      <div class="text-center">
        <p class="font-bold text-emerald-800 uppercase">Total Pemasukan</p>
        <p class="text-base font-serif font-bold text-emerald-900 mt-1">{{ formatCurrency(totalIncome) }}</p>
      </div>
      <div class="text-center border-x border-[#ebdcc3]">
        <p class="font-bold text-red-800 uppercase">Total Pengeluaran</p>
        <p class="text-base font-serif font-bold text-red-900 mt-1">{{ formatCurrency(totalExpense) }}</p>
      </div>
      <div class="text-center">
        <p class="font-bold text-amber-800 uppercase">Saldo Bersih (Net)</p>
        <p class="text-base font-serif font-bold text-[#b48a57] mt-1">{{ formatCurrency(netBalance) }}</p>
      </div>
    </div>

    <div class="space-y-2">
      <h3 class="font-serif font-bold text-sm text-[#5a4633] uppercase">A. Rincian Status Pembayaran Invois</h3>
      <table class="w-full text-xs text-left border-collapse border border-[#ebdcc3]">
        <thead>
          <tr class="bg-[#f4ecd8] text-[#5a4633]">
            <th class="border border-[#ebdcc3] p-2">Status / Cara Pembayaran</th>
            <th class="border border-[#ebdcc3] p-2 text-center">Jumlah Transaksi</th>
            <th class="border border-[#ebdcc3] p-2 text-right">Total Uang (B$)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="[key, label, color] in rows" :key="key">
            <td class="border border-[#ebdcc3] p-2 font-semibold">{{ label }}</td>
            <td class="border border-[#ebdcc3] p-2 text-center">{{ breakdown[key].count }}x</td>
            <td class="border border-[#ebdcc3] p-2 text-right font-bold" :class="color">{{ formatCurrency(breakdown[key].total) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex justify-between pt-12 text-xs">
      <div class="text-center">
        <p>Disediakan Oleh,</p>
        <div class="h-16"></div>
        <p class="font-bold underline">Pengurusan Yani Home & Spa</p>
      </div>
      <div class="text-center">
        <p>Disahkan Oleh,</p>
        <div class="h-16"></div>
        <p class="font-bold underline">Pengurus Besar</p>
      </div>
    </div>
  </div>
</template>
