import { ref } from 'vue'

// 'form' | 'calendar' | 'expenses' | 'customers' | 'history' | 'dashboard'
const currentView = ref('form')

export function useNavigation() {
  const goTo = (view) => {
    currentView.value = view
    window.scrollTo?.({ top: 0 })
  }
  return { currentView, goTo }
}
