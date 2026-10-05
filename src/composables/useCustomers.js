import { computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useMasterData } from './useMasterData'
import { useToast } from './useToast'
import { looksLikeMissingColumn } from '../utils/db'

const keyOf = (name) => (name || '').trim().toLowerCase()
const clean = (v) => (v == null ? '' : String(v).trim())

const explain = (err) =>
  err?.code === '42501' || /row-level security/i.test(err?.message || '')
    ? `${err.message} (policy RLS tabel yhs_customers menolak tulis, perlu policy untuk anon)`
    : err?.message || String(err)

/**
 * Daftar pelanggan.
 * - `customerDirectory`: gabungan yhs_customers + nama di invois + nama di booking (data terbaru menang),
 *   sehingga autocomplete dan halaman Pelanggan selalu terisi walau tabel yhs_customers belum lengkap.
 * - `ensureCustomer`: simpan/perbarui pelanggan di yhs_customers setiap invois atau booking disimpan.
 */
export function useCustomers() {
  const { allCustomers, invoiceHistory, bookingList, fetchData } = useMasterData()
  const { showToast } = useToast()

  const customerDirectory = computed(() => {
    const map = new Map()
    const merge = (name, phone, address, id = null) => {
      const key = keyOf(name)
      if (!key) return
      const prev = map.get(key) || { key, id: null, name: '', phone: '', address: '' }
      map.set(key, {
        key,
        id: id ?? prev.id,
        // Penulisan nama: tabel pelanggan menang; selain itu pakai penulisan yang pertama kali muncul.
        name: id != null ? clean(name) || prev.name : prev.name || clean(name),
        phone: clean(phone) || prev.phone,
        address: clean(address) || prev.address,
      })
    }
    const byDate = (field) => (a, b) => String(a[field] || '').localeCompare(String(b[field] || ''))

    // Urutan: booking lama -> invois lama -> tabel pelanggan. Nilai non-kosong yang terakhir menang.
    ;[...bookingList.value].sort(byDate('booking_date')).forEach((b) => merge(b.customer_name, b.customer_phone, b.customer_address))
    ;[...invoiceHistory.value].sort(byDate('invoice_date')).forEach((i) => merge(i.customer_name, i.customer_wa, i.customer_address))
    allCustomers.value.forEach((c) => merge(c.name, c.phone, c.address, c.id))

    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  })

  // Pelanggan yang ada di invois/booking tetapi belum tercatat di tabel yhs_customers.
  const missingCustomers = computed(() => customerDirectory.value.filter((c) => c.id == null))

  /** Mengembalikan null bila berhasil, atau pesan error (tidak melempar, agar invois/booking tetap tersimpan). */
  const ensureCustomer = async ({ name, phone, address }) => {
    const key = keyOf(name)
    if (!key) return null
    const p = clean(phone)
    const a = clean(address)
    const existing = allCustomers.value.find((c) => keyOf(c.name) === key)

    try {
      if (!existing) {
        let { error } = await supabase.from('yhs_customers').insert([{ name: clean(name), phone: p, address: a }])
        if (error && looksLikeMissingColumn(error)) {
          ;({ error } = await supabase.from('yhs_customers').insert([{ name: clean(name), phone: p }]))
        }
        if (error) throw error
        return null
      }

      // Pelanggan lama: perbarui nomor/alamat bila ada yang baru.
      const patch = {}
      if (p && p !== clean(existing.phone)) patch.phone = p
      if (a && a !== clean(existing.address)) patch.address = a
      if (Object.keys(patch).length === 0) return null
      const { error } = await supabase.from('yhs_customers').update(patch).eq('id', existing.id)
      if (error) throw error
      return null
    } catch (err) {
      console.error('Gagal menyimpan pelanggan:', err)
      return explain(err)
    }
  }

  // Tombol "Sinkronkan": masukkan semua pelanggan yang belum ada di tabel.
  const syncMissingCustomers = async () => {
    const rows = missingCustomers.value.map((c) => ({ name: c.name, phone: c.phone, address: c.address }))
    if (rows.length === 0) {
      showToast('Semua pelanggan sudah ada di daftar.')
      return
    }
    let { error } = await supabase.from('yhs_customers').insert(rows)
    if (error && looksLikeMissingColumn(error)) {
      ;({ error } = await supabase.from('yhs_customers').insert(rows.map(({ name, phone }) => ({ name, phone }))))
    }
    if (error) {
      showToast('❌ Gagal menyinkronkan pelanggan: ' + explain(error), 'error')
      return
    }
    showToast(`✅ ${rows.length} pelanggan ditambahkan ke daftar.`)
    await fetchData()
  }

  return { customerDirectory, missingCustomers, ensureCustomer, syncMissingCustomers }
}
