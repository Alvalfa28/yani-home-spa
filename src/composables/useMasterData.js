import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useToast } from './useToast'

// State di level modul = satu sumber data untuk seluruh aplikasi.
const availableServices = ref([])
const availableTherapists = ref([])
const allCustomers = ref([])
const invoiceHistory = ref([])
const bookingList = ref([])
const expenseList = ref([])
const incomeList = ref([])
const incomesAvailable = ref(false) // false bila tabel yhs_incomes belum ada

// Supabase TIDAK melempar error: ia mengembalikan { error }. Jadi dicek manual.
const fetchTable = async (table, orderBy) => {
  let query = supabase.from(table).select('*')
  if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending })
  const { data, error } = await query
  return { data: data || [], error }
}

const fetchData = async () => {
  const { showToast } = useToast()

  const [services, therapists, customers, invoices, bookings, expenses, incomes] = await Promise.all([
    fetchTable('yhs_services', { column: 'name', ascending: true }),
    fetchTable('yhs_therapists', { column: 'name', ascending: true }),
    fetchTable('yhs_customers', { column: 'name', ascending: true }),
    fetchTable('yhs_invoices', { column: 'created_at', ascending: false }),
    fetchTable('yhs_bookings'),
    fetchTable('yhs_expenses'),
    fetchTable('yhs_incomes'),
  ])

  const failed = [services, therapists, customers, invoices].find((r) => r.error)
  if (failed) {
    console.error('Gagal memuat data:', failed.error)
    showToast('❌ Gagal memuat data: ' + failed.error.message, 'error')
  }

  availableServices.value = services.data
  availableTherapists.value = therapists.data
  allCustomers.value = customers.data
  invoiceHistory.value = invoices.data
  bookingList.value = bookings.error ? [] : bookings.data
  expenseList.value = expenses.error ? [] : expenses.data

  incomesAvailable.value = !incomes.error
  incomeList.value = incomes.error ? [] : incomes.data
}

export function useMasterData() {
  return {
    availableServices,
    availableTherapists,
    allCustomers,
    invoiceHistory,
    bookingList,
    expenseList,
    incomeList,
    incomesAvailable,
    fetchData,
  }
}
