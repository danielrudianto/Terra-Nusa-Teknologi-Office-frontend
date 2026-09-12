import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

import { KATEGORI_KETERANGAN } from 'src/app/constants/tender-keterangan.constant';
import { SupplierSelectorComponent } from 'src/app/components/supplier-selector/supplier-selector.component';
import { DialogGeserDirective } from 'src/app/directives/dialog-geser.directive';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-tender-quote-dialog',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    NgxMaskDirective,
    TranslateModule,
    DialogGeserDirective,
    MatSlideToggleModule,
  ],
  templateUrl: './tender-quote-dialog.component.html',
  styleUrl: './tender-quote-dialog.component.scss',
})
export class TenderQuoteDialogComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);

  formGroup: FormGroup = this.formBuilder.group({
    supplierID: [null, Validators.required],
    supplierName: [''],
    // Syarat yang DITAWARKAN pemasok; kerap berbeda dari yang diminta.
    paymentTerm: [''],
    creditTerm: [null],
    /*
     * Apakah pemasok memungut PPN.
     *
     * Menentukan BIAYA SEBENARNYA, bukan sekadar keterangan: PPN yang
     * dipungut PKP dapat dikreditkan sebagai pajak masukan, sehingga yang
     * benar-benar menjadi beban hanya DPP-nya.
     *
     * Akibatnya penawaran yang tampak lebih murah dapat justru lebih mahal —
     * Rp 105 tanpa PPN lebih mahal daripada Rp 100 + PPN.
     */
    includePpn: [false],
    ppnPercentage: [11],
    /*
     * Franco (diantar pemasok) atau Loco (diambil sendiri).
     *
     * Loco berarti AKN menanggung angkutnya — dan ongkos itu tidak pernah
     * muncul di surat penawaran mana pun. Penawaran Loco yang tampak lebih
     * murah karena itu dapat justru lebih mahal.
     */
    deliveryMethod: ['franco'],
    // Biaya lain yang DITANGGUNG AKN di luar harga barangnya.
    otherCost: [null],
    otherCostNote: [''],
    // Nomor pada surat penawaran PEMASOK; bukan nomor buatan sistem ini.
    quotationNumber: [''],
    /*
     * Keterangan pemasok, BERKATEGORI.
     *
     * Menggantikan satu kotak teks bebas. Dengan kategori, syarat pembayaran
     * seorang pemasok berada pada baris yang sama dengan syarat pembayaran
     * pemasok lain di tabel perbandingan — sebelumnya keduanya terkubur di
     * dalam paragraf masing-masing.
     */
    noteList: this.formBuilder.array([]),
    quotedAt: [new Date()],
    items: this.formBuilder.array([]),
  });

  readonly pilihanKategori = KATEGORI_KETERANGAN;

  readonly pilihanTermin = [
    { value: 'CASH', label: 'poForm.cash' },
    { value: 'COD', label: 'poForm.cod' },
    { value: 'CBD', label: 'poForm.cbd' },
    { value: 'PPD', label: 'poForm.prepaidOpt' },
    { value: 'CR', label: 'poForm.credit' },
    { value: 'CRD', label: 'poForm.creditPrepaid' },
  ];

  constructor(
    private dialogRef: MatDialogRef<TenderQuoteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public input: any,
  ) {}

  get t(): FormArray {
    return this.formGroup.get('items') as FormArray;
  }

  barisAt(i: number): FormGroup {
    return this.t.at(i) as FormGroup;
  }

  get k(): FormArray {
    return this.formGroup.get('noteList') as FormArray;
  }

  keteranganAt(i: number): FormGroup {
    return this.k.at(i) as FormGroup;
  }

  /** Contoh isi untuk kategori yang sedang dipilih pada satu baris. */
  contohKategori(i: number): string {
    const nilai = this.keteranganAt(i).get('category')?.value;
    return (
      this.pilihanKategori.find((x) => x.value === nilai)?.contoh ??
      'tender.katLainnyaContoh'
    );
  }

  tambahKeterangan(category: string = 'pembayaran', content = ''): void {
    this.k.push(
      this.formBuilder.group({
        category: [category],
        content: [content],
      }),
    );
  }

  hapusKeterangan(i: number): void {
    this.k.removeAt(i);
  }

  get isUbah(): boolean {
    return !!this.input?.quote?.id;
  }

  ngOnInit(): void {
    const barisTender = this.input?.items ?? [];
    const lama = this.input?.quote;

    /*
     * Satu baris formulir untuk SETIAP baris permintaan.
     *
     * Harga dibiarkan kosong; yang tidak ditawar pemasok memang tidak diisi,
     * dan barisnya tidak akan tersimpan. Menyediakan barisnya tetap perlu:
     * yang mencatat balasan membaca daftarnya sambil mencocokkan dengan
     * pesan WhatsApp, dan baris yang hilang membuat ia kehilangan urutan.
     */
    for (const b of barisTender) {
      const isi = (lama?.items ?? []).find(
        (x: any) => x.tenderItemID === b.id,
      );
      this.t.push(
        this.formBuilder.group({
          tenderItemID: [b.id],
          // Hanya untuk ditampilkan; tidak dikirim.
          _nama: [b.name],
          _spesifikasi: [b.specification ?? ''],
          _volume: [b.quantity ?? null],
          _satuan: [b.unit ?? ''],
          price: [isi?.price ?? null],
          notes: [isi?.notes ?? ''],
        }),
      );
    }

    if (lama) {
      this.formGroup.patchValue({
        supplierID: lama.supplierID,
        supplierName: lama.supplierName
          ? `${lama.supplierPrefix ?? ''} ${lama.supplierName}`.trim()
          : '',
        paymentTerm: lama.paymentTerm ?? '',
        creditTerm: lama.creditTerm ?? null,
        quotationNumber: lama.quotationNumber ?? '',
        includePpn: !!lama.includePpn,
        ppnPercentage: lama.ppnPercentage ?? 11,
        deliveryMethod: lama.deliveryMethod ?? 'franco',
        otherCost: lama.otherCost ?? null,
        otherCostNote: lama.otherCostNote ?? '',
        quotedAt: lama.quotedAt ? new Date(lama.quotedAt) : new Date(),
      });

      /*
       * Keterangan lama ikut terisi, termasuk yang belum berkategori.
       *
       * Server mengirimkan teks bebas dari penawaran lama sebagai satu
       * keterangan berkategori `lainnya`. Menyimpan kembali penawaran ini
       * akan memindahkannya ke tabel keterangan dan mengosongkan kolom
       * lamanya — jadi yang menyunting sekali saja sudah memilahnya, tanpa
       * perlu skrip pemindahan apa pun.
       */
      for (const k of lama.noteList ?? []) {
        this.tambahKeterangan(k.category, k.content ?? '');
      }
    }

    // Satu baris kosong supaya isiannya langsung terlihat dan tidak perlu
    // menemukan tombol tambah lebih dulu.
    if (!this.k.length) this.tambahKeterangan();
  }

  pilihPemasok(): void {
    this.dialog
      .open(SupplierSelectorComponent, {})
      .afterClosed()
      .subscribe((s: any) => {
        if (!s) return;
        this.formGroup.patchValue({
          supplierID: s.id,
          supplierName: `${s.prefix ?? ''} ${s.name}`.trim(),
        });
      });
  }

  /** Banyaknya baris yang benar-benar ditawar. */
  get jumlahDitawar(): number {
    return this.t.controls.filter(
      (c) => c.get('price')?.value !== null && c.get('price')?.value !== '',
    ).length;
  }

  get pakaiPpn(): boolean {
    return !!this.formGroup.get('includePpn')?.value;
  }

  /** Nilai PPN atas seluruh penawaran; nol bila pemasok bukan PKP. */
  get nilaiPpn(): number {
    if (!this.pakaiPpn) return 0;
    const tarif = Number(this.formGroup.get('ppnPercentage')?.value) || 0;
    return (this.total * tarif) / 100;
  }

  /** Yang benar-benar dibayarkan ke pemasok. */
  get totalDibayar(): number {
    return this.total + this.nilaiPpn;
  }

  /**
   * Biaya yang benar-benar ditanggung AKN.
   *
   * PPN yang dipungut PKP dikreditkan sebagai pajak masukan, sehingga yang
   * menjadi beban hanya DPP-nya. Pemasok non-PKP tidak memungut apa pun —
   * dan seluruh harganya menjadi biaya.
   *
   * Inilah angka yang layak dibandingkan antar penawaran, bukan yang
   * tertulis pada surat penawaran.
   */
  get isLoco(): boolean {
    return this.formGroup.get('deliveryMethod')?.value === 'loco';
  }

  /** Biaya lain yang ditanggung AKN; nol bila tidak diisi. */
  get biayaLain(): number {
    return Number(this.formGroup.get('otherCost')?.value) || 0;
  }

  get biayaSebenarnya(): number {
    // PPN dikreditkan sehingga tidak ikut; biaya lain TIDAK dapat
    // dikreditkan dan seluruhnya menjadi beban.
    return this.total + this.biayaLain;
  }

  /** Total penawaran, hanya dari baris yang ditawar dan bervolume. */
  get total(): number {
    return this.t.controls.reduce((a, c) => {
      const harga = Number(c.get('price')?.value) || 0;
      const vol = Number(c.get('_volume')?.value) || 0;
      // Baris tanpa volume tidak dapat dijumlahkan; harganya tetap tercatat
      // dan dibandingkan per satuan.
      return a + harga * vol;
    }, 0);
  }

  private tanggalIso(v: any): string | null {
    if (!v) return null;
    const t = v instanceof Date ? v : new Date(v);
    if (isNaN(t.getTime())) return null;
    const dd = (n: number) => String(n).padStart(2, '0');
    return `${t.getFullYear()}-${dd(t.getMonth() + 1)}-${dd(t.getDate())}`;
  }

  simpan(): void {
    if (this.formGroup.invalid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const v = this.formGroup.getRawValue();
    this.dialogRef.close({
      supplierID: v.supplierID,
      paymentTerm: v.paymentTerm || null,
      creditTerm: v.creditTerm ? Number(v.creditTerm) : null,
      deliveryMethod: v.deliveryMethod || null,
      otherCost: v.otherCost ? Number(v.otherCost) : null,
      otherCostNote: v.otherCostNote || null,
      includePpn: !!v.includePpn,
      // Tarif hanya dikirim bila memungut; menyimpannya pada pemasok non-PKP
      // membuat laporan kelak menghitung pajak yang tidak pernah ada.
      ppnPercentage: v.includePpn ? Number(v.ppnPercentage) || 11 : null,
      quotationNumber: (v.quotationNumber || '').trim() || null,
      /*
       * Keterangan kosong TIDAK dikirim.
       *
       * Barisnya ada di layar hanya karena ditambahkan lalu ditinggalkan;
       * mengirimnya membuat tabel perbandingan menumbuhkan baris kategori
       * yang seluruh selnya "—".
       */
      noteList: (v.noteList || [])
        .filter((x: any) => String(x?.content ?? '').trim())
        .map((x: any, i: number) => ({
          category: x.category,
          content: String(x.content).trim(),
          sortOrder: i,
        })),
      quotedAt: this.tanggalIso(v.quotedAt),
      items: (v.items || [])
        // Baris yang tidak ditawar TIDAK dikirim.
        //
        // Kosong berbeda dari nol: nol berarti digratiskan, kosong berarti
        // tidak ditawar — dan yang tidak menawar tidak boleh terhitung
        // sebagai penawaran termurah.
        .filter((x: any) => x.price !== null && x.price !== '')
        .map((x: any) => ({
          tenderItemID: x.tenderItemID,
          price: Number(x.price),
          notes: x.notes || null,
        })),
    });
  }

  batal(): void {
    this.dialogRef.close();
  }
}
