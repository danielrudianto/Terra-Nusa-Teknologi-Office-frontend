import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule, MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TextFieldModule } from '@angular/cdk/text-field';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import { SupplierTerkunciComponent } from 'src/app/components/supplier-terkunci/supplier-terkunci.component';
import {
  BarisCoPInput,
  BarisPagu,
  CertificateOfPayment,
  CertificateOfPaymentService,
  KATEGORI_POTONGAN,
  KATEGORI_TAMBAHAN,
  PenyesuaianCoP,
  SyaratSpk,
} from 'src/app/services/certificate-of-payment.service';
import { PermissionService } from 'src/app/services/permission.service';
import { ServerMessageService } from 'src/app/services/server-message.service';

/**
 * TAHAP DUA — pemeriksaan.
 *
 * MENGAPA INI FORMULIR, BUKAN SATU TOMBOL
 *
 * Sebelumnya memeriksa berarti menekan "tandai sudah diperiksa" dari daftar.
 * Yang menekannya belum tentu membuka dokumennya, dan tanda "diperiksa"
 * kemudian dibaca penyetuju sebagai pernyataan bahwa angkanya sudah
 * ditelaah — padahal tidak ada yang menelaah apa pun.
 *
 * Lembar ini memindahkan tandanya ke UJUNG pekerjaan yang sesungguhnya:
 * membaca ulang volumenya, membetulkan yang keliru, lalu memutuskan
 * potongan dan tambahannya. Tandanya terbubuh sebagai akibat menyimpan,
 * bukan sebagai tindakan tersendiri.
 *
 * BEDANYA DENGAN LEMBAR PENGISIAN
 *
 * Di sinilah rupiah muncul untuk PERTAMA KALINYA. Lembar pengisian tetap
 * volume semata siapa pun yang mengerjakannya; harga satuan, jumlah per
 * baris, potongan, dan tambahan semuanya hidup di lembar ini.
 *
 * Seluruh potongan dan tambahan bersifat PILIHAN. Menyimpan tanpa satu pun
 * baris penyesuaian adalah keadaan yang sah — banyak progres memang dibayar
 * penuh — dan memaksa mengisinya hanya melahirkan baris nol rupiah.
 */
@Component({
  selector: 'app-certificate-of-payment-check',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressBarModule,
    TextFieldModule,
    NgxMaskDirective,
    TranslateModule,
    HeaderTitleComponent,
    SupplierTerkunciComponent,
  ],
  providers: [provideNgxMask()],
  templateUrl: './certificate-of-payment-check.component.html',
  styleUrl: './certificate-of-payment-check.component.scss',
})
export class CertificateOfPaymentCheckComponent implements OnInit {
  private readonly service = inject(CertificateOfPaymentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);
  readonly izin = inject(PermissionService);

  copId = 0;

  readonly cop = signal<CertificateOfPayment | null>(null);
  readonly baris = signal<BarisPagu[]>([]);
  readonly memuat = signal(false);
  readonly menyimpan = signal(false);

  readonly KATEGORI_POTONGAN = KATEGORI_POTONGAN;
  readonly KATEGORI_TAMBAHAN = KATEGORI_TAMBAHAN;

  readonly tanggal = new FormControl<Date | null>(null);
  readonly periodeAwal = new FormControl<Date | null>(null);
  readonly periodeAkhir = new FormControl<Date | null>(null);
  readonly catatan = new FormControl<string>('');

  /** Volume per baris, dan catatannya. */
  readonly isian = signal<Record<number, number | null>>({});
  readonly catatanBaris = signal<Record<number, string>>({});
  /** Volume yang sudah tersimpan pada CoP ini — dikembalikan ke sisa pagu. */
  readonly volumeAwal = signal<Record<number, number>>({});
  private kontrol = new Map<number, FormControl<string | null>>();

  readonly penyesuaian = signal<PenyesuaianCoP[]>([]);

  readonly bolehPeriksa = computed(() => this.izin.level() >= 2);

  // ------------------------------------------------------------------
  // Muat
  // ------------------------------------------------------------------

  async ngOnInit(): Promise<void> {
    this.copId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.copId) return;
    await this.muat();
  }

  private pesan(e: any): void {
    this.snackBar.open(
      this.pesanServer.terjemahkan(e),
      this.translate.instant('common.close'),
      { duration: 6000 },
    );
  }

  async muat(): Promise<void> {
    this.memuat.set(true);
    try {
      const c = (await firstValueFrom(
        this.service.detail(this.copId),
      )) as CertificateOfPayment;
      this.cop.set(c);

      this.tanggal.setValue(c.date ? new Date(c.date) : null);
      this.periodeAwal.setValue(c.periodStart ? new Date(c.periodStart) : null);
      this.periodeAkhir.setValue(c.periodEnd ? new Date(c.periodEnd) : null);
      this.catatan.setValue(c.note || '');

      const isi: Record<number, number | null> = {};
      const cat: Record<number, string> = {};
      (c.items || []).forEach((i) => {
        isi[i.purchaseOrderItemID] = Number(i.quantity);
        if (i.remarks) cat[i.purchaseOrderItemID] = i.remarks;
      });
      this.isian.set(isi);
      this.catatanBaris.set(cat);
      this.volumeAwal.set(
        Object.fromEntries(
          Object.entries(isi).map(([k, v]) => [Number(k), Number(v) || 0]),
        ),
      );

      const pagu = (await firstValueFrom(
        this.service.pagu(c.purchaseOrderID),
      )) as BarisPagu[];
      this.baris.set(pagu || []);
      this.bangunKontrol();

      this.siapkanPenyesuaian(c);
    } catch (e) {
      this.pesan(e);
    } finally {
      this.memuat.set(false);
    }
  }

  /**
   * Potongan awal: yang SUDAH tersimpan, atau saran bila belum ada sama sekali.
   *
   * Uang muka dikembalikan sedikit demi sedikit dari tiap progres; retensi
   * ditahan dari tiap progres sampai masa pemeliharaan berakhir. Keduanya
   * berlaku pada SETIAP periode — dan yang berlaku setiap periode adalah
   * yang paling mudah terlewat pada periode kelima.
   *
   * Sarannya tetap dapat dihapus atau dibetulkan; ia titik awal, bukan kunci.
   */
  private siapkanPenyesuaian(c: CertificateOfPayment): void {
    const ada = (c.adjustments || []).map((a) => ({ ...a }));
    if (ada.length) {
      this.penyesuaian.set(ada);
      this.susunKontrolNominal();
      return;
    }

    const sy = c.spkSyarat;
    const saran: PenyesuaianCoP[] = [];
    if (sy && sy.saranUangMuka > 0) {
      saran.push({
        kind: 'deduction',
        category: 'uang_muka',
        label: null,
        amount: sy.saranUangMuka,
        note: null,
      });
    }
    if (sy && sy.saranRetensi > 0) {
      saran.push({
        kind: 'deduction',
        category: 'retensi',
        label: null,
        amount: sy.saranRetensi,
        note: null,
      });
    }
    if (sy && sy.saranPph > 0) {
      saran.push({
        kind: 'deduction',
        category: 'pph',
        label: sy.pphCode || null,
        amount: sy.saranPph,
        note: null,
      });
    }
    this.penyesuaian.set(saran);
    this.susunKontrolNominal();
  }

  // ------------------------------------------------------------------
  // Volume
  // ------------------------------------------------------------------

  private bangunKontrol(): void {
    const isi = this.isian();
    this.kontrol = new Map();
    this.baris().forEach((b) => {
      const id = b.purchaseOrderItemID;
      const awal = isi[id];
      const c = new FormControl<string | null>(
        awal === null || awal === undefined ? '' : String(awal),
      );
      c.valueChanges.subscribe((v) => this.terimaVolume(id, v));
      this.kontrol.set(id, c);
    });
  }

  kontrolVol(barisId: number): FormControl<string | null> {
    let c = this.kontrol.get(barisId);
    if (!c) {
      c = new FormControl<string | null>('');
      c.valueChanges.subscribe((v) => this.terimaVolume(barisId, v));
      this.kontrol.set(barisId, c);
    }
    return c;
  }

  /** ngx-mask menyimpan angka BERSIH pada kontrolnya — `Number` sudah cukup. */
  private terimaVolume(barisId: number, teks: string | null): void {
    const bersih = (teks ?? '').toString().trim();
    const angka = bersih === '' ? null : Number(bersih);
    this.isian.update((s) => ({
      ...s,
      [barisId]: angka !== null && Number.isFinite(angka) ? angka : null,
    }));
    // Nilai kotor berubah, dan potongan berpersen dihitung DARINYA.
    // Tanpa ini, uang muka 20% tetap memakai nilai kotor yang sudah tidak
    // berlaku — tepat pada layar tempat keputusannya diambil.
    this.hitungUlangSemuaPersen();
  }

  setCatatan(barisId: number, teks: string): void {
    this.catatanBaris.update((s) => ({ ...s, [barisId]: teks }));
  }

  nilai(barisId: number): number | null {
    return this.isian()[barisId] ?? null;
  }

  sisaBoleh(b: BarisPagu): number {
    return b.sisa + (this.volumeAwal()[b.purchaseOrderItemID] || 0);
  }

  melebihi(b: BarisPagu): boolean {
    const v = this.nilai(b.purchaseOrderItemID);
    return v !== null && v > this.sisaBoleh(b);
  }

  get adaYangMelebihi(): boolean {
    return this.baris().some((b) => this.melebihi(b));
  }

  /** Jumlah rupiah baris ini — volume x harga satuan SPK. */
  jumlahBaris(b: BarisPagu): number {
    return (this.nilai(b.purchaseOrderItemID) || 0) * Number(b.price || 0);
  }

  /**
   * Nilai kotor DIHITUNG ULANG dari volume yang sedang tampak di layar.
   *
   * Bukan diambil dari `grossAmount` yang tersimpan: pemeriksa boleh
   * membetulkan volume di lembar ini, dan ringkasan yang memakai angka
   * tersimpan akan menampilkan nilai lama sementara barisnya sudah berubah —
   * tepat pada layar tempat keputusan potongan diambil.
   */
  get kotor(): number {
    return this.baris().reduce((t, b) => t + this.jumlahBaris(b), 0);
  }

  get periodeSah(): boolean {
    const a = this.periodeAwal.value;
    const b = this.periodeAkhir.value;
    return !!a && !!b && b.getTime() >= a.getTime();
  }

  get adaIsian(): boolean {
    return Object.values(this.isian()).some((v) => v !== null && v > 0);
  }

  // ------------------------------------------------------------------
  // Potongan & tambahan
  // ------------------------------------------------------------------

  get syarat(): SyaratSpk | null {
    return this.cop()?.spkSyarat || null;
  }

  kategoriUntuk(kind: string): readonly string[] {
    return kind === 'deduction' ? KATEGORI_POTONGAN : KATEGORI_TAMBAHAN;
  }

  tambahBaris(kind: 'deduction' | 'addition'): void {
    this.penyesuaian.update((s) => [
      ...s,
      {
        kind,
        category: kind === 'deduction' ? 'uang_muka' : 'biaya_luar_kontrak',
        label: null,
        amount: 0,
        note: null,
      },
    ]);
    this.susunKontrolNominal();
  }


  hapusBaris(i: number): void {
    this.penyesuaian.update((s) => s.filter((_, idx) => idx !== i));
    this.susunKontrolNominal();
  }

  setBaris(i: number, bagian: Partial<PenyesuaianCoP>): void {
    this.penyesuaian.update((s) =>
      s.map((b, idx) => (idx === i ? { ...b, ...bagian } : b)),
    );
  }

  // ---- persen atau nominal --------------------------------------------

  /**
   * Cara memasukkan nilai tiap baris: 'nominal' atau 'persen'.
   *
   * MENGAPA ADA PILIHAN
   *
   * Uang muka dan retensi disepakati sebagai PERSENTASE — kontraknya
   * berbunyi "uang muka 20%", bukan "uang muka dua ratus juta". Memaksa
   * memasukkan nominalnya berarti yang memeriksa mengalikannya sendiri di
   * kalkulator setiap periode, dan hasil kali tangan itulah yang paling
   * sering salah. Denda justru sebaliknya: ia memang nominal yang
   * disepakati, bukan persentase.
   *
   * YANG TERSIMPAN SELALU NOMINAL. Persen hanya cara memasukkannya, dan
   * server tidak perlu tahu apa pun tentang ini.
   *
   * DASAR PERKALIANNYA nilai kotor PERIODE INI, bukan nilai kontrak. Itulah
   * yang tercetak pada lembar CoP ("20% x Rp <kotor> = ..."), dan itu pula
   * yang membuat pengembalian uang muka menutup dirinya sendiri: bila tiap
   * progres dipotong 20%, saat progres mencapai 100% yang dikembalikan tepat
   * sebesar uang mukanya.
   */
  modeNilai: ('nominal' | 'persen')[] = [];

  /** Persen yang diketik per baris; hanya dipakai saat modenya 'persen'. */
  private persen: number[] = [];

  persenBaris(i: number): number {
    return this.persen[i] || 0;
  }

  /**
   * Kategori yang WAJARNYA dimasukkan sebagai persen.
   *
   * Sekadar tebakan awal — modenya tetap dapat ditukar. Yang ditebak benar
   * menghemat satu ketukan; yang ditebak salah tidak menghalangi apa pun.
   */
  private static modeBawaan(kategori: string): 'nominal' | 'persen' {
    return kategori === 'uang_muka' ||
      kategori === 'retensi' ||
      kategori === 'pph'
      ? 'persen'
      : 'nominal';
  }

  gantiMode(i: number, mode: 'nominal' | 'persen'): void {
    if (this.modeNilai[i] === mode) return;
    this.modeNilai[i] = mode;

    const a = this.penyesuaian()[i];
    const c = this.kontrolNominal(i);
    if (mode === 'persen') {
      // Nominal yang sudah ada diterjemahkan menjadi persennya, supaya
      // menukar mode tidak menghapus angka yang sudah diputuskan.
      const p = this.kotor ? (Number(a?.amount || 0) / this.kotor) * 100 : 0;
      this.persen[i] = p;
      c.setValue(p ? String(Number(p.toFixed(4))) : '', { emitEvent: false });
    } else {
      c.setValue(a?.amount ? String(a.amount) : '', { emitEvent: false });
    }
    this.hitungUlangBaris(i);
  }

  /** Susun ulang nominal baris dari apa yang tersimpan di kontrolnya. */
  private hitungUlangBaris(i: number): void {
    const teks = (this.kontrolNominal(i).value ?? '').toString().trim();
    const angka = teks === '' ? 0 : Number(teks);
    const bersih = Number.isFinite(angka) ? angka : 0;

    if (this.modeNilai[i] === 'persen') {
      this.persen[i] = bersih;
      this.setBaris(i, { amount: (this.kotor * bersih) / 100 });
    } else {
      this.setBaris(i, { amount: bersih });
    }
  }

  /**
   * Hitung ulang SELURUH baris berpersen.
   *
   * Dipanggil saat volume berubah: dasar perkaliannya ikut berubah, dan
   * potongan yang tidak ikut dihitung ulang akan tetap memakai nilai kotor
   * yang sudah tidak berlaku — tepat pada layar tempat keputusannya diambil.
   */
  private hitungUlangSemuaPersen(): void {
    this.penyesuaian().forEach((_, i) => {
      if (this.modeNilai[i] === 'persen') this.hitungUlangBaris(i);
    });
  }

  // ---- baris yang sudah disentuh ---------------------------------------

  /**
   * Baris ditandai merah hanya setelah DISENTUH.
   *
   * Baris yang baru ditambahkan memang belum lengkap — itu bukan kesalahan,
   * itu keadaan awalnya. Menandainya merah seketika membuat layar terbaca
   * seolah sudah salah sebelum ada yang mengetik apa pun, dan warna merah
   * yang muncul tanpa sebab membuat merah yang sungguh berarti ikut
   * diabaikan.
   */
  private disentuh = new Set<number>();

  tampakSalah(i: number): boolean {
    if (!this.disentuh.has(i)) return false;
    const a = this.penyesuaian()[i];
    return a ? this.barisSalah(a) : false;
  }

  // ---- jenis, kategori, keterangan -------------------------------------

  gantiJenis(i: number, kind: 'deduction' | 'addition'): void {
    const kategori = kind === 'deduction' ? 'uang_muka' : 'biaya_luar_kontrak';
    this.setBaris(i, { kind, category: kategori });
    this.sesuaikanKategori(i, kategori);
  }

  gantiKategori(i: number, kategori: string): void {
    this.setBaris(i, { category: kategori });
    this.sesuaikanKategori(i, kategori);
  }

  /**
   * Ikutkan keterangan dan mode pada kategori yang baru dipilih.
   *
   * Sebelumnya keterangannya tinggal apa adanya: memilih "PPh" mengisinya
   * "PPh 23", lalu menukar kategorinya ke "Denda" meninggalkan baris denda
   * berketerangan "PPh 23" — dan itulah yang tercetak di lembar CoP.
   *
   * Yang diganti HANYA keterangan yang memang berasal dari saran; yang
   * diketik sendiri tidak disentuh. Orang yang menulis nomor surat dendanya
   * lalu membetulkan kategorinya tidak boleh kehilangan tulisannya.
   */
  private sesuaikanKategori(i: number, kategori: string): void {
    const c = this.kontrolLabel(i);
    const sekarang = (c.value || '').trim();
    const daftarSaran = this.semuaSaranLabel();
    if (!sekarang || daftarSaran.includes(sekarang)) {
      const saran = this.saranLabelKategori(kategori);
      c.setValue(saran || '', { emitEvent: false });
      this.setBaris(i, { label: saran || null });
    }

    this.modeNilai[i] = CertificateOfPaymentCheckComponent.modeBawaan(kategori);
    this.hitungUlangBaris(i);
  }

  /** Keterangan yang disarankan untuk sebuah kategori. */
  private saranLabelKategori(kategori: string): string | null {
    if (kategori === 'pph') return this.syarat?.pphCode || null;
    return null;
  }

  saranLabel(a: PenyesuaianCoP): string | null {
    return this.saranLabelKategori(a.category);
  }

  /** Seluruh keterangan yang pernah disarankan; dipakai membedakan ketikan. */
  private semuaSaranLabel(): string[] {
    return [this.syarat?.pphCode].filter(Boolean) as string[];
  }

  // ---- keterangan sebagai kontrol --------------------------------------

  private label: FormControl<string | null>[] = [];

  kontrolLabel(i: number): FormControl<string | null> {
    let c = this.label[i];
    if (!c) {
      c = new FormControl<string | null>(this.penyesuaian()[i]?.label ?? '');
      c.valueChanges.subscribe((v) => {
        this.disentuh.add(i);
        this.setBaris(i, { label: (v || '').trim() || null });
      });
      this.label[i] = c;
    }
    return c;
  }


  // ---- nominal penyesuaian ------------------------------------------

  /**
   * Satu FormControl per baris penyesuaian — BUKAN `[value]` + `(input)`.
   *
   * Alasannya sama dengan kotak volume: ngx-mask memformat lewat
   * ControlValueAccessor, dan `[value]` yang dipasang ulang tiap putaran
   * deteksi perubahan menimpa hasil formatnya seketika. Mask terpasang,
   * tetapi pemisah ribuannya tidak pernah terlihat.
   *
   * Sekaligus menghapus keharusan membongkar teks berformat sendiri:
   * kontrol menyimpan angka BERSIH ("1234567.89"), sehingga `Number()`
   * sudah cukup — tidak ada lagi tebakan apakah sebuah titik berarti
   * pemisah ribuan atau pemisah desimal.
   */
  private nominal: FormControl<string | null>[] = [];

  kontrolNominal(i: number): FormControl<string | null> {
    let c = this.nominal[i];
    if (!c) {
      const awal = this.penyesuaian()[i]?.amount;
      c = new FormControl<string | null>(awal ? String(awal) : '');
      // Nilainya TIDAK langsung menjadi nominal: bila modenya persen, yang
      // diketik adalah persentase dan nominalnya hasil kali. `hitungUlangBaris`
      // yang memutuskan — satu tempat, supaya kedua mode tidak berselisih.
      c.valueChanges.subscribe(() => {
        this.disentuh.add(i);
        this.hitungUlangBaris(i);
      });
      this.nominal[i] = c;
    }
    return c;
  }

  /**
   * Susun ulang kontrol nominal mengikuti daftar penyesuaian.
   *
   * Dipanggil setiap kali daftarnya berubah panjang. Barisnya dilacak
   * `$index`, sehingga menghapus baris ke-2 menggeser seluruh baris di
   * bawahnya — kontrol yang tidak ikut digeser akan menempel pada baris
   * yang salah, dan nominal berpindah ke kategori orang lain.
   */
  private susunKontrolNominal(): void {
    this.nominal = [];
    this.label = [];
    this.disentuh = new Set<number>();
    const daftar = this.penyesuaian();
    this.modeNilai = daftar.map((a) =>
      CertificateOfPaymentCheckComponent.modeBawaan(a.category),
    );
    this.persen = daftar.map((a) =>
      this.kotor ? (Number(a.amount || 0) / this.kotor) * 100 : 0,
    );
    daftar.forEach((a, i) => {
      const c = this.kontrolNominal(i);
      // Baris berpersen menampilkan PERSENNYA, bukan nominalnya — kalau
      // tidak, angka yang tampak dan satuan di sebelahnya tidak cocok.
      const tampil =
        this.modeNilai[i] === 'persen'
          ? this.persen[i]
            ? String(Number(this.persen[i].toFixed(4)))
            : ''
          : a.amount
            ? String(a.amount)
            : '';
      c.setValue(tampil, { emitEvent: false });
      this.kontrolLabel(i).setValue(a.label ?? '', { emitEvent: false });
    });
  }

  get potongan(): number {
    return this.penyesuaian()
      .filter((a) => a.kind === 'deduction')
      .reduce((t, a) => t + Number(a.amount || 0), 0);
  }

  get tambahan(): number {
    return this.penyesuaian()
      .filter((a) => a.kind === 'addition')
      .reduce((t, a) => t + Number(a.amount || 0), 0);
  }

  get bersih(): number {
    return this.kotor - this.potongan + this.tambahan;
  }

  get bersihNegatif(): boolean {
    return this.bersih < 0;
  }

  /**
   * Baris penyesuaian yang belum sah.
   *
   * Nol rupiah termasuk salah — bukan galat teknis, melainkan pernyataan
   * yang tidak berarti apa-apa. Yang memang tidak dipotong seharusnya tidak
   * punya barisnya sama sekali, dan tombol hapus ada di sebelahnya.
   */
  barisSalah(a: PenyesuaianCoP): boolean {
    if (!a.amount || Number(a.amount) <= 0) return true;
    if (a.category === 'lain_lain' && !(a.label || '').trim()) return true;
    return false;
  }

  get adaBarisSalah(): boolean {
    return this.penyesuaian().some((a) => this.barisSalah(a));
  }

  get bolehSimpan(): boolean {
    return (
      !this.menyimpan() &&
      this.periodeSah &&
      this.adaIsian &&
      !this.adaYangMelebihi &&
      !this.adaBarisSalah &&
      !this.bersihNegatif
    );
  }

  // ------------------------------------------------------------------
  // Simpan
  // ------------------------------------------------------------------

  private tanggalTeks(d: Date | null): string | null {
    if (!d) return null;
    // Disusun dari bagian LOKAL: `toISOString()` mengubahnya ke UTC lebih
    // dahulu, dan di WIB tanggal 1 pukul 00:00 tersimpan sebagai tanggal 30
    // bulan sebelumnya.
    const bulan = `${d.getMonth() + 1}`.padStart(2, '0');
    const hari = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${bulan}-${hari}`;
  }

  private susunItems(): BarisCoPInput[] {
    const isi = this.isian();
    const cat = this.catatanBaris();
    return this.baris()
      .filter((b) => {
        const v = isi[b.purchaseOrderItemID];
        return v !== null && v !== undefined && v > 0;
      })
      .map((b) => ({
        purchaseOrderItemID: b.purchaseOrderItemID,
        quantity: Number(isi[b.purchaseOrderItemID]),
        remarks: cat[b.purchaseOrderItemID] || null,
      }));
  }

  /**
   * Simpan seluruhnya, lalu bubuhkan tandanya.
   *
   * URUTANNYA DISENGAJA
   *
   * Isi disimpan LEBIH DAHULU, tanda diperiksa PALING AKHIR. Server menolak
   * menyunting dokumen yang sudah ditandai — urutan terbalik akan menolak
   * simpanannya sendiri. Dan bila salah satu langkah gagal, yang tertinggal
   * adalah dokumen yang tersimpan tetapi belum bertanda: keadaan yang dapat
   * diulang tanpa akibat, berbeda dengan bertanda tetapi belum tersimpan.
   */
  async simpan(): Promise<void> {
    if (!this.bolehSimpan) return;
    this.menyimpan.set(true);
    try {
      await firstValueFrom(
        this.service.ubah(this.copId, {
          date: this.tanggalTeks(this.tanggal.value) || undefined,
          periodStart: this.tanggalTeks(this.periodeAwal.value),
          periodEnd: this.tanggalTeks(this.periodeAkhir.value),
          note: this.catatan.value || null,
          items: this.susunItems(),
        }),
      );

      await firstValueFrom(
        this.service.simpanPenyesuaian(this.copId, this.penyesuaian()),
      );

      await firstValueFrom(this.service.periksa(this.copId, true));

      this.snackBar.open(
        this.translate.instant('cop.sudahDiperiksa'),
        this.translate.instant('common.close'),
        { duration: 3000 },
      );
      this.router.navigate(['/Certificate-of-payment/View', this.copId]);
    } catch (e) {
      this.pesan(e);
    } finally {
      this.menyimpan.set(false);
    }
  }

  batal(): void {
    this.router.navigate(['/Certificate-of-payment/View', this.copId]);
  }
}
