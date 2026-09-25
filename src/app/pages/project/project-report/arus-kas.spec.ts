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
    cakupanKeluar: ['pembelian', 'reimbursement', 'internal'],
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
    // Satuan disebut EKSPLISIT: bawaan layarnya kini harian, dan uji ini
    // memang tentang pengemberan bulanan.
    f.componentInstance.gantiSatuanKas('bulan');

    const t = f.componentInstance.titikArusKas();
    expect(t.map((x) => x.bulan)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(t.map((x) => x.saldo)).toEqual([-400, -700, -200]);
    expect(f.componentInstance.saldoKasAkhir()).toBe(-200);
    expect(f.componentInstance.totalKasMasuk()).toBe(500);
    expect(f.componentInstance.totalKasKeluar()).toBe(700);
  }));

  it('pembelian internal ikut hanya bila sakelar internal menyala', fakeAsync(() => {
    const f = buat({
      ...ARUS,
      outgoing: [
        ...ARUS.outgoing,
        { date: '2026-02-20', amount: 250, jenis: 'internal' },
      ],
    });
    f.componentInstance.muat('R501');
    tick();
    f.componentInstance.gantiSatuanKas('bulan');

    expect(f.componentInstance.sertakanInternal()).toBeTrue();
    expect(f.componentInstance.totalKasKeluar()).toBe(950);

    f.componentInstance.sertakanInternal.set(false);
    expect(f.componentInstance.totalKasKeluar()).toBe(700);
  }));

  it('menyebut bulan pertama saldonya menembus nol', fakeAsync(() => {
    // Angka yang sebenarnya dicari di grafik ini: sejak kapan proyek ini
    // menalangi uang perusahaan.
    const f = buat(ARUS);
    f.componentInstance.muat('R501');
    tick();
    f.componentInstance.gantiSatuanKas('bulan');

    expect(f.componentInstance.bulanMulaiMinus()).toBe('Jan 26');
  }));

  it('pada satuan HARIAN, menembus nolnya disebut sampai TANGGALNYA', fakeAsync(() => {
    /*
     * Inilah yang dibeli dengan satuan harian: bukan sekadar "Januari",
     * melainkan hari mana. Pada satuan bulanan, kas yang sempat minus di
     * pertengahan bulan lalu tertolong termin di akhir bulan tidak pernah
     * muncul sama sekali.
     */
    const f = buat(ARUS);
    f.componentInstance.muat('R501');
    tick();

    expect(f.componentInstance.satuanKas()).toBe('hari');
    expect(f.componentInstance.bulanMulaiMinus()).toBe('10 Jan 26');
  }));

  it('berganti satuan mengembalikan jendela ke ujung kanan', fakeAsync(() => {
    /*
     * Lebar jendela dihitung dalam SATUAN TITIK. Geseran 6 pada bulanan
     * berarti 6 hari pada harian — tampilannya melompat ke rentang yang
     * tidak diminta siapa pun, dan tidak ada yang menandainya.
     */
    const f = buat(ARUS);
    f.componentInstance.muat('R501');
    tick();
    f.componentInstance.gantiSatuanKas('bulan');
    f.componentInstance.geserKas.set(2);

    f.componentInstance.gantiSatuanKas('hari');
    expect(f.componentInstance.geserKas()).toBe(0);
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

  // ------------------------------------------------------------------
  // Pemilih seri
  // ------------------------------------------------------------------

  describe('pemilih seri', () => {
    it('seri yang dimatikan DIBUANG dari datasets, bukan ditandai hidden', fakeAsync(() => {
      /*
       * `hidden` menyembunyikan garisnya tetapi nilainya tetap ikut
       * menentukan rentang sumbu Y. Saldo yang bergerak di -700 sampai -200
       * akan tetap digambar pada sumbu yang membentang sampai +500 hanya
       * karena kas masuk yang TIDAK TERLIHAT masih ada di sana — dan garis
       * yang diminta tampil sendirian justru jadi gepeng.
       */
      const f = buat(ARUS);
      f.componentInstance.muat('R501');
      tick();
      // Uji ini tentang JENDELA, dan jendelanya dulu disusun atas ember
      // bulanan. Satuannya disebut eksplisit supaya yang diuji tetap hal
      // yang sama sesudah bawaan layarnya menjadi harian.
      f.componentInstance.gantiSatuanKas('bulan');

      expect(f.componentInstance.dataArusKas().datasets.length).toBe(3);

      f.componentInstance.toggleSeriKas('masuk');
      f.componentInstance.toggleSeriKas('keluar');

      const ds = f.componentInstance.dataArusKas().datasets;
      expect(ds.length).toBe(1);
      expect(ds.some((d: any) => d.hidden)).toBeFalse();
    }));

    it('seri terakhir tidak dapat dimatikan', fakeAsync(() => {
      // Grafik tanpa satu pun garis adalah kotak kosong dengan sumbu: tidak
      // ada galat, tidak ada keterangan, dan yang mematikannya belum tentu
      // ingat bahwa ia sendiri penyebabnya.
      const f = buat(ARUS);
      f.componentInstance.muat('R501');
      tick();
      // Uji ini tentang JENDELA, dan jendelanya dulu disusun atas ember
      // bulanan. Satuannya disebut eksplisit supaya yang diuji tetap hal
      // yang sama sesudah bawaan layarnya menjadi harian.
      f.componentInstance.gantiSatuanKas('bulan');

      f.componentInstance.toggleSeriKas('masuk');
      f.componentInstance.toggleSeriKas('keluar');
      expect(f.componentInstance.seriKasTerkunci('saldo')).toBeTrue();

      f.componentInstance.toggleSeriKas('saldo');
      expect(f.componentInstance.seriKasAktif('saldo')).toBeTrue();
      expect(f.componentInstance.dataArusKas().datasets.length).toBe(1);
    }));

    it('warna chip berasal dari sumber yang sama dengan warna garis', fakeAsync(() => {
      // Ditulis dua kali, chip hijau dan garis merah akan menunjuk hal yang
      // sama tanpa satu pun galat — dan yang membacanya menyimpulkan
      // grafiknya yang salah, bukan warnanya.
      const f = buat(ARUS);
      f.componentInstance.muat('R501');
      tick();
      // Uji ini tentang JENDELA, dan jendelanya dulu disusun atas ember
      // bulanan. Satuannya disebut eksplisit supaya yang diuji tetap hal
      // yang sama sesudah bawaan layarnya menjadi harian.
      f.componentInstance.gantiSatuanKas('bulan');

      const ds: any[] = f.componentInstance.dataArusKas().datasets as any[];
      const urut: any[] = ['masuk', 'keluar', 'saldo'];
      urut.forEach((k, i) => {
        expect(ds[i].borderColor).toBe(f.componentInstance.warnaSeriKas(k));
      });
    }));
  });

  // ------------------------------------------------------------------
  // Jendela geser
  // ------------------------------------------------------------------

  describe('jendela geser', () => {
    /** 18 bulan: keluar 100 tiap bulan, tanpa pemasukan. */
    const PANJANG = {
      outgoing: Array.from({ length: 18 }, (_, i) => ({
        date:
          `${2025 + Math.floor(i / 12)}-` +
          `${String((i % 12) + 1).padStart(2, '0')}-10`,
        amount: 100,
      })),
      incoming: [],
    };

    it('bawaannya menampilkan jendela TERBARU, bukan yang paling awal', fakeAsync(() => {
      // Yang membuka laporan arus kas menanyakan posisi kas SEKARANG.
      // Memaksanya menggeser ke ujung kanan lebih dulu setiap kali adalah
      // pekerjaan yang tidak ada gunanya.
      const f = buat(PANJANG);
      f.componentInstance.muat('R501');
      tick();
      // Uji ini tentang JENDELA, dan jendelanya dulu disusun atas ember
      // bulanan. Satuannya disebut eksplisit supaya yang diuji tetap hal
      // yang sama sesudah bawaan layarnya menjadi harian.
      f.componentInstance.gantiSatuanKas('bulan');

      const semua = f.componentInstance.titikArusKas();
      const tampil = f.componentInstance.titikTampil();

      expect(semua.length).toBe(18);
      expect(tampil.length).toBe(f.componentInstance.lebarJendela());
      expect(tampil[tampil.length - 1].bulan).toBe(semua[semua.length - 1].bulan);
    }));

    it('saldo di jendela tetap kumulatif sejak AWAL proyek', fakeAsync(() => {
      /*
       * Yang dipotong adalah TITIK yang saldonya sudah kumulatif — bukan
       * pembayarannya. Kalau pembayarannya yang disaring lebih dulu, saldo di
       * jendela ini dimulai ulang dari nol, dan proyek yang sudah menalangi
       * setahun terbaca baru mulai.
       */
      const f = buat(PANJANG);
      f.componentInstance.muat('R501');
      tick();
      // Uji ini tentang JENDELA, dan jendelanya dulu disusun atas ember
      // bulanan. Satuannya disebut eksplisit supaya yang diuji tetap hal
      // yang sama sesudah bawaan layarnya menjadi harian.
      f.componentInstance.gantiSatuanKas('bulan');

      const tampil = f.componentInstance.titikTampil();
      const pertama = tampil[0];

      // Bulan ke-7 dari 18 (jendela 12): sudah -700, bukan -100.
      expect(pertama.keluar).toBe(100);
      expect(pertama.saldo).toBeLessThan(-100);
      expect(tampil[tampil.length - 1].saldo).toBe(-1800);
    }));

    it('mundur lalu maju kembali ke posisi semula', fakeAsync(() => {
      const f = buat(PANJANG);
      f.componentInstance.muat('R501');
      tick();
      // Uji ini tentang JENDELA, dan jendelanya dulu disusun atas ember
      // bulanan. Satuannya disebut eksplisit supaya yang diuji tetap hal
      // yang sama sesudah bawaan layarnya menjadi harian.
      f.componentInstance.gantiSatuanKas('bulan');

      const awal = f.componentInstance.titikTampil().map((x) => x.bulan);
      f.componentInstance.geserKeBelakang();
      expect(f.componentInstance.titikTampil().map((x) => x.bulan)).not.toEqual(awal);

      f.componentInstance.geserKeDepan();
      expect(f.componentInstance.titikTampil().map((x) => x.bulan)).toEqual(awal);
    }));

    it('tidak dapat mundur melewati bulan pertama', fakeAsync(() => {
      const f = buat(PANJANG);
      f.componentInstance.muat('R501');
      tick();
      // Uji ini tentang JENDELA, dan jendelanya dulu disusun atas ember
      // bulanan. Satuannya disebut eksplisit supaya yang diuji tetap hal
      // yang sama sesudah bawaan layarnya menjadi harian.
      f.componentInstance.gantiSatuanKas('bulan');

      for (let i = 0; i < 20; i++) f.componentInstance.geserKeBelakang();

      const tampil = f.componentInstance.titikTampil();
      const semua = f.componentInstance.titikArusKas();
      expect(tampil[0].bulan).toBe(semua[0].bulan);
      expect(tampil.length).toBe(f.componentInstance.lebarJendela());
      expect(f.componentInstance.bisaMundur()).toBeFalse();
    }));

    it('melebarkan jendela mengembalikan ke bulan terkini', fakeAsync(() => {
      // Melebarkan dari posisi tengah membuat tampilannya melompat ke rentang
      // yang tidak diminta siapa pun.
      const f = buat(PANJANG);
      f.componentInstance.muat('R501');
      tick();
      // Uji ini tentang JENDELA, dan jendelanya dulu disusun atas ember
      // bulanan. Satuannya disebut eksplisit supaya yang diuji tetap hal
      // yang sama sesudah bawaan layarnya menjadi harian.
      f.componentInstance.gantiSatuanKas('bulan');

      f.componentInstance.geserKeBelakang();
      expect(f.componentInstance.bisaMaju()).toBeTrue();

      f.componentInstance.pilihJendela(24);
      expect(f.componentInstance.bisaMaju()).toBeFalse();
      // 18 titik dengan jendela 24: semuanya muat, kendalinya disembunyikan.
      expect(f.componentInstance.titikTampil().length).toBe(18);
      expect(f.componentInstance.jendelaDipakai()).toBeFalse();
    }));

    it('kendali jendela disembunyikan bila semuanya muat', fakeAsync(() => {
      // Kendali yang tidak dapat melakukan apa-apa hanya menyiratkan ada
      // sesuatu yang tersembunyi.
      const f = buat(ARUS); // hanya 3 bulan
      f.componentInstance.muat('R501');
      tick();
      f.componentInstance.gantiSatuanKas('bulan');

      expect(f.componentInstance.jendelaDipakai()).toBeFalse();
      expect(f.componentInstance.titikTampil().length).toBe(3);
    }));

    it('geser yang tertinggal di luar jangkauan dijepit, bukan mengosongkan grafik', fakeAsync(() => {
      // `geserKas` bertahan; berpindah ke proyek yang lebih pendek membuat
      // nilainya melewati ujung. Dijepit di `geserSah`, bukan hanya di
      // tombolnya.
      const f = buat(PANJANG);
      f.componentInstance.muat('R501');
      tick();
      // Uji ini tentang JENDELA, dan jendelanya dulu disusun atas ember
      // bulanan. Satuannya disebut eksplisit supaya yang diuji tetap hal
      // yang sama sesudah bawaan layarnya menjadi harian.
      f.componentInstance.gantiSatuanKas('bulan');

      f.componentInstance.geserKas.set(999);
      expect(f.componentInstance.titikTampil().length).toBe(
        f.componentInstance.lebarJendela(),
      );
      expect(f.componentInstance.titikTampil()[0].bulan).toBe(
        f.componentInstance.titikArusKas()[0].bulan,
      );
    }));
  });

  it('kurva S juga LURUS — kumulatif tidak boleh tampak turun', fakeAsync(() => {
    const f = buat(ARUS);
    f.componentInstance.muat('R501');
    tick();
    for (const d of f.componentInstance.dataKurvaS().datasets as any[]) {
      expect(d.tension).toBe(0);
    }
  }));

  it('seret ke kanan menggeser jendela ke titik yang lebih lama', fakeAsync(() => {
    const banyak = {
      ...ARUS,
      outgoing: Array.from({ length: 60 }, (_, i) => ({
        date: `2026-0${1 + Math.floor(i / 28)}-${String(1 + (i % 28)).padStart(2, '0')}`,
        amount: 10,
        jenis: 'pembelian',
      })),
    };
    const f = buat(banyak);
    const c = f.componentInstance;
    c.muat('R501');
    tick();
    c.pilihJendela(30);
    expect(c.jendelaDipakai()).toBeTrue();
    const el = { getBoundingClientRect: () => ({ width: 300 }), setPointerCapture: () => {} };
    c.mulaiSeretKas({ button: 0, clientX: 100, pointerId: 1, currentTarget: el } as any);
    c.gerakSeretKas({ clientX: 130 } as any); // 10 px per titik -> 3 titik
    expect(c.geserKas()).toBe(3);
    c.gerakSeretKas({ clientX: 50 } as any); // ke kiri melewati ujung terbaru
    expect(c.geserKas()).toBe(0);
    c.akhiriSeretKas();
  }));

  it('garis digambar LURUS, tanpa lengkung', fakeAsync(() => {
    /*
     * Lengkung (`tension > 0`) membuat chart.js menarik kurva MELEWATI titik
     * datanya: pada deret yang turun ke nol lalu naik lagi — bulan tanpa
     * penerimaan, yang di sini biasa — garis "kas masuk" tercelup di bawah
     * nol dan menggambar penerimaan negatif yang tidak pernah ada.
     *
     * Garis lurus membuat seluruh persoalan itu tidak ada: segmen lurus tidak
     * dapat melampaui kedua ujungnya.
     */
    const f = buat(ARUS);
    f.componentInstance.muat('R501');
    tick();

    for (const d of f.componentInstance.dataArusKas().datasets as any[]) {
      expect(d.tension).toBe(0);
      expect(d.cubicInterpolationMode).toBeUndefined();
    }
  }));

  it('tanggal mentah tidak pernah sampai ke layar', () => {
    // `2026-09-12` bentuk penyimpanan, bukan bentuk baca.
    const c = buat(ARUS).componentInstance;
    expect(c.tanggalBaca('2026-09-12')).toBe('12 Sep 2026');
    expect(c.tanggalBaca('2026-07-31T00:00:00')).toBe('31 Jul 2026');
    // Nol di depan tanggalnya dibuang.
    expect(c.tanggalBaca('2026-01-05')).toBe('5 Jan 2026');
    // Yang tidak terbaca dikembalikan apa adanya, bukan jadi "NaN NaN".
    expect(c.tanggalBaca(null)).toBe('');
    expect(c.tanggalBaca('bukan tanggal')).toBe('bukan tanggal');
  });

  it('jendela otomatis ~10 titik pada layar lebar', () => {
    const c = buat(ARUS).componentInstance;
    c.gantiSatuanKas('bulan');
    const j = (c as any).lebarWadah;

    j.set(1590); // 1920x1200: layar dikurangi menu samping dan padding
    expect(c.jendelaOtomatis()).toBe(10);

    j.set(900);
    expect(c.jendelaOtomatis()).toBe(6);

    // Dijepit di kedua ujung.
    j.set(200);
    expect(c.jendelaOtomatis()).toBe(5);
    j.set(9999);
    expect(c.jendelaOtomatis()).toBe(20);

    // Belum terukur: 10, bukan 0 — jendela nol berarti grafik kosong.
    j.set(0);
    expect(c.jendelaOtomatis()).toBe(10);
  });

  it('jendela otomatis HARIAN memakai ukuran sendiri', () => {
    /*
     * 160px per titik disusun untuk LABEL BULAN yang harus terbaca satu per
     * satu. Pada harian tidak ada yang membaca label tiap hari — yang dibaca
     * bentuk garisnya, dan bentuk baru muncul kalau titiknya cukup banyak.
     * Sepuluh hari bukan grafik, itu sepuluh batang berjajar.
     */
    const c = buat(ARUS).componentInstance;
    const j = (c as any).lebarWadah;

    expect(c.satuanKas()).toBe('hari');

    // 1590 / 22 = 72: sekitar dua bulan pada layar lebar.
    j.set(1590);
    expect(c.jendelaOtomatis()).toBe(72);

    // Dijepit di kedua ujung: di bawah 30 hari bentuknya hilang, di atas
    // 120 hari rinciannya tidak lagi terbaca DAN kendali gesernya berhenti
    // muncul untuk proyek yang lebih pendek dari itu.
    j.set(100);
    expect(c.jendelaOtomatis()).toBe(30);
    j.set(9999);
    expect(c.jendelaOtomatis()).toBe(120);

    // Belum terukur: dua bulan, bukan nol — jendela nol berarti grafik
    // kosong pada kedipan pertama.
    j.set(0);
    expect(c.jendelaOtomatis()).toBe(60);
  });

  it('proyek biasa HARUS mendapat kendali gesernya', () => {
    /*
     * INI YANG DILAPORKAN: grafik harian yang padat dan tidak dapat digeser
     * ke mana pun.
     *
     * Kendali geser hanya digambar ketika titiknya LEBIH BANYAK daripada
     * yang muat. Dengan jendela otomatis seratus tujuh puluhan hari, proyek
     * empat bulan tidak pernah melampauinya — jadi kendalinya tidak pernah
     * ada, dan yang tersisa grafik rapat yang tidak dapat ditelusuri.
     */
    const c = buat(ARUS).componentInstance;
    const j = (c as any).lebarWadah;
    j.set(1350);

    // Proyek empat bulan (~120 hari) pada layar 1350px.
    expect(c.jendelaOtomatis()).toBeLessThan(120);
  });

  it('chip lebar jendela IKUT satuannya', () => {
    /*
     * Angka di chip adalah JUMLAH TITIK, dan satu titik berarti hal yang
     * berbeda pada tiap satuan. Chip "6" pada satuan harian berarti jendela
     * enam HARI: grafik yang hanya memuat seminggu.
     */
    const c = buat(ARUS).componentInstance;
    expect(c.PILIHAN_JENDELA()).toEqual(['auto', 30, 60, 90]);

    c.gantiSatuanKas('bulan');
    expect(c.PILIHAN_JENDELA()).toEqual(['auto', 6, 10, 18]);
  });

  it('berganti satuan mengembalikan lebar jendela ke BAWAAN satuan itu', () => {
    /*
     * "6" yang terbawa dari bulanan menjadi jendela enam HARI. Angkanya
     * masih masuk akal, grafiknya masih tergambar, dan tidak ada apa pun
     * yang menyebutkan sebabnya.
     *
     * Yang dikembalikan BUKAN selalu `'auto'` — melainkan bawaan satuan yang
     * dituju: 30 pada harian, `'auto'` pada bulanan. `'auto'` pada harian di
     * layar lebar menghasilkan jendela seratus titik lebih, dan kendali
     * jendelanya lenyap sama sekali karena hanya digambar ketika titiknya
     * lebih banyak daripada yang muat. Lihat `jendela-bawaan.spec.ts`.
     */
    const c = buat(ARUS).componentInstance;
    c.gantiSatuanKas('bulan');
    expect(c.pilihanJendela()).toBe('auto');

    c.pilihJendela(6);
    expect(c.pilihanJendela()).toBe(6);

    c.gantiSatuanKas('hari');
    expect(c.pilihanJendela()).toBe(30);
  });

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

describe('titikKas() harian', () => {
  /*
   * KENAPA HARIAN DITAMBAHKAN.
   *
   * Titik bulanan hanya punya SATU nilai per bulan: saldo pada akhir bulan.
   * Garis di antara dua titik itu tarikan lurus — bukan pengukuran — dan
   * tarikan itu MENUTUPI apa yang terjadi di dalam bulannya.
   *
   * Yang tertutup persis hal yang paling perlu terlihat: bulan yang kasnya
   * sempat menembus nol di pertengahan lalu tertolong termin di akhir bulan
   * tergambar tidak pernah minus sama sekali. Tidak ada galat, tidak ada
   * tanda — grafiknya hanya lebih optimistik daripada kenyataannya.
   */

  it('INTI SOALNYA: minus di tengah bulan tak terlihat pada satuan bulanan', () => {
    // Keluar dulu Rp 800 pada tanggal 5, masuk Rp 900 pada tanggal 28.
    // Akhir bulan saldonya +100 — tetapi selama 23 hari ia minus 800.
    const keluar = [{ date: '2026-03-05', amount: 800 }];
    const masuk = [{ date: '2026-03-28', amount: 900 }];

    const bulanan = titikKas(masuk, keluar, 0, 'bulan');
    expect(bulanan.length).toBe(1);
    expect(bulanan[0].saldo).toBe(100);
    expect(bulanan.some((x) => x.saldo < 0))
      .withContext('satuan bulanan seharusnya memang tidak melihatnya')
      .toBeFalse();

    const harian = titikKas(masuk, keluar, 0, 'hari');
    const minus = harian.filter((x) => x.saldo < 0);
    expect(minus.length)
      .withContext('satuan harian tidak melihat bulan yang sempat minus')
      .toBe(23);
    expect(minus[0].saldo).toBe(-800);
    expect(harian[harian.length - 1].saldo).toBe(100);
  });

  it('hari tanpa pembayaran diisi nol, saldonya BERTAHAN datar', () => {
    /*
     * Kalau hari kosong dilewati, dua pembayaran berjarak sebulan menjadi
     * dua titik bersebelahan — dan kemiringan garis di antaranya berbohong:
     * sebulan tanpa gerakan terbaca sebagai penurunan yang landai.
     */
    const t = titikKas(
      [{ date: '2026-01-01', amount: 100 }],
      [{ date: '2026-01-05', amount: 30 }],
      0,
      'hari',
    );
    expect(t.length).toBe(5);
    expect(t.map((x) => x.saldo)).toEqual([100, 100, 100, 100, 70]);
    expect(t[1].masuk).toBe(0);
    expect(t[1].keluar).toBe(0);
  });

  it('saldo awal terbawa ke hari pertama', () => {
    const t = titikKas([], [{ date: '2026-02-10', amount: 40 }], -500, 'hari');
    expect(t[0].saldo).toBe(-540);
  });

  it('melewati pergantian bulan DAN tahun tanpa melompat', () => {
    /*
     * Penambahan hari memakai `Date.UTC`, bukan `new Date(y, m, d)`: yang
     * kedua memakai zona waktu lokal, dan melewati pergantian musim panas
     * akan melompati atau menggandakan satu hari — pada deret kumulatif,
     * satu hari yang hilang menggeser seluruh sisanya.
     */
    const t = titikKas(
      [{ date: '2025-12-30', amount: 10 }],
      [{ date: '2026-01-02', amount: 4 }],
      0,
      'hari',
    );
    expect(t.map((x) => x.bulan)).toEqual([
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
      '2026-01-02',
    ]);
    expect(t[t.length - 1].saldo).toBe(6);
  });

  it('tahun kabisat: 29 Februari tidak dilewati', () => {
    const t = titikKas(
      [{ date: '2028-02-28', amount: 10 }],
      [{ date: '2028-03-01', amount: 3 }],
      0,
      'hari',
    );
    expect(t.map((x) => x.bulan)).toEqual([
      '2028-02-28',
      '2028-02-29',
      '2028-03-01',
    ]);
  });

  it('tanggal DIPOTONG SEBAGAI TEKS, bukan diurai jadi Date', () => {
    /*
     * `new Date("2026-09-01")` adalah tengah malam UTC, dan di WIB (UTC+7)
     * ia tetap 1 September — tetapi pembayaran yang datang dengan jam
     * (`"2026-09-01T00:00:00Z"`) pernah mundur sehari lewat jalur lain.
     * Memotong teksnya menutup seluruh kelas kekeliruan itu.
     */
    const t = titikKas(
      [{ date: '2026-09-01T00:00:00.000Z', amount: 50 }],
      [],
      0,
      'hari',
    );
    expect(t.length).toBe(1);
    expect(t[0].bulan).toBe('2026-09-01');
  });

  it('tanggal rusak dilewati, bukan menjatuhkan grafiknya', () => {
    const t = titikKas(
      [
        { date: 'entah', amount: 99 },
        { date: null, amount: 99 },
        { date: '2026-05-04', amount: 10 },
      ],
      [],
      0,
      'hari',
    );
    expect(t.length).toBe(1);
    expect(t[0].saldo).toBe(10);
  });

  it('rentang yang tidak masuk akal DIBATASI, bukan membekukan peramban', () => {
    /*
     * Satu tanggal rusak yang lolos penyaringan — misalnya tahun 1900 —
     * akan menghasilkan puluhan ribu titik. Yang terjadi bukan grafik yang
     * salah melainkan tab yang berhenti merespons, dan tidak ada galat apa
     * pun yang menyebut sebabnya.
     */
    const t = titikKas(
      [{ date: '1900-01-01', amount: 1 }],
      [{ date: '2026-01-01', amount: 1 }],
      0,
      'hari',
    );
    expect(t.length).toBeLessThanOrEqual(3660);
  });

  it('bawaan fungsinya tetap BULANAN', () => {
    /*
     * Layar memilih harian; fungsi ini tidak. Pemanggil yang tidak menyebut
     * satuannya tidak boleh tiba-tiba menerima tujuh ratus titik.
     */
    const t = titikKas(
      [{ date: '2026-01-03', amount: 10 }],
      [{ date: '2026-01-20', amount: 4 }],
    );
    expect(t.length).toBe(1);
    expect(t[0].bulan).toBe('2026-01');
  });
});
