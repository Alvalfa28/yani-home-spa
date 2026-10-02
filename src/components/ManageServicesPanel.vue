<script setup>
import { ref } from 'vue'
import { useMasterData } from '../composables/useMasterData'
import { useServices } from '../composables/useServices'

defineEmits(['close'])

const { availableServices } = useMasterData()
const { addService, updateService, deleteService } = useServices()

const newName = ref('')
const newPrice = ref(0)
const editingId = ref(null)
const editName = ref('')
const editPrice = ref(0)

const submitNew = async () => {
  if (await addService(newName.value, newPrice.value)) {
    newName.value = ''
    newPrice.value = 0
  }
}

const startEdit = (serv) => {
  editingId.value = serv.id
  editName.value = serv.name
  editPrice.value = serv.default_price
}

const cancelEdit = () => {
  editingId.value = null
  editName.value = ''
  editPrice.value = 0
}

const submitEdit = async () => {
  if (await updateService(editingId.value, editName.value, editPrice.value)) cancelEdit()
}
</script>

<template>
  <div class="bg-[#fdfbf7] p-4 rounded-xl border border-[#b48a57] mb-4 space-y-4 shadow-md">
    <div class="flex justify-between items-center border-b border-[#ebdcc3] pb-2">
      <h4 class="font-serif text-sm font-bold text-[#5a4633]">⚙️ Kelola Perkhidmatan (Tambah / Edit / Hapus)</h4>
      <button type="button" @click="$emit('close')" class="text-xs font-bold text-gray-500 hover:text-gray-700">✕ Tutup</button>
    </div>

    <div class="bg-white p-3 rounded-xl border border-[#ebdcc3] space-y-2">
      <p class="text-[11px] font-bold text-[#8c7355] uppercase">➕ Tambah Layanan Baru</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input v-model="newName" type="text" placeholder="Nama Rawatan Baru" class="px-3 py-2 rounded-lg border border-[#ebdcc3] text-xs bg-white outline-none" />
        <input v-model.number="newPrice" type="number" placeholder="Harga Default (B$)" class="px-3 py-2 rounded-lg border border-[#ebdcc3] text-xs bg-white outline-none" />
      </div>
      <div class="flex justify-end pt-1">
        <button type="button" @click="submitNew" class="px-3 py-1.5 bg-[#2d7a4f] text-white rounded-lg text-xs font-bold">Simpan Menu Baru</button>
      </div>
    </div>

    <div class="space-y-2 max-h-60 overflow-y-auto bg-white p-3 rounded-xl border border-[#ebdcc3]">
      <p class="text-[11px] font-bold text-[#8c7355] uppercase">📋 Daftar Layanan Tersedia ({{ availableServices.length }})</p>

      <div v-for="serv in availableServices" :key="serv.id"
           class="p-2.5 rounded-lg border border-gray-100 bg-[#fffdfa] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div v-if="editingId !== serv.id" class="flex-1">
          <p class="font-bold text-xs text-[#3e3529]">{{ serv.name }}</p>
          <p class="text-[11px] text-[#b48a57] font-semibold">B$ {{ serv.default_price }}</p>
        </div>

        <div v-else class="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
          <input v-model="editName" type="text" class="px-2 py-1 rounded border border-[#b48a57] text-xs bg-white outline-none" />
          <input v-model.number="editPrice" type="number" class="px-2 py-1 rounded border border-[#b48a57] text-xs bg-white outline-none" />
        </div>

        <div class="flex items-center gap-1.5 self-end sm:self-center">
          <template v-if="editingId !== serv.id">
            <button type="button" @click="startEdit(serv)" class="px-2.5 py-1 bg-[#3b5998] text-white rounded font-bold text-[10px]">✏️ Edit</button>
            <button type="button" @click="deleteService(serv.id, serv.name)" class="px-2.5 py-1 bg-red-600 text-white rounded font-bold text-[10px]">🗑️ Hapus</button>
          </template>
          <template v-else>
            <button type="button" @click="submitEdit" class="px-2.5 py-1 bg-[#2d7a4f] text-white rounded font-bold text-[10px]">💾 Simpan</button>
            <button type="button" @click="cancelEdit" class="px-2.5 py-1 bg-gray-300 text-gray-700 rounded font-bold text-[10px]">Batal</button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
