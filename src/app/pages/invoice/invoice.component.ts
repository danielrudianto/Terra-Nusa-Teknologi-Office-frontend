import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { TranslatePipe } from '@ngx-translate/core';
import { HeaderTitleComponent } from '../../components/header-title/header-title.component';
import { SupplierSelectorComponent } from '../../components/supplier-selector/supplier-selector.component';
import { IPPh, availablePPh } from '../../utils/pph';
import { IBank, banks } from '../../utils/bank';
import { printInvoiceDocument } from '../../helpers/invoice.helper';
import { buildPurchaseOrderDContent } from '../../helpers/purchase-order-d.helper';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ApiService } from '../../services/api.service';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * Kode PPh yang berlaku untuk invoice tenaga kerja.
 *
 * Dibatasi dua pilihan agar tidak salah pilih; nama objek dan tarifnya tetap
 * diambil dari katalog `availablePPh` supaya tidak ada dua sumber data.
 */
const INVOICE_PPH_CODES = ['21-100-35', '21-100-20'];

/** Angka bulan -> angka Romawi, dipakai pada penomoran dokumen. */
const ROMAN = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
];

@Component({
  selector: 'app-invoice',
  providers: [provideNativeDateAdapter(), provideNgxMask()],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatIconModule,
    MatCheckboxModule,
    MatAutocompleteModule,
    MatSelectModule,
    NgxMaskDirective,
    TranslatePipe,
    HeaderTitleComponent,
  ],
  templateUrl: './invoice.component.html',
  styleUrl: './invoice.component.scss',
})
export class InvoiceComponent {
  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private apiService: ApiService,
  ) {}

  isSubmitting = false;

  formGroup: FormGroup = new FormGroup({
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    projectCode: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[A-Z0-9]{3,6}$/),
    ]),
    // Teks bebas: lokasi proyek bisa di mana saja, daftar tetap justru
    // menghambat saat ada proyek di kota baru.
    city: new FormControl('Bandung', Validators.required),
    cutOffDate: new FormControl('', Validators.required),
    date: new FormControl('', Validators.required),
    bankAccountNumber: new FormControl('', Validators.required),
    bankAccountName: new FormControl('', Validators.required),
    bankName: new FormControl('', Validators.required),
    // Opsi pencatatan pembelian sekalian
    createPurchase: new FormControl(false),
    // Cukup diisi angka urutnya; nomor lengkapnya dirakit otomatis.
    purchaseOrderNumber: new FormControl(null, [Validators.min(1)]),
    // Kode & objek pajak diisi lewat pemilih PPh, sama seperti halaman
    // pembelian — supaya data yang tercatat seragam dan rekap PPh lengkap.
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0, [Validators.min(0), Validators.max(100)]),

    // Tiga mata pekerjaan baku; nilainya diisi per periode.
    items: new FormArray([
      InvoiceComponent.buildItem('Upah Harian', 'hari'),
      InvoiceComponent.buildItem('Lembur', 'jam'),
      InvoiceComponent.buildItem('Bonus', 'hari'),
      InvoiceComponent.buildItem('Insentif Bor', 'meter'),
    ]),
  });

  private static buildItem(name: string, unit: string): FormGroup {
    return new FormGroup({
      name: new FormControl(name, Validators.required),
      quantity: new FormControl(0, [Validators.required, Validators.min(0)]),
      unit: new FormControl(unit, Validators.required),
      price: new FormControl(0, [Validators.required, Validators.min(0)]),
    });
  }

  get items(): FormArray {
    return this.formGroup.get('items') as FormArray;
  }

  itemAt(i: number): FormGroup {
    return this.items.at(i) as FormGroup;
  }

  lineTotal(i: number): number {
    const v = this.itemAt(i).getRawValue();
    return (Number(v.quantity) || 0) * (Number(v.price) || 0);
  }

  get grandTotal(): number {
    return this.items.controls.reduce(
      (acc, _c, i) => acc + this.lineTotal(i),
      0,
    );
  }

  /** Upah tenaga kerja tidak dikenai PPN; DPP = nilai invoice apa adanya. */
  get pphValue(): number {
    const pct = Number(this.formGroup.get('pphPercentage')?.value) || 0;
    return (this.grandTotal * pct) / 100;
  }

  /** Nilai yang dibayarkan setelah PPh dipotong. */
  get netTotal(): number {
    return this.grandTotal - this.pphValue;
  }

  get willCreatePurchase(): boolean {
    return !!this.formGroup.get('createPurchase')?.value;
  }

  // --- supplier ------------------------------------------------------------
  openSupplierSelector() {
    this.dialog
      .open(SupplierSelectorComponent, {})
      .afterClosed()
      .subscribe((data: any) => {
        if (!data) return;
        this.formGroup.patchValue({
          supplierID: data.id,
          // Cukup nama orangnya. Prefix supplier (mis. "Pribadi") bukan
          // bagian dari nama dan janggal bila ikut tercetak di tanda tangan.
          supplierName: data.name,
        });
        this.applyFrequentBank(data.id);
      });
  }

  /**
   * Isi rekening dari pembayaran yang paling sering/terakhir dipakai
   * supplier ini — memakai endpoint yang sama dengan halaman pembelian,
   * sehingga riwayatnya konsisten dan berlaku lintas perangkat.
   */
  private applyFrequentBank(supplierID: number) {
    this.apiService
      .get(`purchases/frequent-payment/${supplierID}`, {})
      .subscribe({
        next: (data: any) => {
          if (!data) return;
          this.formGroup.patchValue({
            bankName: data.bankName ?? '',
            bankAccountName: data.bankAccountName ?? '',
            bankAccountNumber: data.bankAccountNumber ?? '',
          });
        },
        // Tidak ada riwayat bukan kondisi galat: rekening cukup diisi manual.
        error: () => {},
      });
  }

  /**
   * Nama bank dipilih dari daftar baku, bukan diketik bebas — supaya
   * penulisannya seragam pada seluruh dokumen dan rekap.
   */
  readonly bankOptions: IBank[] = banks;
  filteredBanks: IBank[] = banks;

  filterBanks(): void {
    const keyword = String(this.formGroup.get('bankName')?.value ?? '')
      .toLowerCase()
      .trim();

    // Kosong atau persis salah satu pilihan: tampilkan semua agar mudah
    // diganti.
    const exact = this.bankOptions.some(
      (b) => b.name.toLowerCase() === keyword,
    );
    if (!keyword || exact) {
      this.filteredBanks = this.bankOptions.slice();
      return;
    }

    this.filteredBanks = this.bankOptions.filter(
      (b) =>
        b.name.toLowerCase().includes(keyword) ||
        (b.alias ?? '').toLowerCase().includes(keyword),
    );
  }

  /** Dua kode PPh yang boleh dipakai pada invoice tenaga kerja. */
  readonly pphOptions: IPPh[] = INVOICE_PPH_CODES.map((code) =>
    availablePPh.find((p) => p.code === code),
  ).filter((p): p is IPPh => !!p);

  /** Tarif mengikuti kode terpilih, tidak diketik manual. */
  onPphSelected(code: string) {
    const pph = this.pphOptions.find((p) => p.code === code);
    this.formGroup.patchValue({
      pphTaxObject: pph?.taxObjectName ?? '',
      pphPercentage: pph?.tariff ?? 0,
    });
  }

  clearPph() {
    this.formGroup.patchValue({
      pphCode: '',
      pphTaxObject: '',
      pphPercentage: 0,
    });
  }

  // --- penomoran -----------------------------------------------------------
  /**
   * Format: [tgl cut-off 2 digit]-[id supplier 3 digit]-INV-[kode proyek]-
   * [bulan Romawi dari tanggal invoice]-[tahun].
   * Contoh: 05-021-INV-R501-VIII-2026
   */
  get invoiceNumber(): string {
    const v = this.formGroup.getRawValue();
    if (!v.cutOffDate || !v.date || !v.supplierID || !v.projectCode) return '—';

    const cut = new Date(v.cutOffDate);
    const inv = new Date(v.date);
    const dd = String(cut.getDate()).padStart(2, '0');
    const id = String(v.supplierID).padStart(3, '0');
    const bulan = ROMAN[inv.getMonth()];

    const nomor = `${dd}-${id}-INV-${v.projectCode}-${bulan}-${inv.getFullYear()}`;
    // Pekerjaan pengeboran ditandai (B) di akhir nomor.
    return this.adaInsentifBor ? `${nomor} (B)` : nomor;
  }

  /**
   * Keterangan pembayaran pada kuitansi.
   *
   * Bila Insentif Bor terisi, pekerjaannya adalah jasa operator pengeboran,
   * sehingga keterangannya disesuaikan agar sesuai dengan yang dibayarkan.
   */
  private get keteranganKuitansi(): string {
    return this.adaInsentifBor
      ? 'Upah jasa operator pengeboran'
      : 'Upah pekerjaan';
  }

  /**
   * Penanda pekerjaan pengeboran.
   *
   * Dipakai dua tempat — keterangan kuitansi dan akhiran nomor dokumen —
   * sehingga keduanya tidak mungkin berbeda.
   */
  private get adaInsentifBor(): boolean {
    return this.items.controls.some((c) => {
      const v = c.getRawValue();
      return v.name === 'Insentif Bor' && (Number(v.quantity) || 0) > 0;
    });
  }

  /** Keterangan periode pada kuitansi, berakhir di tanggal cut-off. */
  private get periodeText(): string {
    const v = this.formGroup.getRawValue();
    if (!v.cutOffDate) return '';
    const cut = new Date(v.cutOffDate);
    const bulan = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ][cut.getMonth()];
    return `s.d. ${cut.getDate()} ${bulan} ${cut.getFullYear()}`;
  }

  // --- cetak ---------------------------------------------------------------
  /**
   * Hanya membuat dokumen. Tidak menyimpan apa pun dan formulir dibiarkan
   * apa adanya, sehingga bisa dicetak ulang atau disesuaikan lagi.
   */

  /**
   * Nomor SPK lengkap dari angka urut yang diketik.
   *
   * Contoh: 1 + proyek MICZ  ->  001-SPK-MICZ-D
   */
  get purchaseOrderName(): string {
    const v = this.formGroup.getRawValue();
    const n = Number(v.purchaseOrderNumber) || 0;
    if (!n || !v.projectCode) return '';
    return `${String(n).padStart(3, '0')}-SPK-${String(
      v.projectCode,
    ).toUpperCase()}-D`;
  }

  /**
   * Cari SPK-nya di basis data, lalu lampirkan di belakang kuitansi.
   *
   * Pencarian gagal atau tidak ketemu tidak membatalkan pencetakan invoice —
   * dokumennya tetap keluar, hanya tanpa lampiran.
   */
  private fetchPurchaseOrder(): Observable<any | null> {
    const nama = this.purchaseOrderName;
    if (!nama) return of(null);
    return this.apiService
      .get('purchase-orders', { keyword: nama, page_size: 5 })
      .pipe(
        map((res: any) => {
          const list = res?.data ?? res?.items ?? [];
          return list.find((x: any) => x?.name === nama) ?? null;
        }),
        catchError(() => of(null)),
      );
  }

  print(output: 'open' | 'download' = 'open') {
    if (!this.readyToPrint()) return;
    this.generateDocument(output);
  }

  /**
   * Membuat dokumen sekaligus mencatat pembelian, lalu mengosongkan
   * formulir untuk invoice berikutnya.
   */
  save() {
    if (!this.readyToPrint()) return;

    const v = this.formGroup.getRawValue();
    if (!v.purchaseOrderName) {
      this.snackBar.open('Nomor PO belum diisi', 'Close', { duration: 3000 });
      return;
    }

    this.generateDocument('open');
    this.savePurchase();
  }

  private readyToPrint(): boolean {
    if (this.formGroup.invalid) {
      this.formGroup.markAllAsTouched();
      return false;
    }
    if (this.grandTotal <= 0) {
      this.snackBar.open(
        'Nilai invoice masih nol — isi volume dan harga satuannya.',
        'Close',
        { duration: 3000 },
      );
      return false;
    }
    return true;
  }

  /**
   * Cetak invoice; SPK dicari lebih dulu agar bisa dilampirkan.
   * Bila SPK tidak ketemu, invoice tetap dicetak tanpa lampiran.
   */

  /** Ubah data PO dari server menjadi bentuk yang dipahami helper PO-D. */
  private toPrintData(po: any) {
    const custom = po?.customData ?? {};
    return {
      purchaseOrderName: po?.name ?? '',
      date: po?.date,
      projectName: po?.projectName ?? '',
      // PO-D memakai istilah "worker", bukan "supplier".
      workerName: po?.supplierName ?? '',
      workerPrefix: po?.supplierPrefix ?? '',
      workerAddress: po?.supplierAddress ?? '',
      workerCity: po?.supplierCity ?? '',
      workerNpwp: po?.supplierNpwp ?? '',
      // PO-D mencatat komponen upah: label + nominal per satuan.
      items: (po?.items ?? []).map((it: any) => ({
        label: it.task || it.item_description || '',
        amount: Number(it.price) || 0,
        unit: it.unit ?? '',
      })),
      clauseContext: custom,
      templateVersion: po?.templateVersion ?? '1.0',
      additionalClauses: custom.additionalClauses ?? [],
    };
  }

  private generateDocument(output: 'open' | 'print' | 'download') {
    this.isFetchingPo = true;
    this.fetchPurchaseOrder().subscribe((po) => {
      this.isFetchingPo = false;
      if (this.purchaseOrderName && !po) {
        this.snackBar.open(
          `SPK ${this.purchaseOrderName} tidak ditemukan — invoice dicetak tanpa lampiran.`,
          'Close',
          { duration: 4000 },
        );
      }
      this.renderDocument(output, po);
    });
  }

  isFetchingPo = false;

  private renderDocument(
    output: 'open' | 'print' | 'download',
    po: any | null = null,
  ) {
    const v = this.formGroup.getRawValue();
    try {
      printInvoiceDocument(
        {
          invoiceNumber: this.invoiceNumber,
          city: v.city,
          date: v.date,
          supplierName: v.supplierName,
          // baris tanpa nilai tidak perlu ikut tercetak
          attachment: po
            ? buildPurchaseOrderDContent(this.toPrintData(po))
            : undefined,
          items: this.items.controls
            .map((c) => c.getRawValue())
            .filter((x) => (Number(x.quantity) || 0) > 0)
            .map((x) => ({
              name: x.name,
              quantity: Number(x.quantity) || 0,
              unit: x.unit,
              price: Number(x.price) || 0,
            })),
          bankAccountNumber: v.bankAccountNumber,
          bankAccountName: v.bankAccountName,
          bankName: v.bankName,
          keterangan: this.keteranganKuitansi,
          periode: this.periodeText,
        },
        output,
      );
    } catch (e) {
      console.error('Gagal membuat dokumen invoice:', e);
      this.snackBar.open('Gagal membuat dokumen invoice', 'Close', {
        duration: 3000,
      });
    }
  }

  /** Kosongkan isian nilai; identitas proyek & supplier dipertahankan. */
  private resetForm() {
    this.items.controls.forEach((c) => c.patchValue({ quantity: 0, price: 0 }));
    this.formGroup.patchValue({
      purchaseOrderName: '',
      pphCode: '',
      pphTaxObject: '',
      pphPercentage: 0,
    });
    this.formGroup.markAsPristine();
    this.formGroup.markAsUntouched();
  }

  private savePurchase() {
    const v = this.formGroup.getRawValue();
    if (!v.purchaseOrderName) {
      this.snackBar.open('Nomor PO belum diisi', 'Close', { duration: 3000 });
      return;
    }

    const toISO = (d: any) =>
      d ? new Date(d).toISOString().split('T')[0] : null;

    this.isSubmitting = true;
    this.apiService
      .post('purchases', {
        procurementType: 'D',
        invoiceName: this.invoiceNumber,
        // kuitansi memakai nomor yang sama dengan invoice
        receiptName: this.invoiceNumber,
        taxInvoiceName: null,
        supplierID: v.supplierID,
        supplierName: v.supplierName,
        supplierAddress: '',
        date: toISO(v.date),
        dueDate: toISO(v.date),
        purchaseOrderName: v.purchaseOrderName,
        projectName: v.projectCode,
        purchaseType: 'D',
        isInternal: false,
        // upah tenaga kerja: tanpa PPN dan tanpa PBBKB
        dpp: this.grandTotal,
        ppn: 0,
        ppnValue: 0,
        pbbkb: 0,
        pphCode: v.pphCode,
        pphTaxObject: v.pphTaxObject,
        pphPercentage: Number(v.pphPercentage) || 0,
        pphValue: this.pphValue,
        otherValue: 0,
        otherValueNote: '',
        total: this.netTotal,
        isInvoiceAttached: true,
        isReceiptAttached: true,
        isTaxInvoiceAttached: false,
        isCopAttached: false,
        isCopyPurchaseOrderAttached: true,
        bankName: v.bankName,
        bankAccountName: v.bankAccountName,
        bankAccountNumber: v.bankAccountNumber,
        paymentMethod: 'Transfer',
        lastStatus: 'ready',
        lastStatusDescription: null,
      })
      .subscribe({
        next: () => {
          this.snackBar.open('Invoice dibuat dan pembelian tercatat', 'Close', {
            duration: 3000,
          });
          // Hanya direset bila pencatatan berhasil, agar data tidak hilang
          // saat penyimpanan gagal dan perlu dicoba lagi.
          this.resetForm();
        },
        error: (error: any) => {
          this.snackBar.open(
            error?.error?.detail ??
              'Dokumen berhasil dibuat, tetapi pembelian gagal dicatat',
            'Close',
            { duration: 5000 },
          );
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
