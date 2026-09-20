/*
 * Halaman KPI — yang dijaga di sini kekeliruan yang TIDAK melempar apa pun.
 *
 * Tiga kelas yang semuanya pernah terjadi di halaman lain repo ini:
 *
 *   1. Tidak ada angka digambar sebagai angka nol. Grafik yang rata di nol
 *      terbaca sebagai perusahaan tanpa pendapatan, bukan sebagai kegagalan
 *      membaca — dan tidak ada galat yang menyebutkan bedanya.
 *   2. Pembanding yang TIDAK ADA digambar sebagai "tidak berubah". Panah
 *      mendatar pada bulan pertama menyatakan sesuatu yang tidak diketahui.
 *   3. Batas ember meleset satu hari. Dokumen pindah ke kolom sebelahnya dan
 *      papannya tetap terlihat masuk akal.
 */

import {
  KpiKinerjaComponent,
  titikMarjin,
} from './kinerja/kpi-kinerja.component';
import { KpiAntreanComponent } from './antrean/kpi-antrean.component';

const P = KpiKinerjaComponent.prototype as any;
const A = KpiAntreanComponent.prototype as any;

/** Dipanggil pada `this` buatan sendiri — komponennya tidak dinyalakan. */
const panggil = (nama: string, diri: any, ...arg: any[]) =>
  (P[nama] ?? A[nama]).call(diri, ...arg);

describe('arah & ikon', () => {
  it('nol adalah "tetap", bukan "tidak ada"', () => {
    expect(panggil('arah', {}, 0)).toBe('tetap');
  });

  it('null adalah "tidak ada", bukan "tetap"', () => {
    /*
     * Inilah bedanya. Bulan pertama deret tidak punya bulan sebelumnya;
     * menggambarnya sebagai "tidak berubah" menyatakan perbandingan yang
     * tidak pernah dilakukan.
     */
    expect(panggil('arah', {}, null)).toBe('tidakAda');
  });

  it('null TIDAK boleh jatuh ke "tetap"', () => {
    // Ditambahkan setelah memeriksa bahwa sabotase yang menghapus penjaga
    // `null` ditolak pengetikan; yang TIDAK ditolak adalah mengarahkannya
    // ke 'tetap', dan itu yang dijaga di sini.
    expect(panggil('arah', {}, null)).not.toBe('tetap');
  });

  it('naik dan turun dibedakan', () => {
    expect(panggil('arah', {}, 5)).toBe('naik');
    expect(panggil('arah', {}, -5)).toBe('turun');
  });

  it('ikon "tidak ada" berbeda dari ikon "tetap"', () => {
    // `ikonArah` memanggil `arah`, jadi `this` buatan ini harus membawanya.
    const diri = { arah: P.arah };
    const tetap = panggil('ikonArah', diri, 0);
    const tidakAda = panggil('ikonArah', diri, null);
    expect(tetap).not.toBe(tidakAda);
  });
});

describe('selisih', () => {
  const diri = (banding: any) => ({ terkini: () => ({ banding }) });

  it('membaca pembanding bulan lalu', () => {
    const d = diri({ bulanLalu: { pendapatan: 500 }, tahunLalu: null });
    expect(panggil('selisih', d, 'pendapatan', 'bulanLalu')).toBe(500);
  });

  it('pembanding yang tidak ada menghasilkan null, bukan nol', () => {
    const d = diri({ bulanLalu: null, tahunLalu: null });
    expect(panggil('selisih', d, 'pendapatan', 'bulanLalu')).toBeNull();
  });

  it('nilai nol tetap nol, bukan null', () => {
    const d = diri({ bulanLalu: { pendapatan: 0 }, tahunLalu: null });
    expect(panggil('selisih', d, 'pendapatan', 'bulanLalu')).toBe(0);
  });

  /*
   * Dua kasus di bawah ditambahkan SETELAH sabotase lolos.
   *
   * Pengujian di atas hanya menyentuh cabang `banding.bulanLalu` yang
   * seluruhnya kosong — yang tertangkap penjaga paling awal. Cabang tempat
   * pembandingnya ADA tetapi bidangnya kosong tidak teruji sama sekali,
   * dan mengubah barisnya menjadi `Number(n) || 0` tetap hijau: bulan
   * pertama akan menampilkan panah "tidak berubah" atas perbandingan yang
   * tidak pernah dilakukan.
   */
  it('bidang yang null di dalam pembanding tetap null', () => {
    const d = diri({ bulanLalu: { pendapatan: null }, tahunLalu: null });
    expect(panggil('selisih', d, 'pendapatan', 'bulanLalu')).toBeNull();
  });

  it('bidang yang TIDAK ADA di dalam pembanding juga null', () => {
    const d = diri({ bulanLalu: { labaKotor: 5 }, tahunLalu: null });
    expect(panggil('selisih', d, 'pendapatan', 'bulanLalu')).toBeNull();
  });
});

describe('persen', () => {
  it('null dicetak sebagai tanda pisah, bukan 0,0%', () => {
    /*
     * Marjin 0% berarti pendapatan habis dimakan biaya. Tidak ada
     * pendapatan sama sekali adalah keadaan lain; mencetak keduanya "0,0%"
     * menyamakan dua hal yang berbeda.
     */
    expect(panggil('persen', {}, null)).toBe('—');
    expect(panggil('persen', {}, undefined)).toBe('—');
  });

  it('angka dicetak satu desimal', () => {
    expect(panggil('persen', {}, 0.1234)).toBe('12.3%');
    expect(panggil('persen', {}, 0)).toBe('0.0%');
  });
});

describe('papan antrean', () => {
  const tahap = (jumlah: number, ember: any, tertuaHari = 0) => ({
    jumlah,
    tertuaHari,
    ember,
  });

  it('ember selalu empat, urut, walau servernya mengirim sebagian', () => {
    /*
     * Kolom yang hilang membuat papan tiap tahap berbeda lebarnya, dan
     * sebaran umur tidak lagi dapat dibandingkan antar-tahap sekilas.
     */
    const hasil = panggil('emberTahap', {}, tahap(3, { '0-2': 3 }));
    expect(hasil.map((e: any) => e.kunci)).toEqual([
      '0-2', '3-7', '8-14', '15+',
    ]);
    expect(hasil.map((e: any) => e.nilai)).toEqual([3, 0, 0, 0]);
  });

  it('hanya ember terakhir ditandai mendesak', () => {
    const hasil = panggil('emberTahap', {}, tahap(1, { '15+': 1 }));
    expect(hasil.filter((e: any) => e.mendesak).map((e: any) => e.kunci)).toEqual([
      '15+',
    ]);
  });

  it('lebar batang dihitung terhadap jumlah tahapnya sendiri', () => {
    const t = tahap(4, { '0-2': 1, '3-7': 3 });
    const em = panggil('emberTahap', {}, t);
    expect(panggil('lebar', {}, t, em[0])).toBe(25);
    expect(panggil('lebar', {}, t, em[1])).toBe(75);
  });

  it('tahap kosong tidak membagi dengan nol', () => {
    const t = tahap(0, {});
    const em = panggil('emberTahap', {}, t);
    expect(panggil('lebar', {}, t, em[0])).toBe(0);
  });

  it('tertahan menyala tepat pada 15 hari, tidak pada 14', () => {
    expect(panggil('tertahan', {}, { tertuaHari: 14 })).toBe(false);
    expect(panggil('tertahan', {}, { tertuaHari: 15 })).toBe(true);
  });

  it('tahap yang gagal tidak dianggap tertahan', () => {
    // `tertuaHari` null pada tahap yang gagal dibaca.
    expect(panggil('tertahan', {}, { tertuaHari: null })).toBe(false);
  });
});

describe('titikMarjin', () => {
  it('bulan yang jendelanya belum penuh jadi null, bukan nol', () => {
    const deret = [
      { jendela: { belumCukup: true } },
      { jendela: { marjinKotor: 0.2 } },
    ];
    expect(titikMarjin(deret, 'marjinKotor')).toEqual([null, 20]);
  });

  it('marjin null dari server juga jadi null', () => {
    expect(titikMarjin([{ jendela: { marjinKotor: null } }], 'marjinKotor'))
      .toEqual([null]);
  });

  it('titik tanpa jendela sama sekali jadi null', () => {
    expect(titikMarjin([{}, { jendela: undefined }], 'marjinKotor'))
      .toEqual([null, null]);
  });

  it('marjin NEGATIF tetap digambar — kerugian bukan data yang hilang', () => {
    expect(titikMarjin([{ jendela: { marjinBersih: -0.08 } }], 'marjinBersih'))
      .toEqual([-8]);
  });

  it('marjin nol yang SUNGGUHAN tetap nol, tidak diputus', () => {
    expect(titikMarjin([{ jendela: { marjinKotor: 0 } }], 'marjinKotor'))
      .toEqual([0]);
  });

  it('deret kosong tidak melempar', () => {
    expect(titikMarjin([], 'marjinKotor')).toEqual([]);
    expect(titikMarjin(null as any, 'marjinKotor')).toEqual([]);
  });
});
