import {
  DURASI_BAWAAN,
  DURASI_MAX,
  DURASI_MIN,
  JENIS_TRANSISI,
  JenisTransisi,
  MULAI_TRANSISI,
  jepitDurasi,
  setelanTransisi,
} from './transisi-rute';

/**
 * Bentuk dan durasi transisi halaman — bagian yang murni hitungan.
 *
 * YANG PINDAH DARI SINI
 *
 * Berkas ini dulu juga menguji pemicu `trigger('transisiRute')` di dalam
 * peramban. Pemicunya sudah tidak ada lagi: pemicu animasi Angular yang
 * terpasang pada pembungkus `<router-outlet>` MENUNDA pembuangan halaman
 * lama, sehingga halamannya bertumpuk dan komponennya tidak pernah
 * dihancurkan. Gerakannya sekarang dijalankan `TransisiHalamanDirective`,
 * dan yang menguji "apakah benar ada yang bergerak" ada di
 * `transisi-halaman.directive.spec.ts`.
 *
 * Yang tinggal di sini adalah keputusan-keputusan yang dapat salah tanpa
 * menghasilkan galat: dua jenis yang menghasilkan gerakan yang sama, jarak
 * piksel tetap yang tenggelam di halaman panjang, durasi dari localStorage
 * yang dijepit ke tempat yang keliru.
 */

describe('Bentuk dan durasi transisi', () => {
  it('setiap jenis punya transform awal yang BERBEDA', () => {
    /*
     * Kalau dua jenis menghasilkan transform yang sama, pilihannya ada di
     * layar tetapi tidak berarti apa-apa — dan yang memilihnya menyimpulkan
     * setelannya rusak. Tidak ada galat, tentu saja.
     */
    const mulai = JENIS_TRANSISI.filter((j) => j.nilai !== 'none').map(
      (j) => setelanTransisi(j.nilai, 500).mulai,
    );
    expect(new Set(mulai).size).toBe(mulai.length);
  });

  it('arah naik dan turun benar-benar berlawanan', () => {
    const naik = setelanTransisi('push-up', 500).mulai;
    const turun = setelanTransisi('push-down', 500).mulai;
    // Jaraknya relatif LAYAR (vh), bukan piksel tetap — lihat alasannya di
    // `MULAI_TRANSISI`. Yang dijaga di sini arahnya, bukan angkanya.
    expect(naik).toContain('translateY(4vh)');
    expect(turun).toContain('translateY(-4vh)');
  });

  it('geser kiri dan kanan berlawanan pada sumbu X', () => {
    expect(setelanTransisi('slide-left', 500).mulai).toContain('translateX(6vw)');
    expect(setelanTransisi('slide-right', 500).mulai).toContain('translateX(-6vw)');
  });

  it('morph tidak MEMINDAHKAN apa pun', () => {
    // Inilah jenis yang aman bagi yang menyalakan "kurangi gerak": ia
    // berubah ukuran, tidak berpindah tempat.
    const m = setelanTransisi('morph', 500).mulai;
    expect(m).toContain('scale(');
    expect(m).not.toContain('translate');
  });

  it('jarak gerakannya relatif LAYAR, bukan piksel tetap', () => {
    /*
     * Inti "morph jalan, push up/down tidak".
     *
     * `scale()` besarnya sebanding dengan tinggi elemennya; pada daftar
     * sepanjang ribuan piksel ia menggeser isi puluhan piksel dan jelas
     * terlihat. `translateY(18px)` tetap 18px apa pun tinggi halamannya —
     * terbaca di halaman pendek, tenggelam di halaman panjang.
     *
     * Keduanya berjalan persis seperti diperintahkan; yang berbeda hanya
     * seberapa besar TERBACANYA. Tidak ada galat, karena memang tidak ada
     * yang rusak.
     */
    for (const j of JENIS_TRANSISI) {
      if (j.nilai === 'none' || j.nilai === 'morph') continue;
      const m = setelanTransisi(j.nilai, 500).mulai;
      expect(m)
        .withContext(
          `jenis "${j.nilai}" memakai jarak piksel tetap — ia akan tenggelam ` +
            `pada halaman daftar yang panjang, dan terbaca sebagai "tidak jalan"`,
        )
        .toMatch(/translate[XY]\(-?[\d.]+v[hw]\)/);
    }
  });

  it('durasi dijepit ke rentang yang sah', () => {
    expect(jepitDurasi(50)).toBe(DURASI_MIN);
    expect(jepitDurasi(9999)).toBe(DURASI_MAX);
    expect(jepitDurasi(500)).toBe(500);
    expect(jepitDurasi('bukan angka')).toBe(DURASI_BAWAAN);
    // `Number(null)` dan `Number('')` sama-sama 0 — dan 0 itu terhingga.
    // Tanpa penjagaan khusus, keduanya dijepit ke 100ms, bukan ke bawaannya.
    expect(jepitDurasi(null)).toBe(DURASI_BAWAAN);
    expect(jepitDurasi(undefined)).toBe(DURASI_BAWAAN);
    expect(jepitDurasi('')).toBe(DURASI_BAWAAN);
    expect(setelanTransisi('push-up', 5).durasi).toBe(DURASI_MIN);
    expect(setelanTransisi('push-up', 99999).durasi).toBe(DURASI_MAX);
  });

  it('jeda ketukan kedua menyusut bersama durasinya', () => {
    /*
     * Jeda tetap 70ms pada transisi 120ms berarti judulnya baru MULAI
     * bergerak saat isinya sudah selesai — dua ketukan yang dimaksud saling
     * mendahului, dan hasilnya terbaca sebagai tersendat.
     */
    expect(setelanTransisi('push-up', 120).jeda).toBeLessThan(120);
    expect(setelanTransisi('push-up', 1500).jeda).toBe(70);
  });

  it('"tidak ada" memang meniadakan — dan itu pilihan sadar', () => {
    const s = setelanTransisi('none', 500);
    expect(s.durasi).toBe(0);
    expect(s.mulai).toBe('none');
  });

  it('jenis yang tidak dikenal kembali ke push-up, bukan kosong', () => {
    // Nilai dari localStorage dapat berisi apa saja — termasuk sisa versi
    // lama. Transform kosong membuat animasinya tidak menggerakkan apa pun.
    const s = setelanTransisi('ngawur' as JenisTransisi, 500);
    expect(s.mulai).toBe(MULAI_TRANSISI['push-up']);
  });
});
