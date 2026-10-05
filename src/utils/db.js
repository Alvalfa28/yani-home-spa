export const MIGRATION_HINT = 'Jalankan sql/migrations-v2.sql di Supabase SQL Editor.'

/** Kolom yang dikirim belum ada di tabel (database belum dimigrasi). */
export const looksLikeMissingColumn = (err) =>
  !!err && (err.code === 'PGRST204' || err.code === '42703' || /column|schema cache/i.test(err.message || ''))

/** Pesan error yang menyertakan petunjuk migrasi bila penyebabnya skema database. */
export const friendlyDbError = (err) => {
  const msg = err?.message || String(err)
  if (looksLikeMissingColumn(err) || err?.code === '23502') return `${msg}. ${MIGRATION_HINT}`
  return msg
}
