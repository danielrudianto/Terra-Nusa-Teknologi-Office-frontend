/**
 * Laporan proyek: apa yang boleh ikut disaring tahun, dan apa yang tidak.
 *
 * Aturannya satu kalimat: KONTRAK DAN MARGIN SEUMUR PROYEK, biaya dan arus
 * mengikuti tahun terpilih.
 *
 * Alasannya bukan selera. Margin adalah `kontrak − biaya`. Proyek
 * konstruksi kerap lintas tahun — SPK terbit Desember, pekerjaannya berjalan
 * tahun berikutnya. Bila biayanya disaring per tahun sementara kontraknya
 * utuh, tahun pertama tampak untung hampir seratus persen dan tahun
 * berikutnya rugi telak. Kedua angka itu terbit dengan wajar, dan tidak ada
 * galat yang memberitahu bahwa keduanya tidak berarti apa-apa.
 *
 * Diuji lewat komponennya langsung, bukan lewat layar yang dirender:
 * merendernya menuntut rute, terjemahan, dan ApiService — dan yang diuji di
 * sini aturan cakupannya, bukan kerangka pengujiannya.
 */

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

import { ApiService } from '../../../services/api.service';
import { ProjectLookupService } from '../../../services/project-lookup.service';
import { ProjectReportComponent } from './project-report.component';

const KONTRAK_DPP = 1_000_000_000;

function komponen(): any {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ApiService,
        useValue: { get: () => ({ subscribe: () => ({ add: () => {} }) }) },
      },
      { provide: Router, useValue: { navigate: () => {} } },
      { provide: ActivatedRoute, useValue: { snapshot: { params: {} } } },
      { provide: MatSnackBar, useValue: { open: () => {} } },
      { provide: TranslateService, useValue: { instant: (k: string) => k } },
      {
        provide: ProjectLookupService,
        useValue: {
          muat: () => Promise.resolve(),
          cari: () => ({
            id: 1,
            name: 'Proyek Lintas Tahun',
            contractDpp: KONTRAK_DPP,
            contractValue: KONTRAK_DPP * 1.11,
          }),
        },
      },
    ],
  });
  return TestBed.runInInjectionContext(
    () => new (ProjectReportComponent as any)(),
  );
}

afterEach(() => TestBed.resetTestingModule());

function pembelian(tanggal: string, dpp: number, jenis = 'A'): any {
  return {
    date: tanggal,
    dpp,
    ppn: 0,
    pbbkb: 0,
    otherValue: 0,
    purchaseType: jenis,
    isInternal: false,
    supplier: { name: 'Pemasok Uji', prefix: 'PT' },
  };
}

/**
 * Proyek yang berjalan dua tahun: 300 juta di 2025, 200 juta di 2026.
 *
 * Angkanya sengaja berbeda antar tahun, dan jumlahnya sengaja tidak bulat
 * terhadap kontraknya — supaya tertukarnya cakupan langsung terlihat pada
 * angka, bukan hanya pada nama variabel.
 */
function proyekLintasTahun(): any {
  return {
    purchases: [
      pembelian('2025-06-01', 200_000_000),
      pembelian('2025-12-31', 100_000_000, 'B'),
      pembelian('2026-01-01', 150_000_000),
      pembelian('2026-08-19', 50_000_000, 'B'),
    ],
    purchase_drafts: [],
    reimbursements: [],
    sales_invoices: [
      { date: '2025-07-01', dpp: 400_000_000, ppn: 0 },
      { date: '2026-02-01', dpp: 300_000_000, ppn: 0 },
    ],
  };
}

function siap(): any {
  const c = komponen();
  c.kode.set('LTT');
  c._data.set(proyekLintasTahun());
  return c;
}

describe('cakupan tahun pada laporan proyek', () => {
  describe('daftar tahun yang ditawarkan', () => {
    it('diturunkan dari datanya, terbaru lebih dulu', () => {
      expect(siap().tahunTersedia()).toEqual([2026, 2025]);
    });

    it('bawaannya seluruh periode, bukan tahun berjalan', () => {
      /*
       * Bila bawaannya tahun ini, setiap proyek yang selesai tahun lalu
       * terbuka kosong melompong — dan yang membukanya menyimpulkan datanya
       * hilang, bukan tahunnya yang keliru.
       */
      expect(siap().tahun()).toBe('semua');
    });

    it('berganti proyek mengembalikan saringannya ke seluruh periode', () => {
      const c = siap();
      c.pilihTahun(2025);
      c.muat('LAIN');
      expect(c.tahun()).toBe('semua');
    });
  });

  describe('yang TIDAK boleh ikut disaring', () => {
    it('biaya seumur proyek tetap sama pada tahun mana pun', () => {
      const c = siap();
      const seumur = c.biayaSeumurProyek();
      expect(seumur).toBe(500_000_000);

      c.pilihTahun(2026);
      expect(c.biayaSeumurProyek()).toBe(seumur);

      c.pilihTahun(2025);
      expect(c.biayaSeumurProyek()).toBe(seumur);
    });

    it('margin tetap sama pada tahun mana pun', () => {
      /*
       * Inti seluruh berkas ini. Bila margin ikut tersaring, memilih 2026
       * menghasilkan Rp 800 juta — angka yang tampak menyenangkan dan tidak
       * berarti apa pun.
       */
      const c = siap();
      expect(c.margin()).toBe(KONTRAK_DPP - 500_000_000);

      c.pilihTahun(2026);
      expect(c.margin()).toBe(KONTRAK_DPP - 500_000_000);
      expect(c.margin()).not.toBe(KONTRAK_DPP - 200_000_000);
    });

    it('porsi kontrak terpakai tetap sama pada tahun mana pun', () => {
      // Porsi sepotong tahun terhadap kontrak utuh tidak pernah mendekati
      // 100%, sehingga peringatan "melampaui kontrak" tidak pernah muncul.
      const c = siap();
      const porsi = c.porsiTerpakai();
      c.pilihTahun(2026);
      expect(c.porsiTerpakai()).toBe(porsi);
    });

    it('tertagih tetap seumur proyek', () => {
      const c = siap();
      const semua = c.tertagih();
      expect(semua).toBe(700_000_000);
      c.pilihTahun(2026);
      expect(c.tertagih()).toBe(semua);
    });
  });

  describe('yang MEMANG ikut disaring', () => {
    it('biaya periode hanya memuat tahun terpilih', () => {
      const c = siap();
      c.pilihTahun(2026);
      expect(c.biayaPeriode()).toBe(200_000_000);

      c.pilihTahun(2025);
      expect(c.biayaPeriode()).toBe(300_000_000);
    });

    it('rincian kategori ikut menyempit', () => {
      const c = siap();
      c.pilihTahun(2026);
      const jumlah = c.kategori().reduce((a: number, k: any) => a + k.nilai, 0);
      expect(jumlah).toBe(200_000_000);
    });

    it('arus mingguan hanya memuat minggu tahun terpilih', () => {
      const c = siap();
      c.pilihTahun(2026);
      for (const m of c.mingguan()) {
        expect(m.mulai >= '2025-12-29').toBeTrue();
      }
    });
  });

  describe('kedua angka biaya pada "Seluruh periode"', () => {
    it('identik — keduanya lewat rumus yang sama', () => {
      /*
       * Penjaga terhadap perhitungan ganda. Bila biaya seumur proyek kelak
       * dijumlah dengan rumusnya sendiri, bedanya justru TIDAK terlihat pada
       * tahun terpilih — hanya pada "Seluruh periode", tempat keduanya
       * seharusnya angka yang sama persis.
       */
      const c = siap();
      expect(c.biayaPeriode()).toBe(c.biayaSeumurProyek());
    });

    it('jumlah seluruh tahun sama dengan biaya seumur proyek', () => {
      // Bila ada dokumen yang jatuh ke luar setiap tahun, jumlahnya kurang —
      // dan tidak ada layar yang membandingkan keduanya.
      const c = siap();
      let jumlah = 0;
      for (const t of c.tahunTersedia()) {
        c.pilihTahun(t);
        jumlah += c.biayaPeriode();
      }
      expect(jumlah).toBe(c.biayaSeumurProyek());
    });
  });

  describe('kumulatif yang dibawa dari tahun sebelumnya', () => {
    it('tahun kedua tidak dimulai dari nol', () => {
      /*
       * Kumulatif yang direset tiap tahun membuat proyek yang sudah berjalan
       * setahun terlihat baru dimulai — padahal grafik ini justru dibaca
       * untuk menjawab "apakah anggarannya jebol sebelum pekerjaannya
       * selesai".
       */
      const c = siap();
      c.pilihTahun(2026);
      expect(c.biayaDibawa()).toBe(300_000_000);

      const minggu = c.mingguan();
      expect(minggu.length).toBeGreaterThan(0);
      expect(minggu[minggu.length - 1].biayaKumulatif).toBe(500_000_000);
    });

    it('tahun pertama tidak membawa apa pun', () => {
      const c = siap();
      c.pilihTahun(2025);
      expect(c.biayaDibawa()).toBe(0);
    });

    it('"Seluruh periode" tidak membawa apa pun', () => {
      // Membawa di atas data yang sudah lengkap menghitung ganda.
      const c = siap();
      expect(c.biayaDibawa()).toBe(0);
      const minggu = c.mingguan();
      expect(minggu[minggu.length - 1].biayaKumulatif).toBe(500_000_000);
    });
  });

  describe('layar kosong: sebabnya dibedakan', () => {
    it('tahun tanpa catatan disebut sebagai tahunnya, bukan sebagai proyeknya', () => {
      const c = siap();
      c.pilihTahun(2024 as any);
      expect(c.periodeKosong()).toBeTrue();
      expect(c.belumAdaCatatan()).toBeFalse();
    });

    it('proyek yang memang kosong bukan "tahun kosong"', () => {
      const c = komponen();
      c.kode.set('KOSONG');
      c._data.set({
        purchases: [],
        purchase_drafts: [],
        reimbursements: [],
        sales_invoices: [],
      });
      expect(c.belumAdaCatatan()).toBeTrue();
      expect(c.periodeKosong()).toBeFalse();
    });
  });

  describe('berkas unduhan', () => {
    it('membawa periodenya dan kedua angka biaya', () => {
      /*
       * Berkas yang beredar tidak membawa konteks layar. Rincian kategori di
       * dalamnya sudah tersaring tahun; tanpa keterangan periode dan tanpa
       * biaya periodenya, ia terbaca sebagai rincian seumur proyek yang
       * totalnya kebetulan tidak cocok.
       */
      const c = siap();
      c.pilihTahun(2026);
      const d = c.dataUnduhan();
      expect(d.periode).toBe('2026');
      expect(d.biayaSeumurProyek).toBe(500_000_000);
      expect(d.biayaPeriode).toBe(200_000_000);
    });
  });
});
