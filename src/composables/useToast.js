import { ref } from 'vue'

// State di level modul: semua komponen berbagi satu toast.
const toast = ref({ show: false, message: '', type: 'success' })
let timer = null

export function useToast() {
  const showToast = (message, type = 'success') => {
    clearTimeout(timer)
    toast.value = { show: true, message, type }
    timer = setTimeout(() => { toast.value.show = false }, 4000)
  }
  return { toast, showToast }
}
