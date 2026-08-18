import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ApiService } from '../../../services/api.service';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { ProjectSelectorComponent } from '../../../components/project-selector/project-selector.component';
import { ProjectLookupService } from '../../../services/project-lookup.service';
import { purchaseTypeLabel } from '../../../constants/purchase-type-label.constant';
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
 * Nilai satu dokumen biaya.
 *
 * Rumusnya BERBEDA per sumber dan bedanya disengaja: pembelian memuat PBBKB
 * dan nilai lain, draft belum, reimbursement hanya nominal pengajuan.
 * Menyamakannya membuat PPN terhitung dua kali pada sebagian baris dan
 * hilang pada sebagian lain.
 *
 * Disimpan di satu tempat karena dipakai dua kali — pengelompokan menurut
 * kategori dan arus per minggu. Bila ditulis terpisah, cepat atau lambat
 * salah satunya diubah sendirian dan kedua tampilan berbeda totalnya.
 */
function nilaiPembelian(p: any): number {
  return (
    Number(p.dpp || 0) +
    (Number(p.ppn || 0) * Number(p.dpp || 0)) / 100 +
    Number(p.pbbkb || 0) +
    Number(p.otherValue || 0)
  );
}

function nilaiDraft(p: any): number {
  return (
    Number(p.dpp || 0) +
    (Number(p.ppn || 0) * Number(p.dpp || 0)) / 100 +
    Number(p.pbbkb || 0)
  );
}

function nilaiFaktur(f: any): number {
  return Number(f.dpp || 0) + (Number(f.ppn || 0) * Number(f.dpp || 0)) / 100;
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

  muat(kode: string): void {
    this.memuat.set(true);
    this.galat.set(null);
    this.kode.set(kode);
    this.kategoriTerbuka.set(null);

    this.api
      .get(`purchases/report/project/${kode}`, {})
      .subscribe({
        next: (res: any) => {
          this._data.set({
            purchases: res?.purchases ?? [],
            reimbursements: res?.reimbursements ?? [],
            purchase_drafts: res?.purchase_drafts ?? [],
            sales_invoices: res?.sales_invoices ?? [],
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
  readonly nilaiKontrak = computed(() =>
    Number((this.proyek() as any)?.contractDpp ?? 0),
  );

  /** Nominal dokumen apa adanya, hanya untuk ditampilkan. */
  readonly nominalKontrak = computed(() =>
    Number((this.proyek() as any)?.contractValue ?? 0),
  );

  /**
   * Biaya dikelompokkan menurut kode tipe biaya, lalu per pemasok.
   *
   * Ketiga sumber dijumlahkan dengan rumusnya masing-masing: pembelian dan
   * draft memakai DPP ditambah PPN, PBBKB, dan nilai lain; reimbursement
   * memakai nominal pengajuannya. Menyamakan rumusnya akan membuat PPN
   * terhitung dua kali pada sebagian baris dan hilang pada sebagian lain.
   */
  readonly kategori = computed<Kategori[]>(() => {
    const d = this._data();
    if (!d) return [];

    const peta = new Map<string, Map<string, number>>();

    const catat = (kode: string, pemasok: string, nilai: number) => {
      const k = (kode || '?').toString();
      if (!peta.has(k)) peta.set(k, new Map());
      const m = peta.get(k)!;
      m.set(pemasok, (m.get(pemasok) ?? 0) + (Number(nilai) || 0));
    };

    const pembelian = this.sertakanInternal()
      ? d.purchases
      : d.purchases.filter((p: any) => !p.isInternal);

    for (const p of pembelian) {
      catat(p.purchaseType, namaPemasok(p), nilaiPembelian(p));
    }
    for (const p of d.purchase_drafts) {
      catat(p.purchaseType, namaPemasok(p), nilaiDraft(p));
    }
    for (const r of d.reimbursements) {
      catat(r.purchaseType, namaPenerima(r), Number(r.amount || 0));
    }

    // Nilai kontrak dibaca sekali di luar perulangan: memanggil signal di
    // dalamnya menghitung ulang untuk setiap kategori tanpa alasan.
    const kontrak = this.nilaiKontrak();

    const hasil: Kategori[] = [];
    for (const [kode, pemasokMap] of peta) {
      const pemasok = [...pemasokMap.entries()]
        .map(([nama, nilai]) => ({ nama, nilai }))
        .sort((a, b) => b.nilai - a.nilai);
      const nilai = pemasok.reduce((a, b) => a + b.nilai, 0);
      hasil.push({
        kode,
        nama: purchaseTypeLabel(this.translate, kode) ?? kode,
        nilai,
        pemasok,
        // `null` bila kontraknya belum diisi — bukan nol, karena nol
        // terbaca sebagai "tidak menyerap apa pun" padahal artinya
        // "belum dapat dihitung".
        porsiKontrak: kontrak > 0 ? (nilai / kontrak) * 100 : null,
      });
    }
    return hasil.sort((a, b) => b.nilai - a.nilai);
  });

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
    const d = this._data();
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
      tambah(biaya, awalMinggu(p.date), nilaiPembelian(p));
    for (const p of d.purchase_drafts)
      tambah(biaya, awalMinggu(p.date), nilaiDraft(p));
    for (const r of d.reimbursements)
      tambah(biaya, awalMinggu(r.date), Number(r.amount || 0));
    for (const f of d.sales_invoices)
      tambah(tagihan, awalMinggu(f.date), nilaiFaktur(f));

    const semua = [...new Set([...biaya.keys(), ...tagihan.keys()])].sort();
    if (semua.length === 0) return [];

    const hasil: Minggu[] = [];
    let kumulatif = 0;
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

  readonly totalBiaya = computed(() =>
    this.kategori().reduce((a, b) => a + b.nilai, 0),
  );

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

  readonly margin = computed(() => this.nilaiKontrak() - this.totalBiaya());

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
    return k > 0 ? (this.totalBiaya() / k) * 100 : null;
  });

  /** True bila biaya sudah melampaui nilai kontraknya. */
  readonly melampauiKontrak = computed(() => {
    const p = this.porsiTerpakai();
    return p !== null && p > 100;
  });

  /**
   * Tertagih tanpa PPN.
   *
   * Disandingkan dengan nilai berikut PPN pada layar yang sama, sehingga
   * ketiga angka — kontrak, biaya, tertagih — dapat dibandingkan dalam
   * dasar yang sama, dan DPP-nya tetap terlihat bagi yang memerlukannya.
   */
  readonly tertagihDpp = computed(() => {
    const d = this._data();
    if (!d) return 0;
    return d.sales_invoices.reduce(
      (a: number, b: any) => a + Number(b.dpp || 0),
      0,
    );
  });

  readonly tertagih = computed(() => {
    const d = this._data();
    if (!d) return 0;
    return d.sales_invoices.reduce(
      (a: number, b: any) =>
        a +
        Number(b.dpp || 0) +
        (Number(b.ppn || 0) * Number(b.dpp || 0)) / 100,
      0,
    );
  });

  /** Persentase terhadap total biaya; nol bila belum ada biaya sama sekali. */
  persen(nilai: number): number {
    const t = this.totalBiaya();
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
      totalBiaya: this.totalBiaya(),
      margin: this.margin(),
      tertagih: this.tertagih(),
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
