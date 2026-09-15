import { TranslateService } from '@ngx-translate/core';

/**
 * Konfirmasi dan pesan berhasil untuk tindakan menentukan pada CoP.
 *
 * MENGAPA BERKAS TERSENDIRI
 *
 * Keempat tindakan ini dapat dijalankan dari DUA layar — daftar dan dialog
 * lihat. Bila masing-masing menyusun kalimatnya sendiri, keduanya akan
 * berselisih pada perubahan berikutnya: satu layar memperingatkan bahwa
 * persetujuan tidak dapat dicabut, layar sebelah tidak. Yang menekan tombol
 * dari layar yang salah tidak pernah tahu ada peringatan yang terlewat.
 *
 * MENGAPA PERLU KONFIRMASI SAMA SEKALI
 *
 * Sebelumnya keempatnya langsung memanggil server begitu ditekan, lalu
 * memuat ulang daftarnya. Tidak ada yang menahan, dan pada keberhasilan
 * tidak ada yang mengabarkan — yang menekan cuma melihat daftarnya berkedip.
 * Akibatnya dua hal yang sama-sama buruk: dokumen keuangan terhapus oleh
 * satu kali salah tekan, dan yang ragu apakah tindakannya jadi akan
 * menekannya SEKALI LAGI.
 *
 * YANG DIKONFIRMASI, DAN YANG TIDAK
 *
 * `periksa` sengaja TIDAK meminta konfirmasi. Ia sakelar yang dapat
 * dikembalikan dari layar yang sama ("Cabut pemeriksaan"), dan meminta
 * konfirmasi pada tindakan yang mudah dibatalkan justru melatih orang
 * menekan "Ya" tanpa membaca — sehingga konfirmasi pada HAPUS ikut kehilangan
 * dayanya. Ia tetap mendapat pesan berhasil.
 */
export type AksiCopBerkonfirmasi = 'hapus' | 'setujui' | 'setujuiBap';

export type AksiCop =
  | AksiCopBerkonfirmasi
  | 'periksa'
  | 'cabutPeriksa';

export interface TeksKonfirmasi {
  title: string;
  prompt: string;
  destructive: boolean;
}

/**
 * Isi dialog konfirmasi; bentuknya langsung dapat dipakai sebagai `data`
 * pada `DeleteConfirmationComponent`.
 *
 * Kalimatnya menyebut AKIBATNYA, bukan sekadar bertanya "yakin?". Pertanyaan
 * yang tidak menyatakan apa-apa tidak menambah keterangan apa pun kepada
 * yang sudah terlanjur menekan tombol — ia hanya menambah satu ketukan.
 */
export function teksKonfirmasiCop(
  translate: TranslateService,
  aksi: AksiCopBerkonfirmasi,
  nomor: string,
): TeksKonfirmasi {
  const kunci = {
    hapus: 'cop.konfirmHapus',
    setujui: 'cop.konfirmSetujui',
    setujuiBap: 'cop.konfirmSetujuiBap',
  }[aksi];

  return {
    title: translate.instant(`${kunci}Judul`),
    prompt: translate.instant(kunci, { nomor }),
    // Hanya hapus yang merusak. Persetujuan tidak dapat dicabut, tetapi ia
    // tidak menghilangkan apa pun — menandainya merah menyamakan "keputusan
    // yang mengikat" dengan "data yang lenyap", dan yang membaca berhenti
    // membedakan keduanya.
    destructive: aksi === 'hapus',
  };
}

/** Pesan berhasil; `null` bila tindakannya memang tidak perlu dikabarkan. */
export function pesanBerhasilCop(
  translate: TranslateService,
  aksi: AksiCop,
  nomor: string,
): string {
  const kunci = {
    hapus: 'cop.berhasilHapus',
    setujui: 'cop.berhasilSetujui',
    setujuiBap: 'cop.berhasilSetujuiBap',
    periksa: 'cop.berhasilPeriksa',
    cabutPeriksa: 'cop.berhasilCabutPeriksa',
  }[aksi];

  return translate.instant(kunci, { nomor });
}

/**
 * Nomor dokumen sebagaimana dibaca orang.
 *
 * `name` adalah nomor lengkapnya ("002-042-R501-2026"); `number` hanya urutan
 * di dalam rantai vendor+proyek. Yang disebut pada konfirmasi harus yang SAMA
 * dengan yang tertera di layar, kalau tidak yang membacanya tidak dapat
 * memastikan ia menghapus dokumen yang benar — dan justru itulah satu-satunya
 * pekerjaan kalimat tersebut.
 */
export function nomorCop(c: { name?: string | null; number?: number | null }): string {
  const nama = String(c?.name ?? '').trim();
  if (nama) return nama;
  return c?.number != null ? String(c.number) : '';
}
