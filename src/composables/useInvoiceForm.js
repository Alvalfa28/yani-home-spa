import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useMasterData } from './useMasterData'
import { useToast } from './useToast'
import { useNavigation } from './useNavigation'
import { todayISO } from '../utils/period'
import { formatCurrency } from '../utils/format'
import { isUnpaid, normalizePaymentMethod } from '../utils/payment'
import { buildInvoiceNumberMap, nextInvoiceNumber } from '../utils/invoice'
import { effectivePaid, settledAmount, round2 } from '../utils/receivable'
import { looksLikeMissingColumn, MIGRATION_HINT } from '../utils/db'
import { DEFAULT_START_TIME, DEFAULT_END_TIME, NO_THERAPIST } from '../utils/constants'

const emptyRow = () => ({ service_id: '', name: '', qty: 1, price: 0, discount: 0 })

export const lineTotal = (item) =>
  Math.max(0, (Number(item.price) || 0) * (Number(item.qty) || 1) - (Number(item.discount) || 0))

// ---- State form (level modul, supaya tidak hilang saat pindah tab) ----
const editingInvoiceId = ref(null)
const sourceBookingId = ref(null) // diisi bila invois dibuat dari booking kalender
const customerName = ref('')
const customerPhone = ref('')
const customerAddress = ref('')
const visitDate = ref(todayISO())
const invoiceStartTime = ref(DEFAULT_START_TIME)
const invoiceEndTime = ref(DEFAULT_END_TIME)
const paymentMethod = ref('Cash')
const remarks = ref('')
const selectedTherapist = ref('')
const serviceSearchKeywords = ref([''])
const selectedServices = ref([emptyRow()])
const discountType = ref('percent')
const discountValue = ref(0)
const isPartialPayment = ref(false) // true = pelanggan baru bayar DP
const paidInput = ref(0)            // jumlah DP yang diterima
const isSubmitting = ref(false)

export function useInvoiceForm() {
  const { availableServices, allCustomers, invoiceHistory, incomeList, fetchData } = useMasterData()
  const { showToast } = useToast()
  const { goTo } = useNavigation()

  // ---- Perhitungan ----
  const subtotal = computed(() => selectedServices.value.reduce((acc, item) => acc + lineTotal(item), 0))

  const transactionDiscountAmount = computed(() => {
    const total = subtotal.value
    const disc = Number(discountValue.value) || 0
    if (disc <= 0) return 0
    const amount = discountType.value === 'percent' ? (total * disc) / 100 : disc
    return Math.min(amount, total)
  })

  const totalDue = computed(() => Math.max(0, subtotal.value - transactionDiscountAmount.value))

  // ---- DP / pembayaran sebagian ----
  // Yang dihitung sebagai pemasukan hanya `paidNow`; sisanya dilunasi lewat Keuangan > Pemasukan.
  const settledSoFar = computed(() =>
    editingInvoiceId.value ? settledAmount(editingInvoiceId.value, incomeList.value) : 0,
  )
  const paidNow = computed(() => {
    if (isUnpaid(paymentMethod.value)) return 0
    if (!isPartialPayment.value) return totalDue.value
    return Math.min(Math.max(Number(paidInput.value) || 0, 0), totalDue.value)
  })
  const remainingDue = computed(() => Math.max(0, round2(totalDue.value - paidNow.value - settledSoFar.value)))

  // ---- Nomor invois ----
  const invoiceNumbers = computed(() => buildInvoiceNumberMap(invoiceHistory.value))
  const getInvoiceNumber = (inv) => invoiceNumbers.value.get(inv.id) || '-'

  const invoiceNumber = computed(() => {
    const existing = editingInvoiceId.value && invoiceNumbers.value.get(editingInvoiceId.value)
    return existing || nextInvoiceNumber(visitDate.value, invoiceHistory.value)
  })

  // ---- Baris layanan ----
  const getFilteredServices = (index) => {
    const keyword = (serviceSearchKeywords.value[index] || '').toLowerCase()
    if (!keyword) return availableServices.value
    return availableServices.value.filter((s) => s.name.toLowerCase().includes(keyword))
  }

  const selectService = (index, serviceId) => {
    const found = availableServices.value.find((s) => String(s.id) === String(serviceId))
    const row = selectedServices.value[index]
    row.service_id = found ? found.id : ''
    row.name = found ? found.name : ''
    row.price = found ? found.default_price : 0
  }

  const addServiceRow = () => {
    selectedServices.value.push(emptyRow())
    serviceSearchKeywords.value.push('')
  }

  const removeServiceRow = (index) => {
    if (selectedServices.value.length <= 1) return
    selectedServices.value.splice(index, 1)
    serviceSearchKeywords.value.splice(index, 1)
  }

  const selectCustomer = (cust) => {
    customerName.value = cust.name
    customerPhone.value = cust.phone || ''
    customerAddress.value = cust.address || ''
  }

  const customerSuggestions = computed(() => {
    const keyword = customerName.value.trim().toLowerCase()
    if (!keyword) return []
    return allCustomers.value.filter((c) => c.name.toLowerCase().includes(keyword))
  })

  // ---- Reset ----
  const resetForm = (silent = false) => {
    editingInvoiceId.value = null
    sourceBookingId.value = null
    customerName.value = ''
    customerPhone.value = ''
    customerAddress.value = ''
    visitDate.value = todayISO()
    invoiceStartTime.value = DEFAULT_START_TIME
    invoiceEndTime.value = DEFAULT_END_TIME
    paymentMethod.value = 'Cash'
    selectedTherapist.value = ''
    remarks.value = ''
    selectedServices.value = [emptyRow()]
    serviceSearchKeywords.value = ['']
    discountType.value = 'percent'
    discountValue.value = 0
    isPartialPayment.value = false
    paidInput.value = 0
    if (!silent) showToast('Form berhasil di-reset.')
  }

  const setServicesFrom = (treatments) => {
    if (Array.isArray(treatments) && treatments.length > 0) {
      selectedServices.value = treatments.map((t) => ({
        service_id: t.service_id || t.id || '',
        name: t.name || '',
        qty: t.qty || 1,
        price: t.price || 0,
        discount: t.discount || 0,
      }))
      serviceSearchKeywords.value = treatments.map(() => '')
    } else {
      selectedServices.value = [emptyRow()]
      serviceSearchKeywords.value = ['']
    }
  }

  // ---- Edit invois dari Riwayat ----
  const startEditInvoice = (inv) => {
    resetForm(true)
    editingInvoiceId.value = inv.id ?? inv._id ?? null

    customerName.value = inv.customer_name || ''
    customerPhone.value = inv.customer_wa || ''
    customerAddress.value = inv.customer_address || ''
    visitDate.value = inv.invoice_date || todayISO()
    invoiceStartTime.value = String(inv.start_time || DEFAULT_START_TIME).slice(0, 5)
    invoiceEndTime.value = String(inv.end_time || DEFAULT_END_TIME).slice(0, 5)
    paymentMethod.value = normalizePaymentMethod(inv.payment_method)
    selectedTherapist.value = inv.therapist && inv.therapist !== NO_THERAPIST ? inv.therapist : ''
    remarks.value = inv.remarks || ''
    setServicesFrom(inv.treatments)

    if (inv.transaction_discount) {
      discountType.value = 'nominal' // di database tersimpan sebagai nominal
      discountValue.value = Number(inv.transaction_discount) || 0
    }

    const paid = effectivePaid(inv)
    const total = Number(inv.total_amount) || 0
    isPartialPayment.value = !isUnpaid(paymentMethod.value) && paid > 0 && paid < total - 0.005
    paidInput.value = isPartialPayment.value ? paid : 0

    goTo('form')
    showToast(`✏️ Mode edit aktif untuk invois ${getInvoiceNumber(inv)}`)
  }

  // ---- Buat invois dari booking kalender ----
  const loadBookingIntoForm = (book) => {
    resetForm(true) // pastikan tidak menimpa invois lain bila sebelumnya sedang mode edit
    sourceBookingId.value = book.id

    customerName.value = book.customer_name || ''
    customerPhone.value = book.customer_phone || ''
    customerAddress.value = book.customer_address || ''
    visitDate.value = book.booking_date
    invoiceStartTime.value = String(book.booking_start_time || book.booking_time || DEFAULT_START_TIME).slice(0, 5)
    invoiceEndTime.value = String(book.booking_end_time || DEFAULT_END_TIME).slice(0, 5)
    paymentMethod.value = normalizePaymentMethod(book.payment_method)
    selectedTherapist.value = book.therapist && book.therapist !== NO_THERAPIST ? book.therapist : ''
    remarks.value = `Dari Booking WA (${invoiceStartTime.value} - ${invoiceEndTime.value}): ${book.notes || '-'}`
    setServicesFrom(book.treatments)

    goTo('form')
    showToast(`✨ Memuat data ${book.customer_name} ke Form Invois!`)
  }

  // ---- Simpan ----
  const saveInvoice = async () => {
    if (!customerName.value.trim() || !customerPhone.value.trim()) {
      showToast('⚠️ Mohon isi Nama Pelanggan dan No. Telefon.', 'error')
      return
    }

    const treatments = selectedServices.value
      .filter((s) => s.service_id || s.name)
      .map((s) => ({ ...s }))
    if (treatments.length === 0) {
      showToast('⚠️ Pilih minimal satu rawatan.', 'error')
      return
    }
    if (invoiceStartTime.value && invoiceEndTime.value && invoiceStartTime.value >= invoiceEndTime.value) {
      showToast('⚠️ Jam selesai harus lebih besar dari jam mulai.', 'error')
      return
    }

    if (!isUnpaid(paymentMethod.value) && isPartialPayment.value) {
      const dp = Number(paidInput.value) || 0
      if (dp <= 0) {
        showToast('⚠️ Isi jumlah DP yang diterima, atau matikan opsi DP.', 'error')
        return
      }
      if (dp >= totalDue.value) {
        showToast('⚠️ DP harus lebih kecil dari total. Untuk bayar penuh, matikan opsi DP.', 'error')
        return
      }
    }

    isSubmitting.value = true
    try {
      const unpaid = isUnpaid(paymentMethod.value)
      const isEdit = !!editingInvoiceId.value

      const payload = {
        customer_name: customerName.value.trim(),
        customer_wa: customerPhone.value.trim(),
        customer_address: customerAddress.value.trim(),
        invoice_date: visitDate.value,
        total_amount: totalDue.value,
        treatments,
        payment_method: paymentMethod.value,
        payment_status: remainingDue.value > 0 ? 'Pending' : 'Full Payment',
        therapist: selectedTherapist.value || NO_THERAPIST,
        remarks: remarks.value,
        transaction_discount: transactionDiscountAmount.value,
      }

      // Kolom opsional: nomor invois hanya dikirim untuk invois baru (edit mempertahankan nomor lama).
      const optional = {
        start_time: invoiceStartTime.value || null,
        end_time: invoiceEndTime.value || null,
        paid_amount: paidNow.value,
        ...(isEdit ? {} : { invoice_number: invoiceNumber.value }),
      }
      // DP hanya valid bila kolom paid_amount ada; menyimpan tanpa kolom itu akan menghilangkan data DP.
      const needsPaidColumn = paidNow.value > 0 && paidNow.value < totalDue.value

      // Edit memakai upsert (seperti kode asli) supaya pasti menimpa baris yang sama.
      const write = (record) =>
        isEdit
          ? supabase.from('yhs_invoices').upsert([{ id: editingInvoiceId.value, ...record }]).select()
          : supabase.from('yhs_invoices').insert([record]).select()

      let { error } = await write({ ...payload, ...optional })
      let missingColumns = false
      if (error && looksLikeMissingColumn(error)) {
        if (needsPaidColumn) {
          throw new Error(`Kolom paid_amount belum ada, DP tidak bisa disimpan. ${MIGRATION_HINT}`)
        }
        // Database belum punya kolom opsional -> simpan tanpa kolom tersebut.
        const retry = await write(payload)
        error = retry.error
        missingColumns = !retry.error
      }
      if (error) throw new Error((isEdit ? 'Gagal Update: ' : 'Gagal Simpan: ') + error.message)

      if (sourceBookingId.value) {
        await supabase.from('yhs_bookings').update({ status: 'Selesai' }).eq('id', sourceBookingId.value)
      }

      const method = paymentMethod.value
      const savedPaid = paidNow.value
      const savedRemaining = remainingDue.value
      showToast(
        missingColumns
          ? '⚠️ Tersimpan, tetapi jam sesi/nomor invois belum bisa disimpan. Jalankan sql/migrations.sql.'
          : savedRemaining > 0
            ? `✅ Invois tersimpan. Diterima ${formatCurrency(savedPaid)}, sisa ${formatCurrency(savedRemaining)} bisa dilunasi di Keuangan.`
            : isEdit
              ? `✅ Invois berhasil diperbarui (${method})`
              : '✅ Invois baru berhasil disimpan!',
        missingColumns ? 'error' : 'success',
      )

      // Kosongkan data per-transaksi; tanggal, jam, dan terapis dipertahankan untuk input berikutnya.
      editingInvoiceId.value = null
      sourceBookingId.value = null
      customerName.value = ''
      customerPhone.value = ''
      customerAddress.value = ''
      remarks.value = ''
      paymentMethod.value = 'Cash'
      selectedServices.value = [emptyRow()]
      serviceSearchKeywords.value = ['']
      discountValue.value = 0
      isPartialPayment.value = false
      paidInput.value = 0

      await fetchData()
    } catch (err) {
      console.error('Detail Error:', err)
      showToast('❌ ' + err.message, 'error')
    } finally {
      isSubmitting.value = false
    }
  }

  // ---- Hapus dari Riwayat ----
  const deleteInvoice = async (invId, custName) => {
    if (!confirm(`Adakah anda pasti ingin memadam invois ini? Jika ini adalah satu-satunya transaksi pelanggan "${custName}", rekod pelanggan juga akan dipadam.`)) return
    try {
      const { data: deleted, error } = await supabase.from('yhs_invoices').delete().eq('id', invId).select()
      if (error) throw error
      if (!deleted || deleted.length === 0) throw new Error('Gagal menghapus invois dari database.')

      const sameName = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase()
      const hasOthers = invoiceHistory.value.some((inv) => inv.id !== invId && sameName(inv.customer_name, custName))
      if (!hasOthers) {
        const target = allCustomers.value.find((c) => sameName(c.name, custName))
        if (target) await supabase.from('yhs_customers').delete().eq('id', target.id)
      }

      showToast('🗑️ Invois & rekod pelanggan berhasil dipadam!')
      await fetchData()
    } catch (err) {
      showToast('❌ Gagal memadam: ' + err.message, 'error')
    }
  }

  // ---- Salin teks (WhatsApp) ----
  const copyInvoiceText = async () => {
    let text = `*YANI HOME & SPA INVOICE*\nNo: ${invoiceNumber.value}\nTarikh: ${visitDate.value}\nNama: ${customerName.value || '-'}\nTelefon: ${customerPhone.value || '-'}\nAlamat: ${customerAddress.value || '-'}\nTerapis: ${selectedTherapist.value || '-'}\n`
    if (remarks.value) text += `Catatan: ${remarks.value}\n`
    text += `\n*Rincian Rawatan:*\n`
    selectedServices.value.forEach((s, i) => {
      if (s.name) text += `${i + 1}. ${s.name} (x${s.qty}) - ${formatCurrency(lineTotal(s))}\n`
    })
    if (transactionDiscountAmount.value > 0) text += `Diskon Transaksi: - ${formatCurrency(transactionDiscountAmount.value)}\n`
    text += `\n*JUMLAH / TOTAL DUE: ${formatCurrency(totalDue.value)}*\nStatus/Cara Bayar: ${paymentMethod.value}\n`
    if (remainingDue.value > 0) {
      text += `Dibayar: ${formatCurrency(paidNow.value)}\n*Sisa Tagihan: ${formatCurrency(remainingDue.value)}*\n`
    }
    text += `\nTerima kasih!`

    try {
      await navigator.clipboard.writeText(text)
      showToast('📋 Invois berhasil disalin ke clipboard!')
    } catch {
      showToast('❌ Gagal menyalin. Browser memblokir akses clipboard.', 'error')
    }
  }

  return {
    // state
    editingInvoiceId, customerName, customerPhone, customerAddress, visitDate,
    invoiceStartTime, invoiceEndTime, paymentMethod, remarks, selectedTherapist,
    serviceSearchKeywords, selectedServices, discountType, discountValue, isSubmitting,
    isPartialPayment, paidInput,
    // computed
    subtotal, transactionDiscountAmount, totalDue, paidNow, remainingDue, invoiceNumber, customerSuggestions,
    // actions
    getInvoiceNumber, getFilteredServices, selectService, addServiceRow, removeServiceRow,
    selectCustomer, resetForm, startEditInvoice, loadBookingIntoForm,
    saveInvoice, deleteInvoice, copyInvoiceText, lineTotal,
  }
}
