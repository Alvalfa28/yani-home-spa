<script setup>
import { ref } from 'vue'
import { usePersonalExpenses } from '../../composables/usePersonalExpenses'
import { useMasterData } from '../../composables/useMasterData'
import { useNavigation } from '../../composables/useNavigation'
import { PERSONAL_CATEGORIES, DEFAULT_SOURCES } from '../../utils/constants'
import { todayISO } from '../../utils/period'
import { formatCurrency } from '../../utils/format'
import PeriodFilter from '../PeriodFilter.vue'
import FinanceRecordForm from '../FinanceRecordForm.vue'

const { goTo } = useNavigation()
const { personalAvailable } = useMasterData()
const { filter, filtered, total, byCategory, bySource, sourceSuggestions, saveExpense, deleteExpense } = usePersonalExpenses()

const blank = () => ({ title: '', amount: 0, expense_date: todayISO(), category: PERSONAL_CATEGORIES[0], source: DEFAULT_SOURCES[0], notes: '' })
const showForm = ref(false)
const editingId = ref(null)
const form = ref(blank())

const openNew = () => { editingId.value = null; form.value = blank(); showForm.value = true }
const openEdit = (exp) => {
  editingId.value = exp.id
  form.value = {
    title: exp.title, amount: exp.amount, expense_date: exp.expense_date,
    category: exp.category || PERSONAL_CATEGORIES[0], source: exp.source || '', notes: exp.notes || '',
  }
  showForm.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
const close = () => { showForm.value = false; editingId.value = null }
const submit = async () => { if (await saveExpense(form.value, editingId.value)) close() }
</script>

<template>
  <div class="max-w-4xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-[#ded3ec] space-y-6 print:hidden">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#eee8f5] pb-4 gap-4">
      <div>
        <h3 class="font-serif text-xl font-bold text-[#4b3569]">🧾 Pengeluaran Pribadi</h3>
        <p class="text-xs text-[#7d6a96]">Catatan terpisah dari Yani Home & Spa: tidak masuk pemasukan, pengeluaran, atau saldo usaha.</p>
      </div>
      <div class="flex items-center gap-2">
        <button v-if="personalAvailable" type="button" @click="openNew" class="text-xs font-bold bg-[#6a4c93] text-white px-4 py-2.5 rounded-xl shadow hover:bg-[#573d7a]">+ Pengeluaran Pribadi</button>
        <button type="button" @click="goTo('form')" class="text-xs font-bold bg-[#3e3529] text-white px-4 py-2.5 rounded-xl shadow">Kembali</button>
      </div>
    </div>

    <p v-if="!personalAvailable" class="text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-xl p-4">
      Tabel <code>personal_expenses</code> belum ada di database. Jalankan <code>sql/migrations-v2.sql</code> di Supabase SQL Editor, lalu muat ulang halaman.
    </p>

    <template v-else>
      <FinanceRecordForm v-if="showForm" kind="personal" :form="form" :categories="PERSONAL_CATEGORIES" :sources="sourceSuggestions"
                         :editing="!!editingId" @save="submit" @cancel="close" />

      <PeriodFilter :filter="filter" accent="bg-[#6a4c93]">{{ filtered.length }} rekod pada periode ini</PeriodFilter>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="p-5 rounded-2xl bg-[#f6f2fb] border border-[#ded3ec] text-center space-y-1">
          <p class="text-xs font-bold text-[#4b3569] uppercase tracking-wider">Total Pengeluaran Pribadi</p>
          <p class="text-2xl font-serif font-bold text-[#4b3569]">{{ formatCurrency(total) }}</p>
        </div>
        <div class="p-5 rounded-2xl bg-[#f6f2fb] border border-[#ded3ec] text-center space-y-1">
          <p class="text-xs font-bold text-[#4b3569] uppercase tracking-wider">Jumlah Transaksi</p>
          <p class="text-2xl font-serif font-bold text-[#4b3569]">{{ filtered.length }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-5 rounded-2xl bg-[#fdfcff] border border-[#ded3ec] space-y-3">
          <h4 class="font-serif text-sm font-bold text-[#4b3569]">Per Kategori</h4>
          <p v-if="byCategory.length === 0" class="text-xs text-gray-500 italic">Belum ada data.</p>
          <div v-for="c in byCategory" :key="c.name" class="space-y-1">
            <div class="flex justify-between text-xs font-semibold text-[#3e3529]"><span>{{ c.name }} ({{ c.count }})</span><span>{{ formatCurrency(c.total) }}</span></div>
            <div class="w-full bg-[#eee8f5] h-2.5 rounded-full overflow-hidden"><div class="bg-[#6a4c93] h-full rounded-full" :style="{ width: c.percentage + '%' }"></div></div>
          </div>
        </div>
        <div class="p-5 rounded-2xl bg-[#fdfcff] border border-[#ded3ec] space-y-3">
          <h4 class="font-serif text-sm font-bold text-[#4b3569]">Per Sumber Uang</h4>
          <p v-if="bySource.length === 0" class="text-xs text-gray-500 italic">Belum ada data.</p>
          <div v-for="s in bySource" :key="s.name" class="space-y-1">
            <div class="flex justify-between text-xs font-semibold text-[#3e3529]"><span>{{ s.name }} ({{ s.count }})</span><span>{{ formatCurrency(s.total) }}</span></div>
            <div class="w-full bg-[#eee8f5] h-2.5 rounded-full overflow-hidden"><div class="bg-[#9b7fc4] h-full rounded-full" :style="{ width: s.percentage + '%' }"></div></div>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <div v-if="filtered.length === 0" class="text-center py-8 text-gray-500 text-xs italic">Belum ada pengeluaran pribadi pada periode ini.</div>
        <div v-else class="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
          <div v-for="exp in filtered" :key="exp.id" class="p-4 rounded-xl border border-[#ded3ec] bg-white text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
            <div class="space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="px-2 py-0.5 bg-[#eee8f5] text-[#4b3569] rounded font-bold text-[10px]">{{ exp.category }}</span>
                <span v-if="exp.source" class="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-bold text-[10px]">🏦 {{ exp.source }}</span>
                <span class="font-bold text-gray-500">📅 {{ exp.expense_date }}</span>
              </div>
              <p class="font-serif font-bold text-sm text-[#4b3569]">{{ exp.title }}</p>
              <p v-if="exp.notes" class="text-gray-500 italic">Catatan: "{{ exp.notes }}"</p>
            </div>
            <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
              <span class="font-serif font-bold text-base text-[#6a4c93]">- {{ formatCurrency(exp.amount) }}</span>
              <div class="flex gap-1.5">
                <button type="button" @click="openEdit(exp)" class="px-2.5 py-1.5 bg-[#3b5998] text-white rounded-lg font-bold text-[10px] shadow">✏️ Edit</button>
                <button type="button" @click="deleteExpense(exp.id, exp.title)" class="px-2.5 py-1.5 bg-red-600 text-white rounded-lg font-bold text-[10px] shadow hover:bg-red-700">🗑️ Hapus</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
