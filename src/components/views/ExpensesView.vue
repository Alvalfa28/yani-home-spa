<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFinance } from '../../composables/useFinance'
import { useMasterData } from '../../composables/useMasterData'
import { useInvoiceForm } from '../../composables/useInvoiceForm'
import { useSettlement } from '../../composables/useSettlement'
import { useNavigation } from '../../composables/useNavigation'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, SETTLEMENT_CATEGORY, DEFAULT_SOURCES } from '../../utils/constants'
import { describePeriod, todayISO } from '../../utils/period'
import { formatCurrency } from '../../utils/format'
import { effectivePaid } from '../../utils/receivable'
import PeriodFilter from '../PeriodFilter.vue'
import FinanceRecordForm from '../FinanceRecordForm.vue'
import FinancialReportPrint from '../FinancialReportPrint.vue'

const { goTo } = useNavigation()
const { invoiceHistory, incomesAvailable } = useMasterData()
const { getInvoiceNumber } = useInvoiceForm()
const { consumeSettlement } = useSettlement()
const {
  filter, filteredExpenses, filteredIncomes, invoiceIncomeTotal, totalIncome, expenseTotal, netBalance,
  outstandingInvoices, outstandingTotal, remainingFor, paymentBreakdown, sourceBalances, sourceSuggestions,
  saveExpense, saveIncome, deleteExpense, deleteIncome,
} = useFinance()

const periodLabel = computed(() => describePeriod(filter))
const printReport = () => window.print()
const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

// ---- Form pengeluaran ----
const blankExpense = () => ({ title: '', amount: 0, expense_date: todayISO(), category: EXPENSE_CATEGORIES[0], source: DEFAULT_SOURCES[0], notes: '' })
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
    title: exp.title, amount: exp.amount, expense_date: exp.expense_date,
    category: exp.category || EXPENSE_CATEGORIES[0], source: exp.source || '', notes: exp.notes || '',
  }
  showExpenseForm.value = true
  scrollTop()
}
const closeExpenseForm = () => { showExpenseForm.value = false; editingExpenseId.value = null }
const submitExpense = async () => {
  if (await saveExpense(expenseForm.value, editingExpenseId.value)) closeExpenseForm()
}

// ---- Form pemasukan manual + pelunasan invois ----
const blankIncome = () => ({ title: '', amount: 0, income_date: todayISO(), category: INCOME_CATEGORIES[0], source: DEFAULT_SOURCES[0], notes: '', invoice_id: '' })
const showIncomeForm = ref(false)
const editingIncomeId = ref(null)
const incomeForm = ref(blankIncome())

// Pilihan invois: yang masih ada sisa + invois yang sedang ditautkan (saat edit).
const invoiceOptions = computed(() => {
  const list = outstandingInvoices.value.map((r) => r.inv)
  const linked = invoiceHistory.value.find((i) => String(i.id) === String(incomeForm.value.invoice_id))
  if (linked && !list.some((i) => i.id === linked.id)) list.push(linked)
  return list
})
const invoiceOptionLabel = (inv) =>
  `${getInvoiceNumber(inv)} · ${inv.customer_name} · sisa ${formatCurrency(remainingFor(inv, editingIncomeId.value))}`
const invoiceLabelById = (id) => {
  const inv = invoiceHistory.value.find((i) => String(i.id) === String(id))
  return inv ? `${getInvoiceNumber(inv)} · ${inv.customer_name}` : ''
}

const onInvoiceLinked = () => {
  const inv = invoiceHistory.value.find((i) => String(i.id) === String(incomeForm.value.invoice_id))
  if (!inv) return
  incomeForm.value.amount = remainingFor(inv, editingIncomeId.value)
  incomeForm.value.category = SETTLEMENT_CATEGORY
  if (!incomeForm.value.title.trim()) incomeForm.value.title = `Pelunasan ${getInvoiceNumber(inv)} - ${inv.customer_name}`
}

const openNewIncome = () => {
  editingIncomeId.value = null
  incomeForm.value = blankIncome()
  showIncomeForm.value = true
}
const openSettlement = (inv) => {
  editingIncomeId.value = null
  incomeForm.value = {
    ...blankIncome(),
    title: `Pelunasan ${getInvoiceNumber(inv)} - ${inv.customer_name}`,
    amount: remainingFor(inv),
    category: SETTLEMENT_CATEGORY,
    invoice_id: inv.id,
  }
  showIncomeForm.value = true
  scrollTop()
}
const openEditIncome = (inc) => {
  editingIncomeId.value = inc.id
  incomeForm.value = {
    title: inc.title, amount: inc.amount, income_date: inc.income_date,
    category: inc.category || INCOME_CATEGORIES[0], source: inc.source || '', notes: inc.notes || '',
    invoice_id: inc.invoice_id || '',
  }
  showIncomeForm.value = true
  scrollTop()
}
const closeIncomeForm = () => { showIncomeForm.value = false; editingIncomeId.value = null }
const submitIncome = async () => {
  if (await saveIncome(incomeForm.value, editingIncomeId.value)) closeIncomeForm()
}

// Datang dari Riwayat Invois lewat tombol "Terima Pelunasan".
onMounted(() => {
  const id = consumeSettlement()
  if (!id || !incomesAvailable.value) return
  const inv = invoiceHistory.value.find((i) => String(i.id) === String(id))
  if (inv && remainingFor(inv) > 0) openSettlement(inv)
})

// ---- Kartu rincian pembayaran ----
const breakdownCards = [
  { key: 'cash', label: '💵 Cash / Tunai', box: 'bg-white border-[#ebdcc3]', title: 'text-[#5a4633]', badge: 'bg-amber-100 text-amber-800', amount: 'text-[#b48a57]' },
  { key: 'bibd', label: '🏦 BIBD', box: 'bg-white border-[#ebdcc3]', title: 'text-[#5a4633]', badge: 'bg-blue-100 text-blue-800', amount: 'text-blue-700' },
  { key: 'baiduri', label: '🏦 Baiduri', box: 'bg-white border-[#ebdcc3]', title: 'text-[#5a4633]', badge: 'bg-purple-100 text-purple-800', amount: 'text-purple-700' },
  { key: 'debit', label: '💳 Debit Card', box: 'bg-white border-[#ebdcc3]', title: 'text-[#5a4633]', badge: 'bg-gray-100 text-gray-700', amount: 'text-gray-700' },
  { key: 'belumLunas', label: '⚠️ Sisa Belum Lunas', box: 'bg-red-50 border-red-200', title: 'text-red-800', badge: 'bg-red-200 text-red-900', amount: 'text-red-700' },
]
</script>

<template>
  <div class="max-w-5xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-[#ebdcc3] space-y-6 print:hidden">

    <div class="flex flex-col xl:flex-row justify-between items-start xl:items-center border-b border-[#f4ecd8] pb-5 gap-4">
      <div>
        <h3 class="font-serif text-xl font-bold text-[#5a4633]">💰 Kelola Keuangan (Pemasukan & Pengeluaran)</h3>
        <p class="text-xs text-[#8c7355] mt-0.5">Pantau kas masuk (termasuk DP), pelunasan, sumber uang, dan saldo bersih Yani Home & Spa</p>
      </div>

      <div class="flex items-center gap-2 flex-wrap w-full xl:w-auto justify-start xl:justify-end">
        <button type="button" @click="printReport" class="text-xs font-bold bg-[#8c7355] text-white px-3.5 py-2.5 rounded-xl shadow hover:bg-[#725c43] transition-all">🖨️ Cetak Laporan</button>
        <button v-if="incomesAvailable" type="button" @click="openNewIncome" class="text-xs font-bold bg-[#2d7a4f] text-white px-3.5 py-2.5 rounded-xl shadow hover:bg-[#235e3c] transition-all">+ Pemasukan</button>
        <button type="button" @click="openNewExpense" class="text-xs font-bold bg-[#8c4343] text-white px-3.5 py-2.5 rounded-xl shadow hover:bg-[#723535] transition-all">+ Pengeluaran</button>
        <button type="button" @click="goTo('form')" class="text-xs font-bold bg-[#3e3529] text-white px-3.5 py-2.5 rounded-xl shadow hover:bg-[#2c251d] transition-all">Kembali</button>
      </div>
    </div>

    <!-- Form tambah / edit (di atas agar langsung terlihat) -->
    <FinanceRecordForm v-if="showIncomeForm" kind="income" :form="incomeForm" :categories="INCOME_CATEGORIES" :sources="sourceSuggestions"
                       :editing="!!editingIncomeId" @save="submitIncome" @cancel="closeIncomeForm">
      <template #extra>
        <label class="block font-bold text-[#8c7355] mb-1">Pelunasan untuk invois (opsional)</label>
        <select v-model="incomeForm.invoice_id" @change="onInvoiceLinked" class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
          <option value="">-- Pemasukan biasa (tidak terkait invois) --</option>
          <option v-for="inv in invoiceOptions" :key="inv.id" :value="inv.id">{{ invoiceOptionLabel(inv) }}</option>
        </select>
        <p class="text-[10px] text-gray-500 mt-1">Pilih invois DP / Belum Lunas, lalu jumlah terisi otomatis sebesar sisa tagihan.</p>
      </template>
    </FinanceRecordForm>
    <FinanceRecordForm v-if="showExpenseForm" kind="expense" :form="expenseForm" :categories="EXPENSE_CATEGORIES" :sources="sourceSuggestions"
                       :editing="!!editingExpenseId" @save="submitExpense" @cancel="closeExpenseForm" />

    <PeriodFilter :filter="filter" accent="bg-[#8c4343]" />

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
        <p class="text-xs font-bold text-emerald-800 uppercase tracking-wider">📥 Total Pemasukan</p>
        <p class="text-xl font-serif font-bold text-emerald-900">{{ formatCurrency(totalIncome) }}</p>
        <p class="text-[10px] text-emerald-600">Invois diterima ({{ formatCurrency(invoiceIncomeTotal) }}) + Manual</p>
      </div>

      <div class="p-5 rounded-2xl bg-red-50 border border-red-200 text-center space-y-1">
        <p class="text-xs font-bold text-red-800 uppercase tracking-wider">📤 Total Pengeluaran</p>
        <p class="text-xl font-serif font-bold text-red-900">{{ formatCurrency(expenseTotal) }}</p>
        <p class="text-[10px] text-red-600">Pengeluaran periode ini</p>
      </div>

      <div class="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-center space-y-1 shadow-sm">
        <p class="text-xs font-bold text-amber-800 uppercase tracking-wider">💰 Saldo Tersedia (Net)</p>
        <p class="text-xl font-serif font-bold" :class="netBalance >= 0 ? 'text-[#b48a57]' : 'text-red-600'">{{ formatCurrency(netBalance) }}</p>
        <p class="text-[10px] text-gray-600">Pemasukan dikurangi pengeluaran</p>
      </div>

      <div class="p-5 rounded-2xl bg-slate-50 border border-slate-300 text-center space-y-1">
        <p class="text-xs font-bold text-slate-700 uppercase tracking-wider">🧾 Tagihan Belum Lunas</p>
        <p class="text-xl font-serif font-bold text-slate-900">{{ formatCurrency(outstandingTotal) }}</p>
        <p class="text-[10px] text-slate-500">{{ outstandingInvoices.length }} invois · belum masuk saldo</p>
      </div>
    </div>

    <!-- Tagihan belum lunas / DP -->
    <div v-if="outstandingInvoices.length" class="bg-[#fffdfa] p-5 rounded-2xl border border-red-200 space-y-3">
      <h4 class="font-serif text-sm font-bold text-[#5a4633]">📌 Invois Menunggu Pelunasan ({{ outstandingInvoices.length }})</h4>
      <div class="space-y-2 max-h-[280px] overflow-y-auto pr-2">
        <div v-for="row in outstandingInvoices" :key="row.inv.id"
             class="p-3 rounded-xl border border-[#ebdcc3] bg-white text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <p class="font-serif font-bold text-sm text-[#5a4633]">{{ row.inv.customer_name }} <span class="text-[10px] text-gray-500 font-sans">{{ getInvoiceNumber(row.inv) }} · {{ row.inv.invoice_date }}</span></p>
            <p class="text-gray-600">Total {{ formatCurrency(row.inv.total_amount) }} · Diterima {{ formatCurrency(effectivePaid(row.inv)) }}</p>
          </div>
          <div class="flex items-center gap-3 w-full sm:w-auto justify-between">
            <span class="font-serif font-bold text-base text-red-600">Sisa {{ formatCurrency(row.remaining) }}</span>
            <button v-if="incomesAvailable" type="button" @click="openSettlement(row.inv)" class="px-2.5 py-1.5 bg-[#2d7a4f] text-white rounded-lg font-bold text-[10px] shadow hover:bg-[#235e3c]">💰 Terima Pembayaran</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Saldo per sumber uang -->
    <div class="bg-[#fffdfa] p-5 rounded-2xl border border-[#ebdcc3] space-y-3">
      <h4 class="font-serif text-sm font-bold text-[#5a4633] border-b border-[#ebdcc3] pb-2">🏦 Saldo per Sumber Uang</h4>
      <div v-if="sourceBalances.length === 0" class="text-xs text-gray-500 text-center py-3 italic">Belum ada pemasukan/pengeluaran pada periode ini.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-xs text-left">
          <thead>
            <tr class="text-[#8c7355]">
              <th class="py-1.5 pr-2">Sumber Uang</th>
              <th class="py-1.5 px-2 text-right">Masuk</th>
              <th class="py-1.5 px-2 text-right">Keluar</th>
              <th class="py-1.5 pl-2 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#f4ecd8]">
            <tr v-for="row in sourceBalances" :key="row.name">
              <td class="py-2 pr-2 font-semibold text-[#3e3529]">{{ row.name }}</td>
              <td class="py-2 px-2 text-right text-emerald-700">{{ formatCurrency(row.income) }}</td>
              <td class="py-2 px-2 text-right text-red-600">{{ formatCurrency(row.expense) }}</td>
              <td class="py-2 pl-2 text-right font-bold" :class="row.balance >= 0 ? 'text-[#b48a57]' : 'text-red-600'">{{ formatCurrency(row.balance) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-[10px] text-gray-500">Pembayaran invois masuk otomatis sesuai cara bayar (Cash → Kas Tunai, BIBD, Baiduri, Debit Card).</p>
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

    <!-- Daftar pemasukan manual -->
    <div v-if="incomesAvailable" class="bg-[#fffdfa] p-5 rounded-2xl border border-[#ebdcc3] space-y-4">
      <h4 class="font-serif text-sm font-bold text-[#5a4633]">📥 Rekod Pemasukan Manual & Pelunasan ({{ filteredIncomes.length }} Rekod)</h4>

      <div v-if="filteredIncomes.length === 0" class="text-xs text-gray-500 text-center py-6 italic">
        Tidak ada rekod pemasukan manual pada periode ini.
      </div>

      <div v-else class="space-y-3 max-h-[350px] overflow-y-auto pr-2">
        <div v-for="inc in filteredIncomes" :key="inc.id" class="p-4 rounded-xl border border-[#ebdcc3] bg-white text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">{{ inc.category }}</span>
              <span v-if="inc.source" class="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-bold text-[10px]">🏦 {{ inc.source }}</span>
              <span class="font-bold text-gray-500">📅 {{ inc.income_date }}</span>
            </div>
            <p class="font-serif font-bold text-sm text-[#5a4633]">{{ inc.title }}</p>
            <p v-if="inc.invoice_id && invoiceLabelById(inc.invoice_id)" class="text-[11px] text-[#8c7355]">🔗 Pelunasan untuk {{ invoiceLabelById(inc.invoice_id) }}</p>
            <p v-if="inc.notes" class="text-gray-500 italic">Catatan: "{{ inc.notes }}"</p>
          </div>

          <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
            <span class="font-serif font-bold text-base text-emerald-700">+ {{ formatCurrency(inc.amount) }}</span>
            <div class="flex gap-1.5">
              <button type="button" @click="openEditIncome(inc)" class="px-2.5 py-1.5 bg-[#3b5998] text-white rounded-lg font-bold text-[10px] shadow hover:bg-[#324b81]">✏️ Edit</button>
              <button type="button" @click="deleteIncome(inc)" class="px-2.5 py-1.5 bg-red-600 text-white rounded-lg font-bold text-[10px] shadow hover:bg-red-700">🗑️ Hapus</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <p v-else class="text-[11px] text-gray-500 italic text-center">
      Pemasukan manual & pelunasan belum aktif: tabel <code>yhs_incomes</code> belum ada di database (lihat sql/migrations.sql).
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
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold text-[10px]">{{ exp.category }}</span>
              <span v-if="exp.source" class="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-bold text-[10px]">🏦 {{ exp.source }}</span>
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
                        :net-balance="netBalance" :breakdown="paymentBreakdown"
                        :source-balances="sourceBalances" :outstanding-total="outstandingTotal" />
</template>
