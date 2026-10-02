<script setup>
import { computed } from 'vue'
import { useNavigation } from '../composables/useNavigation'
import { useMasterData } from '../composables/useMasterData'

const { currentView, goTo } = useNavigation()
const { bookingList, expenseList, incomeList, allCustomers, invoiceHistory } = useMasterData()

const items = computed(() => [
  { key: 'form', label: '📝 Buat / Edit Invois', active: 'bg-[#b48a57] text-white' },
  { key: 'calendar', label: `📅 Kalendar (${bookingList.value.filter((b) => b.status === 'Terjadwal').length})`, active: 'bg-[#2d7a4f] text-white' },
  { key: 'expenses', label: `💸 Keuangan (${expenseList.value.length + incomeList.value.length})`, active: 'bg-[#8c4343] text-white' },
  { key: 'customers', label: `👥 Pelanggan (${allCustomers.value.length})`, active: 'bg-[#2d7a4f] text-white' },
  { key: 'history', label: `📜 Riwayat Invois (${invoiceHistory.value.length})`, active: 'bg-[#3b5998] text-white' },
  { key: 'dashboard', label: '📊 Dashboard', active: 'bg-[#725c43] text-white' },
])
</script>

<template>
  <div class="max-w-7xl mx-auto mb-8 flex flex-wrap justify-center gap-2 print:hidden">
    <button v-for="item in items" :key="item.key" type="button" @click="goTo(item.key)"
            class="px-4 py-2 text-xs font-bold rounded-xl shadow transition-all flex items-center gap-2"
            :class="currentView === item.key ? item.active : 'bg-white text-[#5a4633] border border-[#ebdcc3] hover:bg-[#f4ecd8]'">
      {{ item.label }}
    </button>
  </div>
</template>
