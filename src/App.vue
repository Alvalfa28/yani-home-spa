<script setup>
import { onMounted } from 'vue'
import logoImage from './assets/logo.jpg'
import { useMasterData } from './composables/useMasterData'
import { useNavigation } from './composables/useNavigation'
import AppNavbar from './components/AppNavbar.vue'
import ToastNotification from './components/ToastNotification.vue'
import InvoiceFormView from './components/views/InvoiceFormView.vue'
import CalendarView from './components/views/CalendarView.vue'
import ExpensesView from './components/views/ExpensesView.vue'
import CustomersView from './components/views/CustomersView.vue'
import HistoryView from './components/views/HistoryView.vue'
import DashboardView from './components/views/DashboardView.vue'

const { fetchData } = useMasterData()
const { currentView } = useNavigation()

onMounted(fetchData)
</script>

<template>
  <div class="min-h-screen bg-[#fdfbf7] text-[#3e3529] font-sans p-4 sm:p-6 lg:p-8 overflow-x-hidden w-full">
    <ToastNotification />

    <div class="text-center mb-6 flex flex-col items-center print:hidden">
      <img :src="logoImage" alt="Logo" class="w-20 h-20 rounded-full object-cover shadow-sm border border-[#ebdcc3] mb-3" />
      <h1 class="font-serif text-2xl font-bold tracking-widest uppercase text-[#5a4633]">Yani Home & Spa</h1>
      <p class="text-xs uppercase tracking-widest text-[#8c7355] font-semibold">Invoice System • Rawatan Pantang</p>
    </div>

    <AppNavbar />

    <InvoiceFormView v-if="currentView === 'form'" />
    <CalendarView v-else-if="currentView === 'calendar'" />
    <ExpensesView v-else-if="currentView === 'expenses'" />
    <CustomersView v-else-if="currentView === 'customers'" />
    <HistoryView v-else-if="currentView === 'history'" />
    <DashboardView v-else-if="currentView === 'dashboard'" />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
.font-serif { font-family: 'Playfair Display', serif; }

.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(20px); }

@media print {
  @page { size: portrait; margin: 10mm; }
  body, html { background-color: white !important; height: 100% !important; overflow: hidden !important; }
  body * { visibility: hidden; }
  #invoice-preview, #invoice-preview *, #financial-report-print, #financial-report-print * { visibility: visible; }
  #invoice-preview, #financial-report-print {
    position: absolute; left: 0; top: 0; width: 100% !important; max-height: none !important;
    border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; background: white !important;
  }
}
</style>
