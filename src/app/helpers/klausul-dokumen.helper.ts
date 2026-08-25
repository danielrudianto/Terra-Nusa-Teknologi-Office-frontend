/**
 * Poin perjanjian sebuah purchase order, disusun di SATU tempat.
 *
 * MENGAPA HARUS BERSAMA
 *
 * Logika ini dulu hanya ada di `purchase-order-view.component.ts`. Ketika
 * aplikasi mobile perlu menampilkan klausul yang sama sebelum seseorang
 * menyetujui dari ponsel, menyalinnya berarti dua tempat menyusun perjanjian
 * — dan yang menyetujui dari ponsel akan membaca dokumen yang BERBEDA dari
 * yang tercetak, tanpa satu pun galat yang menandainya. Persetujuan adalah
 * tanda tangan; tanda tangan atas dokumen yang keliru tidak boleh dibuat
 * mudah.
 *
 * Fungsi ini murni: menerima objek purchase order (dengan `customData`) dan
 * mengembalikan bagian-bagian klausulnya. Sumbernya `customData`, sama dengan
 * yang dipakai pencetakan ULANG, supaya keduanya tidak dapat berbeda.
 */

import {
  ClauseSection,
  buildBuangLumpurClauses,
  buildClauseLines,
  buildGroutingClauses,
  buildInsuranceClauses,
  buildLegalServiceBillingTerms,
  buildLegalServiceClauses,
  buildMandorClauses,
  buildManpowerClauses,
  buildTrainingClauses,
  buildTransportBillingTerms,
  buildTransportClauses,
  transportUsesRentalLayout,
} from '../constants/clause-templates';
import { buildBillingTerms, isTempoTerm } from './purchase-order-shared.helper';
import { konteksKlausulTenagaKerja } from './klausul-tenaga-kerja.helper';

/**
 * Jenis dokumen yang benar-benar akan terbit.
 *
 * Bukan selalu kolom `purchaseType`: PO-A yang membawa penanda sewa alat
 * (`equipmentRiskBearer` dan kawan-kawannya) sebenarnya dokumen B, dan
 * `formOrigin` pada `customData` menyimpan jenis yang dipakai formulirnya.
 * Klausul yang salah jenis tampil sebagai perjanjian yang sama sekali lain.
 */
export function jenisEfektifDokumen(data: any): string {
  const custom = data?.customData || {};
  if (custom.formOrigin) return custom.formOrigin;
  if (
    data?.purchaseType === 'A' &&
    (custom.equipmentRiskBearer !== undefined ||
      custom.operatorByVendor !== undefined ||
      custom.quotaPeriodDays !== undefined)
  ) {
    return 'B';
  }
  return data?.purchaseType;
}

/**
 * Seluruh bagian klausul dokumen ini, siap ditampilkan.
 *
 * Setiap cabang memanggil penyusun yang sama dengan yang dipakai pencetakan,
 * dengan `paymentTerm` yang jatuh ke kolom dokumen bila `customData` tidak
 * memuatnya — persis seperti pada layar desktop.
 */
export function susunKlausulDokumen(data: any): ClauseSection[] {
  if (!data) return [];
  const custom = data.customData || {};
  const tambahan: string[] = custom.additionalClauses || [];
  const termBayar = custom.paymentTerm ?? data.payment_term;

  /*
   * PRATINJAU TIDAK lagi menampilkan halaman "tata cara penagihan dan
   * pembayaran".
   *
   * Permintaan pengguna, konsisten dengan 5.1.2: bagian ini panjang dan
   * membuat pratinjau ramai, sementara isinya bagian LAMPIRAN — bukan
   * ketentuan pokok yang perlu dibaca ulang di layar. CETAK/PDF-nya TIDAK
   * berubah: helper cetak (transport/legal/G/C, dst.) merakit halaman
   * penagihannya sendiri, jadi dokumen di atas kertas tetap lengkap. Yang
   * dihilangkan hanya tampilannya di layar pratinjau — dan itu berlaku untuk
   * SEMUA jenis (dahulu masih muncul pada A, C, G, dan 6.4.1).
   *
   * `penagihanDokumen` sengaja dibiarkan ada bila kelak ingin dikembalikan
   * per-jenis; di sini cukup tidak dipakai.
   */
  const penagihan: ClauseSection | null = null;
  const tutup = (bagian: ClauseSection[]): ClauseSection[] =>
    penagihan ? [...bagian, penagihan] : bagian;

  switch (jenisEfektifDokumen(data)) {
    case 'A':
      return tutup(
        buildTransportClauses({ ...custom, paymentTerm: termBayar }, tambahan),
      );

    case 'D':
      // Konteksnya disusun penyusun BERSAMA: tanggal ISO diubah menjadi
      // kalimat jangka waktu, dan jadwal upahnya dibentuk. Meneruskan
      // `customData` apa adanya menghilangkan keduanya.
      return tutup(
        buildManpowerClauses(konteksKlausulTenagaKerja(custom, data), tambahan),
      );

    case 'H': {
      // Lingkup kerja khusus (grouting/mandor/buang-lumpur) punya susunan
      // pasalnya sendiri pada dokumen cetak — bukan pasal baku di bawah.
      // Melewatkannya berarti isi perjanjian yang sebenarnya tidak pernah
      // terlihat sebelum disetujui.
      const lingkup = lingkupKerjaH(data);
      if (lingkup) return tutup(lingkup);

      // PO-H punya EMPAT pasal, bukan satu daftar. Nomornya DIHITUNG dan
      // disertai nama isinya, supaya urutan di layar tidak terbaca melompat
      // (Pasal 2 adalah tabel pekerjaan, tampil di bagian barang, bukan di
      // sini) dan nomor layar tidak tertukar dengan nomor dokumen.
      const bagian: ClauseSection[] = [];
      const tambah = (nama: string, isi: (string | string[])[]) => {
        if (!isi.length) return;
        bagian.push({ title: `Pasal ${bagian.length + 1} — ${nama}`, items: isi });
      };

      tambah(
        'Lingkup dan Waktu Pekerjaan',
        buildClauseLines(
          'H',
          { ...custom, paymentTerm: termBayar },
          data.templateVersion,
          tambahan,
        ),
      );
      tambah('Kewajiban', custom.kewajiban || []);
      tambah('Keterangan', custom.keterangan || []);
      // Pasal "Penagihan dan Pembayaran" TIDAK ditampilkan di PRATINJAU —
      // sama seperti jenis lain (lihat `penagihan = null` di atas). Isinya
      // bagian lampiran yang panjang dan membuat pratinjau ramai. CETAK/PDF
      // PO-H TIDAK berubah: `printPurchaseOrderH` merakit `pasal5` sendiri
      // lewat `buildPasal5`, jadi dokumen di atas kertas tetap lengkap.
      // tambah('Penagihan dan Pembayaran', buildPasal5(custom, custom.billingDocuments));

      return tutup(bagian);
    }

    case '6.4.2':
      return tutup(
        buildInsuranceClauses({ ...custom, paymentTerm: termBayar }, tambahan),
      );

    case '6.5.2':
      return tutup(
        buildTrainingClauses({ ...custom, paymentTerm: termBayar }, tambahan),
      );

    case '6.4.1':
      return tutup(
        buildLegalServiceClauses(
          {
            ...custom,
            paymentTerm: termBayar,
            hasOfficialFee: (custom.officialFees || []).length > 0,
          },
          tambahan,
        ),
      );

    default: {
      // Cadangan kolom utama bila `customData` belum memuatnya — dokumen lama
      // tidak selalu menyimpan keduanya. Sama persis dengan getter `clauses`
      // pada layar desktop, supaya keduanya tidak berbeda satu baris pun.
      const lines = buildClauseLines(
        jenisEfektifDokumen(data),
        {
          ...custom,
          paymentTerm: termBayar,
          paymentTermText: termBayar,
          projectName: custom.projectName ?? data.projectName,
        },
        data.templateVersion,
        tambahan,
      );
      return tutup(lines.length ? [{ items: lines }] : []);
    }
  }
}

/** Sebuah unsur klausul berupa sub-daftar, bukan kalimat tunggal. */
export function klausulSubDaftar(x: string | string[]): boolean {
  return Array.isArray(x);
}

/**
 * Dokumen ini berasal dari FORMULIR B (sewa alat).
 *
 * Replika `dariFormB` pada daftar purchase order — sengaja diletakkan di sini
 * agar sisi PRATINJAU dan sisi CETAK memutuskan dengan aturan yang sama.
 */
function dariFormB(data: any, custom: any): boolean {
  if (custom?.formOrigin) return custom.formOrigin === 'B';
  if (data?.purchaseType === 'B') return true;
  return (
    custom?.equipmentRiskBearer !== undefined ||
    custom?.operatorByVendor !== undefined ||
    custom?.quotaPeriodDays !== undefined
  );
}

/**
 * Ratakan daftar tata cara penagihan menjadi bentuk yang dapat ditampilkan.
 *
 * Penyusun penagihan mengembalikan tiga bentuk: kalimat (string), sub-daftar
 * (array), dan blok alamat (`{block: [...]}`). Pratinjau hanya mengenal
 * kalimat dan sub-daftar; blok diubah menjadi sub-daftar agar alamat kantor
 * tidak tercetak sebagai "[object Object]".
 */
function ratakanPenagihan(items: any[]): (string | string[])[] {
  const hasil: (string | string[])[] = [];
  for (const it of items || []) {
    if (typeof it === 'string') hasil.push(it);
    else if (Array.isArray(it)) hasil.push(it.map((x) => String(x)));
    else if (it && Array.isArray(it.block)) hasil.push(it.block.map((x: any) => String(x)));
  }
  return hasil;
}

/**
 * Bagian TATA CARA PENAGIHAN DAN PEMBAYARAN dokumen ini.
 *
 * MENGAPA PERLU DITAMPILKAN
 *
 * Pada dokumen yang dicetak, bagian ini adalah HALAMAN TERSENDIRI — syarat
 * dokumen penagihan, alamat pengiriman, aturan pembayaran — dan ia MENGIKAT.
 * Pratinjau (layar periksa desktop dan persetujuan ponsel) sebelumnya tidak
 * menampilkannya sama sekali, sehingga "sudah membaca" ditandatangani atas
 * dokumen yang sebagiannya tidak pernah terlihat.
 *
 * Penyusun yang dipakai di sini SAMA dengan yang dipakai jalur cetak
 * (`purchase-order-list`, `purchase-order-*.helper`), dan `pratinjaucek`
 * menjaga agar keduanya tidak berbeda.
 *
 * Mengembalikan `null` untuk dokumen yang memang tidak berhalaman penagihan
 * (asuransi, pelatihan, tenaga kerja) — bukan kelalaian, memang tidak ada.
 */
export function penagihanDokumen(data: any): ClauseSection | null {
  if (!data) return null;
  const custom = data.customData
    ? typeof data.customData === 'string'
      ? JSON.parse(data.customData || '{}')
      : data.customData
    : {};
  const jenis = String(data.purchaseType || '');
  const tempo = isTempoTerm(custom.paymentTerm ?? data.payment_term);
  const JUDUL = 'Tata cara penagihan dan pembayaran';

  const bungkus = (items: any[]): ClauseSection | null => {
    const rata = ratakanPenagihan(items);
    return rata.length ? { title: JUDUL, items: rata } : null;
  };

  // Pekerjaan (H) tidak berhalaman penagihan terpisah; lingkupnya di
  // `lingkupKerjaH`.
  if (jenis.startsWith('H')) return null;

  if (jenis === 'A' && !dariFormB(data, custom)) {
    // Sewa alat berjenis A memakai tata letak B tanpa halaman penagihan;
    // transport sebenarnya-lah yang berhalaman penagihan.
    if (transportUsesRentalLayout(custom.workKind)) return null;
    return bungkus(buildTransportBillingTerms());
  }

  if (jenis === '6.4.1') {
    return bungkus(
      buildLegalServiceBillingTerms((custom.officialFees || []).length > 0),
    );
  }

  if (jenis === '5.1.2') {
    /*
     * 5.1.2 TIDAK menampilkan halaman penagihan di PRATINJAU.
     *
     * Permintaan pengguna: pratinjau 5.1.2 dibuat ringkas seperti pratinjau
     * jenis lain, tanpa bagian "tata cara penagihan dan pembayaran" yang
     * panjang. CETAK/PDF-nya TIDAK berubah — halaman penagihannya tetap
     * dirakit sendiri oleh helper cetak (G memakai `buildBillingTerms`, B
     * memakai `buildMaintenanceBillingTerms`), jadi dokumen di atas kertas
     * tetap lengkap. Yang dihilangkan hanya tampilannya di layar pratinjau.
     */
    return null;
  }

  if (jenis === 'C' || jenis === 'G') {
    return bungkus(buildBillingTerms(tempo));
  }

  return null;
}

/**
 * Lingkup pekerjaan khusus SPK (tipe H) yang tidak memakai pasal biasa.
 *
 * Grouting, mandor, dan buang lumpur masing-masing punya susunan pasalnya
 * sendiri pada dokumen cetak; pratinjau sebelumnya hanya menampilkan pasal
 * baku dan MELEWATKAN ketiganya — pekerjaan yang justru menjadi isi
 * perjanjiannya tidak pernah terlihat sebelum disetujui.
 *
 * `null` bila dokumennya bukan salah satu lingkup itu (borongan biasa), yang
 * memang memakai pasal baku dan sudah tampil dari cabang H di
 * `susunKlausulDokumen`.
 */
export function lingkupKerjaH(data: any): ClauseSection[] | null {
  if (!data || !String(data.purchaseType || '').startsWith('H')) return null;
  const custom = data.customData
    ? typeof data.customData === 'string'
      ? JSON.parse(data.customData || '{}')
      : data.customData
    : {};
  const scope = custom.workScope || 'borongan';

  if (scope === 'grouting') return buildGroutingClauses(custom);
  if (scope.startsWith('mandor-')) return buildMandorClauses(custom, scope);
  if (scope === 'buang-lumpur') {
    return [{ title: 'Lingkup dan ketentuan pekerjaan', items: buildBuangLumpurClauses(custom) }];
  }
  return null;
}

/*
 * Kata yang menandai butir TERMIN PEMBAYARAN.
 *
 * Halaman "tata cara penagihan" sudah tidak ditampilkan di pratinjau, tetapi
 * ketentuan pembayarannya tidak hilang: sebagian besar penyusun klausul
 * menyelipkannya sebagai butir biasa di tengah pasal — dan di sanalah ia
 * tenggelam. Yang menyetujui membaca dua puluh butir dengan bobot yang sama,
 * padahal satu di antaranya menentukan kapan uang keluar.
 *
 * Dicocokkan pada TEKSNYA, bukan pada nomor butir atau nama pasal: letaknya
 * berbeda di tiap jenis dokumen, dan daftar posisi akan tertinggal pada jenis
 * berikutnya yang ditambahkan. Teksnya sendiri tidak berpindah.
 */
const KATA_PEMBAYARAN = [
  'termin',
  'pembayaran',
  'dibayarkan',
  'pelunasan',
  'uang muka',
  'down payment',
  'retensi',
  'jatuh tempo',
  'tempo',
  'hari kerja setelah',
  'hari setelah',
];

/**
 * Butir ini berbicara tentang KAPAN dan BAGAIMANA uang dibayarkan?
 *
 * Dipakai pratinjau untuk menyorotinya. Menyorot terlalu banyak sama tidak
 * bergunanya dengan tidak menyorot sama sekali, jadi yang dicocokkan hanya
 * kata yang benar-benar menyangkut pembayaran — bukan setiap butir yang
 * kebetulan menyebut angka rupiah.
 */
export function adalahKlausulPembayaran(butir: string | string[]): boolean {
  const teks = (Array.isArray(butir) ? butir.join(' ') : String(butir ?? ''))
    .toLowerCase();
  if (!teks.trim()) return false;
  return KATA_PEMBAYARAN.some((k) => teks.includes(k));
}
