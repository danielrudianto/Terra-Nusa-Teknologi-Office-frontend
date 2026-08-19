/**
 * Konteks klausul SPK tenaga kerja (PO-D), dari data yang TERSIMPAN.
 *
 * Sebelumnya konteks itu disusun di TIGA tempat yang berbeda — formulir
 * pembuatan, halaman lihat, dan cetak ulang dari daftar — dan ketiganya
 * memuat isi yang tidak sama:
 *
 *   formulir      lengkap, karena nilainya masih ada di layar
 *   halaman lihat `customData` apa adanya; tanggal masih ISO, sehingga
 *                 kalimat jangka waktu perjanjian tidak pernah terbentuk
 *   cetak ulang   hanya lokasi kerja dan tanggal; seluruh hak dan kewajiban
 *                 pekerja hilang dari PDF-nya
 *
 * Yang membacanya melihat tiga dokumen berbeda untuk satu purchase order yang
 * sama, dan yang paling sedikit isinya justru yang dicetak dan ditandatangani.
 *
 * Berkas ini menjadi SATU-SATUNYA penyusun konteks itu. Formulir tetap punya
 * jalurnya sendiri karena nilainya belum tersimpan, tetapi kalimat jadwal
 * upahnya dirakit fungsi yang sama seperti di sini.
 */

/** Satu komponen upah beserta jadwal pembayarannya. */
export interface JadwalUpah {
  label?: string;
  scheduleType?: string;
  payDay?: string | null;
  payDate?: number | string | null;
  cutoffDay?: string | null;
  cutoffDate?: number | string | null;
  cutoffFirst?: number | string | null;
}

/** Satu pekerjaan beserta komponen upahnya. */
export interface PekerjaanUpah {
  task?: string;
  wages?: JadwalUpah[];
}

/**
 * Urutan hari, dipakai menghitung awal periode.
 *
 * Nilainya berbahasa Indonesia karena ikut tercetak pada dokumennya; label
 * di layar diterjemahkan tersendiri.
 */
const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

/** Hari sesudah hari yang dipilih; periode mulai sehari setelah cut-off. */
function hariBerikutnya(hari: string): string {
  const i = HARI.indexOf(hari);
  return i < 0 ? hari : HARI[(i + 1) % HARI.length];
}

/**
 * Dua kalimat per komponen upah: jadwal pembayaran, lalu periode
 * perhitungannya.
 *
 * Nomor rincian mengacu ke urutan komponen upah pada dokumen ini, sehingga
 * kalimatnya dapat ditelusuri ke baris tabelnya.
 */
export function kalimatJadwalUpah(w: JadwalUpah, index: number): string[] {
  const label = (w?.label || 'Upah').trim();
  const ref = `${label}, sebagaimana disebutkan pada rincian pekerjaan ${
    index + 1
  },`;

  switch (w?.scheduleType) {
    case 'sameMonth': {
      // "Akhir bulan" tidak punya angka tetap; kalimatnya menyebutnya apa
      // adanya dan periodenya dimulai tanggal 1.
      if (w.cutoffDate === 'end') {
        return [
          `${ref} akan dibayarkan setiap bulan pada tanggal ${
            w.payDate || 10
          } pada bulan yang sama.`,
          `Periode perhitungan ${label.toLowerCase()} dimulai tanggal 1 dan berakhir (cut-off) pada akhir bulan.`,
        ];
      }
      const cut = Number(w.cutoffDate) || 15;
      const mulai = cut >= 28 ? 1 : cut + 1;
      return [
        `${ref} akan dibayarkan setiap bulan pada tanggal ${
          w.payDate || 10
        } pada bulan yang sama.`,
        `Periode perhitungan ${label.toLowerCase()} dimulai tanggal ${mulai} dan berakhir (cut-off) pada tanggal ${cut}.`,
      ];
    }
    case 'semiMonthly': {
      /*
       * Dua kali sebulan: cut-off tanggal X dan akhir bulan, dibayar pada
       * hari tertentu di pekan berikutnya.
       *
       * Tanggal bayarnya sengaja TIDAK ditetapkan sebagai angka. Jatuhnya
       * bergantung pada hari apa cut-off itu jatuh tiap bulan, dan menuliskan
       * satu tanggal tetap di SPK akan meleset hampir setiap bulan.
       */
      const c1 = w.cutoffFirst ?? 15;
      const hari = w.payDay || 'Jumat';
      return [
        `${ref} dihitung dua kali dalam sebulan, dengan cut-off pada tanggal ${c1} dan pada akhir bulan.`,
        `Pembayaran ${label.toLowerCase()} dilakukan pada hari ${hari} di pekan berikutnya setelah masing-masing cut-off.`,
      ];
    }
    case 'nextMonth':
      return [
        `${ref} akan dibayarkan setiap bulan pada tanggal ${
          w.payDate || 10
        } di bulan berikutnya.`,
        `Periode perhitungan ${label.toLowerCase()} dimulai pada awal bulan dan berakhir (cut-off) pada akhir bulan.`,
      ];
    default: {
      const cutoff = w?.cutoffDay || 'Rabu';
      return [
        `${ref} akan dibayarkan setiap minggu pada hari ${
          w?.payDay || 'Sabtu'
        }.`,
        `Periode perhitungan ${label.toLowerCase()} dimulai hari ${hariBerikutnya(
          cutoff,
        )} dan berakhir (cut-off) pada hari ${cutoff}.`,
      ];
    }
  }
}

/**
 * Seluruh kalimat jadwal upah pekerjaan PERTAMA.
 *
 * Hanya yang pertama, mengikuti bentuk dokumennya: tata cara pembayaran
 * ditulis sekali, bukan diulang per pekerjaan.
 */
export function kalimatJadwalUpahPertama(
  pekerjaan: PekerjaanUpah[] | undefined,
): string[] {
  const upah = pekerjaan?.[0]?.wages;
  if (!Array.isArray(upah)) return [];
  return upah.flatMap((w, i) => kalimatJadwalUpah(w, i));
}

/** Tanggal dalam penulisan panjang, mis. "1 September 2026". */
export function tanggalPanjang(nilai: any): string {
  if (!nilai) return '';
  const d = new Date(nilai);
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
}

/**
 * Konteks klausul PO-D dari dokumen yang sudah tersimpan.
 *
 * `customData` diteruskan UTUH lebih dulu, lalu bidang yang perlu diolah
 * ditimpa di atasnya. Dengan begitu pengaturan baru yang kelak ditambahkan
 * ke formulir ikut terbawa tanpa berkas ini harus disentuh — yang tidak
 * terbawa hanya yang memang perlu diubah bentuknya.
 */
export function konteksKlausulTenagaKerja(
  custom: any,
  po: { projectName?: string; payment_term?: string } = {},
): any {
  const c = custom || {};
  return {
    ...c,
    paymentTerm: c.paymentTerm ?? po.payment_term,
    projectName: c.projectName ?? po.projectName,
    /*
     * Tanggal disimpan dalam bentuk ISO dan dipakai dalam bentuk kalimat.
     *
     * Halaman lihat dulu meneruskan `customData` apa adanya, sehingga
     * `contractStartText` selalu kosong dan kalimat "Perjanjian ini berlaku
     * sejak tanggal ..." tidak pernah muncul — padahal jangka waktu
     * perjanjian justru salah satu hal yang paling perlu terbaca.
     */
    contractStartText: c.contractStartText || tanggalPanjang(c.contractStart),
    contractEndText: c.contractEndText || tanggalPanjang(c.contractEnd),
    contractUntilProjectDone: !!c.contractUntilProjectDone,
    /*
     * Jadwal upah dirakit dari data yang tersimpan.
     *
     * Sebelumnya jadwalnya dikirim sebagai `schedule` pada tiap baris item —
     * dan `purchase_order_items` tidak punya kolom itu, sehingga backend
     * membuangnya tanpa galat. Akibatnya seluruh tata cara pembayaran runtuh
     * menjadi satu kalimat "Upah dibayarkan sesuai kesepakatan" pada setiap
     * dokumen yang dibaca kembali.
     */
    wageSchedules: Array.isArray(c.wageSchedules)
      ? kalimatJadwalUpahPertama(c.wageSchedules)
      : [],
  };
}
