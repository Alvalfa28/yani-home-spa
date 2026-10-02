<script setup>
import { ref } from 'vue'
import { useMasterData } from '../composables/useMasterData'
import { useServices } from '../composables/useServices'

const emit = defineEmits(['close', 'created', 'deleted'])

const { availableTherapists } = useMasterData()
const { addTherapist, deleteTherapist } = useServices()

const newName = ref('')

const submit = async () => {
  const name = newName.value.trim()
  if (await addTherapist(name)) {
    emit('created', name)
    newName.value = ''
    emit('close')
  }
}

const remove = async (thp) => {
  if (await deleteTherapist(thp.id, thp.name)) emit('deleted', thp.name)
}
</script>

<template>
  <div class="bg-[#fdfbf7] p-4 rounded-xl border border-[#b48a57] space-y-4">
    <h4 class="font-serif text-sm font-bold text-[#5a4633]">Kelola Terapis (Tambah / Hapus)</h4>
    <div class="flex gap-2">
      <input v-model="newName" type="text" placeholder="Nama Terapis Baru" class="flex-1 px-3 py-2 rounded-lg border border-[#ebdcc3] text-xs bg-white outline-none" />
      <button type="button" @click="submit" class="px-3 py-2 bg-[#2d7a4f] text-white rounded-lg text-xs font-bold">Simpan</button>
    </div>
    <div class="space-y-1.5 max-h-40 overflow-y-auto bg-white p-2 rounded-lg border border-[#ebdcc3]">
      <p class="text-[10px] font-bold text-gray-400 uppercase">Daftar Terapis Aktif:</p>
      <div v-for="thp in availableTherapists" :key="thp.id" class="flex justify-between items-center text-xs py-1 px-2 border-b border-gray-50 last:border-none">
        <span class="font-semibold text-[#3e3529]">{{ thp.name }}</span>
        <button type="button" @click="remove(thp)" class="text-red-500 hover:text-red-700 font-bold text-[10px] bg-red-50 px-2 py-0.5 rounded">🗑️ Hapus</button>
      </div>
    </div>
    <div class="flex justify-end pt-1">
      <button type="button" @click="$emit('close')" class="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold">Tutup</button>
    </div>
  </div>
</template>
