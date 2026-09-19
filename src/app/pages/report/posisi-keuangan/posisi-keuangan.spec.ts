/*
 * HALAMAN POSISI KEUANGAN.
 *
 * Yang dijaga di sini bukan tata letaknya melainkan angka-angka yang SALAH
 * BACA kalau keadaan kosongnya digambar sebagai nol. Ketiganya tidak
 * menghasilkan galat; semuanya terbaca sebagai pengukuran.
 */

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { PosisiKeuanganComponent } from './posisi-keuangan.component';
import { ApiService } from 'src/app/services/api.service';
import { ServerMessageService } from 'src/app/services/server-message.service';

function komponen(
  jawab: (url: string) => any = () => ({}),
  terjemahan: Record<string, string> = {},
): any {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ApiService,
        useValue: {
          get: (url: string) => {
            const hasil = jawab(url);
            return hasil instanceof Error
              ? throwError(() => hasil)
              : of(hasil);
          },
        },
      },
      {
        provide: TranslateService,
        useValue: { instant: (k: string) => terjemahan[k] ?? k },
      },
      { provide: ServerMessageService, useValue: { terjemahkan: () => 'galat' } },
    ],
  });
  return TestBed.runInInjectionContext(
    () => new (PosisiKeuanganComponent as any)(),
  );
}

afterEach(() => TestBed.resetTestingModule());

describe('quick ratio', () => {
  /*
   * KARTU QUICK RATIO DI BARIS ATAS SUDAH DIBUANG — angkanya kembar dengan
   * petak rasio di bawahnya, dan dua tempat yang menyebut angka yang sama
   * adalah dua tempat yang suatu saat menyebutnya berbeda.
   *
   * `rasio()` tetap dipakai: spanduk selisih versi lama mencetaknya.
   */
  it('TANPA utang usaha dicetak tanda pisah, bukan 0,00', () => {
    /*
     * Server mengirim `null` ketika tidak ada utang usaha sama sekali —
     * rasionya tak terhingga, yaitu keadaan TERBAIK.
     *
     * `Number(null).toFixed(2)` adalah "0.00", dan nol pada rasio ini berarti
     * keadaan terburuk. Jadi kekeliruannya membaca keadaan terbaik sebagai
     * terburuk, dengan angka yang tampak sah sepenuhnya.
     */
    const c = komponen();
    c.data.set({ quickRatio: null });

    expect(c.rasio()).toBe('—');
  });

  it('angka rasio dicetak dua desimal', () => {
    const c = komponen();
    c.data.set({ quickRatio: 0.82 });
    expect(c.rasio()).toBe('0.82');
  });
});

describe('disposisi rencana', () => {
  it('tanpa satu pun rencana, persennya tanda pisah — bukan 0%', () => {
    /*
     * "0% terpakai" pada perusahaan yang memang belum pernah membuat rencana
     * kas adalah tuduhan, bukan pengukuran — dan itu yang dibaca orang yang
     * membuka halaman ini pertama kali.
     */
    const c = komponen();
    c.akurasi.set({ disposisi: {} });

    expect(c.persen('terpakai')).toBeNull();
    expect(c.disposisi('terpakai')).toEqual({ jumlah: 0, total: 0 });
  });

  it('persentase dihitung terhadap SELURUH rencana periode itu', () => {
    const c = komponen();
    c.akurasi.set({
      disposisi: {
        terpakai: { jumlah: 6, total: 600 },
        rencana: { jumlah: 2, total: 200 },
        batal: { jumlah: 2, total: 200 },
      },
    });

    expect(c.totalRencana()).toBe(10);
    expect(c.persen('terpakai')).toBe(60);
    expect(c.persen('batal')).toBe(20);
  });

  it('status yang tidak muncul di jawaban tetap terbaca nol, bukan meledak', () => {
    const c = komponen();
    c.akurasi.set({ disposisi: { terpakai: { jumlah: 4, total: 400 } } });

    expect(c.persen('batal')).toBe(0);
    expect(c.disposisi('batal').jumlah).toBe(0);
  });
});

describe('bilah ember', () => {
  it('diukur terhadap nilai TERBESAR, bukan terhadap totalnya', () => {
    /*
     * Dibagi terhadap total, seluruh bilah menjadi sangat pendek begitu
     * daftarnya panjang — dan yang dicari di sini justru mana yang menonjol.
     */
    const c = komponen();
    expect(c.lebar(100, [100, 50])).toBe(100);
    expect(c.lebar(50, [100, 50])).toBe(50);
  });

  it('seluruhnya nol tidak menghasilkan NaN', () => {
    const c = komponen();
    expect(c.lebar(0, [0])).toBe(0);
  });

  it('nilai yang BUKAN angka menjadi nol, bukan NaN', () => {
    /*
     * INI BUG YANG SUDAH TERJADI DI LAYAR.
     *
     * Versi sebelumnya menerima objek lalu membaca `x.nilai`. Daftar
     * kewajiban menyimpan nilainya pada `total`, sehingga `x.nilai`
     * `undefined` -> NaN -> `Math.max` atas NaN juga NaN. Penjaga
     * `puncak <= 0` tidak menangkapnya: setiap perbandingan dengan NaN
     * bernilai salah. Yang keluar `width: NaN%`, CSS tidak sah, diabaikan
     * peramban, dan SELURUH batang tergambar penuh — tiga baris bernilai
     * 3 juta, 64 juta, dan 101 juta tampil sama panjang.
     */
    const c = komponen();
    expect(c.lebar(undefined, [undefined, undefined])).toBe(0);
    expect(c.lebar(50, [undefined, 100])).toBe(50);
  });

  it('lewat JALUR ASLINYA: kewajiban lain tergambar proporsional', () => {
    /*
     * Uji sebelumnya memanggil `lebar()` dengan bentuk objek yang BENAR —
     * yaitu bentuk yang tidak pernah dipakai templatnya. Ia lolos, dan
     * bugnya tetap sampai ke layar.
     *
     * Yang ini memakai jalan yang sama persis dengan templat: nilai dari
     * `rincianKewajibanLain()`, pembanding dari `nilaiKewajibanLain()`.
     */
    const c = komponen();
    c.data.set({
      kewajibanLain: {
        rincian: {
          beban: { total: 3_340_000, jumlahDokumen: 1 },
          reimbursement: { total: 63_881_441, jumlahDokumen: 4 },
          gaji: { total: 101_310_811, jumlahDokumen: 9 },
        },
      },
    });

    const daftar = c.rincianKewajibanLain();
    const semua = c.nilaiKewajibanLain();
    const lebar = daftar.map((k: any) => c.lebar(k.total, semua));

    expect(lebar[2]).toBe(100);
    expect(lebar[1]).toBe(63);
    expect(lebar[0]).toBe(3);
    expect(lebar.every((x: number) => Number.isFinite(x))).toBeTrue();
  });
});

describe('pemuatan terpisah', () => {
  it('akurasi yang GAGAL tidak menjatuhkan angka kas', async () => {
    /*
     * Keduanya menjawab pertanyaan yang berbeda, dan yang membuka halaman ini
     * membukanya untuk angka kas. Satu jalan keluar untuk keduanya berarti
     * kegagalan pada empat kueri agregasi ikut menghapus saldo rekening dari
     * layar.
     */
    const c = komponen((url) =>
      url.includes('akurasi') ? new Error('gagal') : { kas: { total: 500 } },
    );
    await c.muat();
    await c.muatAkurasi();

    expect(c.data()?.kas?.total).toBe(500);
    expect(c.galat()).toBe('');
    expect(c.akurasi()).toBeNull();
    expect(c.galatAkurasi()).toBe('galat');
  });
});

describe('label bulan', () => {
  it('"2026-09" menjadi "Sep 2026"', () => {
    expect(komponen().labelBulan('2026-09')).toBe('Sep 2026');
  });

  it('bulan Januari tidak jatuh ke indeks -1', () => {
    /*
     * `nama[bulan - 1]` dengan bulan 1 adalah indeks 0 — benar. Yang mudah
     * keliru justru kebalikannya, dan `nama[-1]` adalah `undefined` yang
     * tercetak sebagai "undefined 2026" di sumbu grafik.
     */
    const c = komponen();
    expect(c.labelBulan('2026-01')).toBe('Jan 2026');
    expect(c.labelBulan('2026-12')).toBe('Des 2026');
  });

  it('kunci yang tidak dikenali dikembalikan apa adanya', () => {
    expect(komponen().labelBulan('sampah')).toBe('sampah');
  });
});


describe('neraca ringkas & ekuitas', () => {
  it('D/E pada ekuitas minus dicetak tanda pisah, bukan angka minus', () => {
    /*
     * `580 / -120` adalah -4,83: angka yang terbaca terukur, pada keadaan
     * yang justru paling perlu dibicarakan orang. Server sudah mengirim
     * `null`; layar tidak boleh mengarangnya kembali.
     */
    const c = komponen();
    c.data.set({ neraca: { ekuitas: -120, debtToEquity: null } });

    expect(c.dte()).toBe('—');
    expect(c.ekuitasMinus()).toBeTrue();
  });

  it('D/E dicetak saat ekuitasnya positif', () => {
    const c = komponen();
    c.data.set({ neraca: { ekuitas: 1610, debtToEquity: 0.3416 } });

    expect(c.dte()).toBe('0.34');
    expect(c.ekuitasMinus()).toBeFalse();
  });

  it('spanduk selisih hanya tampil bila memang ada tambahannya', () => {
    /*
     * Keterangan yang selalu menyala berhenti dibaca orang. Pada perusahaan
     * yang memang tidak punya beban/reimbursement/gaji tertunggak, tidak ada
     * yang perlu dijelaskan.
     */
    const c = komponen();
    c.data.set({ selisihVersiLama: { tambahan: 0 } });
    expect(c.adaSelisih()).toBeFalse();

    c.data.set({ selisihVersiLama: { tambahan: 30 } });
    expect(c.adaSelisih()).toBeTrue();
  });

  it('quick ratio versi lama dicetak untuk dibandingkan', () => {
    const c = komponen();
    c.data.set({ selisihVersiLama: { quickRatioVersiLama: 3.2 } });
    expect(c.rasioLama()).toBe('3.20');
  });

  it('tanpa utang lama, rasio lamanya tanda pisah — bukan 0,00', () => {
    const c = komponen();
    c.data.set({ selisihVersiLama: { quickRatioVersiLama: null } });
    expect(c.rasioLama()).toBe('—');
  });

  it('rincian kewajiban lain selalu bertiga, walau jawabannya kosong', () => {
    /*
     * Baris yang HILANG terbaca sebagai "tidak ada jenisnya", bukan sebagai
     * "nol" — dan gaji yang tidak muncul sama sekali persis kekeliruan yang
     * sedang diperbaiki.
     */
    const c = komponen();
    c.data.set({ kewajibanLain: { rincian: {} } });

    const r = c.rincianKewajibanLain();
    expect(r.length).toBe(3);
    expect(r.map((x: any) => x.kunci)).toEqual([
      'beban',
      'reimbursement',
      'gaji',
    ]);
    expect(r.every((x: any) => x.total === 0)).toBeTrue();
  });
});


describe('rasio: angka, letak, dan ARTINYA', () => {
  /*
   * Layar sempat berhenti menjawab pertanyaan yang membuat orang membukanya.
   * "2,03" berdiri telanjang; pitanya dicetak lebih redup daripada
   * peringatan di sebelahnya, dan tidak ada satu kata pun tentang apa
   * artinya berada di situ.
   */

  function isi(c: any) {
    c.data.set({
      quickRatio: 0.9,
      neraca: { ekuitas: 2_725_535_316, debtToEquity: 2.03 },
      rasio: { dso: 130, marjinKotor: 0.22 },
      ambang: {
        quickRatio: { bawah: 1.1, atas: 1.5, arah: 'pita', acuan: 'CFMA' },
        debtToEquity: { bawah: 0.5, atas: 1.5, arah: 'naikBuruk', acuan: 'CFMA' },
        dso: { bawah: null, atas: 95, arah: 'naikBuruk', acuan: 'CFMA' },
        marjinKotor: { bawah: 0.15, atas: null, arah: 'naikBaik', acuan: 'CFMA' },
      },
      penilaian: {
        quickRatio: { posisi: 'dibawah', baik: false },
        debtToEquity: { posisi: 'diatas', baik: false },
        dso: { posisi: 'diatas', baik: false },
        marjinKotor: { posisi: 'didalam', baik: true },
      },
    });
  }

  it('tiap rasio membawa letak DAN kunci artinya', () => {
    const c = komponen();
    isi(c);
    const dte = c.daftarRasio().find((r: any) => r.kode === 'debtToEquity');

    expect(dte.teks).toBe('2.03');
    expect(dte.posisi).toBe('diatas');
    expect(dte.baik).toBeFalse();
    expect(dte.kunciArti).toBe('posisiKeuangan.arti.debtToEquity.diatas');
  });

  it('marjin di dalam acuan ditandai BAIK, bukan sekadar "di luar/di dalam"', () => {
    /*
     * Arah tiap rasio berbeda: marjin tinggi kabar baik, DSO tinggi kabar
     * buruk. Satu tanda untuk keduanya berarti layar memberi peringatan yang
     * sama pada dua keadaan yang berlawanan.
     */
    const c = komponen();
    isi(c);
    const m = c.daftarRasio().find((r: any) => r.kode === 'marjinKotor');
    expect(m.baik).toBeTrue();
    expect(m.teks).toBe('22.0%');
  });

  it('rasio yang nilainya belum ada TIDAK digambar sama sekali', () => {
    /*
     * Kotak bertanda pisah memberi tahu ada angka yang disembunyikan, dan
     * itu pertanyaan yang berulang. Marjin pada level 4 memang tidak
     * dikirim server — bloknya hilang, bukan kosong.
     */
    const c = komponen();
    isi(c);
    const kode = c.daftarRasio().map((r: any) => r.kode);

    expect(kode).not.toContain('marjinBersih');
    expect(kode).not.toContain('roe');
  });

  it('hari dicetak bulat, rasio dua desimal, bagian sebagai persen', () => {
    const c = komponen();
    expect(c.cetak(130.4, 'hari')).toBe('130');
    expect(c.cetak(2.034, 'angka')).toBe('2.03');
    expect(c.cetak(0.223, 'persen')).toBe('22.3%');
  });

  it('pita yang satu sisinya kosong dicetak "maks"/"min", bukan rentang', () => {
    /*
     * DSO tidak punya batas bawah yang bermakna. Mencetak "0–95" mengarang
     * batas yang tidak pernah ada.
     */
    const c = komponen();
    expect(c.pitaTeks({ bawah: null, atas: 95 }, 'hari')).toContain('95');
    expect(c.pitaTeks({ bawah: null, atas: 95 }, 'hari')).not.toContain('–');
    expect(c.pitaTeks({ bawah: 0.5, atas: 1.5 }, 'angka')).toBe('0.50–1.50');
    expect(c.pitaTeks({}, 'angka')).toBe('—');
  });
});


describe('hitungan yang dapat dicek', () => {
  /*
   * "Overhead 18,5%" tidak berguna sampai terlihat 18,5% DARI APA, dan
   * isinya apa saja. Rasio yang tidak dapat ditelusuri ke komponennya hanya
   * dapat dipercaya — dan yang dipercaya tanpa dapat dicek akan ditanyakan
   * berulang kali.
   */

  function isi(c: any) {
    c.data.set({
      rasio: { rasioOverhead: 0.185 },
      ambang: { rasioOverhead: { bawah: null, atas: 0.15, arah: 'naikBuruk' } },
      penilaian: { rasioOverhead: { posisi: 'diatas', baik: false } },
      hitungan: {
        rasioOverhead: {
          pembilang: {
            label: 'bebanUsaha',
            nilai: 185_000_000,
            rincian: [
              { kategori: 'gaji', label: 'Gaji', nilai: 120_000_000 },
              { kategori: 'sewa', label: 'Sewa kantor', nilai: 65_000_000 },
            ],
          },
          penyebut: { label: 'pendapatan', nilai: 1_000_000_000 },
        },
      },
    });
  }

  it('pembilang, penyebut, dan rinciannya terbaca', () => {
    const c = komponen();
    isi(c);
    const h = c.hitungan('rasioOverhead');

    expect(h.pembilang.nilai).toBe(185_000_000);
    expect(h.penyebut.nilai).toBe(1_000_000_000);
    expect(h.pembilang.rincian.length).toBe(2);
  });

  it('rasio tanpa hitungan tidak menampilkan tombolnya', () => {
    const c = komponen();
    c.data.set({ rasio: { dso: 100 }, hitungan: {} });
    expect(c.hitungan('dso')).toBeNull();
  });

  /*
   * `rincian()`, `labelKomponen()`, dan buka-tutup panel hitungan PINDAH ke
   * `RasioDialogComponent` bersama isinya; ujinya ikut pindah ke
   * `rasio-dialog.spec.ts`. Ditinggalkan di sini, ia akan menguji metode yang
   * sudah tidak ada dan gagal pada baris yang tidak menyebut sebabnya.
   */

  it('dialog dibuka membawa arti DAN hitungan rasio yang diklik', () => {
    /*
     * Petaknya hanya tombol; seluruh penjelasan ada di dialog. Kalau yang
     * dikirim ke dialog tidak lengkap, yang terbuka adalah kotak berisi
     * angka tanpa arti — persis keadaan yang petak ini dibuat untuk
     * memperbaikinya.
     */
    const c = komponen(() => ({}), {
      'posisiKeuangan.arti.rasioOverhead.diatas':
        'Overhead melampaui acuan: biaya kantor memakan marjin proyek.',
    });
    isi(c);
    let dikirim: any = null;
    c['dialog'] = {
      open: (_k: any, opsi: any) => {
        dikirim = opsi.data;
        return { afterClosed: () => of(undefined) };
      },
    };

    const r = c.daftarRasio().find((x: any) => x.kode === 'rasioOverhead');
    c.bukaRasio(r);

    expect(dikirim.kode).toBe('rasioOverhead');
    expect(dikirim.arti).toBe(
      'Overhead melampaui acuan: biaya kantor memakan marjin proyek.',
    );
    expect(dikirim.hitungan.pembilang.nilai).toBe(185_000_000);
  });
});

describe('riwayat rasio', () => {
  /*
   * Grafik riwayat punya dua kekeliruan yang tidak menghasilkan galat.
   *
   * 1. TITIK KOSONG DIGAMBAR SEBAGAI NOL. Bulan tanpa kewajiban lancar tidak
   *    punya quick ratio — keadaan TERBAIK. Sebagai nol ia tergambar sebagai
   *    jurang di grafik, yaitu keadaan terburuk, dan tidak ada yang tampak
   *    salah.
   *
   * 2. PERSEN DISKALAKAN DUA KALI, ATAU TIDAK SAMA SEKALI. Rasio berbentuk
   *    pecahan (0,15) dicetak 15,0%. Bila garisnya memakai pecahan sementara
   *    sumbunya menambahkan "%", yang terbaca adalah "0%" untuk 15%.
   */

  const RW = {
    mundur: 3,
    rasio: ['quickRatio', 'piutangTua'],
    ambang: {
      quickRatio: { bawah: 1.1, atas: 1.5 },
      piutangTua: { bawah: null, atas: 0.15 },
    },
    titik: [
      {
        tanggal: '2026-07-31',
        quickRatio: 1.24,
        piutangTua: 0.08,
        kas: 100,
        piutang: 60,
        utangUsaha: 50,
        ekuitas: 110,
      },
      {
        tanggal: '2026-08-31',
        quickRatio: null,
        piutangTua: 0.22,
        kas: 120,
        piutang: 40,
        utangUsaha: 0,
        ekuitas: 160,
      },
      {
        tanggal: '2026-09-19',
        quickRatio: 1.01,
        piutangTua: 0.3,
        kas: 90,
        piutang: 70,
        utangUsaha: 80,
        ekuitas: 80,
      },
    ],
  };

  function dengan(hitungPanggilan?: { n: number }) {
    return komponen((url: string) => {
      if (url === 'finance-status/riwayat') {
        if (hitungPanggilan) hitungPanggilan.n += 1;
        return RW;
      }
      return {};
    });
  }

  it('TIDAK dimuat sampai panelnya dibuka', async () => {
    const hit = { n: 0 };
    const c = dengan(hit);
    await Promise.resolve();

    expect(hit.n)
      .withContext('riwayat ikut berangkat saat halaman dibuka')
      .toBe(0);
    expect(c.riwayat()).toBeNull();
  });

  it('dibuka berkali-kali hanya memuat SEKALI', async () => {
    /*
     * Satu titik riwayat adalah delapan kueri, bawaannya dua belas titik.
     * Tanpa penjaga, setiap buka-tutup panel melepas sembilan puluh enam
     * kueri lagi — dan tidak ada yang terlihat selain halaman yang melambat.
     */
    const hit = { n: 0 };
    const c = dengan(hit);
    c.bukaRiwayat();
    await Promise.resolve();
    c.bukaRiwayat();
    c.bukaRiwayat();
    await Promise.resolve();

    expect(hit.n).toBe(1);
  });

  it('bulan yang rasionya TIDAK ADA tetap kosong, bukan nol', async () => {
    const c = dengan();
    await c.muatRiwayat();

    const data = c.grafikRiwayat().datasets[0].data;
    expect(data[0]).toBeCloseTo(1.24, 5);
    expect(data[1])
      .withContext('bulan tanpa kewajiban lancar tergambar sebagai jurang')
      .toBeNull();
    expect(data[2]).toBeCloseTo(1.01, 5);
    expect(c.grafikRiwayat().datasets[0].spanGaps).toBeFalse();
  });

  it('rasio berbentuk persen diskalakan SEKALI, dan sama di grafik & tabel', async () => {
    const c = dengan();
    await c.muatRiwayat();
    c.gantiRasioRiwayat('piutangTua');

    expect(c.grafikRiwayat().datasets[0].data[0]).toBeCloseTo(8, 5);
    expect(c.nilaiRiwayat(RW.titik[0])).toBe('8.0%');
  });

  it('pita acuan digambar pada SKALA YANG SAMA dengan garisnya', async () => {
    /*
     * Pita disimpan sebagai pecahan, sama seperti nilainya. Kalau garisnya
     * diskalakan ke persen sementara pitanya tidak, garis 30% akan tampak
     * jauh DI ATAS batas 0,15 yang tergambar menempel di sumbu nol —
     * kesimpulannya benar karena kebetulan, dan akan terbalik pada rasio
     * yang arahnya lain.
     */
    const c = dengan();
    await c.muatRiwayat();
    c.gantiRasioRiwayat('piutangTua');

    const garisBatas = c
      .grafikRiwayat()
      .datasets.filter((d: any) => d.pointRadius === 0);
    expect(garisBatas.length).toBe(1);
    expect(garisBatas[0].data[0]).toBeCloseTo(15, 5);
  });

  it('sisi pita yang kosong TIDAK digambar', async () => {
    const c = dengan();
    await c.muatRiwayat();
    c.gantiRasioRiwayat('piutangTua');
    expect(c.grafikRiwayat().datasets.length).toBe(2);

    c.gantiRasioRiwayat('quickRatio');
    expect(c.grafikRiwayat().datasets.length).toBe(3);
  });

  it('berganti rasio TIDAK memanggil server lagi', async () => {
    /*
     * Seluruh rasio sudah ada pada setiap titik. Memanggil server lagi di
     * sini berarti sembilan puluh enam kueri untuk data yang sudah di tangan.
     */
    const hit = { n: 0 };
    const c = dengan(hit);
    await c.muatRiwayat();
    c.gantiRasioRiwayat('piutangTua');
    c.gantiRasioRiwayat('quickRatio');
    await Promise.resolve();

    expect(hit.n).toBe(1);
  });

  it('titik kosong dicetak tanda pisah di tabel, bukan 0,00', async () => {
    const c = dengan();
    await c.muatRiwayat();
    expect(c.nilaiRiwayat(RW.titik[1])).toBe('—');
  });

  it('sumbu TIDAK dipaksa mulai dari nol', async () => {
    /*
     * Quick ratio bergerak antara 0,9 dan 1,2. Dipaksa dari nol, seluruh
     * pergerakannya menjadi garis mendatar — dan perubahan yang justru dicari
     * orang menjadi tidak terlihat.
     */
    const c = dengan();
    await c.muatRiwayat();
    expect(c.opsiRiwayat().scales.y.beginAtZero).toBeFalse();
  });

  it('sumbu-x menyebut BULANNYA, bukan tanggal mentah', async () => {
    const c = dengan();
    await c.muatRiwayat();
    expect(c.grafikRiwayat().labels[0]).toBe('Jul 2026');
    expect(c.grafikRiwayat().labels[2]).toBe('Sep 2026');
  });

  it('kegagalan riwayat TIDAK menjatuhkan angka kas di halaman', async () => {
    const c = komponen((url: string) => {
      if (url === 'finance-status/riwayat') return new Error('gagal');
      return { kas: { total: 500 }, quickRatio: 1.2 };
    });
    await c.muat();
    await c.muatRiwayat();

    expect(c.riwayat()).toBeNull();
    expect(c.galatRiwayat()).toBeTruthy();
    expect(c.data().kas.total).toBe(500);
    expect(c.galat()).toBe('');
  });
});

describe('kas riwayat yang tidak terbaca', () => {
  /*
   * Saldo bulan lampau disusun ulang dari view `mutation`. Bila penyusunan
   * itu gagal, server mengirim nol beserta penanda — dan halaman ini HARUS
   * membedakan keduanya. Nol yang berarti "tidak terbaca" dan nol yang
   * berarti "rekeningnya kosong" tergambar sama persis.
   */

  const RW_GAGAL = {
    mundur: 2,
    rasio: ['quickRatio'],
    ambang: { quickRatio: { bawah: 1.1, atas: 1.5 } },
    titik: [
      {
        tanggal: '2026-08-31',
        kasTidakTerbaca: true,
        quickRatio: null,
        debtToEquity: null,
        kas: null,
        piutang: 40,
        utangUsaha: 10,
        ekuitas: null,
      },
      {
        tanggal: '2026-09-19',
        kasTidakTerbaca: false,
        quickRatio: 1.01,
        debtToEquity: 1.96,
        kas: 0,
        piutang: 70,
        utangUsaha: 80,
        ekuitas: 80,
      },
    ],
  };

  function dengan(rw: any) {
    return komponen((url: string) =>
      url === 'finance-status/riwayat' ? rw : {},
    );
  }

  it('nilai yang TIDAK ADA dicetak tanda pisah, bukan Rp 0,00', async () => {
    const c = dengan(RW_GAGAL);
    await c.muatRiwayat();
    expect(c.uangAtau(null)).toBe('—');
    expect(c.uangAtau(undefined)).toBe('—');
  });

  it('nol yang MEMANG nol tetap dicetak Rp 0,00', async () => {
    /*
     * Sisi sebaliknya, dan sama pentingnya: rekening yang benar-benar
     * kosong harus terbaca kosong, bukan disembunyikan sebagai "tidak ada
     * data".
     */
    const c = dengan(RW_GAGAL);
    await c.muatRiwayat();
    expect(c.uangAtau(0)).toContain('0,00');
  });

  it('bulan yang saldonya tidak terbaca DIHITUNG dan disebut', async () => {
    const c = dengan(RW_GAGAL);
    await c.muatRiwayat();
    expect(c.adaKasTidakTerbaca()).toBeTrue();
    expect(c.jumlahKasTidakTerbaca()).toBe(1);
  });

  it('tanpa satu pun kegagalan, spanduknya TIDAK tampil', async () => {
    /*
     * Peringatan yang selalu ada berhenti dibaca — dan yang berhenti dibaca
     * tidak memperingatkan apa pun ketika keadaannya benar-benar terjadi.
     */
    const c = dengan({
      ...RW_GAGAL,
      titik: RW_GAGAL.titik.map((t) => ({ ...t, kasTidakTerbaca: false })),
    });
    await c.muatRiwayat();
    expect(c.adaKasTidakTerbaca()).toBeFalse();
    expect(c.jumlahKasTidakTerbaca()).toBe(0);
  });
});

describe('pita acuan yang diubah', () => {
  /*
   * Pita menentukan letak "di dalam / di bawah / di atas acuan" untuk
   * KESEBELAS rasio, dan letak itu dihitung di server. Menutup dialog tanpa
   * memuat ulang berarti sepuluh petak lain tetap menyebut letak yang
   * dihitung dengan pita lama — tanpa satu pun tanda di layar.
   */

  function komponenDialog(hasilTutup: any) {
    const c = komponen();
    c['dialog'] = {
      open: () => ({ afterClosed: () => of(hasilTutup) }),
    };
    return c;
  }

  it('memuat ulang halaman sesudah pita diubah', async () => {
    const c = komponenDialog({ ambangBerubah: true });
    let muatUlang = 0;
    c.muat = async () => {
      muatUlang += 1;
    };
    c.bukaRasio({ kode: 'quickRatio', pita: {} });
    expect(muatUlang).toBe(1);
  });

  it('TIDAK memuat ulang bila dialognya hanya ditutup', () => {
    /*
     * Membuka lalu menutup dialog adalah hal yang dilakukan orang belasan
     * kali saat membaca halaman ini. Memuat ulang setiap kali berarti
     * halamannya berkedip terus-menerus tanpa ada yang berubah.
     */
    const c = komponenDialog(undefined);
    let muatUlang = 0;
    c.muat = async () => {
      muatUlang += 1;
    };
    c.bukaRasio({ kode: 'quickRatio', pita: {} });
    expect(muatUlang).toBe(0);
  });

  it('riwayat ikut dimuat ulang HANYA bila sudah pernah dibuka', () => {
    /*
     * Grafik riwayat menggambar pita acuan sebagai garis; pita yang berubah
     * meninggalkan garisnya di tempat lama. Tetapi panel yang belum pernah
     * dibuka tidak perlu dibangunkan — itu sembilan puluh enam kueri untuk
     * layar yang tertutup.
     */
    const c = komponenDialog({ ambangBerubah: true });
    c.muat = async () => {};
    let riwayatDimuat = 0;
    c.muatRiwayat = async () => {
      riwayatDimuat += 1;
    };

    c.bukaRasio({ kode: 'quickRatio', pita: {} });
    expect(riwayatDimuat).toBe(0);

    c.riwayat.set({ titik: [], rasio: [] });
    c.bukaRasio({ kode: 'quickRatio', pita: {} });
    expect(riwayatDimuat).toBe(1);
  });
});

describe('riwayat: simpanan periode', () => {
  /*
   * Berpindah 12 bulan -> 6 bulan -> 12 bulan lagi adalah hal yang dilakukan
   * orang saat membaca grafiknya. Tanpa simpanan, setiap perpindahan
   * menghitung ulang seluruh riwayat dari dokumen — membayar ulang jawaban
   * yang sudah ada di tangan.
   */

  function dengan(hit: { n: number }) {
    return komponen((url: string) => {
      if (url === 'finance-status/riwayat') {
        hit.n += 1;
        return { mundur: 12, rasio: ['quickRatio'], ambang: {}, titik: [] };
      }
      return {};
    });
  }

  it('kembali ke periode yang sudah dimuat TIDAK memanggil server lagi', async () => {
    const hit = { n: 0 };
    const c = dengan(hit);
    await c.muatRiwayat();
    expect(hit.n).toBe(1);

    c.gantiMundurRiwayat(6);
    await Promise.resolve();
    expect(hit.n).toBe(2);

    c.gantiMundurRiwayat(12);
    await Promise.resolve();
    expect(hit.n)
      .withContext('periode yang sudah ada di tangan dihitung ulang')
      .toBe(2);
  });

  it('jawaban yang GAGAL tidak disimpan', async () => {
    /*
     * Menyimpan kegagalan berarti tombol coba-lagi tidak akan pernah
     * menyentuh server: yang tersaji selamanya galat yang sama, dan tidak
     * ada apa pun di layar yang menjelaskan kenapa mencoba lagi tidak
     * mengubah apa-apa.
     */
    let gagal = true;
    let n = 0;
    const c = komponen((url: string) => {
      if (url !== 'finance-status/riwayat') return {};
      n += 1;
      return gagal ? new Error('x') : { rasio: [], titik: [], ambang: {} };
    });

    await c.muatRiwayat();
    expect(c.galatRiwayat()).toBeTruthy();
    expect(c.riwayat()).toBeNull();

    gagal = false;
    await c.muatRiwayat();
    expect(n)
      .withContext('kegagalan tersimpan, jadi mencoba lagi tidak menyentuh server')
      .toBe(2);
    expect(c.riwayat()).toBeTruthy();
    expect(c.galatRiwayat()).toBe('');

    // Sekali lagi: yang BERHASIL barulah boleh tersimpan.
    await c.muatRiwayat();
    expect(n).toBe(2);
  });

  it('pita acuan yang diubah MEMBUANG simpanannya', async () => {
    /*
     * Letak tiap titik dihitung terhadap pita acuan. Memakai simpanan lama
     * sesudah pitanya berubah berarti grafiknya menggambar acuan baru di
     * atas letak yang lama — dua aturan berbeda pada satu gambar, dan tidak
     * ada yang menandainya.
     */
    const hit = { n: 0 };
    const c = dengan(hit);

    // DUA periode dimuat lebih dulu, dan itu inti ujinya.
    //
    // Memuat ulang periode yang sedang dilihat saja tidak cukup: periode
    // LAIN masih tersimpan dengan letak yang dihitung terhadap pita lama,
    // dan ia akan tersaji apa adanya begitu orang berpindah ke sana. Tidak
    // ada galat, tidak ada tanda — hanya satu grafik yang memakai aturan
    // yang sudah tidak berlaku.
    await c.muatRiwayat();
    c.gantiMundurRiwayat(6);
    await Promise.resolve();
    expect(hit.n).toBe(2);

    c['dialog'] = {
      open: () => ({ afterClosed: () => of({ ambangBerubah: true }) }),
    };
    c.muat = async () => {};
    c.bukaRasio({ kode: 'quickRatio', pita: {} });
    await Promise.resolve();
    expect(hit.n).toBe(3);

    // Periode yang TIDAK sedang dilihat juga harus dihitung ulang.
    c.gantiMundurRiwayat(12);
    await Promise.resolve();
    expect(hit.n)
      .withContext('periode lain masih memakai letak dari pita yang lama')
      .toBe(4);
  });
});
