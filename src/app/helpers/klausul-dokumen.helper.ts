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
  buildClauseLines,
  buildInsuranceClauses,
  buildLegalServiceClauses,
  buildManpowerClauses,
  buildPasal5,
  buildTrainingClauses,
  buildTransportClauses,
} from '../constants/clause-templates';
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

  switch (jenisEfektifDokumen(data)) {
    case 'A':
      return buildTransportClauses({ ...custom, paymentTerm: termBayar }, tambahan);

    case 'D':
      // Konteksnya disusun penyusun BERSAMA: tanggal ISO diubah menjadi
      // kalimat jangka waktu, dan jadwal upahnya dibentuk. Meneruskan
      // `customData` apa adanya menghilangkan keduanya.
      return buildManpowerClauses(
        konteksKlausulTenagaKerja(custom, data),
        tambahan,
      );

    case 'H': {
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

      return bagian;
    }

    case '6.4.2':
      return buildInsuranceClauses({ ...custom, paymentTerm: termBayar }, tambahan);

    case '6.5.2':
      return buildTrainingClauses({ ...custom, paymentTerm: termBayar }, tambahan);

    case '6.4.1':
      return buildLegalServiceClauses(
        {
          ...custom,
          paymentTerm: termBayar,
          hasOfficialFee: (custom.officialFees || []).length > 0,
        },
        tambahan,
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
      return lines.length ? [{ items: lines }] : [];
    }
  }
}

/** Sebuah unsur klausul berupa sub-daftar, bukan kalimat tunggal. */
export function klausulSubDaftar(x: string | string[]): boolean {
  return Array.isArray(x);
}
