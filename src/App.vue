<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from './lib/supabase'
import logoImage from './assets/logo.jpg'

// --- NAVIGATION / VIEW STATE ('form' | 'customers' | 'history' | 'dashboard' | 'calendar') ---
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
const bookingList = ref([]) // State untuk data booking kalendar

// State Autocomplete Pelanggan
const showCustomerDropdown = ref(false)

// State Terapis & Layanan
const selectedTherapist = ref('')
const showAddTherapistModal = ref(false)
const newTherapistName = ref('')

// State Search Keyword per baris layanan untuk pencarian cepat (Form Invois)
const serviceSearchKeywords = ref([''])

const selectedServices = ref([
  { service_id: '', name: '', qty: 1, price: 0, discount: 0 }
])

const showAddServiceModal = ref(false)
const newServiceName = ref('')
const newServicePrice = ref(0)

const discountType = ref('percent')
const discountValue = ref(0)

// --- STATE FILTER DASHBOARD ---
const dashboardPeriod = ref('bulanan') // 'harian' | 'mingguan' | 'bulanan' | 'tahunan'
const selectedDateDaily = ref(new Date().toISOString().split('T')[0])

const currentYear = new Date().getFullYear()
const selectedYearAnnual = ref(currentYear)
const selectedMonth = ref(new Date().getMonth() + 1) // 1 - 12
const selectedMonthYear = ref(currentYear)

const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
}

const selectedWeekNum = ref(getWeekNumber(new Date()))
const selectedWeekYear = ref(currentYear)

// --- STATE KALENDAR BOOKING ---
const calendarViewMonth = ref(new Date().getMonth() + 1)
const calendarViewYear = ref(currentYear)
const selectedCalendarDate = ref(new Date().toISOString().split('T')[0])
const showAddBookingModal = ref(false)

// Form Input Booking Baru (Mendukung banyak rawatan terpilih & multi waktu per hari)
const newBooking = ref({
  customer_name: '',
  customer_phone: '',
  booking_date: new Date().toISOString().split('T')[0],
  booking_time: '10:00',
  therapist: '',
  selected_services: [], // Array menampung banyak layanan ID yang dicentang
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

// --- AMBIL DATA MASTER & BOOKING DARI SUPABASE ---
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

    // Ambil data booking (tabel yhs_bookings)
    const { data: bookData, error: bookErr } = await supabase.from('yhs_bookings').select('*').order('booking_date', { ascending: true })
    if (bookErr) {
      console.warn('Tabel yhs_bookings belum dibuat:', bookErr.message)
      bookingList.value = []
    } else {
      bookingList.value = bookData || []
    }
  } catch (err) {
    console.error('Gagal memuat data:', err.message)
  }
}

onMounted(() => {
  fetchData()
})

// Filter Layanan untuk Booking
const filteredServicesForBooking = computed(() => {
  const keyword = (bookingServiceSearchKeyword.value || '').toLowerCase()
  if (!keyword) return availableServices.value
  return availableServices.value.filter(s => s.name.toLowerCase().includes(keyword))
})

// Simpan Booking Baru ke Supabase
const saveBookingToDB = async () => {
  if (!newBooking.value.customer_name || !newBooking.value.booking_date) {
    return showToast('Mohon isi Nama Pelanggan dan Tanggal Booking.', 'error')
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
      booking_time: newBooking.value.booking_time,
      therapist: newBooking.value.therapist || 'Tanpa Terapis',
      treatments: chosenServicesObj,
      notes: newBooking.value.notes,
      status: 'Terjadwal'
    }

    const { error } = await supabase.from('yhs_bookings').insert([payload])

    if (error) {
      if (error.code === '42P01') {
        throw new Error("Tabel 'yhs_bookings' belum ada di database Supabase Anda. Jalankan SQL setup terlebih dahulu.")
      }
      throw error
    }

    showToast('📅 Booking WhatsApp berhasil dicatat ke kalendar!')
    showAddBookingModal.value = false
    newBooking.value = {
      customer_name: '',
      customer_phone: '',
      booking_date: selectedCalendarDate.value,
      booking_time: '10:00',
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

// Ubah Status Booking (Selesai / Batal)
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

// Hapus Sesi Booking dari Database
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

// Konversi Booking langsung ke Form Invois
const useBookingForInvoice = (book) => {
  customerName.value = book.customer_name
  customerPhone.value = book.customer_phone
  visitDate.value = book.booking_date
  selectedTherapist.value = book.therapist !== 'Tanpa Terapis' ? book.therapist : ''
  remarks.value = `Dari Booking WA (${book.booking_time}): ${book.notes || '-'}`
  
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

// Daftar Hari dalam Bulan yang Dipilih pada Kalendar
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

// Booking yang cocok dengan tanggal yang diklik
const bookingsForSelectedDate = computed(() => {
  return bookingList.value
    .filter(b => b.booking_date === selectedCalendarDate.value)
    .sort((a, b) => (a.booking_time || '00:00').localeCompare(b.booking_time || '00:00'))
})

const getFilteredServices = (index) => {
  const keyword = (serviceSearchKeywords.value[index] || '').toLowerCase()
  if (!keyword) return availableServices.value
  return availableServices.value.filter(s => s.name.toLowerCase().includes(keyword))
}

const filteredInvoicesByPeriod = computed(() => {
  return invoiceHistory.value.filter(inv => {
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

const therapistPerformanceStats = computed(() => {
  const therapistCount = {}
  filteredInvoicesByPeriod.value.forEach(inv => {
    const thp = inv.therapist || 'Tanpa Terapis'
    therapistCount[thp] = (therapistCount[thp] || 0) + 1
  })
  const sorted = Object.entries(therapistCount).sort((a, b) => b[1] - a[1])
  const maxVal = sorted.length > 0 ? sorted[0][1] : 1
  return sorted.map(([name, count]) => ({
    name,
    count,
    percentage: Math.round((count / maxVal) * 100)
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

const groupedAndSortedCustomers = computed(() => {
  const statsMap = {}
  invoiceHistory.value.forEach(inv => {
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

  const enriched = allCustomers.value.map(c => {
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

const saveNewServiceToDB = async () => {
  if (!newServiceName.value || newServicePrice.value <= 0) return showToast('Mohon isi nama dan harga layanan.', 'error')
  try {
    const { error } = await supabase.from('yhs_services').insert([{ name: newServiceName.value, default_price: newServicePrice.value }])
    if (error) throw error
    showToast('Layanan berhasil disimpan permanen!')
    newServiceName.value = ''
    newServicePrice.value = 0
    showAddServiceModal.value = false
    fetchData()
  } catch (err) {
    showToast('Gagal menyimpan layanan: ' + err.message, 'error')
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
  return 'B$ ' + Number(val).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
  showToast('Menyimpan ke database...', 'success')

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

    showToast('✅ Invois tersimpan & Pelanggan otomatis terdaftar!')
    fetchData() 
  } catch (err) {
    showToast('❌ Gagal menyimpan: ' + err.message, 'error')
  } finally {
    isSubmitting.value = false
  }
}

const handlePrint = () => { window.print() }

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
        📅 Kalendar Booking ({{ bookingList.filter(b=>b.status==='Terjadwal').length }})
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
      
      <!-- KOLOM KIRI: FORMULIR -->
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

        <!-- Modal Tambah & Kelola/Hapus Terapis -->
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
              <button @click="showAddServiceModal = true" type="button" class="text-xs font-bold bg-[#8c7355] text-white px-3 py-1.5 rounded-lg hover:bg-[#725c43] transition-colors">+ Menu Baru DB</button>
              <button @click="addServiceRow" type="button" class="text-xs font-bold bg-[#f4ecd8] text-[#5a4633] px-3 py-1.5 rounded-lg hover:bg-[#ebdcc3] transition-colors">+ Baris</button>
            </div>
          </div>

          <div v-if="showAddServiceModal" class="bg-[#fdfbf7] p-4 rounded-xl border border-[#b48a57] mb-4 space-y-3">
            <h4 class="font-serif text-sm font-bold text-[#5a4633]">Tambah Layanan Baru ke Database</h4>
            <input v-model="newServiceName" type="text" placeholder="Nama Layanan / Rawatan" class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] text-sm bg-white outline-none" />
            <input v-model.number="newServicePrice" type="number" placeholder="Harga Default (B$)" class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] text-sm bg-white outline-none" />
            <div class="flex justify-end gap-2">
              <button @click="showAddServiceModal = false" type="button" class="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold">Batal</button>
              <button @click="saveNewServiceToDB" type="button" class="px-3 py-1 bg-[#2d7a4f] text-white rounded-lg text-xs font-bold">Simpan Permanen</button>
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
                  <option value="">-- Pilih Rawatan dari DB --</option>
                  <option v-for="serv in getFilteredServices(index)" :key="serv.id" :value="serv.id" :selected="serv.id === item.service_id">
                    {{ serv.name }} (B$ {{ serv.default_price }})
                  </option>
                </select>
              </div>

              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="text-[10px] uppercase font-bold text-[#8c7355]">Qty</label>
                  <input v-model.number="item.qty" type="number" min="1" class="w-full px-3 py-1.5 rounded-lg border border-[#ebdcc3] text-sm bg-white outline-none" />
                </div>
                <div>
                  <label class="text-[10px] uppercase font-bold text-[#8c7355]">Harga</label>
                  <input v-model.number="item.price" type="number" min="0" class="w-full px-3 py-1.5 rounded-lg border border-[#ebdcc3] text-sm bg-white outline-none" />
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
          <button @click="saveToSupabase" :disabled="isSubmitting" type="button" class="py-3 px-4 bg-[#3b5998] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow hover:bg-[#324b81] transition-all">💾 Simpan DB</button>
        </div>

      </div>

      <!-- KOLOM KANAN: LIVE PREVIEW INVOICE -->
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

    <!-- ================= VIEW 1.5: KALENDAR BOOKING WHATSAPP ================= -->
    <div v-if="currentView === 'calendar'" class="max-w-5xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-[#ebdcc3] space-y-6">
      
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#f4ecd8] pb-4 gap-4">
        <div>
          <h3 class="font-serif text-xl font-bold text-[#5a4633]">📅 Kalendar Jadwal Booking WhatsApp</h3>
          <p class="text-xs text-[#8c7355]">1 hari dapat menampung banyak sesi/waktu booking berbeda</p>
        </div>
        
        <div class="flex items-center gap-3">
          <button @click="showAddBookingModal = true" class="text-xs font-bold bg-[#b48a57] text-white px-4 py-2.5 rounded-xl shadow hover:bg-[#a07747] transition-all">
            + Tambah Booking Baru
          </button>
          <button @click="currentView = 'form'" class="text-xs font-bold bg-[#3e3529] text-white px-4 py-2.5 rounded-xl shadow">Kembali</button>
        </div>
      </div>

      <!-- Modal Form Tambah Booking -->
      <div v-if="showAddBookingModal" class="bg-[#fdfbf7] p-5 rounded-2xl border border-[#b48a57] space-y-4 shadow-md w-full overflow-hidden">
        <h4 class="font-serif text-sm font-bold text-[#5a4633]">📥 Salin & Catat Pesan Booking WhatsApp</h4>
        
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

          <div class="w-full overflow-hidden">
            <label class="block font-bold text-[#8c7355] mb-1">Jam / Waktu Sesi</label>
            <div class="w-full max-w-full overflow-hidden rounded-lg border border-[#ebdcc3] bg-white">
              <input v-model="newBooking.booking_time" type="time" class="w-full px-3 py-2 text-xs bg-transparent outline-none block box-border" style="max-width: 100%;" />
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
            <label class="block font-bold text-[#8c7355]">Pilih Rawatan dari Database (Bisa lebih dari 1)</label>
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

      <!-- Filter Bulan / Tahun Kalendar -->
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

      <!-- Tampilan Grid Kalendar Bulanan -->
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

      <!-- Daftar Detail Booking untuk Tanggal yang Dipilih -->
      <div class="bg-[#fffdfa] p-5 rounded-2xl border border-[#ebdcc3] space-y-4">
        <h4 class="font-serif text-sm font-bold text-[#5a4633]">📋 Daftar Waktu Sesi Booking Tanggal: <span class="text-[#b48a57]">{{ selectedCalendarDate }}</span></h4>

        <div v-if="bookingsForSelectedDate.length === 0" class="text-xs text-gray-500 text-center py-6">Tidak ada jadwal booking pada tanggal ini.</div>

        <div v-else class="space-y-3">
          <div v-for="book in bookingsForSelectedDate" :key="book.id" class="p-4 rounded-xl border border-[#ebdcc3] bg-white text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="font-bold text-xs bg-[#b48a57] text-white px-2 py-0.5 rounded">⏰ {{ book.booking_time }}</span>
                <span class="font-bold font-serif text-sm text-[#5a4633]">{{ book.customer_name }}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold"
                      :class="book.status === 'Terjadwal' ? 'bg-amber-100 text-amber-800' : book.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'">
                  {{ book.status }}
                </span>
              </div>
              <p class="text-gray-600">📞 {{ book.customer_phone || '-' }}</p>
              
              <div class="text-[#b48a57] font-semibold space-y-0.5">
                <p class="text-[11px] uppercase font-bold text-gray-400">Rawatan Dipesan:</p>
                <div v-for="(tr, ti) in book.treatments" :key="ti" class="text-xs">
                  • {{ tr.name }} (B$ {{ tr.price }})
                </div>
              </div>

              <p class="text-gray-600">👩‍⚕️ Terapis: <span class="font-semibold">{{ book.therapist }}</span></p>
              <p v-if="book.notes" class="text-gray-500 italic bg-[#fdfbf7] p-2 rounded border border-[#ebdcc3]">Pesan WA: "{{ book.notes }}"</p>
            </div>

            <!-- Tombol Aksi Booking termasuk Tombol Hapus Sesi -->
            <div class="flex flex-wrap gap-2">
              <button @click="useBookingForInvoice(book)" class="px-3 py-1.5 bg-[#2d7a4f] text-white rounded-lg font-bold text-[10px] shadow">
                ✨ Buat Invois
              </button>
              <button v-if="book.status === 'Terjadwal'" @click="updateBookingStatus(book.id, 'Selesai')" class="px-3 py-1.5 bg-[#3b5998] text-white rounded-lg font-bold text-[10px]">
                Selesai
              </button>
              <button v-if="book.status === 'Terjadwal'" @click="updateBookingStatus(book.id, 'Batal')" class="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg font-bold text-[10px]">
                Batalkan
              </button>
              <button @click="deleteBookingFromDB(book.id, book.customer_name)" class="px-3 py-1.5 bg-red-600 text-white rounded-lg font-bold text-[10px] shadow hover:bg-red-700 transition-all">
                🗑️ Hapus Sesi
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- ================= VIEW 2: HALAMAN DATABASE PELANGGAN ================= -->
    <div v-if="currentView === 'customers'" class="max-w-3xl mx-auto bg-white rounded-2xl p-6 shadow-xl border border-[#ebdcc3] space-y-4">
      <div class="flex justify-between items-center border-b border-[#f4ecd8] pb-3">
        <h3 class="font-serif text-lg font-bold text-[#5a4633]">👥 Database Pelanggan (Urut A-Z)</h3>
        <button @click="currentView = 'form'" class="text-xs font-bold bg-[#b48a57] text-white px-3 py-1.5 rounded-lg">Kembali ke Form</button>
      </div>

      <div v-if="allCustomers.length === 0" class="text-center py-8 text-gray-500 text-sm">Belum ada data pelanggan tersimpan.</div>
      
      <div v-else class="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <div v-for="(customersGroup, letter) in groupedAndSortedCustomers" :key="letter" class="space-y-2">
          <div class="font-serif font-bold text-sm text-[#b48a57] border-b border-[#ebdcc3] pb-1 sticky top-0 bg-white z-10">{{ letter }}</div>
          <div v-for="cust in customersGroup" :key="cust.id" class="p-3 rounded-xl border border-[#ebdcc3] bg-[#fffdfa] text-xs space-y-1 shadow-sm">
            <p class="font-bold text-[#5a4633] text-sm">{{ cust.name }}</p>
            <p class="text-gray-600">📞 {{ cust.phone || '–' }} · 📅 Terakhir: {{ cust.lastVisit }}</p>
            <p class="text-gray-500">{{ cust.visitCount }}x kunjungan · B$ {{ cust.totalSpent.toFixed(2) }} total</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= VIEW 3: HALAMAN RIWAYAT INVOIS ================= -->
    <div v-if="currentView === 'history'" class="max-w-2xl mx-auto bg-white rounded-2xl p-6 shadow-xl border border-[#ebdcc3] space-y-4">
      <div class="flex justify-between items-center border-b border-[#f4ecd8] pb-3">
        <h3 class="font-serif text-lg font-bold text-[#5a4633]">📜 Riwayat Invois</h3>
        <button @click="currentView = 'form'" class="text-xs font-bold bg-[#b48a57] text-white px-3 py-1.5 rounded-lg">Kembali ke Form</button>
      </div>
      <p class="text-[11px] font-bold uppercase tracking-widest text-[#8c7355]">INVOICE HISTORY · {{ invoiceHistory.length }} rekod</p>

      <div v-if="invoiceHistory.length === 0" class="text-center py-8 text-gray-500 text-sm">Belum ada riwayat invois tersimpan di database.</div>

      <div v-else class="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        <div v-for="(inv, idx) in invoiceHistory" :key="inv.id || idx" class="p-4 rounded-xl border border-[#ebdcc3] bg-[#fffdfa] text-xs space-y-2 shadow-sm">
          <div class="flex justify-between items-center">
            <span class="font-bold font-serif text-[#5a4633] text-sm">SW-{{ inv.invoice_date ? inv.invoice_date.replace(/-/g, '') : '20260801' }}-00{{ invoiceHistory.length - idx }}</span>
            <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">LUNAS</span>
          </div>
          <div class="space-y-0.5 text-gray-600">
            <p>👤 {{ inv.customer_name }}</p>
            <p>📅 {{ inv.invoice_date }} · 🕐 {{ formatDateTime(inv.created_at).combined }}</p>
            <p>{{ Array.isArray(inv.treatments) ? inv.treatments.length : 1 }} perkhidmatan · {{ inv.payment_method }}</p>
          </div>
          <div class="pt-2 border-t border-[#f4ecd8]">
            <span class="font-bold text-[#b48a57] text-sm">B$ {{ Number(inv.total_amount).toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= VIEW 4: HALAMAN DASHBOARD STATISTIK ================= -->
    <div v-if="currentView === 'dashboard'" class="max-w-4xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-[#ebdcc3] space-y-6">
      
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#f4ecd8] pb-4 gap-4">
        <div>
          <h3 class="font-serif text-xl font-bold text-[#5a4633]">📊 Dashboard Statistik & Analitik</h3>
          <p class="text-xs text-[#8c7355]">Analisis mendalam laporan harian, mingguan, bulanan, dan tahunan</p>
        </div>
        <button @click="currentView = 'form'" class="text-xs font-bold bg-[#3e3529] text-white px-4 py-2 rounded-xl shadow">Kembali ke Form</button>
      </div>

      <div class="flex flex-wrap justify-center gap-2 bg-[#fdfbf7] p-2 rounded-2xl border border-[#ebdcc3]">
        <button @click="dashboardPeriod = 'harian'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="dashboardPeriod === 'harian' ? 'bg-[#b48a57] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">📅 Pilih Harian</button>
        <button @click="dashboardPeriod = 'mingguan'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="dashboardPeriod === 'mingguan' ? 'bg-[#b48a57] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">📆 Pilih Minggu</button>
        <button @click="dashboardPeriod = 'bulanan'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="dashboardPeriod === 'bulanan' ? 'bg-[#b48a57] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">🗓️ Pilih Bulan</button>
        <button @click="dashboardPeriod = 'tahunan'" class="px-4 py-2 text-xs font-bold rounded-xl transition-all" :class="dashboardPeriod === 'tahunan' ? 'bg-[#b48a57] text-white shadow' : 'bg-white text-[#5a4633] border border-[#ebdcc3]'">📈 Pilih Tahun</button>
      </div>

      <div class="p-4 rounded-xl bg-[#fffdfa] border border-[#ebdcc3] flex flex-wrap items-center justify-between gap-4 text-xs">
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
            <option :value="1">Bulan 1 (Januari)</option>
            <option :value="2">Bulan 2 (Februari)</option>
            <option :value="3">Bulan 3 (Mac)</option>
            <option :value="4">Bulan 4 (April)</option>
            <option :value="5">Bulan 5 (Mei)</option>
            <option :value="6">Bulan 6 (Jun)</option>
            <option :value="7">Bulan 7 (Julai)</option>
            <option :value="8">Bulan 8 (Ogos)</option>
            <option :value="9">Bulan 9 (September)</option>
            <option :value="10">Bulan 10 (Oktober)</option>
            <option :value="11">Bulan 11 (November)</option>
            <option :value="12">Bulan 12 (Disember)</option>
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
          <h4 class="font-serif text-sm font-bold text-[#5a4633]">👩‍⚕️ Grafik Performa Terapis (Jumlah Klien Ditangani)</h4>
          <span class="text-[10px] font-bold text-[#8c7355] uppercase">Total Kunjungan Klien</span>
        </div>
        <div v-if="therapistPerformanceStats.length === 0" class="text-xs text-gray-500 text-center py-4">Belum ada data terapis pada periode ini.</div>
        <div v-else class="space-y-3">
          <div v-for="thp in therapistPerformanceStats" :key="thp.name" class="space-y-1">
            <div class="flex justify-between text-xs font-semibold text-[#3e3529]">
              <span>{{ thp.name }}</span>
              <span class="text-[#2d7a4f] font-bold">{{ thp.count }} pelanggan</span>
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
  #invoice-preview, #invoice-preview * { visibility: visible; }
  #invoice-preview {
    position: absolute; left: 0; top: 0; width: 100% !important; max-height: 100vh !important;
    border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important;
  }
}
</style>