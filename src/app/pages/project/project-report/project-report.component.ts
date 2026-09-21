import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import {
  nominalSingkat,
  pastikanChart,
  rupiah,
} from '../../../helpers/chart-dasar.helper';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { catchError, forkJoin, of } from 'rxjs';

import { ApiService } from '../../../services/api.service';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { ProjectSelectorComponent } from '../../../components/project-selector/project-selector.component';
import { ProjectLookupService } from '../../../services/project-lookup.service';
import { CanDirective } from '../../../directives/can.directive';
import { DeleteConfirmationComponent } from '../../../components/delete-confirmation/delete-confirmation.component';
import {
  ProjectProgressDialogComponent,
  type DataDialogProgress,
} from '../project-progress-dialog/project-progress-dialog.component';
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

/*
 * Pendaftaran dan setelan dasar chart.js — alasannya di `chart-dasar.helper`.
 *
 * Dipanggil di tiap komponen grafik, bukan sekali di `app.config`: yang
 * dijaga justru halaman yang dibuka TANPA halaman grafik lain pernah
 * disentuh, dan itu hanya terjamin kalau berkasnya sendiri yang membawanya.
 */
pastikanChart();

/** Satu titik pada kurva S: pekan, kemajuan, dan biaya terpakai. */
interface TitikKurva {
  mulai: string;
  label: string;
  /** Persen nilai kontrak yang sudah terpakai biaya. `null` bila kontrak kosong. */
  biaya: number | null;
  /** Persen kemajuan pekerjaan. `null` sebelum catatan pertama. */
  progres: number | null;
}

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

export type KunciSeriKas = 'masuk' | 'keluar' | 'saldo';

/**
 * Warna tiap seri arus kas — SATU sumber.
 *
 * Chip pemilih seri memakai warna ini juga. Ditulis dua kali, chip hijau dan
 * garis merah akan menunjuk hal yang sama tanpa satu pun galat — dan yang
 * membacanya menyimpulkan grafiknya salah, bukan warnanya.
 */
export const WARNA_KAS: Record<KunciSeriKas, { garis: string; isi: string }> = {
  masuk: { garis: '#0f9d58', isi: 'rgba(15, 157, 88, 0.10)' },
  keluar: { garis: '#d93025', isi: 'rgba(217, 48, 37, 0.10)' },
  saldo: { garis: '#154dec', isi: 'rgba(21, 77, 236, 0.10)' },
};

/** Satuan waktu grafik arus kas. */
export type SatuanKas = 'hari' | 'bulan';

/** Satu titik pada grafik arus kas — satu hari atau satu bulan. */
export interface TitikKas {
  /** `YYYY-MM-DD` untuk harian, `YYYY-MM` untuk bulanan. */
  bulan: string;
  label: string;
  masuk: number;
  keluar: number;
  /** Saldo kas proyek pada AKHIR titik ini, kumulatif. */
  saldo: number;
}

const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

/**
 * Pembayaran mentah -> titik arus kas, dengan saldo kas berjalan.
 *
 * KENAPA ADA PILIHAN HARIAN
 *
 * Titik bulanan hanya punya SATU nilai per bulan: saldo pada akhir bulan.
 * Garis di antara dua titik itu adalah tarikan lurus — bukan pengukuran —
 * dan tarikan itu MENUTUPI apa yang terjadi di dalam bulannya.
 *
 * Yang tertutup persis hal yang paling perlu terlihat: bulan yang kasnya
 * sempat menembus nol di pertengahan lalu tertolong termin di akhir bulan
 * tergambar tidak pernah minus sama sekali. Proyek yang sempat menalangi
 * uang perusahaan selama tiga minggu terbaca aman. Tidak ada galat, tidak
 * ada tanda — grafiknya hanya lebih optimistik daripada kenyataannya.
 *
 * Harian tidak menarik garis di antara apa pun: tiap hari punya angkanya
 * sendiri. Bulanan tetap disediakan karena untuk proyek dua tahun ia lebih
 * mudah dibaca ketika yang dicari bentuk kasarnya.
 *
 * KENAPA HARI/BULAN KOSONG TETAP DIGAMBAR
 *
 * Kalau yang tanpa pembayaran dilewati, Januari dan Juni menjadi dua titik
 * bersebelahan, dan kemiringan garis di antaranya berbohong: lima bulan
 * tanpa penerimaan justru terbaca sebagai penurunan yang landai. Yang kosong
 * diisi nol supaya jarak pada sumbu waktu sepadan dengan waktu sebenarnya —
 * dan pada satuan harian, inilah yang membuat saldo terlihat BERTAHAN datar
 * alih-alih melandai menuju titik berikutnya.
 *
 * KENAPA TANGGALNYA DIPOTONG SEBAGAI TEKS
 *
 * `String(tanggal).slice(0, 10)` — bukan `new Date(...)`. Mengurai
 * `"2026-09-15"` menghasilkan tengah malam UTC, dan di WIB pembayaran tanggal
 * 1 pukul 00:00 mundur ke hari sebelumnya. Kekeliruan yang sama sudah pernah
 * menggeser seluruh kurva kalender; di sini ia akan memindahkan penerimaan ke
 * hari yang salah tanpa satu pun galat.
 *
 * Penambahan harinya memakai `Date.UTC`, bukan `new Date(y, m, d)`: yang
 * kedua memakai zona waktu lokal, dan melewati pergantian musim panas di
 * zona mana pun akan melompati atau menggandakan satu hari.
 */
export function titikKas(
  masuk: any[],
  keluar: any[],
  saldoAwal = 0,
  /*
   * Bawaan FUNGSI ini tetap bulanan, sementara bawaan LAYARNYA harian.
   *
   * Dua hal yang berbeda, dan sengaja tidak disamakan. Layar memilih harian
   * karena itu yang jujur untuk dibaca; fungsi ini mempertahankan perilaku
   * lamanya supaya pemanggil yang tidak menyebut satuannya tidak tiba-tiba
   * menerima tujuh ratus titik. Pemanggil yang mau harian menyebutnya —
   * dan komponen laporan proyek memang menyebutnya.
   */
  satuan: SatuanKas = 'bulan',
): TitikKas[] {
  const harian = satuan === 'hari';
  const panjang = harian ? 10 : 7;
  const pola = harian ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{4}-\d{2}$/;

  const kunciDari = (v: any): string | null => {
    const s = String(v ?? '').slice(0, panjang);
    return pola.test(s) ? s : null;
  };

  const ember = new Map<string, { masuk: number; keluar: number }>();
  const tambah = (baris: any[], arah: 'masuk' | 'keluar') => {
    for (const b of baris ?? []) {
      const kunci = kunciDari(b?.date);
      if (!kunci) continue;
      const n = Number(b?.amount) || 0;
      const e = ember.get(kunci) ?? { masuk: 0, keluar: 0 };
      e[arah] += Math.abs(n);
      ember.set(kunci, e);
    }
  };
  tambah(masuk, 'masuk');
  tambah(keluar, 'keluar');

  const kunci = [...ember.keys()].sort();
  if (!kunci.length) return [];

  const hasil: TitikKas[] = [];
  let saldo = saldoAwal;

  const catat = (k: string, label: string) => {
    const e = ember.get(k) ?? { masuk: 0, keluar: 0 };
    saldo += e.masuk - e.keluar;
    hasil.push({ bulan: k, label, masuk: e.masuk, keluar: e.keluar, saldo });
  };

  if (harian) {
    /*
     * HARI DITAMBAHKAN SECARA ARITMETIKA, TANPA `Date` SAMA SEKALI.
     *
     * Bukan kerapian: `new Date(y, m, d)` memakai zona waktu lokal, dan
     * `new Date("2026-09-01")` memakai UTC — dua jawaban berbeda dari satu
     * bentuk yang mirip. Karma di repo ini berjalan pada UTC, jadi uji apa
     * pun yang membandingkan keduanya TIDAK akan pernah gagal di sini; yang
     * gagal adalah peramban orang di WIB, pada tanggal 1 pukul 00:00, dengan
     * pembayaran yang mundur sehari tanpa satu pun galat.
     *
     * Aritmetika pada (tahun, bulan, tanggal) tidak punya zona waktu untuk
     * salah. Kabisat diurus sendiri — aturannya tiga baris, dan `Date`
     * tidak dibutuhkan untuk itu.
     */
    const kabisat = (y: number) =>
      y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
    const HARI_BULAN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const panjangBulan = (y: number, m: number) =>
      m === 2 && kabisat(y) ? 29 : HARI_BULAN[m - 1];

    let [y, m, hari] = kunci[0].split('-').map(Number);
    const [ay, am, ad] = kunci[kunci.length - 1].split('-').map(Number);

    // Pagar keras: satu proyek yang tanggalnya rusak (mis. tahun 1900) akan
    // menghasilkan puluhan ribu titik dan membekukan peramban. Sepuluh tahun
    // kalender sudah jauh melampaui umur proyek mana pun di sini.
    const MAKS_HARI = 3660;

    const lewat = () =>
      y > ay ||
      (y === ay && (m > am || (m === am && hari > ad)));

    while (!lewat() && hasil.length < MAKS_HARI) {
      const k =
        `${y}-${String(m).padStart(2, '0')}-${String(hari).padStart(2, '0')}`;
      catat(
        k,
        `${hari} ${NAMA_BULAN[m - 1]} ${String(y).slice(2)}`,
      );
      hari += 1;
      if (hari > panjangBulan(y, m)) {
        hari = 1;
        m += 1;
        if (m > 12) {
          m = 1;
          y += 1;
        }
      }
    }
    return hasil;
  }

  let [th, bl] = kunci[0].split('-').map(Number);
  const [thAkhir, blAkhir] = kunci[kunci.length - 1].split('-').map(Number);

  while (th < thAkhir || (th === thAkhir && bl <= blAkhir)) {
    const k = `${th}-${String(bl).padStart(2, '0')}`;
    catat(k, `${NAMA_BULAN[bl - 1]} ${String(th).slice(2)}`);
    bl += 1;
    if (bl > 12) {
      bl = 1;
      th += 1;
    }
  }
  return hasil;
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
    MatDialogModule,
    MatTooltipModule,
    BaseChartDirective,
    CanDirective,
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
  private readonly dialog = inject(MatDialog);

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

    this.muatProgress();
    this.muatArusKas();
  }

  // ------------------------------------------------------------------
  // Kemajuan pekerjaan
  // ------------------------------------------------------------------

  /**
   * Riwayat kemajuan proyek INI saja, bukan seluruh keluarganya.
   *
   * Kontraknya dipegang satu kode; anak-anaknya hanya menampung biaya per
   * paket dan tidak punya kemajuan sendiri. Menjumlahkan persen dari beberapa
   * kode akan menghasilkan angka di atas seratus yang tidak berarti apa pun.
   */
  readonly progress = signal<any[]>([]);

  /**
   * Sebagian divisi tidak punya modul `project_progress` sama sekali
   * (konsultan pajak, misalnya). Bagi mereka bagian ini disembunyikan, bukan
   * ditampilkan kosong dengan pesan galat — laporan biayanya tetap utuh.
   */
  readonly progressTerkunci = signal(false);

  private muatProgress(): void {
    this.progress.set([]);

    /*
     * Menunggu daftar proyek selesai dimuat lebih dulu.
     *
     * Kemajuan dicari lewat ID proyek, sedangkan halaman ini hanya memegang
     * KODE-nya; penerjemahnya adalah `lookup`. Dibuka lewat tautan langsung
     * (`/Project/Report/R501`), `muat()` berjalan pada tarikan napas yang
     * sama dengan `lookup.muat()` — sehingga tanpa penantian ini `proyek()`
     * masih kosong dan bagian kemajuan diam-diam tidak pernah terisi.
     *
     * `muat()` mengembalikan janji yang sama bila sudah berjalan, jadi
     * memanggilnya lagi di sini tidak menambah permintaan.
     */
    void this.lookup.muat().then(() => {
      const p = this.proyek();
      if (!p || p.id <= 0) return;
      this.ambilProgress(p.id);
    });
  }

  private ambilProgress(projectID: number): void {
    this.api.get(`projects/${projectID}/progress`, {}).subscribe({
      next: (baris: any) => {
        this.progressTerkunci.set(false);
        this.progress.set(Array.isArray(baris) ? baris : []);
      },
      error: (err: any) => {
        // 403 berarti modulnya bukan wilayah divisi ini; itu bukan kegagalan
        // yang perlu dilaporkan kepada yang membuka laporan biaya.
        this.progressTerkunci.set(err?.status === 403);
        this.progress.set([]);
      },
    });
  }

  catatProgress(): void {
    const p = this.proyek();
    if (!p || p.id <= 0) return;

    this.dialog
      .open(ProjectProgressDialogComponent, {
        data: { projectID: p.id } as DataDialogProgress,
      })
      .afterClosed()
      .subscribe((tersimpan) => {
        if (tersimpan) this.muatProgress();
      });
  }

  ubahProgress(baris: any): void {
    const p = this.proyek();
    if (!p || p.id <= 0) return;

    this.dialog
      .open(ProjectProgressDialogComponent, {
        data: { projectID: p.id, progress: baris } as DataDialogProgress,
      })
      .afterClosed()
      .subscribe((tersimpan) => {
        if (tersimpan) this.muatProgress();
      });
  }

  hapusProgress(baris: any): void {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: this.translate.instant('projectProgress.deleteTitle'),
          prompt: this.translate.instant('projectProgress.deletePrompt'),
        },
      })
      .afterClosed()
      .subscribe((setuju) => {
        if (setuju !== true) return;
        this.api.delete(`projects/progress/${baris.id}`).subscribe({
          next: () => this.muatProgress(),
          error: (err: any) => {
            const pesan =
              err?.error?.detail ??
              this.translate.instant('notify.deleteFailed');
            this.snackBar.open(pesan, 'Close', { duration: 5000 });
          },
        });
      });
  }

  /** Catatan kemajuan terakhir; angka yang pertama dicari orang. */
  readonly progresTerakhir = computed<any | null>(() => {
    const r = this.progress();
    return r.length ? r[r.length - 1] : null;
  });

  /**
   * Kurva S: kemajuan pekerjaan dan biaya terpakai, keduanya dalam persen.
   *
   * Dua garis pada sumbu yang sama, dan JARAK ANTAR GARIS itulah jawabannya.
   * Garis biaya di atas garis kemajuan berarti uang habis lebih cepat
   * daripada pekerjaan bertambah — pertanyaan yang selama ini tidak dapat
   * dijawab laporan ini, karena biaya hanya bisa dibandingkan dengan tagihan,
   * dan tagihan mengikuti termin, bukan keadaan di lapangan.
   *
   * Sumbu waktunya PEKANAN dan mengikuti saringan tahun yang sama dengan
   * sisa halaman. Kemajuan dibaca sebagai fungsi tangga: catatan terakhir
   * pada atau sebelum akhir pekan itu — pekan tanpa catatan meneruskan angka
   * sebelumnya, bukan turun ke nol.
   */
  readonly kurvaS = computed<TitikKurva[]>(() => {
    const pekanBiaya = this.mingguan();
    const riwayat = [...this.progress()].sort((a, b) =>
      String(a.date).localeCompare(String(b.date)),
    );
    if (!pekanBiaya.length && !riwayat.length) return [];

    const dua = (n: number) => String(n).padStart(2, '0');
    const kunciDari = (d: Date) =>
      `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;

    // Rentangnya mencakup KEDUANYA. Kemajuan yang dicatat sebelum biaya
    // pertama, atau setelah biaya terakhir, tetap harus terlihat — justru
    // masa tanpa pengeluaran itu yang paling perlu dibaca.
    const pekanProgres = riwayat
      .map((r) => awalMinggu(r.date))
      .filter((x): x is string => !!x);
    const semua = [...pekanBiaya.map((w) => w.mulai), ...pekanProgres].sort();
    if (!semua.length) return [];

    const kontrak = this.nilaiKontrak();
    const petaBiaya = new Map(pekanBiaya.map((w) => [w.mulai, w.biayaKumulatif]));

    const hasil: TitikKurva[] = [];
    const kursor = new Date(semua[0]);
    const akhir = new Date(semua[semua.length - 1]);
    let kumulatif = this.biayaDibawa();
    let progres: number | null = null;
    let i = 0;

    while (kursor <= akhir) {
      const kunci = kunciDari(kursor);

      // Biaya kumulatif pekan ini; pekan di luar rentang biaya meneruskan
      // angka terakhir, bukan kembali ke nol.
      if (petaBiaya.has(kunci)) kumulatif = petaBiaya.get(kunci)!;

      // Catatan kemajuan terakhir pada atau sebelum akhir pekan ini.
      const akhirPekan = new Date(kursor);
      akhirPekan.setDate(akhirPekan.getDate() + 6);
      const batas = kunciDari(akhirPekan);
      while (i < riwayat.length && String(riwayat[i].date).slice(0, 10) <= batas) {
        progres = Number(riwayat[i].percentage);
        i++;
      }

      hasil.push({
        mulai: kunci,
        label: `${dua(kursor.getDate())}/${dua(kursor.getMonth() + 1)}`,
        biaya: kontrak > 0 ? (kumulatif / kontrak) * 100 : null,
        progres,
      });
      kursor.setDate(kursor.getDate() + 7);
    }
    return hasil;
  });

  readonly adaKurvaS = computed(
    () => this.progress().length > 0 && this.kurvaS().length > 0,
  );

  /**
   * Selisih kemajuan dan biaya pada titik terakhir, dalam poin persen.
   *
   * Negatif berarti biaya mendahului pekerjaan. Disebutkan sebagai angka,
   * bukan hanya digambar: yang membaca grafik dari layar kecil tidak dapat
   * mengukur jarak dua garis dengan mata.
   */
  readonly selisihKurva = computed<number | null>(() => {
    const t = this.kurvaS();
    for (let i = t.length - 1; i >= 0; i--) {
      const x = t[i];
      if (x.progres !== null && x.biaya !== null) return x.progres - x.biaya;
    }
    return null;
  });

  readonly dataKurvaS = computed<ChartData<'line'>>(() => {
    const t = this.kurvaS();
    return {
      labels: t.map((x) => x.label),
      datasets: [
        {
          label: this.translate.instant('projectProgress.seriesProgress'),
          data: t.map((x) => x.progres),
          borderColor: '#0f9d58',
          backgroundColor: 'rgba(15, 157, 88, 0.12)',
          fill: true,
          tension: 0.25,
          pointRadius: 2,
          spanGaps: true,
        },
        {
          label: this.translate.instant('projectProgress.seriesCost'),
          data: t.map((x) => x.biaya),
          borderColor: '#d93025',
          backgroundColor: 'rgba(217, 48, 37, 0.10)',
          fill: true,
          tension: 0.25,
          pointRadius: 2,
          spanGaps: true,
        },
      ],
    };
  });

  readonly opsiKurvaS: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      // Bentuk kurva S UTUH yang dibaca — tanpa jendela 12 titik.
      geserZoomAkn: { jendelaAwal: false },
      /*
       * Legenda dengan kotak KECIL dan bergaya titik.
       *
       * Bawaan Chart.js menggambar kotak selebar 40px per seri. Dua seri
       * berarti 80px hanya untuk kotaknya, dan pada layar 390px legendanya
       * membungkus menjadi dua baris — yang diambil dari tinggi grafik,
       * bukan dari ruang kosong.
       */
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8 },
      },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(1)}%`,
        },
      },
    },
    scales: {
      x: {
        /*
         * Label tanggal TIDAK dimiringkan.
         *
         * Dengan rotasi, Chart.js memutar `12/09` sampai 90 derajat begitu
         * ruangnya kurang — dan pada grafik setinggi 240px di ponsel, label
         * tegak memakan hampir seperempat tingginya. Yang tersisa untuk
         * kurvanya sendiri tinggal setengah.
         *
         * `maxRotation: 0` membuat Chart.js MELEWATI label yang tidak muat
         * alih-alih memutarnya. Yang dibaca dari kurva S adalah bentuknya
         * beserta beberapa tanggal jangkar, bukan setiap tanggal opname —
         * daftar di bawah grafiknya yang memuat semuanya.
         */
        ticks: { maxRotation: 0, autoSkip: true },
      },
      y: {
        // Sengaja dikunci 0-100 dan TIDAK menyesuaikan isinya.
        //
        // Sumbu yang menyesuaikan diri membuat proyek yang baru 8% terlihat
        // sama penuhnya dengan proyek yang sudah 80%. Yang dibaca di sini
        // adalah posisi terhadap keseluruhan pekerjaan, bukan bentuk garisnya.
        min: 0,
        max: 100,
        ticks: { callback: (v) => `${v}%` },
      },
    },
  };

  lacakProgress = (_: number, p: any) => p.id;

  /**
   * `2026-09-12` -> `12 Sep 2026`.
   *
   * `YYYY-MM-DD` adalah bentuk PENYIMPANAN, bukan bentuk baca. Dibiarkan
   * mentah di layar, halamannya terbaca seperti keluaran basis data yang
   * belum selesai dirapikan — dan bagi yang membacanya cepat, urutan
   * tahun-bulan-hari menuntut satu langkah penerjemahan yang tidak perlu ada.
   *
   * DIURAI SEBAGAI TEKS, bukan lewat `new Date(...)`.
   *
   * `new Date('2026-09-12')` adalah tengah malam UTC; di zona di sebelah
   * barat UTC ia mundur menjadi 11 September. Tanggal yang bergeser satu hari
   * tergantung jam komputer yang membukanya adalah kekeliruan yang sama yang
   * sudah dua kali muncul di sistem ini — pada kurva kalender dan pada
   * pengemberan bulan arus kas. Di sini akibatnya lebih halus dan lebih
   * buruk: tanggal opname yang salah sehari tidak akan pernah dicurigai.
   */
  tanggalBaca(nilai: any): string {
    const s = String(nilai ?? '');
    // Dicocokkan pada teks UTUH, bukan pada 10 huruf pertamanya.
    //
    // Memotong dulu lalu mencocokkan membuat nilai yang bukan tanggal
    // dikembalikan TERPENGGAL — "bukan tanggal" menjadi "bukan tang".
    // Cacat yang cuma muncul pada data yang sudah aneh, jadi ia menambah
    // keanehan kedua di atas yang pertama.
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (!m) return s;

    const bulan = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
    ];
    const b = bulan[Number(m[2]) - 1];
    if (!b) return s;

    // Nol di depan tanggalnya dibuang: "05 Sep" lebih berat dibaca daripada
    // "5 Sep", dan di sini tidak ada kolom yang perlu disejajarkan.
    return `${Number(m[3])} ${b} ${m[1]}`;
  }

  // ==================================================================
  // ARUS KAS PROYEK
  // ==================================================================
  //
  // Bukan pengulangan tab "arus per minggu" di atas. Yang itu membaca TANGGAL
  // DOKUMEN dan menjawab "sudah berkomitmen berapa". Yang ini membaca TANGGAL
  // PEMBAYARAN dan menjawab "kapan uangnya bergerak".
  //
  // Dua proyek dengan biaya dan tagihan yang sama persis dapat sangat berbeda
  // kasnya: yang satu menagih di muka, yang lain menalangi enam bulan.
  // Perbedaan itu tidak terlihat sama sekali pada tanggal dokumen.

  readonly arusKasMasuk = signal<any[]>([]);
  readonly arusKasKeluar = signal<any[]>([]);

  /**
   * 403 = divisinya tidak memegang `payment_outgoing`.
   *
   * Rutenya sengaja dijaga modul itu (level 3), bukan `purchase` (level 1),
   * supaya data pembayaran tidak bocor lewat pintu yang lebih rendah. Bagi
   * yang tidak berhak, tabnya DISEMBUNYIKAN — bukan ditampilkan kosong dengan
   * pesan galat. Pola yang sama dipakai bagian kemajuan bagi konsultan pajak.
   */
  readonly arusKasTerkunci = signal(false);

  /**
   * Kas keluar yang DIHITUNG: pembelian internal (`jenis: 'internal'`,
   * dianggap dibayar pada tanggal pembeliannya) hanya bila sakelar
   * "sertakan internal" menyala — sama dengan bagian laporan lainnya.
   */
  readonly arusKasKeluarDihitung = computed(() =>
    this.sertakanInternal()
      ? this.arusKasKeluar()
      : this.arusKasKeluar().filter((x: any) => x?.jenis !== 'internal'),
  );

  /**
   * Tab di DALAM kartu ini, terpisah dari bilah tab laporan di atas.
   *
   * Dua tingkat tab pada satu halaman perlu alasan. Alasannya: bilah atas
   * memilah RINCIAN BIAYA (ikhtisar vs arus per minggu), sedangkan yang ini
   * memilah dua cara menilai KESEHATAN proyek. Menggabungkannya menjadi satu
   * bilah berisi empat membuat saringan tahun dan KPI di atasnya tampak
   * berlaku untuk keempatnya, padahal tidak.
   */
  readonly tabKartu = signal<'arus-kas' | 'progres'>('arus-kas');

  pilihTabKartu(t: 'arus-kas' | 'progres'): void {
    this.tabKartu.set(t);
  }

  /** Bilah tab hanya berarti kalau keduanya memang dapat dibuka. */
  readonly duaTabTersedia = computed(
    () => !this.arusKasTerkunci() && !this.progressTerkunci(),
  );

  /**
   * Tab yang BENAR-BENAR ditampilkan.
   *
   * Kalau hanya satu yang tersedia, pilihan pengguna diabaikan — tanpa ini,
   * pengguna yang pernah memilih "arus kas" lalu membuka proyek dengan modul
   * terkunci akan melihat kartu kosong tanpa penjelasan.
   */
  readonly tabAktif = computed<'arus-kas' | 'progres'>(() => {
    if (this.arusKasTerkunci()) return 'progres';
    if (this.progressTerkunci()) return 'arus-kas';
    return this.tabKartu();
  });

  private muatArusKas(): void {
    this.arusKasMasuk.set([]);
    this.arusKasKeluar.set([]);
    // Proyek baru selalu dibuka pada bulan terkini, bukan pada posisi geser
    // proyek sebelumnya — rentang yang sama tidak berarti apa-apa di proyek
    // yang umurnya berbeda.
    this.geserKas.set(0);

    const k = this.kode();
    if (!k) return;

    // Dicari lewat KODE proyek, bukan id — sumbernya (`purchases`,
    // `reimbursements`, `sales_invoices`) semuanya bertaut lewat
    // `projectName`. Jadi tidak perlu menunggu `lookup` seperti progress.
    this.api.get(`projects/${encodeURIComponent(k)}/cashflow`, {}).subscribe({
      next: (r: any) => {
        this.arusKasTerkunci.set(false);
        this.arusKasMasuk.set(Array.isArray(r?.incoming) ? r.incoming : []);
        this.arusKasKeluar.set(Array.isArray(r?.outgoing) ? r.outgoing : []);
      },
      error: (err: any) => {
        this.arusKasTerkunci.set(err?.status === 403);
        this.arusKasMasuk.set([]);
        this.arusKasKeluar.set([]);
      },
    });
  }

  /**
   * Saldo kas yang DIBAWA dari sebelum tahun yang dipilih.
   *
   * Sama alasannya dengan `biayaDibawa` pada arus mingguan: kumulatif yang
   * direset tiap tahun membuat proyek yang sudah menalangi setahun terlihat
   * mulai dari nol — persis keadaan yang paling perlu terlihat.
   */
  readonly kasDibawa = computed(() => {
    const t = this.tahun();
    if (t === SELURUH) return 0;

    const jumlah = (baris: any[]) =>
      (baris ?? [])
        .filter((x: any) => sebelumTahun(x?.date, t))
        .reduce((a, x) => a + Math.abs(Number(x?.amount) || 0), 0);

    return jumlah(this.arusKasMasuk()) - jumlah(this.arusKasKeluarDihitung());
  });

  /**
   * Satuan grafik arus kas. HARIAN yang menjadi bawaan.
   *
   * Bulanan hanya punya satu nilai per bulan — saldo akhir bulan — dan garis
   * di antaranya tarikan lurus, bukan pengukuran. Bulan yang kasnya sempat
   * menembus nol di pertengahan lalu tertolong termin di akhir bulan
   * tergambar tidak pernah minus. Untuk grafik yang dibaca justru untuk
   * mengetahui "sejak kapan proyek ini menalangi", itu lebih optimistik
   * daripada kenyataannya.
   *
   * Bulanan TETAP disediakan: pada proyek dua tahun ia lebih mudah dibaca
   * ketika yang dicari bentuk kasarnya, bukan hari tertentu.
   */
  readonly satuanKas = signal<SatuanKas>('hari');

  readonly PILIHAN_SATUAN_KAS: SatuanKas[] = ['hari', 'bulan'];

  gantiSatuanKas(s: SatuanKas): void {
    this.satuanKas.set(s);
    // Lebar jendela dikembalikan ke otomatis.
    //
    // Chipnya menyatakan JUMLAH TITIK, dan satu titik berarti hal yang
    // berbeda pada tiap satuan: "6" yang terbawa dari bulanan menjadi
    // jendela enam HARI. Angkanya masih masuk akal, grafiknya masih
    // tergambar, dan tidak ada apa pun yang menyebutkan sebabnya.
    this.pilihanJendela.set('auto');
    // Jendela dikembalikan ke ujung kanan: lebar jendela dihitung dalam
    // SATUAN titik, jadi geseran 6 pada bulanan berarti 6 hari pada harian —
    // tampilannya melompat ke rentang yang tidak diminta siapa pun.
    this.geserKas.set(0);
  }

  readonly titikArusKas = computed<TitikKas[]>(() => {
    const t = this.tahun();
    const saring = (baris: any[]) =>
      t === SELURUH
        ? baris
        : (baris ?? []).filter((x: any) => dalamTahun(x?.date, t));

    return titikKas(
      saring(this.arusKasMasuk()),
      saring(this.arusKasKeluarDihitung()),
      this.kasDibawa(),
      this.satuanKas(),
    );
  });

  readonly adaArusKas = computed(() => this.titikArusKas().length > 0);

  // ------------------------------------------------------------------
  // Jendela geser: proyek panjang tidak muat dibaca sekaligus
  // ------------------------------------------------------------------
  //
  // Proyek dua tahun adalah 24 titik. Dijejalkan ke satu lebar kartu,
  // labelnya bertumpuk dan bentuk garisnya hilang — yang tersisa cuma
  // kecenderungan kasar, padahal yang dicari justru bulan tertentu.
  //
  // Jendelanya MUNDUR dari yang terbaru, bukan maju dari awal: yang membuka
  // laporan arus kas menanyakan posisi kas SEKARANG, dan memaksanya menggeser
  // ke ujung kanan lebih dulu setiap kali adalah pekerjaan yang tidak ada
  // gunanya.

  private readonly wadahGrafik =
    viewChild<ElementRef<HTMLElement>>('wadahGrafik');

  /** Lebar wadah grafik dalam px; 0 berarti belum terukur. */
  private readonly lebarWadah = signal(0);

  /** `'auto'` = menyesuaikan lebar layar. */
  readonly pilihanJendela = signal<number | 'auto'>('auto');

  /**
   * Pilihan lebar jendela — IKUT SATUANNYA.
   *
   * Angka di chip ini adalah JUMLAH TITIK, dan satu titik berarti hal yang
   * berbeda pada tiap satuan. Dibiarkan tetap `[6, 10, 18]`, chip "6" pada
   * satuan harian berarti jendela ENAM HARI: grafik yang hanya memuat
   * seminggu, dengan kendali geser yang harus ditekan belasan kali untuk
   * menyeberangi satu proyek. Tidak ada galat — hanya kendali yang terasa
   * rusak, dan itulah yang dilaporkan.
   */
  readonly PILIHAN_JENDELA = computed<(number | 'auto')[]>(() =>
    this.satuanKas() === 'hari' ? ['auto', 30, 60, 90] : ['auto', 6, 10, 18],
  );

  /**
   * Titik ke sekian dari UJUNG KANAN; 0 berarti menampilkan yang terbaru.
   *
   * Dihitung dari ujung kanan, bukan dari awal, supaya menambah bulan baru
   * tidak menggeser tampilan orang yang sedang melihat bagian terkini.
   */
  readonly geserKas = signal(0);

  constructor() {
    /*
     * Lebar diukur dari WADAHNYA, bukan dari `window.innerWidth`.
     *
     * Menu samping dapat dilipat, dan kartunya juga dipakai pada layar lebar
     * yang jendelanya separuh. Mengukur jendela peramban memberi jawaban yang
     * benar hanya pada satu susunan layar.
     */
    let pengamat: ResizeObserver | undefined;

    effect(() => {
      const el = this.wadahGrafik()?.nativeElement;
      pengamat?.disconnect();
      pengamat = undefined;
      if (!el || typeof ResizeObserver === 'undefined') return;

      pengamat = new ResizeObserver((baris) => {
        const w = Math.round(baris[0]?.contentRect?.width ?? 0);
        if (w > 0) this.lebarWadah.set(w);
      });
      pengamat.observe(el);
    });

    inject(DestroyRef).onDestroy(() => pengamat?.disconnect());
  }

  /**
   * Berapa titik yang muat, dihitung dari lebar wadahnya.
   *
   * ~160px per titik. Angkanya DITETAPKAN DARI LAYAR NYATA, bukan dari
   * ambang keterbacaan label: pada 1920×1200 wadah grafiknya sekitar 1590px
   * (1920 dikurangi menu samping dan padding halaman), dan 1590/160 ≈ 10 —
   * jumlah yang diminta.
   *
   * Sebelumnya 64px, dengan alasan "di bawah itu label bulan bertumpuk". Itu
   * benar sebagai BATAS BAWAH, tetapi salah dipakai sebagai ukuran yang
   * nyaman: ia menjejalkan sebanyak mungkin bulan sampai tepat sebelum
   * labelnya rusak, dan hasilnya padat tanpa ada yang memintanya.
   *
   * Dibatasi 5..20. Di bawah 5 jendelanya berhenti berbentuk garis; di atas
   * 20 tidak ada lagi yang dapat dibaca per bulan, dan yang butuh gambaran
   * sepanjang itu sedang menanyakan hal yang berbeda.
   */
  readonly jendelaOtomatis = computed(() => {
    const w = this.lebarWadah();

    /*
     * HARIAN memakai ukuran yang berbeda, dan itu bukan selera.
     *
     * 160px per titik disusun untuk LABEL BULAN yang harus terbaca satu per
     * satu. Pada harian tidak ada yang membaca label tiap hari — yang dibaca
     * BENTUK garisnya, dan bentuk baru muncul kalau titiknya cukup banyak.
     * Sepuluh hari bukan grafik, itu sepuluh batang berjajar.
     *
     * Sekitar satu triwulan (90 hari) memberi bentuk yang berarti dan masih
     * memuat rincian hariannya; sumbu-x menipiskan labelnya sendiri.
     */
    if (this.satuanKas() === 'hari') {
      /*
       * ~22px per hari, bukan 8px.
       *
       * 8px memberi jendela seratus tujuh puluhan hari pada layar lebar —
       * dan proyek yang panjangnya kurang dari itu jadi TIDAK PERNAH
       * memunculkan kendali geser sama sekali, karena kendalinya hanya
       * digambar ketika titiknya lebih banyak daripada yang muat. Yang
       * dialami orang: grafik harian yang padat dan tidak dapat digeser ke
       * mana pun.
       *
       * 22px memberi sekitar dua bulan pada layar lebar: bentuk garisnya
       * masih terbaca, dan proyek yang lebih panjang dari itu — hampir
       * semuanya — mendapatkan kendali gesernya.
       */
      if (!w) return 60;
      return Math.max(30, Math.min(120, Math.round(w / 22)));
    }

    // Belum terukur (ResizeObserver belum menyala): 10, bukan 0 — jendela
    // nol berarti grafik kosong pada kedipan pertama.
    if (!w) return 10;
    return Math.max(5, Math.min(20, Math.round(w / 160)));
  });

  /**
   * Lebar wadah yang TERUKUR, untuk keterangan pada chip "Otomatis".
   *
   * Disebutkan supaya kalau jumlah titiknya terasa aneh, sebabnya langsung
   * terlihat — lebar yang salah terbaca, atau ambangnya yang perlu disetel.
   * Tanpa ini, satu-satunya cara memeriksanya adalah menebak.
   */
  readonly lebarWadahTerukur = computed(() => this.lebarWadah());

  readonly lebarJendela = computed(() => {
    const p = this.pilihanJendela();
    return p === 'auto' ? this.jendelaOtomatis() : p;
  });

  /** Jendelanya cuma berarti kalau titiknya memang lebih banyak. */
  readonly jendelaDipakai = computed(
    () => this.titikArusKas().length > this.lebarJendela(),
  );

  /** `geserKas` dijepit di sini, bukan hanya di tombolnya. */
  readonly geserSah = computed(() => {
    const maks = Math.max(0, this.titikArusKas().length - this.lebarJendela());
    return Math.max(0, Math.min(maks, this.geserKas()));
  });

  readonly bisaMundur = computed(
    () =>
      this.geserSah() <
      Math.max(0, this.titikArusKas().length - this.lebarJendela()),
  );
  readonly bisaMaju = computed(() => this.geserSah() > 0);

  /**
   * Titik yang benar-benar digambar.
   *
   * Yang dipotong adalah TITIK yang saldonya sudah kumulatif sejak awal
   * proyek — bukan pembayarannya. Kalau pembayarannya yang disaring lebih
   * dulu, saldo di jendela ini akan dimulai ulang dari nol, dan proyek yang
   * sudah menalangi setahun terbaca baru mulai.
   */
  readonly titikTampil = computed<TitikKas[]>(() => {
    const semua = this.titikArusKas();
    const lebar = this.lebarJendela();
    if (semua.length <= lebar) return semua;

    const akhir = semua.length - this.geserSah();
    return semua.slice(Math.max(0, akhir - lebar), akhir);
  });

  /** Rentang yang sedang tampil, disebut sebagai teks. */
  readonly labelJendela = computed(() => {
    const t = this.titikTampil();
    if (!t.length) return '';
    return t.length === 1 ? t[0].label : `${t[0].label} – ${t[t.length - 1].label}`;
  });

  geserKeBelakang(): void {
    if (!this.bisaMundur()) return;
    this.geserKas.set(this.geserSah() + this.lebarJendela());
  }

  geserKeDepan(): void {
    if (!this.bisaMaju()) return;
    this.geserKas.set(Math.max(0, this.geserSah() - this.lebarJendela()));
  }

  keTerkini(): void {
    this.geserKas.set(0);
  }

  pilihJendela(p: number | 'auto'): void {
    this.pilihanJendela.set(p);
    // Kembali ke ujung kanan: melebarkan jendela dari posisi tengah membuat
    // tampilannya melompat ke rentang yang tidak diminta siapa pun.
    this.geserKas.set(0);
  }

  /** Saldo kas pada titik terakhir; `null` bila belum ada pembayaran. */
  readonly saldoKasAkhir = computed<number | null>(() => {
    const t = this.titikArusKas();
    return t.length ? t[t.length - 1].saldo : null;
  });

  readonly totalKasMasuk = computed(() =>
    this.titikArusKas().reduce((a, x) => a + x.masuk, 0),
  );
  readonly totalKasKeluar = computed(() =>
    this.titikArusKas().reduce((a, x) => a + x.keluar, 0),
  );

  /**
   * Titik PERTAMA saldo kasnya menembus nol; `null` bila tidak pernah.
   *
   * Ini angka yang sebenarnya dicari orang di grafik ini — sejak kapan proyek
   * ini menalangi uang perusahaan. Disebutkan sebagai teks, bukan hanya
   * digambar: yang membuka laporan dari layar kecil tidak dapat membaca
   * perpotongan garis dengan sumbu nol dengan mata.
   *
   * Pada satuan HARIAN angka ini menjadi lebih jujur, dan kadang lebih buruk
   * daripada yang tertulis sebelumnya: saldo yang sempat minus di tengah
   * bulan lalu tertolong termin di akhir bulan TIDAK pernah muncul pada
   * satuan bulanan. Kalau tanggalnya tiba-tiba lebih awal daripada yang
   * diingat orang, itu bukan kemunduran — itu hari yang selama ini tidak
   * terlihat.
   */
  readonly bulanMulaiMinus = computed<string | null>(() => {
    const t = this.titikArusKas().find((x) => x.saldo < 0);
    return t ? t.label : null;
  });

  /**
   * Seri mana yang sedang digambar.
   *
   * Tiga garis sekaligus menjawab "kenapa"; satu garis menjawab "berapa".
   * Yang ingin melihat saldo saja sedang bertanya hal yang berbeda, dan dua
   * garis lain di sana hanya membuat sumbunya ikut menyesuaikan nilai yang
   * tidak sedang ia baca.
   */
  readonly seriKas = signal<Record<KunciSeriKas, boolean>>({
    masuk: true,
    keluar: true,
    saldo: true,
  });

  readonly KUNCI_SERI_KAS: KunciSeriKas[] = ['masuk', 'keluar', 'saldo'];

  /** Warna chip diambil dari sumber yang SAMA dengan warna garisnya. */
  warnaSeriKas(k: KunciSeriKas): string {
    return WARNA_KAS[k].garis;
  }

  labelSeriKas(k: KunciSeriKas): string {
    return `projectCashflow.series${
      k === 'masuk' ? 'In' : k === 'keluar' ? 'Out' : 'Balance'
    }`;
  }

  seriKasAktif(k: KunciSeriKas): boolean {
    return this.seriKas()[k];
  }

  /**
   * Seri terakhir tidak dapat dimatikan.
   *
   * Grafik tanpa satu pun garis adalah kotak kosong dengan sumbu — tidak ada
   * galat, tidak ada keterangan, dan yang mematikannya belum tentu ingat
   * bahwa ia sendiri penyebabnya. Chipnya dibuat `disabled` supaya sebabnya
   * terlihat sebelum ditekan, bukan sesudahnya.
   */
  readonly seriKasTerakhir = computed(
    () => Object.values(this.seriKas()).filter(Boolean).length === 1,
  );

  seriKasTerkunci(k: KunciSeriKas): boolean {
    return this.seriKasTerakhir() && this.seriKas()[k];
  }

  toggleSeriKas(k: KunciSeriKas): void {
    if (this.seriKasTerkunci(k)) return;
    this.seriKas.update((s) => ({ ...s, [k]: !s[k] }));
  }

  readonly dataArusKas = computed<ChartData<'line'>>(() => {
    // `titikTampil`, bukan `titikArusKas`: yang digambar adalah jendelanya.
    // KPI di atas tetap memakai seluruh proyek — dua pertanyaan berbeda.
    const t = this.titikTampil();
    const aktif = this.seriKas();

    /*
     * TITIK DIHILANGKAN PADA SATUAN HARIAN.
     *
     * Sembilan puluh bulatan berjejer bukan grafik, itu pita bulatan: bentuk
     * garisnya tertutup oleh penandanya sendiri. Pada bulanan titiknya
     * sedikit dan penanda justru membantu — di sanalah nilainya benar-benar
     * diukur, bukan ditarik lurus di antara dua titik.
     */
    const jari = this.satuanKas() === 'hari' ? 0 : 2;

    /*
     * Seri yang dimatikan DIBUANG dari `datasets`, bukan ditandai `hidden`.
     *
     * `hidden` menyembunyikan garisnya tetapi nilainya tetap ikut
     * menentukan rentang sumbu Y. Saldo yang bergerak di -600 jt sampai
     * -100 jt akan tetap digambar pada sumbu yang membentang sampai +450 jt
     * hanya karena kas masuk yang tidak terlihat masih ada di sana — dan
     * garis yang diminta tampil sendirian justru jadi gepeng.
     *
     * Dibuang dari daftarnya, sumbunya menyesuaikan pada yang benar-benar
     * dibaca.
     */
    const semua = [
      /*
       * `cubicInterpolationMode: 'monotone'`, BUKAN `tension`.
         *
         * Ditemukan saat merender grafiknya sungguhan: dengan `tension: 0.25`,
         * chart.js melengkungkan garis MELEWATI titik datanya. Pada deret yang
         * turun ke nol lalu naik lagi — bulan tanpa penerimaan, yang di sini
         * biasa — lengkungannya tercelup di BAWAH nol, dan garis "kas masuk"
         * menggambar penerimaan negatif yang tidak pernah ada.
         *
         * `monotone` tetap melengkung tetapi tidak pernah melampaui datanya.
         * Sudah diukur: titik kendali kurvanya tidak lagi menembus garis nol.
         */
        {
          kunci: 'masuk' as KunciSeriKas,
          label: this.translate.instant('projectCashflow.seriesIn'),
          data: t.map((x) => x.masuk),
          borderColor: WARNA_KAS.masuk.garis,
          backgroundColor: WARNA_KAS.masuk.isi,
          tension: 0,
          pointRadius: jari,
        },
        {
          kunci: 'keluar' as KunciSeriKas,
          label: this.translate.instant('projectCashflow.seriesOut'),
          data: t.map((x) => x.keluar),
          borderColor: WARNA_KAS.keluar.garis,
          backgroundColor: WARNA_KAS.keluar.isi,
          tension: 0,
          pointRadius: jari,
        },
        {
          /*
           * Saldo digambar TEBAL dan terisi; dua garis lainnya tipis.
           *
           * Ketiganya setara secara visual membuat mata berpindah-pindah
           * tanpa tahu mana yang harus dibaca. Saldo adalah jawabannya; masuk
           * dan keluar adalah sebabnya.
           */
          kunci: 'saldo' as KunciSeriKas,
          label: this.translate.instant('projectCashflow.seriesBalance'),
          data: t.map((x) => x.saldo),
          borderColor: WARNA_KAS.saldo.garis,
          backgroundColor: WARNA_KAS.saldo.isi,
          borderWidth: 2.5,
          fill: true,
          tension: 0,
          pointRadius: jari,
        },
    ];

    return {
      labels: t.map((x) => x.label),
      datasets: semua
        .filter((d) => aktif[d.kunci])
        .map(({ kunci, ...sisa }) => sisa),
    };
  });

  readonly opsiArusKas: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      // Jendelanya diatur sendiri (30/60/90 hari) — bukan 12 titik bawaan.
      geserZoomAkn: { jendelaAwal: false },
      // Sama seperti kurva S: legenda bertitik kecil supaya tidak membungkus
      // menjadi dua baris di layar sempit.
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8 },
      },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${ctx.dataset.label}: ${rupiah(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        // Alasannya sama dengan kurva S — lihat `opsiKurvaS`.
        ticks: { maxRotation: 0, autoSkip: true },
      },
      y: {
        /*
         * TIDAK dikunci mulai nol — kebalikan dari kurva S, dan disengaja.
         *
         * Saldo kas proyek memang bisa minus, dan justru itu yang dicari.
         * Memaksa `min: 0` akan memotong seluruh bagian yang menjawab
         * pertanyaannya.
         */
        ticks: {
          callback: (v) => {
            const n = Number(v);
            const jt = n / 1_000_000;
            return `${Math.abs(jt) >= 1000 ? (jt / 1000).toFixed(1) + ' M' : jt.toFixed(0) + ' jt'}`;
          },
        },
        grid: {
          // Garis nol dipertegas: perpotongan dengannya adalah inti grafiknya.
          color: (ctx: any) =>
            ctx.tick?.value === 0
              ? 'rgba(0,0,0,0.35)'
              : 'rgba(0,0,0,0.06)',
        },
      },
    },
  };

  // ------------------------------------------------------------------
  // Perhitungan terhadap kemajuan, bukan terhadap tagihan
  // ------------------------------------------------------------------
  //
  // Ini yang sebenarnya dicari waktu bertanya "biaya vs kontrak, tapi yang
  // aktual". Margin di kartu atas adalah kontrak dikurangi biaya SAMPAI KINI
  // — angka yang benar hanya bila proyeknya sudah selesai. Di tengah jalan ia
  // selalu tampak sehat, karena biaya yang belum keluar belum ada di sana.
  //
  // Seluruh angka di bawah memakai KEMAJUAN sebagai penyebut, sehingga
  // menjawab pertanyaan yang berbeda: bukan "sudah rugi belum", melainkan
  // "kalau begini terus, akan jadi berapa".

  /** Persen kemajuan terakhir sebagai angka, atau null bila belum ada. */
  readonly persenProgres = computed<number | null>(() => {
    const t = this.progresTerakhir();
    if (!t) return null;
    const n = Number(t.percentage);
    return isFinite(n) ? n : null;
  });

  /**
   * Nilai pekerjaan yang SUDAH dikerjakan: kemajuan × nilai kontrak.
   *
   * Bukan pengakuan pendapatan akuntansi — pembukuan resmi tetap berbasis
   * faktur, dan angka ini tidak masuk ke laba rugi. Gunanya membandingkan
   * pekerjaan dengan tagihan: faktur mengikuti termin, dan termin tidak
   * pernah persis mengikuti keadaan di lapangan.
   */
  readonly nilaiDikerjakan = computed<number | null>(() => {
    const p = this.persenProgres();
    const k = this.nilaiKontrak();
    if (p === null || k <= 0) return null;
    return (p / 100) * k;
  });

  /**
   * Selisih pekerjaan dan tagihan.
   *
   * Positif  = sudah dikerjakan tetapi belum ditagih — uang perusahaan yang
   *            sedang menganggur di lapangan, dan biasanya inilah sebab kas
   *            terasa seret padahal proyeknya untung.
   * Negatif  = sudah ditagih melebihi yang dikerjakan (uang muka besar) —
   *            terasa lapang sekarang, tetapi pekerjaannya masih harus
   *            dibiayai nanti.
   */
  readonly selisihTagihan = computed<number | null>(() => {
    const dikerjakan = this.nilaiDikerjakan();
    if (dikerjakan === null) return null;
    return dikerjakan - this.tertagihDpp();
  });

  /**
   * Batas bawah kemajuan sebelum proyeksi boleh ditampilkan.
   *
   * Proyeksi membagi biaya dengan kemajuan. Pada kemajuan kecil, pembaginya
   * kecil dan hasilnya meledak: biaya mobilisasi yang keluar di awal saat
   * kemajuan 2% memproyeksikan biaya akhir lima puluh kali lipat. Angka itu
   * bukan peringatan, hanya artefak pembagian — dan sekali terlihat, seluruh
   * proyeksi berhenti dipercaya.
   */
  private readonly BATAS_PROYEKSI = 10;

  /**
   * Perkiraan biaya sampai proyek selesai, bila lajunya tetap seperti
   * sekarang: biaya sampai kini dibagi porsi pekerjaan yang sudah jadi.
   */
  readonly proyeksiBiaya = computed<number | null>(() => {
    const p = this.persenProgres();
    if (p === null || p < this.BATAS_PROYEKSI) return null;
    const biaya = this.biayaSeumurProyek();
    if (biaya <= 0) return null;
    return biaya / (p / 100);
  });

  /** Perkiraan margin akhir: kontrak dikurangi proyeksi biaya. */
  readonly proyeksiMargin = computed<number | null>(() => {
    const b = this.proyeksiBiaya();
    const k = this.nilaiKontrak();
    if (b === null || k <= 0) return null;
    return k - b;
  });

  readonly proyeksiMarginPersen = computed<number | null>(() => {
    const m = this.proyeksiMargin();
    const k = this.nilaiKontrak();
    if (m === null || k <= 0) return null;
    return (m / k) * 100;
  });

  /**
   * Proyeksi ditahan, dan sebabnya disebutkan.
   *
   * Bagian yang hilang tanpa keterangan terbaca sebagai kerusakan; yang
   * membacanya akan mengira datanya gagal dimuat, bukan bahwa angkanya
   * memang belum layak dihitung.
   */
  readonly proyeksiBelumLayak = computed(() => {
    const p = this.persenProgres();
    return p !== null && p < this.BATAS_PROYEKSI;
  });

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
    // Ganti tahun = ganti rentang. Posisi geser lama menunjuk bulan yang
    // sudah tidak ada di daftarnya.
    this.geserKas.set(0);

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
