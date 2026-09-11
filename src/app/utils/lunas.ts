/**
 * Ambang "sudah lunas" — dipakai bersama seluruh dialog pembayaran.
 *
 * Angkanya harus SAMA dengan `TOLERANSI_LUNAS` di
 * `controllers/payment_outgoing_controller.py`. Server dan layar yang
 * berbeda pendapat menghasilkan kegagalan yang paling membingungkan: tombol
 * mati padahal servernya menerima, atau tombol hidup lalu permintaannya
 * ditolak.
 */
export const TOLERANSI_LUNAS = 0.01;

/**
 * Tidak ada lagi sisa yang dapat dibayarkan?
 *
 * Ambangnya SATU SEN, bukan lima rupiah.
 *
 * Lima rupiah sempat dipakai di sini, disalin dari toleransi pembulatan
 * pajak di server — dan itu keliru pada dua arah sekaligus:
 *
 *   * Dokumen yang nilainya SENDIRI di bawah lima rupiah langsung dianggap
 *     lunas dan tombol bayarnya mati selamanya. Beban Rp 0,11 tidak pernah
 *     dapat dibayar, tanpa satu pun pesan yang menjelaskan mengapa.
 *   * Sisa di bawah lima rupiah pada dokumen besar pun ikut tertutup —
 *     padahal justru sisa itulah yang dicatat sebagai pembayaran pembulatan,
 *     bernilai di bawah satu rupiah.
 *
 * Yang benar-benar tidak dapat dibayar hanya sisa yang sudah nol.
 *
 * Ini TIDAK menggantikan pemeriksaan di server; muatan permintaan dapat
 * disusun sendiri oleh siapa pun yang membuka Network tab. Gunanya hanya
 * agar tombolnya tidak mengundang penekanan yang pasti gagal.
 */
export function sudahLunas(sisa: unknown): boolean {
  return (Number(sisa) || 0) <= TOLERANSI_LUNAS;
}

/**
 * Format rupiah yang TIDAK menelan sen.
 *
 * `1.0-0` — yang dipakai sebelumnya — membulatkan ke rupiah penuh, sehingga
 * Rp 0,11 tampil sebagai "Rp 0". Yang membacanya melihat dokumen bernilai nol
 * yang tidak dapat dibayar, dan tidak ada apa pun di layar yang menjelaskan
 * dari mana angka nol itu datang.
 *
 * `1.0-2` menampilkan sen HANYA bila ada: satu juta tetap "1.000.000",
 * sedangkan 0,11 menjadi "0,11".
 */
export const FORMAT_RUPIAH = '1.0-2';
