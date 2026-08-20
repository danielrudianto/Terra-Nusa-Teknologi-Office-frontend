import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { catchError, forkJoin, of } from 'rxjs';

import { ApiService } from '../../../services/api.service';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { ProjectSelectorComponent } from '../../../components/project-selector/project-selector.component';
import { ProjectLookupService } from '../../../services/project-lookup.service';
import { purchaseTypeLabel } from '../../../constants/purchase-type-label.constant';
import {
  SELURUH,
  TahunLaporan,
  dalamTahun,
  daftarTahun,
  labelTahun,
  sebelumTahun,
} from '../../../constants/tahun-laporan';
import {
  biayaDraft,
  biayaPembelian,
  biayaReimbursement,
  nilaiTagihan,
  nilaiTagihanKotor,
} from '../../../helpers/nilai-biaya.helper';
import {
  unduhLaporanProyekExcel,
  unduhLaporanProyekPdf,
  type DataLaporanProyek,
} from '../../../helpers/project-report-download';

interface BarisPemasok {
  nama: string;
  nilai: number;
}

/**
 * Awalan yang menandai badan usaha, bukan orang.
 *
 * "Pribadi" dan "Lainnya" adalah penanda jenis di basis data, bukan bagian
 * dari nama. Menempelkannya menghasilkan "Pribadi Riski Riyansyah", yang
 * bukan nama siapa pun.
 */
const AWALAN_BADAN = /^(PT|CV|UD|PD|Koperasi|Yayasan|Firma)\.?$/i;

/**
 * Nama pemasok pada pembelian dan draft.
 *
 * Server mengirim pemasok sebagai OBJEK BERSARANG (`supplier.name`,
 * `supplier.prefix`), bukan kolom datar. Versi sebelumnya membaca
 * `supplier_name` — nama alias di kueri repository — yang tidak pernah
 * sampai ke muatan JSON, sehingga setiap baris jatuh ke teks cadangan dan
 * seluruh rincian tampak kosong.
 *
 * Bentuk datar tetap dicoba sebagai cadangan, kalau-kalau ada endpoint lain
 * yang mengirimkannya begitu.
 */
function namaPemasok(p: any): string {
  const s = p?.supplier;
  if (s?.name) {
    const awalan = (s.prefix ?? '').trim();
    return AWALAN_BADAN.test(awalan)
      ? `${awalan} ${s.name}`.trim()
      : String(s.name).trim();
  }
  const datar = [p?.supplier_prefix, p?.supplier_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  return datar || p?.supplierName || '(pemasok tidak tercatat)';
}

/**
 * Penerima pada reimbursement.
 *
 * Reimbursement tidak punya pemasok: yang ditalangi adalah orang, dan
 * namanya ada di `bankAccountName`. Sebelumnya yang dipakai `name`, yang
 * sebenarnya nomor dokumen — sehingga rinciannya berisi deretan nomor dan
 * tidak menjawab pertanyaan "uangnya ke siapa".
 */
/*
 * Rumus biayanya TIDAK ADA DI BERKAS INI — ia di `helpers/nilai-biaya.helper.ts`.
 *
 * Layar ini dulu punya rumusnya sendiri, `dpp + PPN + PBBKB + nilai lain`,
 * sementara daftar margin dan servernya menjumlahkan `dpp` saja. Keduanya
 * menyebut hasilnya "margin", keduanya tidak pernah menimbulkan galat, dan
 * bedanya baru ketahuan ketika satu proyek dibuka dari daftarnya dan
 * angkanya berbeda ratusan juta.
 */

/**
 * Biaya dikelompokkan menurut kode tipe biaya, lalu per pemasok.
 *
 * Fungsi lepas, bukan isi `computed`, karena dipakai DUA KALI dengan cakupan
 * berbeda: sekali atas data tahun terpilih, sekali atas seluruh umur proyek.
 * Angka yang kedua yang membentuk margin.
 *
 * Menjumlahkan yang kedua dengan rumus tersendiri akan menghasilkan dua
 * angka yang seharusnya identik ketika saringannya "Seluruh periode" —
 * dan bila salah satunya kelak diubah sendirian, bedanya tidak akan
 * ketahuan dari layar mana pun.
 *
 * Ketiganya memakai rumus bersama di `helpers/nilai-biaya.helper.ts`:
 * pembelian dan draft memakai DPP saja, reimbursement memakai nominal
 * pengajuannya karena pengajuan penggantian memang tidak mengenal DPP.
 */
function susunKategori(
  d: any,
  sertakanInternal: boolean,
  kontrak: number,
  namaKategori: (kode: string) => string,
): Kategori[] {
  if (!d) return [];

  const peta = new Map<string, Map<string, number>>();

  const catat = (kode: string, pemasok: string, nilai: number) => {
    const k = (kode || '?').toString();
    if (!peta.has(k)) peta.set(k, new Map());
    const m = peta.get(k)!;
    m.set(pemasok, (m.get(pemasok) ?? 0) + (Number(nilai) || 0));
  };

  const pembelian = sertakanInternal
    ? d.purchases
    : d.purchases.filter((p: any) => !p.isInternal);

  for (const p of pembelian) {
    catat(p.purchaseType, namaPemasok(p), biayaPembelian(p));
  }
  for (const p of d.purchase_drafts) {
    catat(p.purchaseType, namaPemasok(p), biayaDraft(p));
  }
  for (const r of d.reimbursements) {
    catat(r.purchaseType, namaPenerima(r), biayaReimbursement(r));
  }

  const hasil: Kategori[] = [];
  for (const [kode, pemasokMap] of peta) {
    const pemasok = [...pemasokMap.entries()]
      .map(([nama, nilai]) => ({ nama, nilai }))
      .sort((a, b) => b.nilai - a.nilai);
    const nilai = pemasok.reduce((a, b) => a + b.nilai, 0);
    hasil.push({
      kode,
      nama: namaKategori(kode),
      nilai,
      pemasok,
      // `null` bila kontraknya belum diisi — bukan nol, karena nol terbaca
      // sebagai "tidak menyerap apa pun" padahal artinya "belum dapat
      // dihitung".
      porsiKontrak: kontrak > 0 ? (nilai / kontrak) * 100 : null,
    });
  }
  return hasil.sort((a, b) => b.nilai - a.nilai);
}

/**
 * Senin pada minggu tanggal tersebut, sebagai teks `YYYY-MM-DD`.
 *
 * Minggu dimulai Senin, bukan Minggu: pekerjaan lapangan dan penagihan
 * mengikuti minggu kerja, dan memotong di hari Minggu membelah satu minggu
 * kerja menjadi dua batang.
 */
function awalMinggu(tanggal: any): string | null {
  if (!tanggal) return null;
  const t = new Date(tanggal);
  if (isNaN(t.getTime())) return null;
  // getDay(): 0 = Minggu. Digeser agar Senin menjadi awal.
  const geser = (t.getDay() + 6) % 7;
  t.setDate(t.getDate() - geser);
  const dua = (n: number) => String(n).padStart(2, '0');
  return `${t.getFullYear()}-${dua(t.getMonth() + 1)}-${dua(t.getDate())}`;
}

function namaPenerima(r: any): string {
  return (
    r?.bankAccountName?.trim() ||
    r?.employeeName?.trim() ||
    r?.name?.trim() ||
    '(penerima tidak tercatat)'
  );
}

interface Minggu {
  /** Senin minggu tersebut, `YYYY-MM-DD`. */
  mulai: string;
  label: string;
  biaya: number;
  tagihan: number;
  /** Biaya sejak awal proyek sampai akhir minggu ini. */
  biayaKumulatif: number;
}

interface Kategori {
  kode: string;
  nama: string;
  nilai: number;
  pemasok: BarisPemasok[];
  /**
   * Bagian nilai kontrak yang diserap kategori ini, dalam persen.
   *
   * BUKAN margin per kategori: nilai kontrak tersimpan sebagai satu angka
   * dan tidak dipecah per jenis pekerjaan, sehingga margin per kategori
   * tidak dapat dihitung dari data yang ada — mengarangnya akan
   * menghasilkan angka yang tampak tepat tetapi tidak berarti apa pun.
   *
   * Yang ini dapat dihitung dan tetap menjawab pertanyaannya: kategori mana
   * yang paling banyak memakan kontraknya.
   *
   * `null` bila nilai kontraknya belum diisi.
   */
  porsiKontrak: number | null;
}

@Component({
  selector: 'app-project-report',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    TranslatePipe,
    HeaderTitleComponent,
    ProjectSelectorComponent,
  ],
  templateUrl: './project-report.component.html',
  styleUrl: './project-report.component.scss',
})
export class ProjectReportComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  readonly lookup = inject(ProjectLookupService);

  /**
   * Pemilih memakai daftar penuh, termasuk proyek selesai dan batal.
   *
   * Laporan justru paling sering dibuka untuk proyek yang sudah tutup —
   * di situlah margin akhirnya diketahui. Menyaring hanya yang berjalan
   * membuat laporan tidak bisa dibuat justru saat paling dibutuhkan.
   */
  readonly kodeControl = new FormControl('');

  readonly memuat = signal(false);
  readonly galat = signal<string | null>(null);
  readonly kode = signal('');
  readonly tampilan = signal<'ikhtisar' | 'arus'>('ikhtisar');
  readonly kategoriTerbuka = signal<string | null>(null);

  /**
   * Sertakan pembelian bertanda internal.
   *
   * Bawaannya menyala agar angkanya sama dengan sebelum tombol ini ada —
   * laporan yang diam-diam berubah nilainya lebih membingungkan daripada
   * laporan yang butuh satu klik.
   *
   * Hanya PEMBELIAN yang punya penanda ini. Draft dan reimbursement tidak,
   * jadi keduanya selalu ikut terhitung. Itu disebutkan di layar supaya
   * tidak dikira menyaring semuanya.
   */
  readonly sertakanInternal = signal(true);

  /**
   * Tahun aktivitas yang sedang ditampilkan.
   *
   * Bawaannya SELURUH PERIODE, bukan tahun berjalan. Bila bawaannya tahun
   * ini, setiap proyek yang selesai tahun lalu terbuka kosong melompong —
   * dan yang membukanya menyimpulkan datanya hilang, bukan tahunnya yang
   * keliru.
   */
  readonly tahun = signal<TahunLaporan>(SELURUH);
  readonly SELURUH = SELURUH;

  /*
   * Warna komposisi. Sengaja tetap, bukan token tema: ini warna DATA, yang
   * gunanya membedakan satu kategori dari kategori lain. Mengikutkannya ke
   * tema membuat potongan yang bersebelahan bisa jatuh ke rona yang mirip.
   */
  private readonly PALET = [
    '#154dec',
    '#3f7ae0',
    '#5aa9e6',
    '#57c5b6',
    '#f5a524',
    '#e2725b',
    '#9a8fb8',
    '#7a8b99',
  ];

  warna(i: number): string {
    return this.PALET[i % this.PALET.length];
  }

  private readonly _data = signal<any>(null);

  ngOnInit(): void {
    void this.lookup.muat();

    const dariRute = this.route.snapshot.params['code'];
    if (dariRute) {
      this.kodeControl.setValue(dariRute);
      this.muat(dariRute);
    }

    this.kodeControl.valueChanges.subscribe((v) => {
      const k = (v ?? '').trim().toUpperCase();
      // Hanya memuat bila kodenya benar-benar terdaftar. Mengetik sebagian
      // kode tidak boleh memicu permintaan yang pasti kosong hasilnya.
      if (k && this.lookup.cari(k)) this.muat(k);
    });
  }

  /**
   * Laporan digabung dengan proyek anaknya.
   *
   * Bawaannya MATI. Angka proyek yang sudah dihafal orang tidak boleh
   * berubah sendiri begitu fitur ini terpasang; yang menghendaki gabungan
   * menyalakannya, dan saat itu ia tahu apa yang sedang dilihatnya.
   */
  readonly gabungAnak = signal(false);

  /** Proyek yang ikut terhitung: satu, atau seluruh keluarganya. */
  readonly proyekTergabung = computed(() =>
    this.gabungAnak() ? this.lookup.keluarga(this.kode()) : [],
  );

  /** Layar ini punya sesuatu untuk digabung. */
  readonly bisaDigabung = computed(() => this.lookup.punyaAnak(this.kode()));

  ubahGabung(nyala: boolean): void {
    this.gabungAnak.set(nyala);
    this.muat(this.kode());
  }

  muat(kode: string): void {
    this.memuat.set(true);
    this.galat.set(null);
    this.kode.set(kode);
    this.kategoriTerbuka.set(null);
    // Tahun proyek sebelumnya belum tentu ada pada proyek ini. Membawanya
    // ikut membuat laporan terbuka kosong tanpa sebab yang terbaca.
    this.tahun.set(SELURUH);

    /*
     * Satu permintaan per proyek, lalu digabung di layar.
     *
     * Server melayani laporan per KODE, dan kode itu tersimpan sebagai teks
     * pada tiap dokumen — bukan sebagai tautan. Menggabungkannya di server
     * berarti mengubah empat kueri sekaligus; menggabungkannya di sini cukup
     * menyambung empat larik, dan satu keluarga proyek isinya beberapa,
     * bukan puluhan.
     */
    const daftar = this.gabungAnak() ? this.lookup.keluarga(kode) : [];
    const kodeSemua = daftar.length ? daftar.map((p) => p.code) : [kode];

    forkJoin(
      kodeSemua.map((k) =>
        this.api.get(`purchases/report/project/${k}`, {}).pipe(
          /*
           * Satu proyek yang gagal TIDAK menggugurkan yang lain.
           *
           * Pada gabungan, satu kode yang bermasalah akan menghapus seluruh
           * laporan keluarganya — dan yang membacanya tidak akan tahu bahwa
           * yang hilang cuma satu.
           */
          catchError(() => of(null)),
        ),
      ),
    )
      .subscribe({
        next: (hasil: any[]) => {
          const sah = hasil.filter(Boolean);
          if (!sah.length) {
            this._data.set(null);
            const pesan = this.translate.instant('notify.loadFailed');
            this.galat.set(pesan);
            this.snackBar.open(pesan, 'Close', { duration: 4000 });
            return;
          }
          const gabung = (kunci: string) =>
            sah.flatMap((r: any) => r?.[kunci] ?? []);
          this._data.set({
            purchases: gabung('purchases'),
            reimbursements: gabung('reimbursements'),
            purchase_drafts: gabung('purchase_drafts'),
            sales_invoices: gabung('sales_invoices'),
          });
        },
        error: (err) => {
          this._data.set(null);
          const pesan =
            err?.error?.detail ?? this.translate.instant('notify.loadFailed');
          this.galat.set(pesan);
          this.snackBar.open(pesan, 'Close', { duration: 4000 });
        },
      })
      .add(() => this.memuat.set(false));
  }

  readonly proyek = computed(() => this.lookup.cari(this.kode()));

  /**
   * Nilai kontrak untuk perhitungan margin memakai DPP, bukan nominal kotor.
   *
   * PPN adalah titipan negara, bukan pendapatan. Memakai nominal dokumen
   * yang sudah termasuk PPN membuat margin setiap proyek tampak lebih besar
   * sekitar sebelas persen dari kenyataannya — cukup untuk membuat proyek
   * yang sebenarnya rugi tipis terlihat untung.
   */
  readonly nilaiKontrak = computed(() => {
    /*
     * Pada gabungan, kontrak SELURUH keluarga dijumlahkan.
     *
     * Kontraknya kerap berada di induk sementara biayanya di anak; memakai
     * kontrak satu proyek saja terhadap biaya sekeluarga menghasilkan margin
     * yang tampak rugi total.
     */
    const keluarga = this.proyekTergabung();
    if (keluarga.length) {
      return keluarga.reduce((a, p) => a + Number((p as any).contractDpp ?? 0), 0);
    }
    return Number((this.proyek() as any)?.contractDpp ?? 0);
  });

  /** Nominal dokumen apa adanya, hanya untuk ditampilkan. */
  readonly nominalKontrak = computed(() => {
    const keluarga = this.proyekTergabung();
    if (keluarga.length) {
      return keluarga.reduce(
        (a, p) => a + Number((p as any).contractValue ?? 0),
        0,
      );
    }
    return Number((this.proyek() as any)?.contractValue ?? 0);
  });

  /**
   * Tahun yang benar-benar punya catatan pada proyek ini.
   *
   * Diturunkan dari datanya sendiri, bukan deretan tahun tetap: proyek
   * setahun hanya menawarkan satu tahun, sehingga tidak ada tahun kosong
   * yang bisa terpilih — dan proyek lintas tahun ketahuan lintas tahun dari
   * daftarnya sendiri.
   */
  readonly tahunTersedia = computed<number[]>(() => {
    const d = this._data();
    if (!d) return [];
    return daftarTahun([
      ...(d.purchases ?? []).map((x: any) => x.date),
      ...(d.purchase_drafts ?? []).map((x: any) => x.date),
      ...(d.reimbursements ?? []).map((x: any) => x.date),
      ...(d.sales_invoices ?? []).map((x: any) => x.date),
    ]);
  });

  /**
   * Data yang sudah disaring menurut tahun terpilih.
   *
   * Yang disaring TANGGAL DOKUMEN, bukan tanggal dibuat maupun tanggal
   * bayar: tanggal dokumen yang menyatakan kapan pekerjaannya terjadi, dan
   * itu pula tanggal yang tercetak di layar — sehingga yang membaca dapat
   * mencocokkan barisnya satu per satu bila angkanya diragukan.
   */
  readonly dataPeriode = computed<any>(() => {
    const d = this._data();
    if (!d) return null;
    const t = this.tahun();
    if (t === SELURUH) return d;

    const saring = (baris: any[]) =>
      (baris ?? []).filter((x: any) => dalamTahun(x?.date, t));

    return {
      purchases: saring(d.purchases),
      reimbursements: saring(d.reimbursements),
      purchase_drafts: saring(d.purchase_drafts),
      sales_invoices: saring(d.sales_invoices),
    };
  });

  /** Sebutan periode untuk layar dan untuk dicetak pada berkas unduhannya. */
  readonly labelPeriode = computed(() => labelTahun(this.tahun()));

  readonly menyaringTahun = computed(() => this.tahun() !== SELURUH);

  /**
   * Biaya kategori TAHUN TERPILIH — yang tampil di layar.
   *
   * Ini angka aktivitas, bukan angka kesehatan proyek. Yang membentuk
   * margin adalah `biayaSeumurProyek` di bawah.
   */
  readonly kategori = computed<Kategori[]>(() =>
    susunKategori(
      this.dataPeriode(),
      this.sertakanInternal(),
      this.nilaiKontrak(),
      (kode) => purchaseTypeLabel(this.translate, kode) ?? kode,
    ),
  );

  /**
   * Kategori atas SELURUH umur proyek, tanpa saringan tahun.
   *
   * Tidak ditampilkan; ia hanya sumber `biayaSeumurProyek`. Dihitung lewat
   * fungsi yang SAMA dengan kategori di layar, bukan dijumlah sendiri
   * dengan rumus terpisah — dua rumus untuk satu angka berarti keduanya
   * bisa berbeda ketika saringannya "Seluruh periode", dan tidak ada yang
   * membandingkan keduanya.
   */
  private readonly kategoriSeumurProyek = computed<Kategori[]>(() =>
    susunKategori(
      this._data(),
      this.sertakanInternal(),
      this.nilaiKontrak(),
      (kode) => purchaseTypeLabel(this.translate, kode) ?? kode,
    ),
  );

  /**
   * Arus per minggu: biaya keluar dan tagihan terbit.
   *
   * Mingguan, bukan bulanan, karena proyek di sini relatif pendek —
   * bulanan hanya menghasilkan tiga sampai empat batang dan tidak
   * menunjukkan apa pun tentang temponya.
   *
   * Minggu yang KOSONG tetap ditampilkan. Melompatinya membuat jeda dua
   * bulan terlihat sama rapatnya dengan dua minggu berturut-turut, dan
   * justru jeda itulah yang biasanya menandakan pekerjaan berhenti.
   */
  readonly mingguan = computed<Minggu[]>(() => {
    const d = this.dataPeriode();
    if (!d) return [];

    const biaya = new Map<string, number>();
    const tagihan = new Map<string, number>();
    const tambah = (peta: Map<string, number>, kunci: string | null, n: number) => {
      if (!kunci) return;
      peta.set(kunci, (peta.get(kunci) ?? 0) + n);
    };

    const pembelian = this.sertakanInternal()
      ? d.purchases
      : d.purchases.filter((p: any) => !p.isInternal);

    for (const p of pembelian)
      tambah(biaya, awalMinggu(p.date), biayaPembelian(p));
    for (const p of d.purchase_drafts)
      tambah(biaya, awalMinggu(p.date), biayaDraft(p));
    for (const r of d.reimbursements)
      tambah(biaya, awalMinggu(r.date), biayaReimbursement(r));
    for (const f of d.sales_invoices)
      tambah(tagihan, awalMinggu(f.date), nilaiTagihan(f));

    const semua = [...new Set([...biaya.keys(), ...tagihan.keys()])].sort();
    if (semua.length === 0) return [];

    const hasil: Minggu[] = [];
    /*
     * Kumulatifnya DIMULAI dari biaya tahun-tahun sebelumnya, bukan dari nol.
     *
     * Kumulatif yang direset tiap tahun membuat proyek yang sudah berjalan
     * setahun terlihat baru dimulai — dan grafik ini justru dibaca untuk
     * menjawab "apakah anggarannya akan jebol sebelum pekerjaannya selesai".
     * Angka bawaannya disebutkan di layar supaya garis yang mulai tinggi
     * tidak terbaca sebagai lonjakan pada minggu pertama.
     */
    let kumulatif = this.biayaDibawa();
    const kursor = new Date(semua[0]);
    const akhir = new Date(semua[semua.length - 1]);

    while (kursor <= akhir) {
      const dua = (n: number) => String(n).padStart(2, '0');
      const kunci = `${kursor.getFullYear()}-${dua(kursor.getMonth() + 1)}-${dua(kursor.getDate())}`;
      const b = biaya.get(kunci) ?? 0;
      kumulatif += b;
      hasil.push({
        mulai: kunci,
        label: `${dua(kursor.getDate())}/${dua(kursor.getMonth() + 1)}`,
        biaya: b,
        tagihan: tagihan.get(kunci) ?? 0,
        biayaKumulatif: kumulatif,
      });
      kursor.setDate(kursor.getDate() + 7);
    }
    return hasil;
  });

  /** Nilai terbesar di antara biaya dan tagihan; untuk menskalakan batang. */
  get maksMingguan(): number {
    const m = this.mingguan();
    if (!m.length) return 0;
    return Math.max(...m.map((x) => Math.max(x.biaya, x.tagihan)));
  }

  /** Minggu paling boros — yang biasanya pertama ditanyakan. */
  readonly mingguTerberat = computed<Minggu | null>(() => {
    const m = this.mingguan();
    if (!m.length) return null;
    return m.reduce((a, b) => (b.biaya > a.biaya ? b : a));
  });

  /**
   * Biaya TAHUN TERPILIH.
   *
   * Sengaja tidak lagi bernama `biayaSeumurProyek`. Nama itu tidak menyebutkan
   * cakupannya, dan begitu saringan tahun ada, satu nama untuk dua cakupan
   * membuat setiap pemakaiannya harus ditebak. Sekarang setiap tempat yang
   * memakainya menyatakan sendiri cakupan mana yang dimaksudnya.
   */
  readonly biayaPeriode = computed(() =>
    this.kategori().reduce((a, b) => a + b.nilai, 0),
  );

  /**
   * Biaya SEUMUR PROYEK — yang membentuk margin.
   *
   * Tidak pernah ikut disaring tahun. Margin sepotong tahun adalah angka
   * yang tampak masuk akal tetapi tidak menggambarkan apa pun: SPK terbit
   * Desember dan pekerjaannya berjalan tahun berikutnya membuat tahun
   * pertama untung hampir penuh dan tahun keduanya rugi telak.
   */
  readonly biayaSeumurProyek = computed(() =>
    this.kategoriSeumurProyek().reduce((a, b) => a + b.nilai, 0),
  );

  /**
   * Biaya yang sudah keluar SEBELUM tahun terpilih.
   *
   * Dipakai sebagai titik awal grafik kumulatif. Tanpanya, grafik tahun
   * kedua dimulai dari nol dan proyek yang sudah berjalan setahun terlihat
   * baru dimulai — persis kebalikan dari yang ingin diketahui darinya.
   */
  readonly biayaDibawa = computed(() => {
    const d = this._data();
    const t = this.tahun();
    if (!d || t === SELURUH) return 0;

    const saring = (baris: any[]) =>
      (baris ?? []).filter((x: any) => sebelumTahun(x?.date, t));

    return this.kategoriSeumurProyekSampai({
      purchases: saring(d.purchases),
      reimbursements: saring(d.reimbursements),
      purchase_drafts: saring(d.purchase_drafts),
      sales_invoices: [],
    });
  });

  /** Menjumlahkan biaya sekumpulan data lewat rumus yang sama dengan layar. */
  private kategoriSeumurProyekSampai(d: any): number {
    return susunKategori(
      d,
      this.sertakanInternal(),
      this.nilaiKontrak(),
      (kode) => kode,
    ).reduce((a, b) => a + b.nilai, 0);
  }

  /** Berapa pembelian internal yang ada, terpakai atau tidak. */
  readonly jumlahInternal = computed(() => {
    const d = this._data();
    if (!d) return 0;
    return d.purchases.filter((p: any) => p.isInternal).length;
  });

  /*
   * trackBy WAJIB di sini.
   *
   * Tanpa ini Angular membuang seluruh elemen dan membangunnya kembali
   * setiap kali daftarnya dihitung ulang — potongan batang yang lama
   * dihapus lalu yang baru dipasang dengan lebar akhirnya langsung. Transisi
   * CSS tidak pernah berjalan karena elemennya memang bukan elemen yang
   * sama, dan perubahannya terlihat mengedip.
   *
   * Dengan kunci kode kategori, elemen yang sama dipakai ulang dan
   * lebarnya beranimasi dari nilai lama ke nilai baru.
   */
  lacakKategori = (_: number, k: Kategori) => k.kode;
  lacakPemasok = (_: number, s: BarisPemasok) => s.nama;
  lacakMinggu = (_: number, w: Minggu) => w.mulai;

  /**
   * Penanda sesaat bahwa angka baru saja dihitung ulang.
   *
   * Tanpa ini, mengubah saringan hanya mengganti deretan angka begitu saja —
   * dan yang sedang membaca sering tidak sadar totalnya sudah lain. Kedipan
   * singkat lebih jujur daripada perubahan diam-diam.
   */
  readonly baruBerubah = signal(false);
  private jedaBerubah?: ReturnType<typeof setTimeout>;

  toggleInternal(): void {
    this.sertakanInternal.set(!this.sertakanInternal());
    this.kategoriTerbuka.set(null);

    clearTimeout(this.jedaBerubah);
    this.baruBerubah.set(true);
    this.jedaBerubah = setTimeout(() => this.baruBerubah.set(false), 600);
  }

  /** Margin selalu seumur proyek; lihat `biayaSeumurProyek`. */
  readonly margin = computed(
    () => this.nilaiKontrak() - this.biayaSeumurProyek(),
  );

  /**
   * Berapa persen nilai kontrak yang sudah terpakai biaya.
   *
   * Angka margin saja tidak menunjukkan apakah proyeknya akan jebol: rugi
   * lima puluh juta di proyek satu miliar berbeda artinya dengan rugi lima
   * puluh juta di proyek seratus juta.
   *
   * Yang menjawabnya adalah PORSI — "biaya sudah 82% dari kontrak" dapat
   * dibandingkan dengan seberapa jauh pekerjaannya, dan di situ ketahuan
   * akan jebol SEBELUM jebol.
   *
   * `null` bila kontraknya belum diisi.
   */
  readonly porsiTerpakai = computed(() => {
    const k = this.nilaiKontrak();
    // Seumur proyek, sama seperti margin: porsi sepotong tahun terhadap
    // kontrak utuh tidak pernah menyentuh 100% dan tidak pernah memperingatkan.
    return k > 0 ? (this.biayaSeumurProyek() / k) * 100 : null;
  });

  /** True bila biaya sudah melampaui nilai kontraknya. */
  readonly melampauiKontrak = computed(() => {
    const p = this.porsiTerpakai();
    return p !== null && p > 100;
  });

  /**
   * Tertagih tanpa PPN — dasar yang sama dengan biaya dan dengan daftar margin.
   *
   * Disandingkan dengan nilai berikut PPN pada layar yang sama, sehingga
   * ketiga angka — kontrak, biaya, tertagih — dapat dibandingkan dalam
   * dasar yang sama, dan nilai kotornya tetap terlihat bagi yang
   * memerlukannya. Angka INI yang sebanding dengan kolom "Tertagih" pada
   * daftar margin; yang berikut PPN di atasnya tidak.
   */
  readonly tertagihDpp = computed(() => {
    const d = this._data();
    if (!d) return 0;
    return d.sales_invoices.reduce(
      (a: number, b: any) => a + nilaiTagihan(b),
      0,
    );
  });

  readonly tertagih = computed(() => {
    const d = this._data();
    if (!d) return 0;
    return d.sales_invoices.reduce(
      (a: number, b: any) => a + nilaiTagihanKotor(b),
      0,
    );
  });

  /**
   * Persentase terhadap biaya TAHUN TERPILIH.
   *
   * Yang dibandingkan komposisi kategori — dan kategorinya sendiri sudah
   * disaring tahun, jadi pembaginya harus sama-sama tahun itu. Membaginya
   * dengan biaya seumur proyek membuat seluruh potongan mengecil dan
   * jumlahnya tidak lagi seratus persen.
   */
  persen(nilai: number): number {
    const t = this.biayaPeriode();
    return t === 0 ? 0 : (nilai / t) * 100;
  }

  persenKontrak(nilai: number): number {
    const k = this.nilaiKontrak();
    return k === 0 ? 0 : (nilai / k) * 100;
  }

  get maksKategori(): number {
    return this.kategori()[0]?.nilai ?? 0;
  }

  /** Kontrak belum diisi: angka margin tidak punya arti dan harus dijelaskan. */
  readonly kontrakKosong = computed(
    () => !!this.kode() && !this.memuat() && this.nilaiKontrak() === 0,
  );

  readonly adaData = computed(() => this._data() !== null);

  /**
   * Proyek ini belum punya SATU PUN catatan — bukan sekadar belum berbelanja.
   *
   * Dibedakan dengan sengaja. Sebelumnya server menjawab 404 "No purchases
   * found" begitu pembeliannya kosong, dan seluruh laporan gugur bersamanya:
   * proyek KBPDP yang sudah menagih Rp 240 juta tanpa satu pun pembelian
   * hanya menampilkan spanduk merah, dan penjualannya ikut hilang.
   *
   * Keadaan itu biasa, dan ada di kedua arah — sudah menagih tetapi belum
   * berbelanja, atau sudah berbelanja sebelum SPK-nya terbit. Keduanya harus
   * tetap menampilkan angkanya.
   *
   * Yang benar-benar kosong tetap diberi keterangan, tetapi sebagai
   * KETERANGAN — bukan galat merah yang membuat orang mengira laporannya
   * rusak.
   */
  readonly belumAdaCatatan = computed(() => {
    const d = this._data();
    if (!d) return false;
    return (
      (d.purchases?.length ?? 0) === 0 &&
      (d.purchase_drafts?.length ?? 0) === 0 &&
      (d.reimbursements?.length ?? 0) === 0 &&
      (d.sales_invoices?.length ?? 0) === 0
    );
  });

  /**
   * Proyeknya punya catatan, TAHUN TERPILIH yang kosong.
   *
   * Dibedakan dari `belumAdaCatatan` dengan sengaja. Keduanya menghasilkan
   * layar yang sama-sama kosong, tetapi sebabnya berbeda dan tindakannya
   * berbeda: yang satu memang belum ada apa-apa, yang satunya cuma salah
   * pilih tahun. Kalimat yang sama untuk keduanya membuat yang membaca
   * menyimpulkan proyeknya kosong padahal datanya ada di tahun sebelah.
   */
  readonly periodeKosong = computed(() => {
    if (!this.menyaringTahun()) return false;
    if (this.belumAdaCatatan()) return false;
    const d = this.dataPeriode();
    if (!d) return false;
    return (
      (d.purchases?.length ?? 0) === 0 &&
      (d.purchase_drafts?.length ?? 0) === 0 &&
      (d.reimbursements?.length ?? 0) === 0 &&
      (d.sales_invoices?.length ?? 0) === 0
    );
  });

  pilihTahun(t: TahunLaporan): void {
    if (t === this.tahun()) return;
    this.tahun.set(t);
    this.kategoriTerbuka.set(null);

    // Kedipan yang sama dengan sakelar internal: angka yang berubah
    // diam-diam lebih membingungkan daripada angka yang berubah terlihat.
    clearTimeout(this.jedaBerubah);
    this.baruBerubah.set(true);
    this.jedaBerubah = setTimeout(() => this.baruBerubah.set(false), 600);
  }

  /*
   * Unduhan Laporan Proyek.
   *
   * Angkanya diambil dari computed yang sama dengan yang dipakai layar,
   * bukan dihitung ulang: dua rumus untuk satu angka membuat berkas dan
   * layar bisa berbeda tanpa ada yang menyadarinya.
   *
   * Karena itu penyaring yang sedang aktif — termasuk sakelar "sertakan
   * internal" — otomatis ikut terbawa.
   */
  readonly sedangUnduh = signal(false);

  private dataUnduhan(): DataLaporanProyek {
    const p = this.proyek();
    return {
      kodeProyek: this.kode() ?? '',
      namaProyek: p?.name ?? '',
      nilaiKontrak: this.nilaiKontrak(),
      nominalKontrak: this.nominalKontrak(),
      // Seumur proyek — pasangannya margin, dan margin tidak pernah
      // disaring tahun.
      biayaSeumurProyek: this.biayaSeumurProyek(),
      margin: this.margin(),
      tertagih: this.tertagih(),
      /*
       * Biaya tahun terpilih, dan periodenya.
       *
       * Keduanya WAJIB ikut ke berkasnya. Berkas yang beredar tidak membawa
       * konteks layar: rincian kategori di dalamnya sudah tersaring tahun,
       * dan tanpa keterangan periode ia terbaca sebagai rincian seumur
       * proyek yang totalnya kebetulan tidak cocok dengan biayanya.
       */
      biayaPeriode: this.biayaPeriode(),
      periode: this.labelPeriode(),
      kategori: this.kategori().map((k) => ({
        kode: k.kode,
        nama: k.nama,
        nilai: k.nilai,
        pemasok: k.pemasok.map((x: any) => ({
          nama: x.nama,
          nilai: x.nilai,
        })),
      })),
      mingguan: this.mingguan().map((m) => ({
        label: m.label,
        biaya: m.biaya,
        tagihan: m.tagihan,
        biayaKumulatif: m.biayaKumulatif,
      })),
    };
  }

  async unduhExcel(): Promise<void> {
    if (this.sedangUnduh()) return;
    this.sedangUnduh.set(true);
    try {
      await unduhLaporanProyekExcel(this.dataUnduhan());
    } catch (e) {
      console.error('Gagal menyusun berkas Excel laporan proyek:', e);
    } finally {
      this.sedangUnduh.set(false);
    }
  }

  unduhPdf(): void {
    if (this.sedangUnduh()) return;
    this.sedangUnduh.set(true);
    try {
      unduhLaporanProyekPdf(this.dataUnduhan());
    } catch (e) {
      console.error('Gagal menyusun PDF laporan proyek:', e);
    } finally {
      this.sedangUnduh.set(false);
    }
  }

  toggleKategori(kode: string): void {
    this.kategoriTerbuka.set(this.kategoriTerbuka() === kode ? null : kode);
  }


  pilihTampilan(t: 'ikhtisar' | 'arus'): void {
    if (t === this.tampilan()) return;
    this.tampilan.set(t);
    this.kategoriTerbuka.set(null);
  }

  bukaProyek(): void {
    const p = this.proyek();
    if (p) this.router.navigate(['/Project', p.id]);
  }
}
