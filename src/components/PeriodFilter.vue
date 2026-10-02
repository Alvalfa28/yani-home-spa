<script setup>
import { MONTH_NAMES } from '../utils/constants'
import { weeksInYear, yearOptions } from '../utils/period'

defineProps({
  filter: { type: Object, required: true },
  accent: { type: String, default: 'bg-[#b48a57]' },
})

const years = yearOptions()
const tabs = [
  ['harian', '📅 Harian'],
  ['mingguan', '📆 Mingguan'],
  ['bulanan', '🗓️ Bulanan'],
  ['tahunan', '📈 Tahunan'],
  ['semua', '🌐 Semua'],
]
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap justify-center gap-2 bg-[#fdfbf7] p-2 rounded-2xl border border-[#ebdcc3]">
      <button v-for="[key, label] in tabs" :key="key" type="button" @click="filter.period = key"
              class="px-4 py-2 text-xs font-bold rounded-xl transition-all"
              :class="filter.period === key ? accent + ' text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">
        {{ label }}
      </button>
    </div>

    <div v-if="filter.period !== 'semua'"
         class="p-4 rounded-xl bg-[#fffdfa] border border-[#ebdcc3] flex flex-wrap items-center justify-between gap-4 text-xs">
      <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
        <template v-if="filter.period === 'harian'">
          <span class="font-bold text-[#5a4633]">Pilih Tarikh:</span>
          <input v-model="filter.date" type="date" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
        </template>

        <template v-if="filter.period === 'mingguan'">
          <span class="font-bold text-[#5a4633]">Minggu Ke:</span>
          <select v-model.number="filter.weekNum" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
            <option v-for="w in weeksInYear(filter.weekYear)" :key="w" :value="w">Minggu ke-{{ w }}</option>
          </select>
          <span class="font-bold text-[#5a4633]">Tahun:</span>
          <select v-model.number="filter.weekYear" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </template>

        <template v-if="filter.period === 'bulanan'">
          <span class="font-bold text-[#5a4633]">Bulan:</span>
          <select v-model.number="filter.month" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
            <option v-for="(name, i) in MONTH_NAMES" :key="i" :value="i + 1">{{ name }}</option>
          </select>
          <span class="font-bold text-[#5a4633]">Tahun:</span>
          <select v-model.number="filter.monthYear" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </template>

        <template v-if="filter.period === 'tahunan'">
          <span class="font-bold text-[#5a4633]">Pilih Tahun:</span>
          <select v-model.number="filter.yearAnnual" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </template>
      </div>

      <span class="text-gray-500 italic"><slot>Menampilkan data periode terpilih</slot></span>
    </div>
  </div>
</template>
