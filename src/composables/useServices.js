import { supabase } from '../lib/supabase'
import { useMasterData } from './useMasterData'
import { useToast } from './useToast'

/** CRUD menu layanan (yhs_services) dan terapis (yhs_therapists). Semua fungsi mengembalikan true/false. */
export function useServices() {
  const { fetchData } = useMasterData()
  const { showToast } = useToast()

  const run = async (action, okMessage, errorPrefix) => {
    try {
      const { error } = await action()
      if (error) throw error
      if (okMessage) showToast(okMessage)
      await fetchData()
      return true
    } catch (err) {
      showToast(`${errorPrefix}: ${err.message}`, 'error')
      return false
    }
  }

  const validService = (name, price) => {
    if (!String(name || '').trim() || !(Number(price) > 0)) {
      showToast('Mohon isi nama dan harga layanan yang sah.', 'error')
      return false
    }
    return true
  }

  const addService = async (name, price) => {
    if (!validService(name, price)) return false
    return run(
      () => supabase.from('yhs_services').insert([{ name: name.trim(), default_price: Number(price) }]),
      'Layanan baru berhasil disimpan!',
      'Gagal menyimpan layanan',
    )
  }

  const updateService = async (id, name, price) => {
    if (!validService(name, price)) return false
    return run(
      () => supabase.from('yhs_services').update({ name: name.trim(), default_price: Number(price) }).eq('id', id),
      'Layanan berhasil diperbarui!',
      'Gagal memperbarui layanan',
    )
  }

  const deleteService = async (id, name) => {
    if (!confirm(`Adakah anda pasti ingin memadam layanan "${name}"?`)) return false
    return run(
      () => supabase.from('yhs_services').delete().eq('id', id),
      `Layanan "${name}" berhasil dipadam!`,
      'Gagal memadam layanan',
    )
  }

  const addTherapist = async (name) => {
    if (!String(name || '').trim()) {
      showToast('Mohon masukkan nama terapis.', 'error')
      return false
    }
    return run(
      () => supabase.from('yhs_therapists').insert([{ name: name.trim() }]),
      'Terapis baru berhasil disimpan!',
      'Gagal menyimpan terapis',
    )
  }

  const deleteTherapist = async (id, name) => {
    if (!confirm(`Adakah anda pasti ingin memadam terapis "${name}"?`)) return false
    return run(
      () => supabase.from('yhs_therapists').delete().eq('id', id),
      `Terapis ${name} berhasil dipadam!`,
      'Gagal memadam terapis',
    )
  }

  return { addService, updateService, deleteService, addTherapist, deleteTherapist }
}
