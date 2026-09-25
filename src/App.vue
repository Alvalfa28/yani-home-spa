<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from './lib/supabase'
import logoImage from './assets/logo.jpg'

// --- NAVIGATION / VIEW STATE ('form' | 'calendar' | 'expenses' | 'customers' | 'history' | 'dashboard') ---
const currentView = ref('form') 

// --- STATE FORM INPUT INVOICE ---
const customerName = ref('')
const customerPhone = ref('')
const visitDate = ref(new Date().toISOString().split('T')[0])
const paymentMethod = ref('Cash')
const paymentStatus = ref('Full Payment')
const remarks = ref('')

// Master Data & Riwayat
const availableServices = ref([])
const availableTherapists = ref([])
const allCustomers = ref([]) 
const invoiceHistory = ref([])
const bookingList = ref([]) 
const expenseList = ref([]) 
const incomeList = ref([]) 

// State Autocomplete Pelanggan
const showCustomerDropdown = ref(false)

// State Terapis & Layanan
const selectedTherapist = ref('')
const showAddTherapistModal = ref(false)
const newTherapistName = ref('')

// State Search Keyword per baris layanan
const serviceSearchKeywords = ref([''])

const selectedServices = ref([
  { service_id: '', name: '', qty: 1, price: 0, discount: 0 }
])

// State CRUD Menu Perkhidmatan (Layanan)
const showManageServiceModal = ref(false)
const newServiceName = ref('')
const newServicePrice = ref(0)
const editingServiceId = ref(null)
const editServiceName = ref('')
const editServicePrice = ref(0)

const discountType = ref('percent')
const discountValue = ref(0)

// --- STATE FORM PENGELUARAN (EXPENSES) & EDIT ---
const showAddExpenseModal = ref(false)
const editingExpenseId = ref(null)
const newExpense = ref({
  title: '',
  amount: 0,
  expense_date: new Date().toISOString().split('T')[0],
  category: 'Bahan & Produk',
  notes: ''
})
const expenseCategories = ['Bahan & Produk', 'Gaji / Komisen', 'Utiliti & Sewa', 'Operasi Harian', 'Lain-lain']

// --- STATE FORM PEMASUKAN MANUAL (INCOMES) & EDIT ---
const showAddIncomeModal = ref(false)
const editingIncomeId = ref(null)
const newIncome = ref({
  title: '',
  amount: 0,
  income_date: new Date().toISOString().split('T')[0],
  category: 'Pendapatan Usaha',
  notes: ''
})
const incomeCategories = ['Pendapatan Usaha', 'Sumbangan / Modal', 'Lain-lain']

const expensePeriod = ref('bulanan') // 'harian' | 'mingguan' | 'bulanan' | 'tahunan' | 'semua'
const expenseDateDaily = ref(new Date().toISOString().split('T')[0])

const currentYear = new Date().getFullYear()
const expenseYearAnnual = ref(currentYear)
const expenseMonth = ref(new Date().getMonth() + 1)
const expenseMonthYear = ref(currentYear)

const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
}

const expenseWeekNum = ref(getWeekNumber(new Date()))
const expenseWeekYear = ref(currentYear)

// --- STATE FILTER PELANGGAN (CUSTOMERS) ---
const customerPeriod = ref('bulanan') // 'harian' | 'mingguan' | 'bulanan' | 'tahunan' | 'semua'
const customerDateDaily = ref(new Date().toISOString().split('T')[0])
const customerWeekNum = ref(getWeekNumber(new Date()))
const customerWeekYear = ref(currentYear)
const customerMonth = ref(new Date().getMonth() + 1)
const customerMonthYear = ref(currentYear)
const customerYearAnnual = ref(currentYear)

// --- STATE FILTER RIWAYAT INVOIS (HISTORY) ---
const historyPeriod = ref('bulanan') // 'harian' | 'mingguan' | 'bulanan' | 'tahunan' | 'semua'
const historyDateDaily = ref(new Date().toISOString().split('T')[0])
const historyWeekNum = ref(getWeekNumber(new Date()))
const historyWeekYear = ref(currentYear)
const historyMonth = ref(new Date().getMonth() + 1)
const historyMonthYear = ref(currentYear)
const historyYearAnnual = ref(currentYear)

// --- STATE FILTER DASHBOARD ---
const dashboardPeriod = ref('bulanan') // 'harian' | 'mingguan' | 'bulanan' | 'tahunan' | 'semua'
const selectedDateDaily = ref(new Date().toISOString().split('T')[0])
const selectedYearAnnual = ref(currentYear)
const selectedMonth = ref(new Date().getMonth() + 1)
const selectedMonthYear = ref(currentYear)
const selectedWeekNum = ref(getWeekNumber(new Date()))
const selectedWeekYear = ref(currentYear)

// --- STATE KALENDAR BOOKING ---
const calendarViewMonth = ref(new Date().getMonth() + 1)
const calendarViewYear = ref(currentYear)
const selectedCalendarDate = ref(new Date().toISOString().split('T')[0])
const showAddBookingModal = ref(false)

const newBooking = ref({
  customer_name: '',
  customer_phone: '',
  booking_date: new Date().toISOString().split('T')[0],
  booking_start_time: '10:00',
  booking_end_time: '11:00',
  therapist: '',
  selected_services: [],
  notes: ''
})

const bookingServiceSearchKeyword = ref('')

// Toast Notification
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 4000)
}

const isSubmitting = ref(false)

// --- AMBIL DATA MASTER & TABEL ---
const fetchData = async () => {
  try {
    const { data: servData } = await supabase.from('yhs_services').select('*').order('name', { ascending: true })
    availableServices.value = servData || []

    const { data: thpData } = await supabase.from('yhs_therapists').select('*').order('name', { ascending: true })
    availableTherapists.value = thpData || []

    const { data: custData } = await supabase.from('yhs_customers').select('*').order('name', { ascending: true })
    allCustomers.value = custData || []

    const { data: historyData } = await supabase.from('yhs_invoices').select('*').order('created_at', { ascending: false })
    invoiceHistory.value = historyData || []

    const { data: bookData, error: bookErr } = await supabase.from('yhs_bookings').select('*').order('booking_date', { ascending: true })
    if (bookErr) {
      bookingList.value = []
    } else {
      bookingList.value = bookData || []
    }

    const { data: expData, error: expErr } = await supabase.from('yhs_expenses').select('*').order('expense_date', { ascending: false })
    if (expErr) {
      expenseList.value = []
    } else {
      expenseList.value = expData || []
    }

    const { data: incData, error: incErr } = await supabase.from('yhs_incomes').select('*').order('income_date', { ascending: false })
    if (incErr) {
      incomeList.value = []
    } else {
      incomeList.value = incData || []
    }
  } catch (err) {
    console.error('Gagal memuat data:', err.message)
  }
}

onMounted(() => {
  fetchData()
})

// --- CRUD FUNCTIONS UNTUK MENU PERKHIDMATAN (SERVICES) ---
const saveNewServiceToDB = async () => {
  if (!newServiceName.value.trim() || newServicePrice.value <= 0) {
    return showToast('Mohon isi nama dan harga layanan yang sah.', 'error')
  }
  try {
    const { error } = await supabase.from('yhs_services').insert([{ 
      name: newServiceName.value.trim(), 
      default_price: Number(newServicePrice.value) 
    }])
    if (error) throw error
    showToast('Layanan baru berhasil disimpan!')
    newServiceName.value = ''
    newServicePrice.value = 0
    fetchData()
  } catch (err) {
    showToast('Gagal menyimpan layanan: ' + err.message, 'error')
  }
}

const startEditService = (serv) => {
  editingServiceId.value = serv.id
  editServiceName.value = serv.name
  editServicePrice.value = serv.default_price
}

const cancelEditService = () => {
  editingServiceId.value = null
  editServiceName.value = ''
  editServicePrice.value = 0
}

const updateServiceInDB = async () => {
  if (!editServiceName.value.trim() || editServicePrice.value <= 0) {
    return showToast('Mohon isi nama dan harga layanan yang sah.', 'error')
  }
  try {
    const { error } = await supabase.from('yhs_services')
      .update({ name: editServiceName.value.trim(), default_price: Number(editServicePrice.value) })
      .eq('id', editingServiceId.value)
    if (error) throw error
    showToast('Layanan berhasil diperbarui!')
    cancelEditService()
    fetchData()
  } catch (err) {
    showToast('Gagal memperbarui layanan: ' + err.message, 'error')
  }
}

const deleteServiceFromDB = async (servId, servName) => {
  if (!confirm(`Adakah anda pasti ingin memadam layanan "${servName}"?`)) return
  try {
    const { error } = await supabase.from('yhs_services').delete().eq('id', servId)
    if (error) throw error
    showToast(`Layanan "${servName}" berhasil dipadam!`)
    fetchData()
  } catch (err) {
    showToast('Gagal memadam layanan: ' + err.message, 'error')
  }
}

// --- CRUD PENGELUARAN (TAMBAH, EDIT, HAPUS) ---
const saveOrUpdateExpense = async () => {
  if (!newExpense.value.title || !newExpense.value.amount || newExpense.value.amount <= 0) {
    return showToast('Mohon isi Keterangan dan Jumlah Pengeluaran yang sah.', 'error')
  }

  try {
    const payload = {
      title: newExpense.value.title.trim(),
      amount: Number(newExpense.value.amount),
      expense_date: newExpense.value.expense_date,
      category: newExpense.value.category,
      notes: newExpense.value.notes.trim()
    }

    if (editingExpenseId.value) {
      const { error } = await supabase.from('yhs_expenses').update(payload).eq('id', editingExpenseId.value)
      if (error) throw error
      showToast('💸 Pengeluaran berhasil diperbarui!')
    } else {
      const { error } = await supabase.from('yhs_expenses').insert([payload])
      if (error) throw error
      showToast('💸 Pengeluaran berhasil dicatat!')
    }

    showAddExpenseModal.value = false
    editingExpenseId.value = null
    newExpense.value = {
      title: '',
      amount: 0,
      expense_date: new Date().toISOString().split('T')[0],
      category: 'Bahan & Produk',
      notes: ''
    }
    fetchData()
  } catch (err) {
    showToast('Gagal menyimpan pengeluaran: ' + err.message, 'error')
  }
}

const startEditExpense = (exp) => {
  editingExpenseId.value = exp.id
  newExpense.value = {
    title: exp.title,
    amount: exp.amount,
    expense_date: exp.expense_date,
    category: exp.category || 'Bahan & Produk',
    notes: exp.notes || ''
  }
  showAddExpenseModal.value = true
}

const deleteExpenseFromDB = async (expId, expTitle) => {
  if (!confirm(`Adakah anda pasti ingin memadam rekod pengeluaran "${expTitle}"?`)) return
  try {
    const { error } = await supabase.from('yhs_expenses').delete().eq('id', expId)
    if (error) throw error
    showToast(`Pengeluaran "${expTitle}" berhasil dipadam!`)
    fetchData()
  } catch (err) {
    showToast('Gagal memadam pengeluaran: ' + err.message, 'error')
  }
}

// --- CRUD PEMASUKAN MANUAL (TAMBAH, EDIT, HAPUS) ---
const saveOrUpdateIncome = async () => {
  if (!newIncome.value.title || !newIncome.value.amount || newIncome.value.amount <= 0) {
    return showToast('Mohon isi Keterangan dan Jumlah Pemasukan yang sah.', 'error')
  }

  try {
    const payload = {
      title: newIncome.value.title.trim(),
      amount: Number(newIncome.value.amount),
      income_date: newIncome.value.income_date,
      category: newIncome.value.category,
      notes: newIncome.value.notes.trim()
    }

    if (editingIncomeId.value) {
      const { error } = await supabase.from('yhs_incomes').update(payload).eq('id', editingIncomeId.value)
      if (error) throw error
      showToast('📥 Pemasukan manual berhasil diperbarui!')
    } else {
      const { error } = await supabase.from('yhs_incomes').insert([payload])
      if (error) throw error
      showToast('📥 Pemasukan manual berhasil dicatat!')
    }

    showAddIncomeModal.value = false
    editingIncomeId.value = null
    newIncome.value = {
      title: '',
      amount: 0,
      income_date: new Date().toISOString().split('T')[0],
      category: 'Pendapatan Usaha',
      notes: ''
    }
    fetchData()
  } catch (err) {
    showToast('Gagal menyimpan pemasukan: ' + err.message, 'error')
  }
}

const startEditIncome = (inc) => {
  editingIncomeId.value = inc.id
  newIncome.value = {
    title: inc.title,
    amount: inc.amount,
    income_date: inc.income_date,
    category: inc.category || 'Pendapatan Usaha',
    notes: inc.notes || ''
  }
  showAddIncomeModal.value = true
}

const deleteIncomeFromDB = async (incId, incTitle) => {
  if (!confirm(`Adakah anda pasti ingin memadam rekod pemasukan "${incTitle}"?`)) return
  try {
    const { error } = await supabase.from('yhs_incomes').delete().eq('id', incId)
    if (error) throw error
    showToast(`Pemasukan "${incTitle}" berhasil dipadam!`)
    fetchData()
  } catch (err) {
    showToast('Gagal memadam pemasukan: ' + err.message, 'error')
  }
}

// --- FUNGSI HAPUS RIWAYAT INVOIS & DAMPAK KE PELANGGAN ---
const deleteInvoiceHistory = async (invId, customerName) => {
  if (!confirm(`Adakah anda pasti ingin memadam invois ini? Jika ini adalah satu-satunya transaksi pelanggan "${customerName}", rekod pelanggan juga akan dipadam.`)) return
  try {
    const { data: deletedData, error: invErr } = await supabase
      .from('yhs_invoices')
      .delete()
      .eq('id', invId)
      .select()

    if (invErr) throw invErr

    if (!deletedData || deletedData.length === 0) {
      throw new Error("Gagal menghapus invois dari database.")
    }

    const remainingInvoices = invoiceHistory.value.filter(inv => inv.id !== invId)
    const hasOtherInvoices = remainingInvoices.some(
      inv => (inv.customer_name || '').trim().toLowerCase() === (customerName || '').trim().toLowerCase()
    )

    if (!hasOtherInvoices) {
      const targetCust = allCustomers.value.find(
        c => (c.name || '').trim().toLowerCase() === (customerName || '').trim().toLowerCase()
      )

      if (targetCust) {
        const { error: custErr } = await supabase
          .from('yhs_customers')
          .delete()
          .eq('id', targetCust.id)

        if (custErr) {
          console.error('Gagal memadam tabel pelanggan:', custErr.message)
        }
      }
    }

    showToast('🗑️ Invois & rekod pelanggan berhasil dipadam!')
    fetchData()
  } catch (err) {
    showToast('❌ Gagal memadam: ' + err.message, 'error')
  }
}

// --- FILTER & PERHITUNGAN KEUANGAN PENGELUARAN & PEMASUKAN ---
const filteredExpensesByPeriod = computed(() => {
  return expenseList.value.filter(exp => {
    if (expensePeriod.value === 'semua') return true
    if (!exp.expense_date) return false
    const expDate = new Date(exp.expense_date)

    if (expensePeriod.value === 'harian') {
      return exp.expense_date === expenseDateDaily.value
    } 
    else if (expensePeriod.value === 'mingguan') {
      const expYear = expDate.getFullYear()
      const expWeek = getWeekNumber(expDate)
      return expWeek === Number(expenseWeekNum.value) && expYear === Number(expenseWeekYear.value)
    } 
    else if (expensePeriod.value === 'bulanan') {
      return (expDate.getMonth() + 1) === Number(expenseMonth.value) && expDate.getFullYear() === Number(expenseMonthYear.value)
    } 
    else if (expensePeriod.value === 'tahunan') {
      return expDate.getFullYear() === Number(expenseYearAnnual.value)
    }
    return true
  })
})

const filteredIncomesByPeriod = computed(() => {
  return incomeList.value.filter(inc => {
    if (expensePeriod.value === 'semua') return true
    if (!inc.income_date) return false
    const incDate = new Date(inc.income_date)

    if (expensePeriod.value === 'harian') {
      return inc.income_date === expenseDateDaily.value
    } 
    else if (expensePeriod.value === 'mingguan') {
      return getWeekNumber(incDate) === Number(expenseWeekNum.value) && incDate.getFullYear() === Number(expenseWeekYear.value)
    } 
    else if (expensePeriod.value === 'bulanan') {
      return (incDate.getMonth() + 1) === Number(expenseMonth.value) && incDate.getFullYear() === Number(expenseMonthYear.value)
    } 
    else if (expensePeriod.value === 'tahunan') {
      return incDate.getFullYear() === Number(expenseYearAnnual.value)
    }
    return true
  })
})

const filteredInvoiceIncomeTotal = computed(() => {
  return invoiceHistory.value.filter(inv => {
    if (expensePeriod.value === 'semua') return true
    if (!inv.invoice_date) return false
    const invDate = new Date(inv.invoice_date)
    if (expensePeriod.value === 'harian') {
      return inv.invoice_date === expenseDateDaily.value
    } else if (expensePeriod.value === 'mingguan') {
      return getWeekNumber(invDate) === Number(expenseWeekNum.value) && invDate.getFullYear() === Number(expenseWeekYear.value)
    } else if (expensePeriod.value === 'bulanan') {
      return (invDate.getMonth() + 1) === Number(expenseMonth.value) && invDate.getFullYear() === Number(expenseMonthYear.value)
    } else if (expensePeriod.value === 'tahunan') {
      return invDate.getFullYear() === Number(expenseYearAnnual.value)
    }
    return true
  }).reduce((acc, inv) => acc + (Number(inv.total_amount) || 0), 0)
})

const filteredManualIncomeTotal = computed(() => {
  return filteredIncomesByPeriod.value.reduce((acc, inc) => acc + (Number(inc.amount) || 0), 0)
})

const filteredTotalIncome = computed(() => {
  return filteredInvoiceIncomeTotal.value + filteredManualIncomeTotal.value
})

const filteredExpenseTotal = computed(() => {
  return filteredExpensesByPeriod.value.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0)
})

const filteredNetBalance = computed(() => {
  return filteredTotalIncome.value - filteredExpenseTotal.value
})

// --- FILTERED CUSTOMERS BY PERIOD ---
const filteredCustomersByPeriod = computed(() => {
  const periodInvoices = invoiceHistory.value.filter(inv => {
    if (customerPeriod.value === 'semua') return true
    if (!inv.invoice_date) return false
    const invDate = new Date(inv.invoice_date)
    if (customerPeriod.value === 'harian') {
      return inv.invoice_date === customerDateDaily.value
    } else if (customerPeriod.value === 'mingguan') {
      return getWeekNumber(invDate) === Number(customerWeekNum.value) && invDate.getFullYear() === Number(customerWeekYear.value)
    } else if (customerPeriod.value === 'bulanan') {
      return (invDate.getMonth() + 1) === Number(customerMonth.value) && invDate.getFullYear() === Number(customerMonthYear.value)
    } else if (customerPeriod.value === 'tahunan') {
      return invDate.getFullYear() === Number(customerYearAnnual.value)
    }
    return true
  })

  const statsMap = {}
  periodInvoices.forEach(inv => {
    const name = (inv.customer_name || '').trim()
    if (!statsMap[name]) {
      statsMap[name] = { count: 0, total: 0, lastDate: inv.invoice_date || '-' }
    }
    statsMap[name].count += 1
    statsMap[name].total += Number(inv.total_amount) || 0
    if (inv.invoice_date && inv.invoice_date > statsMap[name].lastDate) {
      statsMap[name].lastDate = inv.invoice_date
    }
  })

  const activeCustomerNames = Object.keys(statsMap)
  const enriched = allCustomers.value
    .filter(c => customerPeriod.value === 'semua' ? true : activeCustomerNames.includes(c.name.trim()))
    .map(c => {
      const stat = statsMap[c.name.trim()] || { count: 0, total: 0, lastDate: '-' }
      return {
        ...c,
        visitCount: stat.count,
        totalSpent: stat.total,
        lastVisit: stat.lastDate
      }
    })

  enriched.sort((a, b) => a.name.localeCompare(b.name))

  const groups = {}
  enriched.forEach(cust => {
    const firstLetter = cust.name.charAt(0).toUpperCase() || '#'
    if (!groups[firstLetter]) groups[firstLetter] = []
    groups[firstLetter].push(cust)
  })

  return groups
})

// --- FILTERED HISTORY BY PERIOD ---
const filteredHistoryList = computed(() => {
  return invoiceHistory.value.filter(inv => {
    if (historyPeriod.value === 'semua') return true
    if (!inv.invoice_date) return false
    const invDate = new Date(inv.invoice_date)

    if (historyPeriod.value === 'harian') {
      return inv.invoice_date === historyDateDaily.value
    } 
    else if (historyPeriod.value === 'mingguan') {
      return getWeekNumber(invDate) === Number(historyWeekNum.value) && invDate.getFullYear() === Number(historyWeekYear.value)
    } 
    else if (historyPeriod.value === 'bulanan') {
      return (invDate.getMonth() + 1) === Number(historyMonth.value) && invDate.getFullYear() === Number(historyMonthYear.value)
    } 
    else if (historyPeriod.value === 'tahunan') {
      return invDate.getFullYear() === Number(historyYearAnnual.value)
    }
    return true
  })
})

const filteredHistoryTotalAmount = computed(() => {
  return filteredHistoryList.value.reduce((acc, inv) => acc + (Number(inv.total_amount) || 0), 0)
})

// Filter Layanan untuk Booking
const filteredServicesForBooking = computed(() => {
  const keyword = (bookingServiceSearchKeyword.value || '').toLowerCase()
  if (!keyword) return availableServices.value
  return availableServices.value.filter(s => s.name.toLowerCase().includes(keyword))
})

// Validasi Waktu Bentrok (Overlap Time Check)
const isTimeOverlapping = (start1, end1, start2, end2) => {
  return start1 < end2 && start2 < end1
}

const saveBookingToDB = async () => {
  if (!newBooking.value.customer_name || !newBooking.value.booking_date) {
    return showToast('Mohon isi Nama Pelanggan dan Tanggal Booking.', 'error')
  }

  const startTime = newBooking.value.booking_start_time || '10:00'
  const endTime = newBooking.value.booking_end_time || '11:00'

  if (startTime >= endTime) {
    return showToast('❌ Jam selesai harus lebih besar dari jam mulai!', 'error')
  }

  // Cek apakah jam sudah dibooking pada tanggal & terapis tersebut
  const targetTherapist = newBooking.value.therapist || 'Tanpa Terapis'
  const existingOnDate = bookingList.value.filter(b => 
    b.booking_date === newBooking.value.booking_date && 
    (b.therapist === targetTherapist || targetTherapist === 'Tanpa Terapis' || !b.therapist || b.therapist === 'Tanpa Terapis') &&
    b.status !== 'Batal'
  )

  const hasConflict = existingOnDate.some(b => {
    const bStart = b.booking_start_time || b.booking_time || '10:00'
    const bEnd = b.booking_end_time || '11:00'
    return isTimeOverlapping(startTime, endTime, bStart, bEnd)
  })

  if (hasConflict) {
    return showToast(`❌ Jam ${startTime} - ${endTime} sudah terisi/dibooking pada tanggal ini! Silakan pilih jam lain.`, 'error')
  }

  try {
    const chosenServicesObj = newBooking.value.selected_services.map(sId => {
      const found = availableServices.value.find(s => s.id === sId)
      return found ? { id: found.id, name: found.name, price: found.default_price, qty: 1 } : null
    }).filter(Boolean)

    const payload = {
      customer_name: newBooking.value.customer_name.trim(),
      customer_phone: newBooking.value.customer_phone.trim(),
      booking_date: newBooking.value.booking_date,
      booking_time: startTime, // legacy support
      booking_start_time: startTime,
      booking_end_time: endTime,
      therapist: targetTherapist,
      treatments: chosenServicesObj,
      notes: newBooking.value.notes,
      status: 'Terjadwal'
    }

    const { error } = await supabase.from('yhs_bookings').insert([payload])

    if (error) throw error

    showToast('📅 Booking WhatsApp berhasil dicatat ke kalendar!')
    showAddBookingModal.value = false
    newBooking.value = {
      customer_name: '',
      customer_phone: '',
      booking_date: selectedCalendarDate.value,
      booking_start_time: '10:00',
      booking_end_time: '11:00',
      therapist: '',
      selected_services: [],
      notes: ''
    }
    bookingServiceSearchKeyword.value = ''
    fetchData()
  } catch (err) {
    showToast('Gagal menyimpan booking: ' + err.message, 'error')
  }
}

const updateBookingStatus = async (id, newStatus) => {
  try {
    const { error } = await supabase.from('yhs_bookings').update({ status: newStatus }).eq('id', id)
    if (error) throw error
    showToast(`Status booking diubah menjadi ${newStatus}`)
    fetchData()
  } catch (err) {
    showToast('Gagal mengemas kini status: ' + err.message, 'error')
  }
}

const deleteBookingFromDB = async (bookId, customerName) => {
  if (!confirm(`Adakah anda pasti ingin memadam sesi booking untuk "${customerName}"?`)) return
  try {
    const { error } = await supabase.from('yhs_bookings').delete().eq('id', bookId)
    if (error) throw error
    showToast(`Sesi booking ${customerName} berhasil dipadam!`)
    fetchData()
  } catch (err) {
    showToast('Gagal memadam sesi booking: ' + err.message, 'error')
  }
}

const useBookingForInvoice = (book) => {
  customerName.value = book.customer_name
  customerPhone.value = book.customer_phone
  visitDate.value = book.booking_date
  selectedTherapist.value = book.therapist !== 'Tanpa Terapis' ? book.therapist : ''
  remarks.value = `Dari Booking WA (${book.booking_start_time || book.booking_time} - ${book.booking_end_time || 'selesai'}): ${book.notes || '-'}`
  
  if (Array.isArray(book.treatments) && book.treatments.length > 0) {
    selectedServices.value = book.treatments.map(t => ({
      service_id: t.id || '',
      name: t.name || '',
      qty: t.qty || 1,
      price: t.price || 0,
      discount: 0
    }))
    serviceSearchKeywords.value = book.treatments.map(() => '')
  } else if (book.service_name) {
    selectedServices.value = [{
      service_id: '',
      name: book.service_name,
      qty: 1,
      price: book.price || 0,
      discount: 0
    }]
    serviceSearchKeywords.value = ['']
  }

  currentView.value = 'form'
  showToast(`✨ Memuat data ${book.customer_name} & ${book.treatments?.length || 1} rawatan ke Form Invois!`)
}

const calendarDaysInMonth = computed(() => {
  const year = calendarViewYear.value
  const month = calendarViewMonth.value
  const date = new Date(year, month - 1, 1)
  const days = []

  const firstDayIndex = date.getDay()
  for (let i = 0; i < firstDayIndex; i++) {
    days.push({ dayNum: '', dateStr: '', isCurrentMonth: false })
  }

  while (date.getMonth() === month - 1) {
    const dStr = date.toISOString().split('T')[0]
    days.push({
      dayNum: date.getDate(),
      dateStr: dStr,
      isCurrentMonth: true
    })
    date.setDate(date.getDate() + 1)
  }
  return days
})

const bookingsGroupedByTherapist = computed(() => {
  const dateBookings = bookingList.value.filter(b => b.booking_date === selectedCalendarDate.value)
  const columns = {}
  
  availableTherapists.value.forEach(thp => {
    columns[thp.name] = dateBookings
      .filter(b => b.therapist === thp.name)
      .sort((a, b) => (a.booking_start_time || a.booking_time || '00:00').localeCompare(b.booking_start_time || b.booking_time || '00:00'))
  })

  const unassigned = dateBookings
    .filter(b => !b.therapist || b.therapist === 'Tanpa Terapis' || !availableTherapists.value.some(t => t.name === b.therapist))
    .sort((a, b) => (a.booking_start_time || a.booking_time || '00:00').localeCompare(b.booking_start_time || b.booking_time || '00:00'))
  
  if (unassigned.length > 0 || Object.keys(columns).length === 0) {
    columns['Tanpa Terapis'] = unassigned
  }

  return columns
})

const getFilteredServices = (index) => {
  const keyword = (serviceSearchKeywords.value[index] || '').toLowerCase()
  if (!keyword) return availableServices.value
  return availableServices.value.filter(s => s.name.toLowerCase().includes(keyword))
}

const filteredInvoicesByPeriod = computed(() => {
  return invoiceHistory.value.filter(inv => {
    if (dashboardPeriod.value === 'semua') return true
    if (!inv.invoice_date) return false
    const invDate = new Date(inv.invoice_date)

    if (dashboardPeriod.value === 'harian') {
      return inv.invoice_date === selectedDateDaily.value
    } 
    else if (dashboardPeriod.value === 'mingguan') {
      const invYear = invDate.getFullYear()
      const invWeek = getWeekNumber(invDate)
      return invWeek === Number(selectedWeekNum.value) && invYear === Number(selectedWeekYear.value)
    } 
    else if (dashboardPeriod.value === 'bulanan') {
      return (invDate.getMonth() + 1) === Number(selectedMonth.value) && invDate.getFullYear() === Number(selectedMonthYear.value)
    } 
    else if (dashboardPeriod.value === 'tahunan') {
      return invDate.getFullYear() === Number(selectedYearAnnual.value)
    }
    return true
  })
})

const periodInvoiceCount = computed(() => filteredInvoicesByPeriod.value.length)
const periodTotalAmount = computed(() => {
  return filteredInvoicesByPeriod.value.reduce((acc, inv) => acc + (Number(inv.total_amount) || 0), 0)
})
const periodAverageAmount = computed(() => {
  if (periodInvoiceCount.value === 0) return 0
  return periodTotalAmount.value / periodInvoiceCount.value
})

const popularServicesStats = computed(() => {
  const serviceCount = {}
  filteredInvoicesByPeriod.value.forEach(inv => {
    if (Array.isArray(inv.treatments)) {
      inv.treatments.forEach(t => {
        const sName = t.name || 'Lainnya'
        serviceCount[sName] = (serviceCount[sName] || 0) + (Number(t.qty) || 1)
      })
    }
  })
  const sorted = Object.entries(serviceCount).sort((a, b) => b[1] - a[1])
  const maxVal = sorted.length > 0 ? sorted[0][1] : 1
  return sorted.map(([name, count]) => ({
    name,
    count,
    percentage: Math.round((count / maxVal) * 100)
  }))
})

// Therapist Performance + Bonus 10% Calculation
const therapistPerformanceStats = computed(() => {
  const therapistData = {}
  filteredInvoicesByPeriod.value.forEach(inv => {
    const thp = inv.therapist || 'Tanpa Terapis'
    if (!therapistData[thp]) {
      therapistData[thp] = { count: 0, revenue: 0 }
    }
    therapistData[thp].count += 1
    therapistData[thp].revenue += Number(inv.total_amount) || 0
  })

  const sorted = Object.entries(therapistData).sort((a, b) => b[1].count - a[1].count)
  const maxVal = sorted.length > 0 ? sorted[0][1].count : 1

  return sorted.map(([name, data]) => ({
    name,
    count: data.count,
    revenue: data.revenue,
    bonus: data.revenue * 0.10, // Bonus 10% dari omset rawatan
    percentage: Math.round((data.count / maxVal) * 100)
  }))
})

const profitByDayOfWeek = computed(() => {
  const daysMap = {
    1: { label: 'Senin', total: 0 },
    2: { label: 'Selasa', total: 0 },
    3: { label: 'Rabu', total: 0 },
    4: { label: 'Khamis', total: 0 },
    5: { label: 'Jumaat', total: 0 },
    6: { label: 'Sabtu', total: 0 },
    0: { label: 'Ahad', total: 0 },
  }

  filteredInvoicesByPeriod.value.forEach(inv => {
    if (inv.invoice_date) {
      const dayIndex = new Date(inv.invoice_date).getDay()
      if (daysMap[dayIndex]) {
        daysMap[dayIndex].total += Number(inv.total_amount) || 0
      }
    }
  })

  const orderedDays = [1, 2, 3, 4, 5, 6, 0].map(k => ({
    day: daysMap[k].label,
    total: daysMap[k].total
  }))

  const maxTotal = Math.max(...orderedDays.map(d => d.total), 1)
  return orderedDays.map(d => ({
    ...d,
    percentage: Math.round((d.total / maxTotal) * 100)
  }))
})

const formatDateTime = (timestamp) => {
  if (!timestamp) return '-'
  const d = new Date(timestamp)
  const dateStr = d.toLocaleDateString('en-GB') 
  const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return { combined: `${dateStr}, ${timeStr}` }
}

const formatNumberID = (val) => {
  return Number(val || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const filteredCustomers = computed(() => {
  if (!customerName.value) return []
  const keyword = customerName.value.toLowerCase()
  return allCustomers.value.filter(c => c.name.toLowerCase().includes(keyword))
})

const selectCustomer = (cust) => {
  customerName.value = cust.name
  customerPhone.value = cust.phone
  showCustomerDropdown.value = false
}

const saveNewTherapistToDB = async () => {
  if (!newTherapistName.value.trim()) return showToast('Mohon masukkan nama terapis.', 'error')
  try {
    const { error } = await supabase.from('yhs_therapists').insert([{ name: newTherapistName.value.trim() }])
    if (error) throw error
    showToast('Terapis baru berhasil disimpan!')
    selectedTherapist.value = newTherapistName.value.trim()
    newTherapistName.value = ''
    showAddTherapistModal.value = false
    fetchData()
  } catch (err) {
    showToast('Gagal menyimpan terapis: ' + err.message, 'error')
  }
}

const deleteTherapistFromDB = async (thpId, thpName) => {
  if (!confirm(`Adakah anda pasti ingin memadam terapis "${thpName}"?`)) return
  try {
    const { error } = await supabase.from('yhs_therapists').delete().eq('id', thpId)
    if (error) throw error
    showToast(`Terapis ${thpName} berhasil dipadam!`)
    if (selectedTherapist.value === thpName) {
      selectedTherapist.value = ''
    }
    fetchData()
  } catch (err) {
    showToast('Gagal memadam terapis: ' + err.message, 'error')
  }
}

const onServiceSelect = (index, event) => {
  const serviceId = event.target.value
  const found = availableServices.value.find(s => s.id === serviceId)
  if (found) {
    selectedServices.value[index].service_id = found.id
    selectedServices.value[index].name = found.name
    selectedServices.value[index].price = found.default_price
  } else {
    selectedServices.value[index].service_id = ''
    selectedServices.value[index].name = ''
    selectedServices.value[index].price = 0
  }
}

const addServiceRow = () => {
  selectedServices.value.push({ service_id: '', name: '', qty: 1, price: 0, discount: 0 })
  serviceSearchKeywords.value.push('')
}

const removeServiceRow = (index) => {
  if (selectedServices.value.length > 1) {
    selectedServices.value.splice(index, 1)
    serviceSearchKeywords.value.splice(index, 1)
  }
}

const subtotal = computed(() => {
  return selectedServices.value.reduce((acc, item) => {
    const itemTotal = (Number(item.price) || 0) * (Number(item.qty) || 1) - (Number(item.discount) || 0)
    return acc + (itemTotal > 0 ? itemTotal : 0)
  }, 0)
})

const transactionDiscountAmount = computed(() => {
  let total = subtotal.value
  let disc = Number(discountValue.value) || 0
  if (disc <= 0) return 0
  return discountType.value === 'percent' ? (total * disc) / 100 : (disc > total ? total : disc)
})

const totalDue = computed(() => {
  let finalAmount = subtotal.value - transactionDiscountAmount.value
  return finalAmount > 0 ? finalAmount : 0
})

const formatCurrency = (val) => {
  return 'B$ ' + Number(val || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const invoiceNumber = computed(() => {
  const dateStr = visitDate.value.replace(/-/g, '')
  return `YHS-${dateStr}-001`
})

const saveToSupabase = async () => {
  if (!customerName.value || !customerPhone.value) {
    showToast('⚠️ Mohon isi Nama Pelanggan dan No. Telefon.', 'error')
    return
  }

  isSubmitting.value = true
  showToast('Menyimpan data...', 'success')

  try {
    const { error: invError } = await supabase.from('yhs_invoices').insert([{
      customer_name: customerName.value.trim(),
      customer_wa: customerPhone.value.trim(),
      invoice_date: visitDate.value,
      total_amount: totalDue.value,
      treatments: selectedServices.value,
      payment_method: paymentMethod.value,
      payment_status: 'Full Payment',
      therapist: selectedTherapist.value || 'Tanpa Terapis',
      remarks: remarks.value,
      transaction_discount: transactionDiscountAmount.value
    }])

    if (invError) throw invError

    const existingCust = allCustomers.value.find(
      c => c.name.toLowerCase() === customerName.value.trim().toLowerCase()
    )

    if (!existingCust) {
      await supabase.from('yhs_customers').insert([{
        name: customerName.value.trim(),
        phone: customerPhone.value.trim()
      }])
    }

    showToast('✅ Invois tersimpan & Pelanggan otomatis tercatat!')
    fetchData() 
  } catch (err) {
    showToast('❌ Gagal menyimpan: ' + err.message, 'error')
  } finally {
    isSubmitting.value = false
  }
}

const handlePrint = () => { window.print() }

const printFinancialReport = () => {
  window.print()
}

const copyInvoiceText = () => {
  let text = `*YANI HOME & SPA INVOICE*\nNo: ${invoiceNumber.value}\nTarikh: ${visitDate.value}\nNama: ${customerName.value || '-'}\nTelefon: ${customerPhone.value || '-'}\nTerapis: ${selectedTherapist.value || '-'}\n`
  if(remarks.value) text += `Catatan: ${remarks.value}\n`
  text += `\n*Rincian Rawatan:*\n`
  selectedServices.value.forEach((s, i) => {
    if(s.name) text += `${i+1}. ${s.name} (x${s.qty}) - ${formatCurrency(s.price * s.qty)}\n`
  })
  if (transactionDiscountAmount.value > 0) text += `Diskon Transaksi: - ${formatCurrency(transactionDiscountAmount.value)}\n`
  text += `\n*JUMLAH / TOTAL DUE: ${formatCurrency(totalDue.value)}*\nCara Bayar: ${paymentMethod.value}\n\nTerima kasih!`

  navigator.clipboard.writeText(text)
  showToast('📋 Invois berhasil disalin ke clipboard!')
}

const resetForm = () => {
  customerName.value = ''
  customerPhone.value = ''
  visitDate.value = new Date().toISOString().split('T')[0]
  selectedTherapist.value = ''
  remarks.value = ''
  selectedServices.value = [{ service_id: '', name: '', qty: 1, price: 0, discount: 0 }]
  serviceSearchKeywords.value = ['']
  discountValue.value = 0
  showToast('Form berhasil di-reset.')
}
</script>

<template>
  <div class="min-h-screen bg-[#fdfbf7] text-[#3e3529] font-sans p-4 sm:p-6 lg:p-8 overflow-x-hidden w-full">
    
    <!-- Toast Notification -->
    <transition name="toast">
      <div v-if="toast.show" 
           class="fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-medium border flex items-center gap-3 backdrop-blur-md transition-all"
           :class="toast.type === 'error' ? 'bg-red-500/90 text-white border-red-600' : 'bg-[#3e3529]/95 text-white border-[#b48a57]'">
        <span>{{ toast.message }}</span>
      </div>
    </transition>

    <!-- Top Header Brand -->
    <div class="text-center mb-6 flex flex-col items-center print:hidden">
      <img :src="logoImage" alt="Logo" class="w-20 h-20 rounded-full object-cover shadow-sm border border-[#ebdcc3] mb-3" />
      <h1 class="font-serif text-2xl font-bold tracking-widest uppercase text-[#5a4633]">Yani Home & Spa</h1>
      <p class="text-xs uppercase tracking-widest text-[#8c7355] font-semibold">Invoice System • Rawatan Pantang</p>
    </div>

    <!-- NAVBAR / MENU NAVIGASI UTAMA -->
    <div class="max-w-7xl mx-auto mb-8 flex flex-wrap justify-center gap-2 print:hidden">
      <button @click="currentView = 'form'" type="button" class="px-4 py-2 text-xs font-bold rounded-xl shadow transition-all flex items-center gap-2"
              :class="currentView === 'form' ? 'bg-[#b48a57] text-white' : 'bg-white text-[#5a4633] border border-[#ebdcc3] hover:bg-[#f4ecd8]'">
        📝 Buat Invois
      </button>
      <button @click="currentView = 'calendar'" type="button" class="px-4 py-2 text-xs font-bold rounded-xl shadow transition-all flex items-center gap-2"
              :class="currentView === 'calendar' ? 'bg-[#2d7a4f] text-white' : 'bg-white text-[#5a4633] border border-[#ebdcc3] hover:bg-[#f4ecd8]'">
        📅 Kalendar ({{ bookingList.filter(b=>b.status==='Terjadwal').length }})
      </button>
      <button @click="currentView = 'expenses'" type="button" class="px-4 py-2 text-xs font-bold rounded-xl shadow transition-all flex items-center gap-2"
              :class="currentView === 'expenses' ? 'bg-[#8c4343] text-white' : 'bg-white text-[#5a4633] border border-[#ebdcc3] hover:bg-[#f4ecd8]'">
        💸 Keuangan ({{ expenseList.length + incomeList.length }})
      </button>
      <button @click="currentView = 'customers'" type="button" class="px-4 py-2 text-xs font-bold rounded-xl shadow transition-all flex items-center gap-2"
              :class="currentView === 'customers' ? 'bg-[#2d7a4f] text-white' : 'bg-white text-[#5a4633] border border-[#ebdcc3] hover:bg-[#f4ecd8]'">
        👥 Pelanggan ({{ allCustomers.length }})
      </button>
      <button @click="currentView = 'history'" type="button" class="px-4 py-2 text-xs font-bold rounded-xl shadow transition-all flex items-center gap-2"
              :class="currentView === 'history' ? 'bg-[#3b5998] text-white' : 'bg-white text-[#5a4633] border border-[#ebdcc3] hover:bg-[#f4ecd8]'">
        📜 Riwayat ({{ invoiceHistory.length }})
      </button>
      <button @click="currentView = 'dashboard'" type="button" class="px-4 py-2 text-xs font-bold rounded-xl shadow transition-all flex items-center gap-2"
              :class="currentView === 'dashboard' ? 'bg-[#725c43] text-white' : 'bg-white text-[#5a4633] border border-[#ebdcc3] hover:bg-[#f4ecd8]'">
        📊 Dashboard
      </button>
    </div>

    <!-- ================= VIEW 1: HALAMAN UTAMA / FORMULIR INVOIS ================= -->
    <div v-if="currentView === 'form'" class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      <div class="lg:col-span-7 bg-white rounded-2xl shadow-[0_4px_25px_-5px_rgba(180,138,87,0.1)] border border-[#ebdcc3] p-6 sm:p-8 space-y-6 print:hidden">
        <h2 class="font-serif text-lg font-bold text-[#5a4633] border-b border-[#f4ecd8] pb-3">Maklumat Pelanggan / Customer Info</h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="relative">
            <label class="block text-xs font-bold uppercase tracking-wider text-[#8c7355] mb-1">Nama Pelanggan (Ketik huruf...)</label>
            <input v-model="customerName" @focus="showCustomerDropdown = true" type="text" placeholder="Ketik nama (cth: A...)" 
                   class="w-full px-4 py-2.5 rounded-xl border border-[#ebdcc3] focus:ring-2 focus:ring-[#b48a57] outline-none text-sm bg-[#fffdfa]" />
            
            <div v-if="showCustomerDropdown && filteredCustomers.length > 0" 
                 class="absolute left-0 right-0 mt-1 bg-white border border-[#ebdcc3] rounded-xl shadow-lg z-20 max-h-40 overflow-y-auto">
              <div v-for="cust in filteredCustomers" :key="cust.id" @click="selectCustomer(cust)"
                   class="px-4 py-2.5 text-xs hover:bg-[#fdfbf7] cursor-pointer border-b border-gray-50 flex justify-between">
                <span class="font-bold text-[#3e3529]">{{ cust.name }}</span>
                <span class="text-gray-400">{{ cust.phone }}</span>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-[#8c7355] mb-1">No. Telefon</label>
            <input v-model="customerPhone" type="text" placeholder="+673 xxx xxxx" class="w-full px-4 py-2.5 rounded-xl border border-[#ebdcc3] focus:ring-2 focus:ring-[#b48a57] outline-none text-sm bg-[#fffdfa]" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="w-full overflow-hidden">
            <label class="block text-xs font-bold uppercase tracking-wider text-[#8c7355] mb-1">Tarikh Kunjungan</label>
            <div class="w-full max-w-full overflow-hidden rounded-xl border border-[#ebdcc3] bg-[#fffdfa] focus-within:ring-2 focus-within:ring-[#b48a57]">
              <input v-model="visitDate" type="date" class="w-full px-4 py-2.5 text-sm bg-transparent outline-none block box-border text-center sm:text-left" style="max-width: 100%;" />
            </div>
          </div>
          <div class="w-full overflow-hidden">
            <label class="block text-xs font-bold uppercase tracking-wider text-[#8c7355] mb-1">Cara Bayar</label>
            <select v-model="paymentMethod" class="w-full px-4 py-2.5 rounded-xl border border-[#ebdcc3] focus:ring-2 focus:ring-[#b48a57] outline-none text-sm bg-[#fffdfa]">
              <option value="Cash">Cash</option>
              <option value="Transfer BIBD">Transfer BIBD</option>
              <option value="Transfer Baiduri">Transfer Baiduri</option>
              <option value="QR Pay BIBD">QR Pay BIBD</option>
              <option value="QR PAY BAIDURI">QR PAY BAIDURI</option>
              <option value="Debit Card">Debit Card</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="text-xs font-bold uppercase tracking-wider text-[#8c7355]">Terapis / Therapist</label>
              <button @click="showAddTherapistModal = true" type="button" class="text-[10px] font-bold text-[#b48a57] hover:underline">+ Terapis Baru / Urus</button>
            </div>
            <select v-model="selectedTherapist" class="w-full px-4 py-2.5 rounded-xl border border-[#ebdcc3] focus:ring-2 focus:ring-[#b48a57] outline-none text-sm bg-[#fffdfa]">
              <option value="">-- Tanpa Terapis --</option>
              <option v-for="thp in availableTherapists" :key="thp.id" :value="thp.name">{{ thp.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-[#8c7355] mb-1">Catatan / Remarks</label>
            <input v-model="remarks" type="text" placeholder="Catatan tambahan..." class="w-full px-4 py-2.5 rounded-xl border border-[#ebdcc3] focus:ring-2 focus:ring-[#b48a57] outline-none text-sm bg-[#fffdfa]" />
          </div>
        </div>

        <div v-if="showAddTherapistModal" class="bg-[#fdfbf7] p-4 rounded-xl border border-[#b48a57] space-y-4">
          <h4 class="font-serif text-sm font-bold text-[#5a4633]">Kelola Terapis (Tambah / Hapus)</h4>
          <div class="flex gap-2">
            <input v-model="newTherapistName" type="text" placeholder="Nama Terapis Baru" class="flex-1 px-3 py-2 rounded-lg border border-[#ebdcc3] text-xs bg-white outline-none" />
            <button @click="saveNewTherapistToDB" type="button" class="px-3 py-2 bg-[#2d7a4f] text-white rounded-lg text-xs font-bold">Simpan</button>
          </div>
          <div class="space-y-1.5 max-h-40 overflow-y-auto bg-white p-2 rounded-lg border border-[#ebdcc3]">
            <p class="text-[10px] font-bold text-gray-400 uppercase">Daftar Terapis Aktif:</p>
            <div v-for="thp in availableTherapists" :key="thp.id" class="flex justify-between items-center text-xs py-1 px-2 border-b border-gray-50 last:border-none">
              <span class="font-semibold text-[#3e3529]">{{ thp.name }}</span>
              <button @click="deleteTherapistFromDB(thp.id, thp.name)" type="button" class="text-red-500 hover:text-red-700 font-bold text-[10px] bg-red-50 px-2 py-0.5 rounded">🗑️ Hapus</button>
            </div>
          </div>
          <div class="flex justify-end pt-1">
            <button @click="showAddTherapistModal = false" type="button" class="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold">Tutup</button>
          </div>
        </div>

        <div class="border-t border-[#f4ecd8] pt-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-serif text-lg font-bold text-[#5a4633]">Pilih Perkhidmatan / Select Services</h3>
            <div class="flex gap-2">
              <button @click="showManageServiceModal = true" type="button" class="text-xs font-bold bg-[#8c7355] text-white px-3 py-1.5 rounded-lg hover:bg-[#725c43] transition-colors">⚙️ Kelola Layanan</button>
              <button @click="addServiceRow" type="button" class="text-xs font-bold bg-[#f4ecd8] text-[#5a4633] px-3 py-1.5 rounded-lg hover:bg-[#ebdcc3] transition-colors">+ Baris</button>
            </div>
          </div>

          <!-- MODAL KELOLA LAYANAN -->
          <div v-if="showManageServiceModal" class="bg-[#fdfbf7] p-4 rounded-xl border border-[#b48a57] mb-4 space-y-4 shadow-md">
            <div class="flex justify-between items-center border-b border-[#ebdcc3] pb-2">
              <h4 class="font-serif text-sm font-bold text-[#5a4633]">⚙️ Kelola Perkhidmatan (Tambah / Edit / Hapus)</h4>
              <button @click="showManageServiceModal = false" class="text-xs font-bold text-gray-500 hover:text-gray-700">✕ Tutup</button>
            </div>

            <div class="bg-white p-3 rounded-xl border border-[#ebdcc3] space-y-2">
              <p class="text-[11px] font-bold text-[#8c7355] uppercase">➕ Tambah Layanan Baru</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input v-model="newServiceName" type="text" placeholder="Nama Rawatan Baru" class="px-3 py-2 rounded-lg border border-[#ebdcc3] text-xs bg-white outline-none" />
                <input v-model.number="newServicePrice" type="number" placeholder="Harga Default (B$)" class="px-3 py-2 rounded-lg border border-[#ebdcc3] text-xs bg-white outline-none" />
              </div>
              <div class="flex justify-end pt-1">
                <button @click="saveNewServiceToDB" type="button" class="px-3 py-1.5 bg-[#2d7a4f] text-white rounded-lg text-xs font-bold">Simpan Menu Baru</button>
              </div>
            </div>

            <div class="space-y-2 max-h-60 overflow-y-auto bg-white p-3 rounded-xl border border-[#ebdcc3]">
              <p class="text-[11px] font-bold text-[#8c7355] uppercase">📋 Daftar Layanan Tersedia ({{ availableServices.length }})</p>
              
              <div v-for="serv in availableServices" :key="serv.id" class="p-2.5 rounded-lg border border-gray-100 bg-[#fffdfa] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div v-if="editingServiceId !== serv.id" class="flex-1">
                  <p class="font-bold text-xs text-[#3e3529]">{{ serv.name }}</p>
                  <p class="text-[11px] text-[#b48a57] font-semibold">B$ {{ serv.default_price }}</p>
                </div>

                <div v-if="editingServiceId === serv.id" class="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  <input v-model="editServiceName" type="text" class="px-2 py-1 rounded border border-[#b48a57] text-xs bg-white outline-none" />
                  <input v-model.number="editServicePrice" type="number" class="px-2 py-1 rounded border border-[#b48a57] text-xs bg-white outline-none" />
                </div>

                <div class="flex items-center gap-1.5 self-end sm:self-center">
                  <template v-if="editingServiceId !== serv.id">
                    <button @click="startEditService(serv)" class="px-2.5 py-1 bg-[#3b5998] text-white rounded font-bold text-[10px]">✏️ Edit</button>
                    <button @click="deleteServiceFromDB(serv.id, serv.name)" class="px-2.5 py-1 bg-red-600 text-white rounded font-bold text-[10px]">🗑️ Hapus</button>
                  </template>
                  <template v-else>
                    <button @click="updateServiceInDB" class="px-2.5 py-1 bg-[#2d7a4f] text-white rounded font-bold text-[10px]">💾 Simpan</button>
                    <button @click="cancelEditService" class="px-2.5 py-1 bg-gray-300 text-gray-700 rounded font-bold text-[10px]">Batal</button>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div v-for="(item, index) in selectedServices" :key="index" class="bg-[#fffdfa] p-4 rounded-xl border border-[#ebdcc3] space-y-3 overflow-hidden">
              <div class="flex justify-between items-center">
                <span class="text-xs font-bold text-[#8c7355]">Item #{{ index + 1 }}</span>
                <button @click="removeServiceRow(index)" type="button" class="text-red-400 hover:text-red-600 text-xs font-bold" :disabled="selectedServices.length === 1">Hapus</button>
              </div>
              
              <div class="w-full">
                <input v-model="serviceSearchKeywords[index]" type="text" placeholder="🔍 Ketik untuk cari layanan..." 
                       class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] text-xs bg-white outline-none mb-2 focus:ring-1 focus:ring-[#b48a57]" />
                <select @change="onServiceSelect(index, $event)" class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] text-sm bg-white outline-none">
                  <option value="">-- Pilih Rawatan --</option>
                  <option v-for="serv in getFilteredServices(index)" :key="serv.id" :value="serv.id" :selected="serv.id === item.service_id">
                    {{ serv.name }} (B$ {{ serv.default_price }})
                  </option>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-[10px] uppercase font-bold text-[#8c7355]">Qty</label>
                  <input v-model.number="item.qty" type="number" min="1" class="w-full px-3 py-1.5 rounded-lg border border-[#ebdcc3] text-sm bg-white outline-none" />
                </div>
                <div>
                  <label class="text-[10px] uppercase font-bold text-[#8c7355]">Diskon</label>
                  <input v-model.number="item.discount" type="number" min="0" class="w-full px-3 py-1.5 rounded-lg border border-[#ebdcc3] text-sm bg-white outline-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="border-t border-[#f4ecd8] pt-6">
          <h3 class="font-serif text-sm font-bold text-[#5a4633] mb-2">Diskaun Transaksi / Transaction Discount</h3>
          <div class="flex gap-2 mb-3">
            <button @click="discountType = 'percent'" type="button" class="flex-1 py-2 text-xs font-bold rounded-lg border transition-all"
                    :class="discountType === 'percent' ? 'bg-[#b48a57] text-white border-[#b48a57]' : 'bg-[#fffdfa] text-[#5a4633] border-[#ebdcc3]'">Peratus %</button>
            <button @click="discountType = 'nominal'" type="button" class="flex-1 py-2 text-xs font-bold rounded-lg border transition-all"
                    :class="discountType === 'nominal' ? 'bg-[#b48a57] text-white border-[#b48a57]' : 'bg-[#fffdfa] text-[#5a4633] border-[#ebdcc3]'">Nominal B$</button>
          </div>
          <input v-model.number="discountValue" type="number" min="0" placeholder="Masukkan nilai diskon transaksi" 
                 class="w-full px-4 py-2.5 rounded-xl border border-[#ebdcc3] text-sm bg-[#fffdfa] outline-none focus:ring-1 focus:ring-[#b48a57]" />
        </div>

        <div class="grid grid-cols-2 gap-3 pt-4 border-t border-[#f4ecd8]">
          <button @click="handlePrint" type="button" class="py-3 px-4 bg-[#8c7355] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow hover:bg-[#725c43] transition-all">🖨️ Cetak / PDF</button>
          <button @click="copyInvoiceText" type="button" class="py-3 px-4 bg-[#2d7a4f] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow hover:bg-[#235e3c] transition-all">📋 Salin Teks</button>
          <button @click="resetForm" type="button" class="py-3 px-4 bg-[#fffdfa] text-[#5a4633] border border-[#ebdcc3] font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-[#f4ecd8] transition-all">🔄 Reset</button>
          <button @click="saveToSupabase" :disabled="isSubmitting" type="button" class="py-3 px-4 bg-[#3b5998] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow hover:bg-[#324b81] transition-all">💾 Simpan Data</button>
        </div>

      </div>

      <div id="invoice-preview" class="lg:col-span-5 bg-white rounded-2xl shadow-[0_4px_25px_-5px_rgba(180,138,87,0.1)] border border-[#ebdcc3] p-6 sm:p-8 sticky top-6">
        <div class="text-center border-b border-[#ebdcc3] pb-6 mb-6 flex flex-col items-center">
          <img :src="logoImage" alt="Logo" class="w-16 h-16 rounded-full object-cover shadow-sm border border-[#ebdcc3] mb-2" />
          <h2 class="font-serif text-xl font-bold text-[#3e3529]">Yani Home & Spa</h2>
          <p class="text-[11px] text-[#8c7355]">Tanjong Bunut, Brunei Darussalam<br>+6737100696</p>
        </div>

        <div class="flex justify-between items-start mb-6 text-xs">
          <div>
            <span class="font-bold text-[#8c7355] uppercase tracking-wider block mb-1">INVOIS / INVOICE</span>
            <p class="font-semibold text-[#3e3529]">{{ invoiceNumber }}</p>
            <p class="text-[11px] text-gray-500">{{ visitDate }}</p>
          </div>
          <div class="text-right">
            <span class="font-bold text-[#8c7355] uppercase tracking-wider block mb-1">Bayaran</span>
            <span class="px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-semibold text-[10px]">{{ paymentMethod }}</span>
          </div>
        </div>

        <div class="bg-[#fdfbf7] p-3 rounded-xl border border-[#ebdcc3] mb-6 text-xs space-y-1">
          <span class="font-bold text-[#8c7355] block uppercase text-[10px]">Pelanggan / Customer</span>
          <p class="font-semibold text-[#3e3529]">{{ customerName || '-' }}</p>
          <p class="text-gray-500">{{ customerPhone || '-' }}</p>
          <p v-if="selectedTherapist" class="text-[11px] text-[#8c7355] font-semibold pt-1 border-t border-[#ebdcc3]">Terapis: {{ selectedTherapist }}</p>
          <p v-if="remarks" class="text-[11px] text-gray-600 italic pt-1 border-t border-[#ebdcc3]">Catatan: {{ remarks }}</p>
        </div>

        <div class="mb-6 overflow-x-auto">
          <table class="w-full text-xs text-left">
            <thead>
              <tr class="bg-[#b48a57] text-white">
                <th class="p-2 rounded-l-lg">No</th>
                <th class="p-2">Perkhidmatan</th>
                <th class="p-2 text-center">Qty</th>
                <th class="p-2 text-right rounded-r-lg">Harga</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#f4ecd8]">
              <tr v-for="(item, idx) in selectedServices" :key="idx">
                <td class="p-2 text-gray-500">{{ idx + 1 }}</td>
                <td class="p-2 font-medium text-[#3e3529]">{{ item.name || '(Belum diisi)' }}</td>
                <td class="p-2 text-center">{{ item.qty }}</td>
                <td class="p-2 text-right font-medium">{{ formatCurrency((item.price * item.qty) - item.discount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="border-t border-[#ebdcc3] pt-4 space-y-2 text-xs">
          <div class="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{{ formatCurrency(subtotal) }}</span>
          </div>
          <div v-if="transactionDiscountAmount > 0" class="flex justify-between text-red-600">
            <span>Diskon Transaksi</span>
            <span>- {{ formatCurrency(transactionDiscountAmount) }}</span>
          </div>
          <div class="flex justify-between text-base font-serif font-bold text-[#3e3529] pt-2 border-t border-[#ebdcc3]">
            <span>JUMLAH / TOTAL DUE</span>
            <span class="text-[#b48a57]">{{ formatCurrency(totalDue) }}</span>
          </div>
        </div>

        <div class="mt-8 text-center border-t border-[#f4ecd8] pt-4 text-[10px] text-[#8c7355] font-serif italic">
          🌸 Terima kasih kerana memilih Yani Home & Spa 🌸<br>Tanjong Bunut, Brunei Darussalam
        </div>
      </div>
    </div>

    <!-- ================= VIEW 1.2: KEUANGAN (PEMASUKAN & PENGELUARAN) ================= -->
    <div v-if="currentView === 'expenses'" class="max-w-5xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-[#ebdcc3] space-y-6 print:hidden">
      
      <div class="flex flex-col xl:flex-row justify-between items-start xl:items-center border-b border-[#f4ecd8] pb-5 gap-4">
        <div>
          <h3 class="font-serif text-xl font-bold text-[#5a4633]">💰 Kelola Keuangan (Pemasukan & Pengeluaran)</h3>
          <p class="text-xs text-[#8c7355] mt-0.5">Pantau aliran kas masuk, pemasukan manual, pengeluaran operasional, dan sisa saldo bersih</p>
        </div>
        
        <div class="flex items-center gap-2 flex-wrap w-full xl:w-auto justify-start xl:justify-end">
          <button @click="printFinancialReport" class="text-xs font-bold bg-[#8c7355] text-white px-3.5 py-2.5 rounded-xl shadow hover:bg-[#725c43] transition-all flex items-center gap-1.5">
            🖨️ Cetak Laporan
          </button>
          <button @click="editingIncomeId = null; newIncome = { title: '', amount: 0, income_date: new Date().toISOString().split('T')[0], category: 'Pendapatan Usaha', notes: '' }; showAddIncomeModal = true" class="text-xs font-bold bg-[#2d7a4f] text-white px-3.5 py-2.5 rounded-xl shadow hover:bg-[#235e3c] transition-all flex items-center gap-1.5">
            + Pemasukan
          </button>
          <button @click="editingExpenseId = null; newExpense = { title: '', amount: 0, expense_date: new Date().toISOString().split('T')[0], category: 'Bahan & Produk', notes: '' }; showAddExpenseModal = true" class="text-xs font-bold bg-[#8c4343] text-white px-3.5 py-2.5 rounded-xl shadow hover:bg-[#723535] transition-all flex items-center gap-1.5">
            + Pengeluaran
          </button>
          <button @click="currentView = 'form'" class="text-xs font-bold bg-[#3e3529] text-white px-3.5 py-2.5 rounded-xl shadow hover:bg-[#2c251d] transition-all">
            Kembali
          </button>
        </div>
      </div>

      <div class="space-y-4">
        <div class="flex flex-wrap justify-center gap-2 bg-[#fdfbf7] p-3 rounded-2xl border border-[#ebdcc3]">
          <button @click="expensePeriod = 'harian'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="expensePeriod === 'harian' ? 'bg-[#8c4343] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">📅 Harian</button>
          <button @click="expensePeriod = 'mingguan'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="expensePeriod === 'mingguan' ? 'bg-[#8c4343] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">📆 Mingguan</button>
          <button @click="expensePeriod = 'bulanan'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="expensePeriod === 'bulanan' ? 'bg-[#8c4343] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">🗓️ Bulanan</button>
          <button @click="expensePeriod = 'tahunan'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="expensePeriod === 'tahunan' ? 'bg-[#8c4343] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">📈 Tahunan</button>
          <button @click="expensePeriod = 'semua'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="expensePeriod === 'semua' ? 'bg-[#8c4343] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">🌐 Semua</button>
        </div>

        <div v-if="expensePeriod !== 'semua'" class="p-4 rounded-xl bg-[#fffdfa] border border-[#ebdcc3] flex flex-wrap items-center justify-between gap-4 text-xs">
          <div v-if="expensePeriod === 'harian'" class="flex items-center gap-2 w-full sm:w-auto">
            <span class="font-bold text-[#5a4633]">Pilih Tarikh:</span>
            <input v-model="expenseDateDaily" type="date" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
          </div>

          <div v-if="expensePeriod === 'mingguan'" class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <span class="font-bold text-[#5a4633]">Minggu Ke:</span>
            <select v-model.number="expenseWeekNum" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
              <option v-for="w in 52" :key="w" :value="w">Minggu ke-{{ w }}</option>
            </select>
            <span class="font-bold text-[#5a4633]">Tahun:</span>
            <select v-model.number="expenseWeekYear" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
              <option v-for="y in [currentYear, currentYear+1, currentYear+2]" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>

          <div v-if="expensePeriod === 'bulanan'" class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <span class="font-bold text-[#5a4633]">Bulan:</span>
            <select v-model.number="expenseMonth" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
              <option v-for="m in 12" :key="m" :value="m">Bulan {{ m }}</option>
            </select>
            <span class="font-bold text-[#5a4633]">Tahun:</span>
            <select v-model.number="expenseMonthYear" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
              <option v-for="y in [currentYear, currentYear+1, currentYear+2]" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>

          <div v-if="expensePeriod === 'tahunan'" class="flex items-center gap-2 w-full sm:w-auto">
            <span class="font-bold text-[#5a4633]">Pilih Tahun:</span>
            <select v-model.number="expenseYearAnnual" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
              <option v-for="y in [currentYear, currentYear+1, currentYear+2]" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>

          <span class="text-gray-500 italic">Menampilkan data periode terpilih</span>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
          <p class="text-xs font-bold text-emerald-800 uppercase tracking-wider">📥 Total Pemasukan</p>
          <p class="text-2xl font-serif font-bold text-emerald-900">{{ formatCurrency(filteredTotalIncome) }}</p>
          <p class="text-[10px] text-emerald-600">Invois ({{ formatCurrency(filteredInvoiceIncomeTotal) }}) + Manual ({{ formatCurrency(filteredManualIncomeTotal) }})</p>
        </div>

        <div class="p-5 rounded-2xl bg-red-50 border border-red-200 text-center space-y-1">
          <p class="text-xs font-bold text-red-800 uppercase tracking-wider">📤 Total Pengeluaran</p>
          <p class="text-2xl font-serif font-bold text-red-900">{{ formatCurrency(filteredExpenseTotal) }}</p>
          <p class="text-[10px] text-red-600">Pengeluaran periode ini</p>
        </div>

        <div class="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-center space-y-1 shadow-sm">
          <p class="text-xs font-bold text-amber-800 uppercase tracking-wider">💰 Saldo Tersedia (Net)</p>
          <p class="text-2xl font-serif font-bold" :class="filteredNetBalance >= 0 ? 'text-[#b48a57]' : 'text-red-600'">
            {{ formatCurrency(filteredNetBalance) }}
          </p>
          <p class="text-[10px] text-gray-600">Sisa saldo bersih</p>
        </div>
      </div>

      <!-- MODAL TAMBAH / EDIT PEMASUKAN MANUAL -->
      <div v-if="showAddIncomeModal" class="bg-[#fdfbf7] p-5 rounded-2xl border border-[#2d7a4f] space-y-4 shadow-md w-full">
        <h4 class="font-serif text-sm font-bold text-[#5a4633]">
          {{ editingIncomeId ? '✏️ Edit Rekod Pemasukan Manual' : '✍️ Tambah Rekod Pemasukan Manual Baru' }}
        </h4>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label class="block font-bold text-[#8c7355] mb-1">Keterangan / Sumber Pemasukan</label>
            <input v-model="newIncome.title" type="text" placeholder="Cth: Tambahan modal / Sumber lain..." class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
          </div>
          <div>
            <label class="block font-bold text-[#8c7355] mb-1">Jumlah (B$)</label>
            <input v-model.number="newIncome.amount" type="number" min="0" placeholder="0.00" class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none font-bold" />
          </div>

          <div class="w-full overflow-hidden">
            <label class="block font-bold text-[#8c7355] mb-1">Tarikh Pemasukan</label>
            <div class="w-full max-w-full overflow-hidden rounded-lg border border-[#ebdcc3] bg-white">
              <input v-model="newIncome.income_date" type="date" class="w-full px-3 py-2 text-xs bg-transparent outline-none block box-border" style="max-width: 100%;" />
            </div>
          </div>

          <div>
            <label class="block font-bold text-[#8c7355] mb-1">Kategori Pemasukan</label>
            <select v-model="newIncome.category" class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
              <option v-for="cat in incomeCategories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>

          <div class="sm:col-span-2">
            <label class="block font-bold text-[#8c7355] mb-1">Catatan Tambahan (Opsional)</label>
            <input v-model="newIncome.notes" type="text" placeholder="Keterangan tambahan..." class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button @click="showAddIncomeModal = false; editingIncomeId = null" type="button" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-xs font-bold">Batal</button>
          <button @click="saveOrUpdateIncome" type="button" class="px-4 py-2 bg-[#2d7a4f] text-white rounded-xl text-xs font-bold">
            {{ editingIncomeId ? 'Simpan Perubahan' : 'Simpan Pemasukan' }}
          </button>
        </div>
      </div>

      <!-- MODAL TAMBAH / EDIT PENGELUARAN -->
      <div v-if="showAddExpenseModal" class="bg-[#fdfbf7] p-5 rounded-2xl border border-[#8c4343] space-y-4 shadow-md w-full">
        <h4 class="font-serif text-sm font-bold text-[#5a4633]">
          {{ editingExpenseId ? '✏️ Edit Rekod Pengeluaran' : '✍️ Tambah Rekod Pengeluaran Baru' }}
        </h4>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label class="block font-bold text-[#8c7355] mb-1">Keterangan / Nama Pengeluaran</label>
            <input v-model="newExpense.title" type="text" placeholder="Cth: Beli minyak urut & herba..." class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
          </div>
          <div>
            <label class="block font-bold text-[#8c7355] mb-1">Jumlah (B$)</label>
            <input v-model.number="newExpense.amount" type="number" min="0" placeholder="0.00" class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none font-bold" />
          </div>

          <div class="w-full overflow-hidden">
            <label class="block font-bold text-[#8c7355] mb-1">Tarikh Pengeluaran</label>
            <div class="w-full max-w-full overflow-hidden rounded-lg border border-[#ebdcc3] bg-white">
              <input v-model="newExpense.expense_date" type="date" class="w-full px-3 py-2 text-xs bg-transparent outline-none block box-border" style="max-width: 100%;" />
            </div>
          </div>

          <div>
            <label class="block font-bold text-[#8c7355] mb-1">Kategori Pengeluaran</label>
            <select v-model="newExpense.category" class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
              <option v-for="cat in expenseCategories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>

          <div class="sm:col-span-2">
            <label class="block font-bold text-[#8c7355] mb-1">Catatan Tambahan (Opsional)</label>
            <input v-model="newExpense.notes" type="text" placeholder="Keterangan tambahan..." class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button @click="showAddExpenseModal = false; editingExpenseId = null" type="button" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-xs font-bold">Batal</button>
          <button @click="saveOrUpdateExpense" type="button" class="px-4 py-2 bg-[#8c4343] text-white rounded-xl text-xs font-bold">
            {{ editingExpenseId ? 'Simpan Perubahan' : 'Simpan Pengeluaran' }}
          </button>
        </div>
      </div>

      <!-- DAFTAR PEMASUKAN MANUAL -->
      <div class="bg-[#fffdfa] p-5 rounded-2xl border border-[#ebdcc3] space-y-4">
        <h4 class="font-serif text-sm font-bold text-[#5a4633]">📥 Rekod Pemasukan Manual ({{ filteredIncomesByPeriod.length }} Rekod)</h4>

        <div v-if="filteredIncomesByPeriod.length === 0" class="text-xs text-gray-500 text-center py-6 italic">
          Tidak ada rekod pemasukan manual pada periode ini.
        </div>

        <div v-else class="space-y-3 max-h-[350px] overflow-y-auto pr-2">
          <div v-for="inc in filteredIncomesByPeriod" :key="inc.id" class="p-4 rounded-xl border border-[#ebdcc3] bg-white text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
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
                <button @click="startEditIncome(inc)" class="px-2.5 py-1.5 bg-[#3b5998] text-white rounded-lg font-bold text-[10px] shadow hover:bg-[#324b81]">✏️ Edit</button>
                <button @click="deleteIncomeFromDB(inc.id, inc.title)" class="px-2.5 py-1.5 bg-red-600 text-white rounded-lg font-bold text-[10px] shadow hover:bg-red-700">🗑️ Hapus</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- DAFTAR PENGELUARAN -->
      <div class="bg-[#fffdfa] p-5 rounded-2xl border border-[#ebdcc3] space-y-4">
        <h4 class="font-serif text-sm font-bold text-[#5a4633]">📤 Rekod Riwayat Pengeluaran ({{ filteredExpensesByPeriod.length }} Rekod)</h4>

        <div v-if="filteredExpensesByPeriod.length === 0" class="text-xs text-gray-500 text-center py-6 italic">
          Tidak ada rekod pengeluaran pada periode ini.
        </div>

        <div v-else class="space-y-3 max-h-[350px] overflow-y-auto pr-2">
          <div v-for="exp in filteredExpensesByPeriod" :key="exp.id" class="p-4 rounded-xl border border-[#ebdcc3] bg-white text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
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
                <button @click="startEditExpense(exp)" class="px-2.5 py-1.5 bg-[#3b5998] text-white rounded-lg font-bold text-[10px] shadow hover:bg-[#324b81]">✏️ Edit</button>
                <button @click="deleteExpenseFromDB(exp.id, exp.title)" class="px-2.5 py-1.5 bg-red-600 text-white rounded-lg font-bold text-[10px] shadow hover:bg-red-700">🗑️ Hapus</button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- ================= LAPORAN KEUANGAN KHUSUS CETAK / PDF ================= -->
    <div id="financial-report-print" class="hidden print:block bg-white text-[#3e3529] p-8 space-y-6 w-full">
      <div class="text-center border-b border-[#ebdcc3] pb-4 mb-4 flex flex-col items-center">
        <h2 class="font-serif text-2xl font-bold uppercase text-[#3e3529]">Yani Home & Spa</h2>
        <p class="text-xs text-[#8c7355]">LAPORAN KECILAN KEUANGAN (FINANCIAL REPORT)</p>
        <p class="text-[11px] text-gray-500 mt-1">Periode Filter: <span class="uppercase font-bold">{{ expensePeriod }}</span></p>
      </div>

      <!-- Ringkasan Keuangan Cetak -->
      <div class="grid grid-cols-3 gap-4 border border-[#ebdcc3] p-4 rounded-xl text-xs">
        <div class="text-center">
          <p class="font-bold text-emerald-800 uppercase">Total Pemasukan</p>
          <p class="text-base font-serif font-bold text-emerald-900 mt-1">{{ formatCurrency(filteredTotalIncome) }}</p>
        </div>
        <div class="text-center border-x border-[#ebdcc3]">
          <p class="font-bold text-red-800 uppercase">Total Pengeluaran</p>
          <p class="text-base font-serif font-bold text-red-900 mt-1">{{ formatCurrency(filteredExpenseTotal) }}</p>
        </div>
        <div class="text-center">
          <p class="font-bold text-amber-800 uppercase">Saldo Bersih (Net)</p>
          <p class="text-base font-serif font-bold text-[#b48a57] mt-1">{{ formatCurrency(filteredNetBalance) }}</p>
        </div>
      </div>

      <!-- Tabel Pemasukan -->
      <div class="space-y-2">
        <h3 class="font-serif font-bold text-sm text-[#5a4633] uppercase">A. Rincian Pemasukan</h3>
        <table class="w-full text-xs text-left border-collapse border border-[#ebdcc3]">
          <thead>
            <tr class="bg-[#f4ecd8] text-[#5a4633]">
              <th class="border border-[#ebdcc3] p-2">Tarikh</th>
              <th class="border border-[#ebdcc3] p-2">Sumber / Keterangan</th>
              <th class="border border-[#ebdcc3] p-2">Kategori</th>
              <th class="border border-[#ebdcc3] p-2 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="inc in filteredIncomesByPeriod" :key="inc.id">
              <td class="border border-[#ebdcc3] p-2">{{ inc.income_date }}</td>
              <td class="border border-[#ebdcc3] p-2">{{ inc.title }}</td>
              <td class="border border-[#ebdcc3] p-2">{{ inc.category }}</td>
              <td class="border border-[#ebdcc3] p-2 text-right font-bold text-emerald-700">+ {{ formatCurrency(inc.amount) }}</td>
            </tr>
            <tr v-if="filteredIncomesByPeriod.length === 0">
              <td colspan="4" class="border border-[#ebdcc3] p-3 text-center text-gray-400 italic">Tiada rekod pemasukan manual.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Tabel Pengeluaran -->
      <div class="space-y-2">
        <h3 class="font-serif font-bold text-sm text-[#5a4633] uppercase">B. Rincian Pengeluaran</h3>
        <table class="w-full text-xs text-left border-collapse border border-[#ebdcc3]">
          <thead>
            <tr class="bg-[#f4ecd8] text-[#5a4633]">
              <th class="border border-[#ebdcc3] p-2">Tarikh</th>
              <th class="border border-[#ebdcc3] p-2">Keterangan / Item</th>
              <th class="border border-[#ebdcc3] p-2">Kategori</th>
              <th class="border border-[#ebdcc3] p-2 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="exp in filteredExpensesByPeriod" :key="exp.id">
              <td class="border border-[#ebdcc3] p-2">{{ exp.expense_date }}</td>
              <td class="border border-[#ebdcc3] p-2">{{ exp.title }}</td>
              <td class="border border-[#ebdcc3] p-2">{{ exp.category }}</td>
              <td class="border border-[#ebdcc3] p-2 text-right font-bold text-red-600">- {{ formatCurrency(exp.amount) }}</td>
            </tr>
            <tr v-if="filteredExpensesByPeriod.length === 0">
              <td colspan="4" class="border border-[#ebdcc3] p-3 text-center text-gray-400 italic">Tiada rekod pengeluaran.</td>
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

    <!-- ================= VIEW 1.5: KALENDAR BOOKING ================= -->
    <div v-if="currentView === 'calendar'" class="max-w-7xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-[#ebdcc3] space-y-6">
      
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#f4ecd8] pb-4 gap-4">
        <div>
          <h3 class="font-serif text-xl font-bold text-[#5a4633]">📅 Kalendar Jadwal Booking Berdasarkan Terapis</h3>
          <p class="text-xs text-[#8c7355]">Jadwal harian dikelompokkan otomatis ke dalam kolom masing-masing terapis (Sistem validasi jam bentrok aktif)</p>
        </div>
        
        <div class="flex items-center gap-3">
          <button @click="showAddBookingModal = true" class="text-xs font-bold bg-[#b48a57] text-white px-4 py-2.5 rounded-xl shadow hover:bg-[#a07747] transition-all">
            + Tambah Booking Baru
          </button>
          <button @click="currentView = 'form'" class="text-xs font-bold bg-[#3e3529] text-white px-4 py-2.5 rounded-xl shadow">Kembali</button>
        </div>
      </div>

      <div v-if="showAddBookingModal" class="bg-[#fdfbf7] p-5 rounded-2xl border border-[#b48a57] space-y-4 shadow-md w-full overflow-hidden">
        <h4 class="font-serif text-sm font-bold text-[#5a4633]">📥 Salin & Catat Pesan Booking WhatsApp (Dilengkapi Jam Mulai & Selesai)</h4>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label class="block font-bold text-[#8c7355] mb-1">Nama Pelanggan</label>
            <input v-model="newBooking.customer_name" type="text" placeholder="Nama dari WA..." class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
          </div>
          <div>
            <label class="block font-bold text-[#8c7355] mb-1">No. Telefon WhatsApp</label>
            <input v-model="newBooking.customer_phone" type="text" placeholder="+673..." class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
          </div>
          
          <div class="w-full overflow-hidden">
            <label class="block font-bold text-[#8c7355] mb-1">Tanggal Booking</label>
            <div class="w-full max-w-full overflow-hidden rounded-lg border border-[#ebdcc3] bg-white">
              <input v-model="newBooking.booking_date" type="date" class="w-full px-3 py-2 text-xs bg-transparent outline-none block box-border" style="max-width: 100%;" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-bold text-[#8c7355] mb-1">Jam Mulai</label>
              <input v-model="newBooking.booking_start_time" type="time" class="w-full px-3 py-2 text-xs bg-white rounded-lg border border-[#ebdcc3] outline-none" />
            </div>
            <div>
              <label class="block font-bold text-[#8c7355] mb-1">Jam Selesai</label>
              <input v-model="newBooking.booking_end_time" type="time" class="w-full px-3 py-2 text-xs bg-white rounded-lg border border-[#ebdcc3] outline-none" />
            </div>
          </div>

          <div>
            <label class="block font-bold text-[#8c7355] mb-1">Terapis Ditugaskan</label>
            <select v-model="newBooking.therapist" class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
              <option value="">-- Pilih Terapis --</option>
              <option v-for="thp in availableTherapists" :key="thp.id" :value="thp.name">{{ thp.name }}</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-[#8c7355] mb-1">Rincian Pesan / Catatan WA</label>
            <input v-model="newBooking.notes" type="text" placeholder="Cth: Pesan khusus..." class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
          </div>

          <div class="sm:col-span-2 space-y-2">
            <label class="block font-bold text-[#8c7355]">Pilih Rawatan (Bisa lebih dari 1)</label>
            <input v-model="bookingServiceSearchKeyword" type="text" placeholder="🔍 Cari nama rawatan..." class="w-full px-3 py-1.5 rounded-lg border border-[#ebdcc3] text-xs bg-white outline-none mb-2" />
            
            <div class="max-h-44 overflow-y-auto space-y-1 bg-white p-3 rounded-xl border border-[#ebdcc3]">
              <div v-for="serv in filteredServicesForBooking" :key="serv.id" class="flex items-center gap-2 py-1 border-b border-gray-50 last:border-none">
                <input type="checkbox" :id="'srv-' + serv.id" :value="serv.id" v-model="newBooking.selected_services" class="w-4 h-4 text-[#b48a57] rounded border-[#ebdcc3]" />
                <label :for="'srv-' + serv.id" class="text-xs text-[#3e3529] cursor-pointer flex-1 flex justify-between">
                  <span>{{ serv.name }}</span>
                  <span class="font-bold text-[#b48a57]">B$ {{ serv.default_price }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button @click="showAddBookingModal = false" type="button" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-xs font-bold">Batal</button>
          <button @click="saveBookingToDB" type="button" class="px-4 py-2 bg-[#2d7a4f] text-white rounded-xl text-xs font-bold">Simpan ke Kalendar</button>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between bg-[#fffdfa] p-3 rounded-xl border border-[#ebdcc3] text-xs gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <span class="font-bold text-[#5a4633]">Pilih Bulan:</span>
          <select v-model.number="calendarViewMonth" class="px-3 py-1.5 rounded-lg border border-[#ebdcc3] bg-white outline-none font-bold">
            <option v-for="m in 12" :key="m" :value="m">Bulan {{ m }}</option>
          </select>
          <select v-model.number="calendarViewYear" class="px-3 py-1.5 rounded-lg border border-[#ebdcc3] bg-white outline-none font-bold">
            <option v-for="y in [currentYear, currentYear+1, currentYear+2]" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <p class="text-gray-500 italic">Klik pada tanggal untuk melihat jadwal</p>
      </div>

      <div class="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs w-full">
        <div class="font-bold text-[#b48a57] py-2">Ahad</div>
        <div class="font-bold text-[#5a4633] py-2">Senin</div>
        <div class="font-bold text-[#5a4633] py-2">Selasa</div>
        <div class="font-bold text-[#5a4633] py-2">Rabu</div>
        <div class="font-bold text-[#5a4633] py-2">Khamis</div>
        <div class="font-bold text-[#5a4633] py-2">Jumaat</div>
        <div class="font-bold text-[#b48a57] py-2">Sabtu</div>

        <div v-for="(d, idx) in calendarDaysInMonth" :key="idx" 
             @click="d.dateStr && (selectedCalendarDate = d.dateStr)"
             class="min-h-[60px] sm:min-h-[85px] p-1 sm:p-2 rounded-xl border flex flex-col items-center justify-between transition-all cursor-pointer relative"
             :class="[
               !d.dayNum ? 'bg-gray-50 border-transparent cursor-default' : 
               selectedCalendarDate === d.dateStr ? 'bg-[#f4ecd8] border-[#b48a57] shadow-sm' : 'bg-[#fffdfa] border-[#ebdcc3] hover:bg-amber-50/50'
             ]">
          <span v-if="d.dayNum" class="font-bold text-xs" :class="selectedCalendarDate === d.dateStr ? 'text-[#b48a57]' : 'text-[#3e3529]'">{{ d.dayNum }}</span>
          <div v-if="d.dayNum && bookingList.filter(item => item.booking_date === d.dateStr).length > 0" class="my-auto">
            <span class="px-1.5 py-0.5 bg-[#2d7a4f] text-white rounded-full text-[9px] sm:text-[10px] font-bold shadow-sm whitespace-nowrap">
              {{ bookingList.filter(item => item.booking_date === d.dateStr).length }} sesi
            </span>
          </div>
          <span v-if="d.dayNum"></span>
        </div>
      </div>

      <div class="bg-[#fffdfa] p-5 rounded-2xl border border-[#ebdcc3] space-y-4">
        <h4 class="font-serif text-sm font-bold text-[#5a4633]">
          📋 Jadwal Sesi Tanggal: <span class="text-[#b48a57] font-bold">{{ selectedCalendarDate }}</span>
        </h4>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          <div v-for="(bookings, therapistName) in bookingsGroupedByTherapist" :key="therapistName" 
               class="bg-white rounded-xl border border-[#ebdcc3] shadow-sm overflow-hidden flex flex-col">
            <div class="bg-[#5a4633] text-white px-4 py-3 flex justify-between items-center">
              <span class="font-serif font-bold text-sm tracking-wide">👩‍⚕️ Terapis: {{ therapistName }}</span>
              <span class="bg-[#b48a57] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                {{ bookings.length }} sesi
              </span>
            </div>

            <div class="p-3 space-y-3 flex-1 bg-[#fffdfa] max-h-[500px] overflow-y-auto">
              <div v-if="bookings.length === 0" class="text-xs text-gray-400 text-center py-8 italic">
                Tidak ada sesi jadwal untuk {{ therapistName }} pada tanggal ini.
              </div>

              <div v-for="book in bookings" :key="book.id" class="p-3 rounded-lg border border-[#ebdcc3] bg-white text-xs space-y-2 shadow-sm">
                <div class="flex justify-between items-center border-b border-gray-100 pb-1.5">
                  <span class="font-bold text-xs bg-[#b48a57] text-white px-2.5 py-0.5 rounded">
                    ⏰ {{ book.booking_start_time || book.booking_time || '10:00' }} - {{ book.booking_end_time || 'Selesai' }}
                  </span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold"
                        :class="book.status === 'Terjadwal' ? 'bg-amber-100 text-amber-800' : book.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'">
                    {{ book.status }}
                  </span>
                </div>

                <div>
                  <p class="font-serif font-bold text-sm text-[#5a4633]">{{ book.customer_name }}</p>
                  <p class="text-gray-600 text-[11px]">📞 {{ book.customer_phone || '-' }}</p>
                </div>
                
                <div class="bg-[#fdfbf7] p-2 rounded border border-[#ebdcc3] space-y-0.5">
                  <p class="text-[10px] uppercase font-bold text-[#8c7355]">Rawatan Dipesan:</p>
                  <div v-for="(tr, ti) in book.treatments" :key="ti" class="text-[11px] text-[#3e3529] font-medium">
                    • {{ tr.name }} <span class="text-[#b48a57]">({{ formatCurrency(tr.price) }})</span>
                  </div>
                </div>

                <p v-if="book.notes" class="text-gray-500 text-[11px] italic">Catatan: "{{ book.notes }}"</p>

                <div class="flex flex-wrap gap-1.5 pt-1 border-t border-gray-100">
                  <button @click="useBookingForInvoice(book)" class="px-2 py-1 bg-[#2d7a4f] text-white rounded font-bold text-[10px] shadow hover:bg-[#235e3c]">
                    ✨ Buat Invois
                  </button>
                  <button v-if="book.status === 'Terjadwal'" @click="updateBookingStatus(book.id, 'Selesai')" class="px-2 py-1 bg-[#3b5998] text-white rounded font-bold text-[10px]">
                    Selesai
                  </button>
                  <button v-if="book.status === 'Terjadwal'" @click="updateBookingStatus(book.id, 'Batal')" class="px-2 py-1 bg-red-100 text-red-700 rounded font-bold text-[10px]">
                    Batal
                  </button>
                  <button @click="deleteBookingFromDB(book.id, book.customer_name)" class="px-2 py-1 bg-red-600 text-white rounded font-bold text-[10px] shadow hover:bg-red-700">
                    🗑️ Hapus
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- ================= VIEW 2: HALAMAN DAFTAR PELANGGAN ================= -->
    <div v-if="currentView === 'customers'" class="max-w-4xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-[#ebdcc3] space-y-6 print:hidden">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#f4ecd8] pb-4 gap-4">
        <div>
          <h3 class="font-serif text-xl font-bold text-[#5a4633]">👥 Rekod Daftar Pelanggan Berdasarkan Periode</h3>
          <p class="text-xs text-[#8c7355]">Pantau daftar kunjungan dan total belanja pelanggan per harian, mingguan, bulanan, tahunan, atau semua</p>
        </div>
        <button @click="currentView = 'form'" class="text-xs font-bold bg-[#b48a57] text-white px-4 py-2.5 rounded-xl shadow">Kembali ke Form</button>
      </div>

      <!-- FILTER PERIODE PELANGGAN -->
      <div class="space-y-4">
        <div class="flex flex-wrap justify-center gap-2 bg-[#fdfbf7] p-2 rounded-2xl border border-[#ebdcc3]">
          <button @click="customerPeriod = 'harian'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="customerPeriod === 'harian' ? 'bg-[#2d7a4f] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">📅 Harian</button>
          <button @click="customerPeriod = 'mingguan'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="customerPeriod === 'mingguan' ? 'bg-[#2d7a4f] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">📆 Mingguan</button>
          <button @click="customerPeriod = 'bulanan'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="customerPeriod === 'bulanan' ? 'bg-[#2d7a4f] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">🗓️ Bulanan</button>
          <button @click="customerPeriod = 'tahunan'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="customerPeriod === 'tahunan' ? 'bg-[#2d7a4f] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">📈 Tahunan</button>
          <button @click="customerPeriod = 'semua'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="customerPeriod === 'semua' ? 'bg-[#2d7a4f] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">🌐 Semua</button>
        </div>

        <div v-if="customerPeriod !== 'semua'" class="p-4 rounded-xl bg-[#fffdfa] border border-[#ebdcc3] flex flex-wrap items-center justify-between gap-4 text-xs">
          <div v-if="customerPeriod === 'harian'" class="flex items-center gap-2 w-full sm:w-auto">
            <span class="font-bold text-[#5a4633]">Pilih Tarikh:</span>
            <input v-model="customerDateDaily" type="date" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
          </div>

          <div v-if="customerPeriod === 'mingguan'" class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <span class="font-bold text-[#5a4633]">Minggu Ke:</span>
            <select v-model.number="customerWeekNum" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
              <option v-for="w in 52" :key="w" :value="w">Minggu ke-{{ w }}</option>
            </select>
            <span class="font-bold text-[#5a4633]">Tahun:</span>
            <select v-model.number="customerWeekYear" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
              <option v-for="y in [currentYear, currentYear+1, currentYear+2]" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>

          <div v-if="customerPeriod === 'bulanan'" class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <span class="font-bold text-[#5a4633]">Bulan:</span>
            <select v-model.number="customerMonth" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
              <option v-for="m in 12" :key="m" :value="m">Bulan {{ m }}</option>
            </select>
            <span class="font-bold text-[#5a4633]">Tahun:</span>
            <select v-model.number="customerMonthYear" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
              <option v-for="y in [currentYear, currentYear+1, currentYear+2]" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>

          <div v-if="customerPeriod === 'tahunan'" class="flex items-center gap-2 w-full sm:w-auto">
            <span class="font-bold text-[#5a4633]">Pilih Tahun:</span>
            <select v-model.number="customerYearAnnual" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
              <option v-for="y in [currentYear, currentYear+1, currentYear+2]" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>

          <span class="text-gray-500 italic">Menampilkan pelanggan yang aktif pada periode ini</span>
        </div>
      </div>

      <div v-if="Object.keys(filteredCustomersByPeriod).length === 0" class="text-center py-10 text-gray-500 text-xs italic">
        Tiada rekod kunjungan pelanggan pada periode ini.
      </div>
      
      <div v-else class="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        <div v-for="(customersGroup, letter) in filteredCustomersByPeriod" :key="letter" class="space-y-2">
          <div class="font-serif font-bold text-sm text-[#2d7a4f] border-b border-[#ebdcc3] pb-1 sticky top-0 bg-white z-10">{{ letter }}</div>
          <div v-for="cust in customersGroup" :key="cust.id" class="p-4 rounded-xl border border-[#ebdcc3] bg-[#fffdfa] text-xs space-y-1 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <p class="font-bold text-[#5a4633] text-sm">{{ cust.name }}</p>
              <p class="text-gray-600">📞 {{ cust.phone || '–' }} · 📅 Kunjungan Terakhir: {{ cust.lastVisit }}</p>
            </div>
            <div class="text-right">
              <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">{{ cust.visitCount }}x Kunjungan</span>
              <p class="font-serif font-bold text-sm text-[#b48a57] mt-1">B$ {{ cust.totalSpent.toFixed(2) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= VIEW 3: HALAMAN RIWAYAT INVOIS ================= -->
    <div v-if="currentView === 'history'" class="max-w-4xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-[#ebdcc3] space-y-6 print:hidden">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#f4ecd8] pb-4 gap-4">
        <div>
          <h3 class="font-serif text-xl font-bold text-[#5a4633]">📜 Rekod Riwayat / Invois Berdasarkan Periode</h3>
          <p class="text-xs text-[#8c7355]">Pantau senarai invois dan jumlah pendapatan transaksi per harian, mingguan, bulanan, tahunan, atau semua</p>
        </div>
        <button @click="currentView = 'form'" class="text-xs font-bold bg-[#3b5998] text-white px-4 py-2.5 rounded-xl shadow">Kembali ke Form</button>
      </div>

      <!-- FILTER PERIODE RIWAYAT INVOIS -->
      <div class="space-y-4">
        <div class="flex flex-wrap justify-center gap-2 bg-[#fdfbf7] p-2 rounded-2xl border border-[#ebdcc3]">
          <button @click="historyPeriod = 'harian'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="historyPeriod === 'harian' ? 'bg-[#3b5998] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">📅 Harian</button>
          <button @click="historyPeriod = 'mingguan'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="historyPeriod === 'mingguan' ? 'bg-[#3b5998] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">📆 Mingguan</button>
          <button @click="historyPeriod = 'bulanan'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="historyPeriod === 'bulanan' ? 'bg-[#3b5998] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">🗓️ Bulanan</button>
          <button @click="historyPeriod = 'tahunan'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="historyPeriod === 'tahunan' ? 'bg-[#3b5998] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">📈 Tahunan</button>
          <button @click="historyPeriod = 'semua'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="historyPeriod === 'semua' ? 'bg-[#3b5998] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">🌐 Semua</button>
        </div>

        <div v-if="historyPeriod !== 'semua'" class="p-4 rounded-xl bg-[#fffdfa] border border-[#ebdcc3] flex flex-wrap items-center justify-between gap-4 text-xs">
          <div v-if="historyPeriod === 'harian'" class="flex items-center gap-2 w-full sm:w-auto">
            <span class="font-bold text-[#5a4633]">Pilih Tarikh:</span>
            <input v-model="historyDateDaily" type="date" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
          </div>

          <div v-if="historyPeriod === 'mingguan'" class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <span class="font-bold text-[#5a4633]">Minggu Ke:</span>
            <select v-model.number="historyWeekNum" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
              <option v-for="w in 52" :key="w" :value="w">Minggu ke-{{ w }}</option>
            </select>
            <span class="font-bold text-[#5a4633]">Tahun:</span>
            <select v-model.number="historyWeekYear" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
              <option v-for="y in [currentYear, currentYear+1, currentYear+2]" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>

          <div v-if="historyPeriod === 'bulanan'" class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <span class="font-bold text-[#5a4633]">Bulan:</span>
            <select v-model.number="historyMonth" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
              <option v-for="m in 12" :key="m" :value="m">Bulan {{ m }}</option>
            </select>
            <span class="font-bold text-[#5a4633]">Tahun:</span>
            <select v-model.number="historyMonthYear" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
              <option v-for="y in [currentYear, currentYear+1, currentYear+2]" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>

          <div v-if="historyPeriod === 'tahunan'" class="flex items-center gap-2 w-full sm:w-auto">
            <span class="font-bold text-[#5a4633]">Pilih Tahun:</span>
            <select v-model.number="historyYearAnnual" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
              <option v-for="y in [currentYear, currentYear+1, currentYear+2]" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>

          <span class="text-gray-500 italic">Menampilkan {{ filteredHistoryList.length }} rekod (Total: {{ formatCurrency(filteredHistoryTotalAmount) }})</span>
        </div>
      </div>

      <div v-if="filteredHistoryList.length === 0" class="text-center py-10 text-gray-500 text-xs italic">
        Tiada rekod invois pada periode ini.
      </div>

      <div v-else class="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        <div v-for="(inv, idx) in filteredHistoryList" :key="inv.id || idx" class="p-4 rounded-xl border border-[#ebdcc3] bg-[#fffdfa] text-xs space-y-2 shadow-sm">
          <div class="flex justify-between items-center">
            <span class="font-bold font-serif text-[#5a4633] text-sm">SW-{{ inv.invoice_date ? inv.invoice_date.replace(/-/g, '') : '20260801' }}-00{{ filteredHistoryList.length - idx }}</span>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">LUNAS</span>
              <button @click="deleteInvoiceHistory(inv.id, inv.customer_name)" class="px-2.5 py-1 bg-red-600 text-white rounded font-bold text-[10px] shadow hover:bg-red-700 transition-all">
                🗑️ Hapus Invois
              </button>
            </div>
          </div>
          <div class="space-y-0.5 text-gray-600">
            <p>👤 <strong>{{ inv.customer_name }}</strong> ({{ inv.customer_wa || '-' }})</p>
            <p>📅 {{ inv.invoice_date }} · 🕐 {{ formatDateTime(inv.created_at).combined }} · Terapis: {{ inv.therapist || '-' }}</p>
            <p>{{ Array.isArray(inv.treatments) ? inv.treatments.length : 1 }} perkhidmatan · Pembayaran via {{ inv.payment_method }}</p>
          </div>
          <div class="pt-2 border-t border-[#f4ecd8] flex justify-between items-center">
            <span class="text-[10px] text-gray-500 italic">{{ inv.remarks || 'Tiada catatan' }}</span>
            <span class="font-bold text-[#b48a57] text-sm">B$ {{ Number(inv.total_amount).toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= VIEW 4: HALAMAN DASHBOARD STATISTIK ================= -->
    <div v-if="currentView === 'dashboard'" class="max-w-4xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-[#ebdcc3] space-y-6 print:hidden">
      
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#f4ecd8] pb-4 gap-4">
        <div>
          <h3 class="font-serif text-xl font-bold text-[#5a4633]">📊 Dashboard Statistik & Analitik</h3>
          <p class="text-xs text-[#8c7355]">Analisis mendalam laporan harian, mingguan, bulanan, tahunan, atau semua</p>
        </div>
        <button @click="currentView = 'form'" class="text-xs font-bold bg-[#3e3529] text-white px-4 py-2 rounded-xl shadow">Kembali ke Form</button>
      </div>

      <div class="flex flex-wrap justify-center gap-2 bg-[#fdfbf7] p-2 rounded-2xl border border-[#ebdcc3]">
        <button @click="dashboardPeriod = 'harian'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="dashboardPeriod === 'harian' ? 'bg-[#b48a57] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">📅 Harian</button>
        <button @click="dashboardPeriod = 'mingguan'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="dashboardPeriod === 'mingguan' ? 'bg-[#b48a57] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">📆 Mingguan</button>
        <button @click="dashboardPeriod = 'bulanan'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="dashboardPeriod === 'bulanan' ? 'bg-[#b48a57] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">🗓️ Bulanan</button>
        <button @click="dashboardPeriod = 'tahunan'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="dashboardPeriod === 'tahunan' ? 'bg-[#b48a57] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">📈 Tahunan</button>
        <button @click="dashboardPeriod = 'semua'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="dashboardPeriod === 'semua' ? 'bg-[#b48a57] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">🌐 Semua</button>
      </div>

      <div v-if="dashboardPeriod !== 'semua'" class="p-4 rounded-xl bg-[#fffdfa] border border-[#ebdcc3] flex flex-wrap items-center justify-between gap-4 text-xs">
        <div v-if="dashboardPeriod === 'harian'" class="flex items-center gap-2 w-full sm:w-auto">
          <span class="font-bold text-[#5a4633]">Pilih Tarikh:</span>
          <div class="w-full sm:w-48 overflow-hidden rounded-lg border border-[#ebdcc3] bg-white">
            <input v-model="selectedDateDaily" type="date" class="w-full px-3 py-2 text-xs bg-transparent outline-none block box-border" style="max-width: 100%;" />
          </div>
        </div>

        <div v-if="dashboardPeriod === 'mingguan'" class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <span class="font-bold text-[#5a4633]">Minggu Ke:</span>
          <select v-model.number="selectedWeekNum" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
            <option v-for="w in 52" :key="w" :value="w">Minggu ke-{{ w }}</option>
          </select>
          <span class="font-bold text-[#5a4633]">Tahun:</span>
          <select v-model.number="selectedWeekYear" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
            <option v-for="y in [currentYear, currentYear+1, currentYear+2, currentYear+3, currentYear+4]" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>

        <div v-if="dashboardPeriod === 'bulanan'" class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <span class="font-bold text-[#5a4633]">Bulan:</span>
          <select v-model.number="selectedMonth" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
            <option v-for="m in 12" :key="m" :value="m">Bulan {{ m }}</option>
          </select>
          <span class="font-bold text-[#5a4633]">Tahun:</span>
          <select v-model.number="selectedMonthYear" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
            <option v-for="y in [currentYear, currentYear+1, currentYear+2, currentYear+3, currentYear+4]" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>

        <div v-if="dashboardPeriod === 'tahunan'" class="flex items-center gap-2 w-full sm:w-auto">
          <span class="font-bold text-[#5a4633]">Pilih Tahun:</span>
          <select v-model.number="selectedYearAnnual" class="px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
            <option v-for="y in [currentYear, currentYear+1, currentYear+2, currentYear+3, currentYear+4]" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>

        <span class="text-gray-500 italic">Menampilkan data terpilih</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="p-4 rounded-xl bg-[#fdfbf7] border border-[#ebdcc3] text-center space-y-1">
          <p class="text-xs font-bold text-[#8c7355] uppercase">📋 Total Invois</p>
          <p class="text-2xl font-serif font-bold text-[#5a4633]">{{ periodInvoiceCount }}</p>
          <p class="text-[10px] text-gray-500">Jumlah transaksi</p>
        </div>
        <div class="p-4 rounded-xl bg-[#fdfbf7] border border-[#ebdcc3] text-center space-y-1">
          <p class="text-xs font-bold text-[#8c7355] uppercase">💰 Total Pendapatan</p>
          <p class="text-2xl font-serif font-bold text-[#b48a57]">B$ {{ formatNumberID(periodTotalAmount) }}</p>
          <p class="text-[10px] text-gray-500">Akumulasi pendapatan</p>
        </div>
        <div class="p-4 rounded-xl bg-[#fdfbf7] border border-[#ebdcc3] text-center space-y-1">
          <p class="text-xs font-bold text-[#8c7355] uppercase">📈 Rata-rata Invois</p>
          <p class="text-2xl font-serif font-bold text-[#3e3529]">B$ {{ formatNumberID(periodAverageAmount) }}</p>
          <p class="text-[10px] text-gray-500">Per transaksi rata-rata</p>
        </div>
      </div>

      <div class="p-5 rounded-2xl bg-[#fffdfa] border border-[#ebdcc3] space-y-4">
        <div class="flex justify-between items-center">
          <h4 class="font-serif text-sm font-bold text-[#5a4633]">🔥 Grafik Perkhidmatan Paling Populer</h4>
          <span class="text-[10px] font-bold text-[#8c7355] uppercase">Berdasarkan Qty Terjual</span>
        </div>
        <div v-if="popularServicesStats.length === 0" class="text-xs text-gray-500 text-center py-4">Belum ada data layanan pada periode ini.</div>
        <div v-else class="space-y-3">
          <div v-for="serv in popularServicesStats" :key="serv.name" class="space-y-1">
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

      <div class="p-5 rounded-2xl bg-[#fffdfa] border border-[#ebdcc3] space-y-4">
        <div class="flex justify-between items-center">
          <h4 class="font-serif text-sm font-bold text-[#5a4633]">👩‍⚕️ Grafik Performa Terapis & Bonus 10% Bulanan</h4>
          <span class="text-[10px] font-bold text-[#8c7355] uppercase">Klien & Omset Komisi</span>
        </div>
        <div v-if="therapistPerformanceStats.length === 0" class="text-xs text-gray-500 text-center py-4">Belum ada data terapis pada periode ini.</div>
        <div v-else class="space-y-4">
          <div v-for="thp in therapistPerformanceStats" :key="thp.name" class="space-y-1.5 p-3 rounded-xl border border-[#ebdcc3] bg-[#fdfbf7]">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs font-semibold text-[#3e3529] gap-1">
              <span class="font-bold text-sm text-[#5a4633]">{{ thp.name }} ({{ thp.count }} Klien)</span>
              <div class="text-right">
                <span class="text-[#8c7355] font-medium mr-2">Omset: B$ {{ formatNumberID(thp.revenue) }}</span>
                <span class="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">🎁 Bonus 10%: B$ {{ formatNumberID(thp.bonus) }}</span>
              </div>
            </div>
            <div class="w-full bg-[#f4ecd8] h-3 rounded-full overflow-hidden">
              <div class="bg-[#2d7a4f] h-full rounded-full transition-all duration-500" :style="{ width: thp.percentage + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-5 rounded-2xl bg-[#fffdfa] border border-[#ebdcc3] space-y-4">
        <div class="flex justify-between items-center">
          <h4 class="font-serif text-sm font-bold text-[#5a4633]">📅 Analisis Profit Berdasarkan Hari (Senin - Ahad)</h4>
          <span class="text-[10px] font-bold text-[#8c7355] uppercase">Hari Paling Menguntungkan</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-7 gap-3 pt-2">
          <div v-for="d in profitByDayOfWeek" :key="d.day" class="bg-white p-3 rounded-xl border border-[#ebdcc3] flex flex-col justify-between items-center text-center space-y-2">
            <span class="text-xs font-bold text-[#5a4633]">{{ d.day }}</span>
            <div class="w-6 bg-[#f4ecd8] h-28 rounded-lg flex items-end overflow-hidden p-0.5">
              <div class="w-full bg-[#3b5998] rounded-md transition-all duration-500" :style="{ height: d.percentage + '%' }"></div>
            </div>
            <div>
              <p class="text-[10px] text-[#b48a57] font-bold">B$ {{ Number(d.total).toFixed(0) }}</p>
            </div>
          </div>
        </div>
      </div>

    </div>

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