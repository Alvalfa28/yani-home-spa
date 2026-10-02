<script setup>
import { ref, computed } from 'vue'
import { useFinance } from '../../composables/useFinance'
import { useMasterData } from '../../composables/useMasterData'
import { useNavigation } from '../../composables/useNavigation'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../utils/constants'
import { describePeriod, todayISO } from '../../utils/period'
import { formatCurrency } from '../../utils/format'
import PeriodFilter from '../PeriodFilter.vue'
import FinanceRecordForm from '../FinanceRecordForm.vue'
import FinancialReportPrint from '../FinancialReportPrint.vue'

const { goTo } = useNavigation()
const { incomesAvailable } = useMasterData()
const {
  filter, filteredExpenses, filteredIncomes, invoiceIncomeTotal, totalIncome, expenseTotal, netBalance,
  paymentBreakdown, saveExpense, saveIncome, deleteExpense, deleteIncome,
} = useFinance()

const periodLabel = computed(() => describePeriod(filter))
const printReport = () => window.print()

// ---- Form pengeluaran ----
const blankExpense = () => ({ title: '', amount: 0, expense_date: todayISO(), category: EXPENSE_CATEGORIES[0], notes: '' })
const showExpenseForm = ref(false)
const editingExpenseId = ref(null)
const expenseForm = ref(blankExpense())

const openNewExpense = () => {
  editingExpenseId.value = null
  expenseForm.value = blankExpense()
  showExpenseForm.value = true
}
const openEditExpense = (exp) => {
  editingExpenseId.value = exp.id
  expenseForm.value = {
    title: exp.title,
    amount: exp.amount,
    expense_date: exp.expense_date,
    category: exp.category || EXPENSE_CATEGORIES[0],
    notes: exp.notes || '',
  }
  showExpenseForm.value = true
}
const closeExpenseForm = () => {
  showExpenseForm.value = false
  editingExpenseId.value = null
}
const submitExpense = async () => {
  if (await saveExpense(expenseForm.value, editingExpenseId.value)) closeExpenseForm()
}

// ---- Form pemasukan manual ----
const blankIncome = () => ({ title: '', amount: 0, income_date: todayISO(), category: INCOME_CATEGORIES[0], notes: '' })
const showIncomeForm = ref(false)
const editingIncomeId = ref(null)
const incomeForm = ref(blankIncome())

const openNewIncome = () => {
  editingIncomeId.value = null
  incomeForm.value = blankIncome()
  showIncomeForm.value = true
}
const openEditIncome = (inc) => {
  editingIncomeId.value = inc.id
  incomeForm.value = {
    title: inc.title,
    amount: inc.amount,
    income_date: inc.income_date,
    category: inc.category || INCOME_CATEGORIES[0],
    notes: inc.notes || '',
  }
  showIncomeForm.value = true
}
const closeIncomeForm = () => {
  showIncomeForm.value = false
  editingIncomeId.value = null
}
const submitIncome = async () => {
  if (await saveIncome(incomeForm.value, editingIncomeId.value)) closeIncomeForm()
}

// ---- Kartu rincian pembayaran ----
const breakdownCards = [
  { key: 'cash', label: '💵 Cash / Tunai', box: 'bg-white border-[#ebdcc3]', title: 'text-[#5a4633]', badge: 'bg-amber-100 text-amber-800', amount: 'text-[#b48a57]' },
  { key: 'bibd', label: '🏦 BIBD', box: 'bg-white border-[#ebdcc3]', title: 'text-[#5a4633]', badge: 'bg-blue-100 text-blue-800', amount: 'text-blue-700' },
  { key: 'baiduri', label: '🏦 Baiduri', box: 'bg-white border-[#ebdcc3]', title: 'text-[#5a4633]', badge: 'bg-purple-100 text-purple-800', amount: 'text-purple-700' },
  { key: 'debit', label: '💳 Debit Card', box: 'bg-white border-[#ebdcc3]', title: 'text-[#5a4633]', badge: 'bg-gray-100 text-gray-700', amount: 'text-gray-700' },
  { key: 'belumLunas', label: '⚠️ Belum Lunas', box: 'bg-red-50 border-red-200', title: 'text-red-800', badge: 'bg-red-200 text-red-900', amount: 'text-red-700' },
]
</script>

<template>
  <div class="max-w-5xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-[#ebdcc3] space-y-6 print:hidden">

    <div class="flex flex-col xl:flex-row justify-between items-start xl:items-center border-b border-[#f4ecd8] pb-5 gap-4">
      <div>
        <h3 class="font-serif text-xl font-bold text-[#5a4633]">💰 Kelola Keuangan (Pemasukan & Pengeluaran)</h3>
        <p class="text-xs text-[#8c7355] mt-0.5">Pantau aliran kas masuk, rincian pembayaran, dan saldo bersih</p>
      </div>

      <div class="flex items-center gap-2 flex-wrap w-full xl:w-auto justify-start xl:justify-end">
        <button type="button" @click="printReport" class="text-xs font-bold bg-[#8c7355] text-white px-3.5 py-2.5 rounded-xl shadow hover:bg-[#725c43] transition-all">🖨️ Cetak Laporan</button>
        <button v-if="incomesAvailable" type="button" @click="openNewIncome" class="text-xs font-bold bg-[#2d7a4f] text-white px-3.5 py-2.5 rounded-xl shadow hover:bg-[#235e3c] transition-all">+ Pemasukan</button>
        <button type="button" @click="openNewExpense" class="text-xs font-bold bg-[#8c4343] text-white px-3.5 py-2.5 rounded-xl shadow hover:bg-[#723535] transition-all">+ Pengeluaran</button>
        <button type="button" @click="goTo('form')" class="text-xs font-bold bg-[#3e3529] text-white px-3.5 py-2.5 rounded-xl shadow hover:bg-[#2c251d] transition-all">Kembali</button>
      </div>
    </div>

    <PeriodFilter :filter="filter" accent="bg-[#8c4343]" />

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
        <p class="text-xs font-bold text-emerald-800 uppercase tracking-wider">📥 Total Pemasukan</p>
        <p class="text-2xl font-serif font-bold text-emerald-900">{{ formatCurrency(totalIncome) }}</p>
        <p class="text-[10px] text-emerald-600">Invois Lunas ({{ formatCurrency(invoiceIncomeTotal) }}) + Manual</p>
      </div>

      <div class="p-5 rounded-2xl bg-red-50 border border-red-200 text-center space-y-1">
        <p class="text-xs font-bold text-red-800 uppercase tracking-wider">📤 Total Pengeluaran</p>
        <p class="text-2xl font-serif font-bold text-red-900">{{ formatCurrency(expenseTotal) }}</p>
        <p class="text-[10px] text-red-600">Pengeluaran periode ini</p>
      </div>

      <div class="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-center space-y-1 shadow-sm">
        <p class="text-xs font-bold text-amber-800 uppercase tracking-wider">💰 Saldo Tersedia (Net)</p>
        <p class="text-2xl font-serif font-bold" :class="netBalance >= 0 ? 'text-[#b48a57]' : 'text-red-600'">{{ formatCurrency(netBalance) }}</p>
        <p class="text-[10px] text-gray-600">Sisa saldo bersih</p>
      </div>
    </div>

    <div class="bg-[#fffdfa] p-5 rounded-2xl border border-[#ebdcc3] space-y-3 shadow-sm">
      <h4 class="font-serif text-sm font-bold text-[#5a4633] border-b border-[#ebdcc3] pb-2">💳 Rincian Status Pembayaran Invois</h4>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-1">
        <div v-for="card in breakdownCards" :key="card.key" class="p-3.5 rounded-xl border space-y-1" :class="card.box">
          <div class="flex justify-between items-center text-xs">
            <span class="font-bold" :class="card.title">{{ card.label }}</span>
            <span class="px-2 py-0.5 rounded font-bold text-[10px]" :class="card.badge">{{ paymentBreakdown[card.key].count }}x</span>
          </div>
          <p class="font-serif font-bold text-base" :class="card.amount">{{ formatCurrency(paymentBreakdown[card.key].total) }}</p>
        </div>
      </div>
    </div>

    <FinanceRecordForm v-if="showIncomeForm" kind="income" :form="incomeForm" :categories="INCOME_CATEGORIES"
                       :editing="!!editingIncomeId" @save="submitIncome" @cancel="closeIncomeForm" />
    <FinanceRecordForm v-if="showExpenseForm" kind="expense" :form="expenseForm" :categories="EXPENSE_CATEGORIES"
                       :editing="!!editingExpenseId" @save="submitExpense" @cancel="closeExpenseForm" />

    <!-- Daftar pemasukan manual -->
    <div v-if="incomesAvailable" class="bg-[#fffdfa] p-5 rounded-2xl border border-[#ebdcc3] space-y-4">
      <h4 class="font-serif text-sm font-bold text-[#5a4633]">📥 Rekod Pemasukan Manual ({{ filteredIncomes.length }} Rekod)</h4>

      <div v-if="filteredIncomes.length === 0" class="text-xs text-gray-500 text-center py-6 italic">
        Tidak ada rekod pemasukan manual pada periode ini.
      </div>

      <div v-else class="space-y-3 max-h-[350px] overflow-y-auto pr-2">
        <div v-for="inc in filteredIncomes" :key="inc.id" class="p-4 rounded-xl border border-[#ebdcc3] bg-white text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">{{ inc.category }}</span>
              <span class="font-bold text-gray-500">📅 {{ inc.income_date }}</span>
            </div>
            <p class="font-serif font-bold text-sm text-[#5a4633]">{{ inc.title }}</p>
            <p v-if="inc.notes" class="text-gray-500 italic">Catatan: "{{ inc.notes }}"</p>
          </div>

          <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
            <span class="font-serif font-bold text-base text-emerald-700">+ {{ formatCurrency(inc.amount) }}</span>
            <div class="flex gap-1.5">
              <button type="button" @click="openEditIncome(inc)" class="px-2.5 py-1.5 bg-[#3b5998] text-white rounded-lg font-bold text-[10px] shadow hover:bg-[#324b81]">✏️ Edit</button>
              <button type="button" @click="deleteIncome(inc.id, inc.title)" class="px-2.5 py-1.5 bg-red-600 text-white rounded-lg font-bold text-[10px] shadow hover:bg-red-700">🗑️ Hapus</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <p v-else class="text-[11px] text-gray-500 italic text-center">
      Pemasukan manual belum aktif: tabel <code>yhs_incomes</code> belum ada di database (lihat sql/migrations.sql).
    </p>

    <!-- Daftar pengeluaran -->
    <div class="bg-[#fffdfa] p-5 rounded-2xl border border-[#ebdcc3] space-y-4">
      <h4 class="font-serif text-sm font-bold text-[#5a4633]">📤 Rekod Riwayat Pengeluaran ({{ filteredExpenses.length }} Rekod)</h4>

      <div v-if="filteredExpenses.length === 0" class="text-xs text-gray-500 text-center py-6 italic">
        Tidak ada rekod pengeluaran pada periode ini.
      </div>

      <div v-else class="space-y-3 max-h-[350px] overflow-y-auto pr-2">
        <div v-for="exp in filteredExpenses" :key="exp.id" class="p-4 rounded-xl border border-[#ebdcc3] bg-white text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold text-[10px]">{{ exp.category }}</span>
              <span class="font-bold text-gray-500">📅 {{ exp.expense_date }}</span>
            </div>
            <p class="font-serif font-bold text-sm text-[#5a4633]">{{ exp.title }}</p>
            <p v-if="exp.notes" class="text-gray-500 italic">Catatan: "{{ exp.notes }}"</p>
          </div>

          <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
            <span class="font-serif font-bold text-base text-red-600">- {{ formatCurrency(exp.amount) }}</span>
            <div class="flex gap-1.5">
              <button type="button" @click="openEditExpense(exp)" class="px-2.5 py-1.5 bg-[#3b5998] text-white rounded-lg font-bold text-[10px] shadow hover:bg-[#324b81]">✏️ Edit</button>
              <button type="button" @click="deleteExpense(exp.id, exp.title)" class="px-2.5 py-1.5 bg-red-600 text-white rounded-lg font-bold text-[10px] shadow hover:bg-red-700">🗑️ Hapus</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Hanya ada di DOM saat tab Keuangan aktif, jadi tidak ikut tercetak bersama invois. -->
  <FinancialReportPrint :period-label="periodLabel" :total-income="totalIncome" :total-expense="expenseTotal"
                        :net-balance="netBalance" :breakdown="paymentBreakdown" />
</template>
