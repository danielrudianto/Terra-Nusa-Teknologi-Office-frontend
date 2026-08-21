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
  buildMaintenanceBillingTerms,
  buildMandorClauses,
  buildManpowerClauses,
  buildPasal5,
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

  // Bagian penagihan disatukan di akhir, apa pun jenis dokumennya.
  const penagihan = penagihanDokumen(data);
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
      tambah('Penagihan dan Pembayaran', buildPasal5(custom, custom.billingDocuments));

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
    return custom.maintenanceMode === 'jasa'
      ? bungkus(buildMaintenanceBillingTerms())
      : bungkus(buildBillingTerms(tempo));
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
