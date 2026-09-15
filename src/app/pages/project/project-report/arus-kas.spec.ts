import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { ProjectReportComponent, titikKas } from './project-report.component';

/**
 * Arus kas proyek: kapan uangnya BERGERAK, bukan kapan dokumennya terbit.
 *
 * Tab "arus per minggu" yang sudah ada membaca tanggal dokumen dan menjawab
 * "sudah berkomitmen berapa". Dua proyek dengan biaya dan tagihan yang sama
 * persis dapat sangat berbeda kasnya — yang satu menagih di muka, yang lain
 * menalangi enam bulan — dan perbedaan itu tidak terlihat sama sekali di sana.
 *
 * Yang diuji di sini bentuk datanya, bukan gambarnya.
 */
describe('ProjectReport — arus kas', () => {
  // ------------------------------------------------------------------
  // Fungsi murni
  // ------------------------------------------------------------------

  describe('titikKas()', () => {
    it('bulan tanpa pembayaran tetap digambar', () => {
      // Januari lalu Juni. Kalau bulan kosong dilewati, keduanya jadi dua
      // titik bersebelahan dan kemiringan garis di antaranya berbohong:
      // lima bulan tanpa penerimaan terbaca sebagai penurunan yang landai.
      const t = titikKas(
        [{ date: '2026-06-10', amount: 100 }],
        [{ date: '2026-01-05', amount: 40 }],
      );

      expect(t.map((x) => x.bulan)).toEqual([
        '2026-01',
        '2026-02',
        '2026-03',
        '2026-04',
        '2026-05',
        '2026-06',
      ]);
      expect(t[1].masuk).toBe(0);
      expect(t[1].keluar).toBe(0);
    });

    it('saldo berjalan melewati bulan kosong', () => {
      const t = titikKas(
        [{ date: '2026-03-01', amount: 100 }],
        [{ date: '2026-01-05', amount: 40 }],
      );
      // -40, tetap -40, lalu +100.
      expect(t.map((x) => x.saldo)).toEqual([-40, -40, 60]);
    });

    it('melewati pergantian tahun', () => {
      const t = titikKas(
        [],
        [
          { date: '2025-11-01', amount: 10 },
          { date: '2026-02-01', amount: 10 },
        ],
      );
      expect(t.map((x) => x.bulan)).toEqual([
        '2025-11',
        '2025-12',
        '2026-01',
        '2026-02',
      ]);
      expect(t[t.length - 1].saldo).toBe(-20);
    });

    it('saldo awal dibawa masuk, bukan dimulai dari nol', () => {
      // Kumulatif yang direset tiap tahun membuat proyek yang sudah
      // menalangi setahun terlihat mulai dari nol — persis keadaan yang
      // paling perlu terlihat.
      const t = titikKas([], [{ date: '2026-01-05', amount: 40 }], -500);
      expect(t[0].saldo).toBe(-540);
    });

    it('tanggal batas bulan tetap di bulan yang tertulis', () => {
      /*
       * PERINGATAN JUJUR SOAL UJI INI.
       *
       * Yang dijaga kodenya adalah `String(tanggal).slice(0, 7)` alih-alih
       * `new Date(...)`. Sebabnya: `new Date('2026-09-01')` adalah tengah
       * malam UTC, dan di zona di sebelah barat UTC ia mundur ke 31 Agustus —
       * penerimaannya pindah ke bulan yang salah tanpa satu pun galat.
       *
       * Tetapi Karma di sini berjalan pada zona UTC, sehingga pada mesin ini
       * `new Date` memberi jawaban yang SAMA. Jadi uji ini sendiri TIDAK
       * dapat menangkap kembalinya `new Date`; ia hanya mengunci perilaku
       * yang benar untuk tanggal batas bulan.
       *
       * Yang benar-benar menggigit adalah uji "tanggal yang tidak terbaca"
       * di bawah: `new Date(null)` bukan NaN melainkan 1 Januari 1970,
       * sehingga seluruh rentangnya melar menjadi ratusan bulan. Sudah
       * dibuktikan: mengganti pemotongan teks dengan `Date` membuat uji itu
       * gagal dengan "Expected 673 to be 1".
       *
       * Saya sebut ini supaya tidak ada yang mengira zona waktu sudah
       * terjaga oleh uji, padahal yang menjaganya adalah bentuk kodenya.
       */
      const t = titikKas(
        [{ date: '2026-09-01', amount: 5 }],
        [{ date: '2026-09-30', amount: 5 }],
      );
      expect(t.length).toBe(1);
      expect(t[0].bulan).toBe('2026-09');
      expect(t[0].masuk).toBe(5);
      expect(t[0].keluar).toBe(5);
    });

    it('nominal negatif dibaca sebagai besarannya', () => {
      // Pembayaran keluar kadang tersimpan bertanda negatif tergantung
      // jalurnya. Dibiarkan apa adanya, ia MENAMBAH saldo — arah yang
      // berlawanan, dan tanpa galat.
      const t = titikKas([], [{ date: '2026-01-05', amount: -40 }]);
      expect(t[0].keluar).toBe(40);
      expect(t[0].saldo).toBe(-40);
    });

    it('tanggal yang tidak terbaca diabaikan, bukan menjatuhkan seluruhnya', () => {
      const t = titikKas(
        [{ date: null, amount: 100 }, { date: '2026-01-05', amount: 10 }],
        [],
      );
      expect(t.length).toBe(1);
      expect(t[0].masuk).toBe(10);
    });

    it('tanpa pembayaran mengembalikan daftar kosong', () => {
      expect(titikKas([], [])).toEqual([]);
    });
  });

  // ------------------------------------------------------------------
  // Terpasang di komponennya
  // ------------------------------------------------------------------

  const PROYEK = {
    id: 1,
    code: 'R501',
    name: 'Bored pile R501',
    isActive: true,
    isCancelled: false,
    contractValue: 1110,
    contractDpp: 1000,
    contractCount: 1,
  };

  const LAPORAN = {
    purchases: [],
    purchase_drafts: [],
    reimbursements: [],
    sales_invoices: [],
  };

  const ARUS = {
    outgoing: [
      { date: '2026-01-10', amount: 400, jenis: 'pembelian' },
      { date: '2026-02-10', amount: 300, jenis: 'reimbursement' },
    ],
    incoming: [{ date: '2026-03-05', amount: 500, jenis: 'faktur' }],
    cakupanKeluar: ['pembelian', 'reimbursement'],
  };

  function buat(arus: any | 'terlarang', progress: any[] | 'terlarang' = []) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ProjectReportComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: ApiService,
          useValue: {
            get: (jalur: string) => {
              if (jalur.startsWith('purchases/report/project/'))
                return of(LAPORAN);
              if (jalur.endsWith('/cashflow')) {
                return arus === 'terlarang'
                  ? throwError(() => ({ status: 403 }))
                  : of(arus);
              }
              if (jalur.endsWith('/progress')) {
                return progress === 'terlarang'
                  ? throwError(() => ({ status: 403 }))
                  : of(progress);
              }
              if (jalur === 'projects') return of({ data: [PROYEK] });
              return of(null);
            },
            post: () => of({}),
            put: () => of({}),
            delete: () => of({}),
          },
        },
        { provide: MatSnackBar, useValue: { open: () => {} } },
        {
          provide: MatDialog,
          useValue: { open: () => ({ afterClosed: () => of(false) }) },
        },
        { provide: Router, useValue: { navigate: () => {} } },
        { provide: ActivatedRoute, useValue: { snapshot: { params: {} } } },
      ],
    });
    return TestBed.createComponent(ProjectReportComponent);
  }

  it('menyusun tiga bulan dengan saldo yang berjalan', fakeAsync(() => {
    const f = buat(ARUS);
    f.componentInstance.muat('R501');
    tick();

    const t = f.componentInstance.titikArusKas();
    expect(t.map((x) => x.bulan)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(t.map((x) => x.saldo)).toEqual([-400, -700, -200]);
    expect(f.componentInstance.saldoKasAkhir()).toBe(-200);
    expect(f.componentInstance.totalKasMasuk()).toBe(500);
    expect(f.componentInstance.totalKasKeluar()).toBe(700);
  }));

  it('menyebut bulan pertama saldonya menembus nol', fakeAsync(() => {
    // Angka yang sebenarnya dicari di grafik ini: sejak kapan proyek ini
    // menalangi uang perusahaan.
    const f = buat(ARUS);
    f.componentInstance.muat('R501');
    tick();

    expect(f.componentInstance.bulanMulaiMinus()).toBe('Jan 26');
  }));

  it('403 menyembunyikan tabnya, bukan menampilkan galat', fakeAsync(() => {
    // Rutenya dijaga `payment_outgoing` (level 3). Divisi yang tidak
    // memegangnya tidak perlu tahu ada yang gagal — laporan biayanya utuh.
    const f = buat('terlarang', [{ id: 1, date: '2026-01-05', percentage: 10 }]);
    f.componentInstance.muat('R501');
    tick();

    expect(f.componentInstance.arusKasTerkunci()).toBeTrue();
    expect(f.componentInstance.duaTabTersedia()).toBeFalse();
    expect(f.componentInstance.galat()).toBeFalsy();
  }));

  it('tab yang terkunci tidak pernah jadi tab aktif', fakeAsync(() => {
    /*
     * Pilihan tab bertahan antar proyek. Tanpa penjagaan ini, yang pernah
     * memilih "arus kas" lalu membuka proyek dengan modulnya terkunci akan
     * melihat kartu kosong tanpa satu pun penjelasan.
     */
    const f = buat('terlarang', [{ id: 1, date: '2026-01-05', percentage: 10 }]);
    f.componentInstance.pilihTabKartu('arus-kas');
    f.componentInstance.muat('R501');
    tick();

    expect(f.componentInstance.tabKartu()).toBe('arus-kas');
    expect(f.componentInstance.tabAktif()).toBe('progres');
  }));

  it('kemajuan terkunci menyisakan arus kas tanpa bilah tab', fakeAsync(() => {
    const f = buat(ARUS, 'terlarang');
    f.componentInstance.muat('R501');
    tick();

    expect(f.componentInstance.duaTabTersedia()).toBeFalse();
    expect(f.componentInstance.tabAktif()).toBe('arus-kas');
  }));

  it('tanpa pembayaran bukan galat', fakeAsync(() => {
    // Proyek yang baru berjalan punya kas keluar tanpa kas masuk; yang
    // berjalan dengan uang muka punya kebalikannya. Keduanya normal.
    const f = buat({ outgoing: [], incoming: [] });
    f.componentInstance.muat('R501');
    tick();

    expect(f.componentInstance.adaArusKas()).toBeFalse();
    expect(f.componentInstance.arusKasTerkunci()).toBeFalse();
    expect(f.componentInstance.galat()).toBeFalsy();
  }));
});
