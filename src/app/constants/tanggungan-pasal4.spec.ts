/**
 * Pasal 4 SPK pekerjaan: pembagian tanggungan yang tidak memaksa.
 *
 * Butir-butir pada pasal ini disusun untuk pekerjaan bor — material besi dan
 * beton, perataan lokasi, penentuan titik survey, keamanan keluar masuk
 * alat. Pada subkontrak lain sebagiannya tidak ada sama sekali: yang
 * membangun bedeng tidak menerima besi maupun beton dari siapa pun.
 *
 * Sebelumnya setiap butir HARUS jatuh kepada salah satu pihak, dan borongan
 * umum bahkan tidak diberi pilihan — ia menerima kalimat penuhnya. Dokumen
 * yang terbit karena itu menyatakan kewajiban atas pekerjaan yang tidak
 * pernah ada dalam lingkupnya, tanpa satu pun galat.
 *
 * Yang menyelesaikannya keadaan KETIGA: "tidak ada".
 */

import {
  BUTIR_TANGGUNGAN_BOR,
  PihakTanggungan,
  TANGGUNGAN_BAWAAN_BOR,
  TANGGUNGAN_BAWAAN_UMUM,
  bangunPasal4,
} from './clause-templates';

/** Seluruh butir ditandai tidak ada. */
function semuaTidakAda(): Record<string, PihakTanggungan> {
  return Object.fromEntries(
    BUTIR_TANGGUNGAN_BOR.map((b) => [b.kunci, 'tidak' as PihakTanggungan]),
  );
}

/**
 * Seluruh kalimat sebagai satu teks huruf kecil.
 *
 * Huruf pertama kalimatnya sengaja dibesarkan, sehingga butir yang kebetulan
 * berada paling depan berubah bentuk — "material besi" menjadi "Material
 * besi". Membandingkan apa adanya membuat pengujian gagal karena hal yang
 * bukan aturannya.
 */
function isi(kalimat: string[]): string {
  return kalimat.join(' ').toLowerCase();
}

/** Kalimat tanggungan saja — tanpa asuransi dan standby. */
function tanggunganSaja(tanggungan?: Record<string, any>): string[] {
  return bangunPasal4({
    tanggungan,
    penanggungAsuransi: 'tidakBerlaku',
    standbyBerlaku: false,
  });
}

describe('pembagian tanggungan Pasal 4', () => {
  describe('dokumen yang sudah terbit', () => {
    it('tanpa pembagian, kalimatnya persis seperti dahulu', () => {
      /*
       * Sekitar sembilan puluh dokumen terbit dengan bunyi ini. Mencetak
       * ulang salah satunya TIDAK boleh menghasilkan kalimat yang berbeda
       * dari yang ditandatangani vendor.
       */
      expect(tanggunganSaja()).toEqual([
        'Material besi dan beton, akses lokasi, persiapan lahan, perataan lokasi pekerjaan, bobokan pondasi eksisting, penentuan titik (survey), keamanan & pengawalan keluar masuk alat, uang bongkar muat, uang kebisingan dan koordinasi lingkungan lainnya menjadi tanggung jawab PIHAK PERTAMA.',
      ]);
    });
  });

  describe('keadaan ketiga: tidak ada', () => {
    it('butir yang ditandai "tidak" tidak tercetak sama sekali', () => {
      const hasil = tanggunganSaja({
        ...TANGGUNGAN_BAWAAN_BOR,
        materialBesi: 'tidak',
        materialBeton: 'tidak',
      });
      expect(hasil.length).toBe(1);
      expect(isi(hasil)).not.toContain('material besi');
      expect(isi(hasil)).not.toContain('material beton');
      expect(isi(hasil)).toContain('akses lokasi');
    });

    it('butir itu tidak berpindah ke PIHAK KEDUA', () => {
      // "Tidak ada" bukan "ditanggung pihak sebelah". Kalau ia bocor ke
      // pihak kedua, vendor justru menerima kewajiban baru.
      const hasil = tanggunganSaja({
        ...TANGGUNGAN_BAWAAN_BOR,
        materialBesi: 'tidak',
      });
      expect(isi(hasil)).not.toContain('material besi');
    });

    it('seluruh butir "tidak" menghapus poinnya, bukan menyisakan kalimat hampa', () => {
      /*
       * Kalimat "menjadi tanggung jawab PIHAK PERTAMA" tanpa satu pun butir
       * di depannya adalah ketentuan yang tidak menyebutkan apa-apa — dan
       * pada dokumen yang ditandatangani, itu lebih buruk daripada tidak ada.
       */
      const semuaTidak = semuaTidakAda();
      expect(tanggunganSaja(semuaTidak)).toEqual([]);
    });
  });

  describe('bawaan menurut lingkup kerja', () => {
    it('bor menyalakan SELURUH butir, sama seperti dokumen yang beredar', () => {
      const hasil = tanggunganSaja(TANGGUNGAN_BAWAAN_BOR);
      expect(hasil.length).toBe(1);
      for (const b of BUTIR_TANGGUNGAN_BOR) {
        expect(isi(hasil)).withContext(b.kunci).toContain(b.teks.toLowerCase());
      }
      expect(hasil[0]).toContain('PIHAK PERTAMA');
    });

    it('borongan umum hanya menyalakan yang berlaku di hampir setiap pekerjaan', () => {
      const hasil = tanggunganSaja(TANGGUNGAN_BAWAAN_UMUM);
      expect(hasil.length).toBe(1);

      // Yang tetap ada: berlaku apa pun pekerjaannya.
      expect(isi(hasil)).toContain('akses lokasi');
      expect(isi(hasil)).toContain('persiapan lahan');
      expect(isi(hasil)).toContain('koordinasi lingkungan');

      // Yang hilang: khas pekerjaan berat.
      for (const teks of [
        'material besi',
        'material beton',
        'perataan lokasi',
        'penentuan titik',
        'keluar masuk alat',
      ]) {
        expect(isi(hasil)).withContext(teks).not.toContain(teks);
      }
    });

    it('kedua bawaan memuat kunci yang sama persis', () => {
      /*
       * Kunci yang tertinggal pada salah satunya akan jatuh ke bawaan
       * PIHAK PERTAMA tanpa pernah muncul sebagai pilihan di layar — butir
       * yang tidak dapat dimatikan siapa pun.
       */
      expect(Object.keys(TANGGUNGAN_BAWAAN_UMUM).sort()).toEqual(
        BUTIR_TANGGUNGAN_BOR.map((b) => b.kunci).sort(),
      );
      expect(Object.keys(TANGGUNGAN_BAWAAN_BOR).sort()).toEqual(
        BUTIR_TANGGUNGAN_BOR.map((b) => b.kunci).sort(),
      );
    });
  });

  describe('pembagian antar pihak tetap bekerja', () => {
    it('terbagi dua menghasilkan dua kalimat', () => {
      const hasil = tanggunganSaja({
        ...TANGGUNGAN_BAWAAN_BOR,
        materialBesi: 'kedua',
        materialBeton: 'kedua',
      });
      expect(hasil.length).toBe(2);
      expect(hasil[0]).toContain('PIHAK PERTAMA');
      expect(hasil[1]).toContain('PIHAK KEDUA');
      expect(hasil[1].toLowerCase()).toContain('material besi');
    });

    it('butir "tidak" tidak menambah kalimat ketiga', () => {
      const hasil = tanggunganSaja({
        ...TANGGUNGAN_BAWAAN_BOR,
        materialBesi: 'kedua',
        materialBeton: 'tidak',
      });
      expect(hasil.length).toBe(2);
    });

    it('huruf pertama kalimatnya tetap besar', () => {
      // Butir yang sama dapat muncul di tengah kalimat lain, sehingga yang
      // dibesarkan kalimatnya — bukan daftar butirnya.
      const hasil = tanggunganSaja(TANGGUNGAN_BAWAAN_UMUM);
      expect(hasil[0][0]).toBe(hasil[0][0].toUpperCase());
      expect(hasil[0].startsWith('Akses lokasi')).toBeTrue();
    });
  });

  describe('poin lain Pasal 4 tidak ikut terpengaruh', () => {
    it('asuransi dan standby tetap dapat dimatikan sendiri', () => {
      const semuaTidak = semuaTidakAda();
      expect(
        bangunPasal4({
          tanggungan: semuaTidak,
          penanggungAsuransi: 'tidakBerlaku',
          standbyBerlaku: false,
        }),
      ).toEqual([]);
    });

    it('asuransi tetap tercetak walau seluruh tanggungan dimatikan', () => {
      // Inilah poin yang berlaku pada hampir setiap subkontrak.
      const semuaTidak = semuaTidakAda();
      const hasil = bangunPasal4({
        tanggungan: semuaTidak,
        penanggungAsuransi: 'pertama',
        standbyBerlaku: false,
      });
      expect(hasil).toEqual([
        'Asuransi CAR & TPL (jika ada) merupakan tanggung jawab PIHAK PERTAMA.',
      ]);
    });
  });
});
