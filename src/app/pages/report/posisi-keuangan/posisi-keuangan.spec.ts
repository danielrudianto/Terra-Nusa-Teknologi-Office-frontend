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

function komponen(jawab: (url: string) => any = () => ({})): any {
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
      { provide: TranslateService, useValue: { instant: (k: string) => k } },
      { provide: ServerMessageService, useValue: { terjemahkan: () => 'galat' } },
    ],
  });
  return TestBed.runInInjectionContext(
    () => new (PosisiKeuanganComponent as any)(),
  );
}

afterEach(() => TestBed.resetTestingModule());

describe('quick ratio', () => {
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
    expect(c.rasioKurang())
      .withContext('kartunya diwarnai merah padahal tidak ada utang sama sekali')
      .toBeFalse();
  });

  it('rasio di bawah 1 ditandai', () => {
    const c = komponen();
    c.data.set({ quickRatio: 0.82 });
    expect(c.rasio()).toBe('0.82');
    expect(c.rasioKurang()).toBeTrue();
  });

  it('rasio tepat 1 TIDAK ditandai', () => {
    const c = komponen();
    c.data.set({ quickRatio: 1 });
    expect(c.rasioKurang()).toBeFalse();
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
    expect(c.rincian(h.pembilang).length).toBe(2);
  });

  it('sisi tanpa rincian mengembalikan daftar KOSONG, bukan meledak', () => {
    /*
     * Tidak semua rasio dirinci. `undefined.map` akan menjatuhkan seluruh
     * halaman — dan halaman yang mati jauh lebih buruk daripada satu baris
     * rincian yang tidak ada.
     */
    const c = komponen();
    isi(c);
    expect(c.rincian(c.hitungan('rasioOverhead').penyebut)).toEqual([]);
    expect(c.rincian(undefined)).toEqual([]);
    expect(c.rincian({ rincian: 'bukan array' })).toEqual([]);
  });

  it('hitungan tertutup secara bawaan, dan membuka hanya barisnya sendiri', () => {
    const c = komponen();
    isi(c);

    expect(c.terbuka('rasioOverhead')).toBeFalse();
    c.bukaHitungan('rasioOverhead');
    expect(c.terbuka('rasioOverhead')).toBeTrue();
    expect(c.terbuka('dso')).toBeFalse();

    c.bukaHitungan('rasioOverhead');
    expect(c.terbuka('rasioOverhead')).toBeFalse();
  });

  it('rasio tanpa hitungan tidak menampilkan tombolnya', () => {
    const c = komponen();
    c.data.set({ rasio: { dso: 100 }, hitungan: {} });
    expect(c.hitungan('dso')).toBeNull();
  });

  it('komponen tanpa terjemahan memakai labelnya, bukan kunci mentah', () => {
    /*
     * Kategori beban datang dari data, bukan dari daftar tetap. Yang belum
     * punya terjemahan akan tercetak sebagai "posisiKeuangan.komponen.sewa"
     * di layar yang dibaca stakeholder.
     */
    const c = komponen();
    expect(c.labelKomponen({ kategori: 'entah', label: 'Sewa kantor' })).toBe(
      'Sewa kantor',
    );
    expect(c.labelKomponen({})).toBe('—');
  });
});
