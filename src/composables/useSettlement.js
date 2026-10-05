import { ref } from 'vue'

// Jembatan Riwayat Invois -> tab Keuangan: invois yang ingin dilunasi.
const pendingSettlementId = ref(null)

export function useSettlement() {
  const requestSettlement = (invoiceId) => { pendingSettlementId.value = invoiceId }
  const consumeSettlement = () => {
    const id = pendingSettlementId.value
    pendingSettlementId.value = null
    return id
  }
  return { pendingSettlementId, requestSettlement, consumeSettlement }
}
