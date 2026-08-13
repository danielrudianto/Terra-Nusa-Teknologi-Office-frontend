import { Component, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ClauseLineComponent } from '../../../../components/clause-line/clause-line.component';
import { PurchaseOrderTypeSwitcher } from '../../../../services/purchase-order-type-switcher.service';
import { PURCHASE_TYPE_LABELS } from '../../../../constants/purchase-type-label.constant';
import { buildClauseLines } from '../../../../constants/clause-templates';
import { printPurchaseOrderG } from '../../../../helpers/purchase-order-g.helper';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SupplierSelectorComponent } from '../../../../components/supplier-selector/supplier-selector.component';
import { MasterItemSelectorComponent } from '../../../../components/master-item-selector/master-item-selector.component';
import { MatButtonModule } from '@angular/material/button';
import { HeaderTitleComponent } from '../../../../components/header-title/header-title.component';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiService } from '../../../../services/api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { tanggalLokal } from '../../../../utils/tanggal';
import { PoPreviewDialogComponent } from '../../../../components/po-preview-dialog/po-preview-dialog.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-purchase-order-create-511',
  providers: [provideNgxMask()],
  imports: [
    ClauseLineComponent,
    TranslatePipe,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    HeaderTitleComponent,
    MatSlideToggleModule,
    NgxMaskDirective,
  ],
  templateUrl: './purchase-order-create-511.component.html',
  styleUrl: './purchase-order-create-511.component.scss',
})
export class PurchaseOrderCreate511Component {
  private readonly translate = inject(TranslateService);

  /**
   * Satuan berubah pada satu baris.
   *
   * Untuk satuan borongan (LS), volumenya dikunci pada 1. Nilainya memang
   * selalu dihitung satu saat menjumlahkan, sehingga membiarkan kolomnya
   * dapat diisi berarti menawarkan angka yang diabaikan diam-diam — dan yang
   * mengisinya baru sadar setelah totalnya tidak sesuai harapan.
   */
  onUnitChange(i: number): void {
    const g = this.getFormGroupAt(i);
    const qty = g.get('quantity');
    if (String(g.get('unit')?.value || '').toUpperCase() === 'LS') {
      qty?.setValue(1);
      qty?.disable();
    } else {
      qty?.enable();
    }
  }

  // ---- termin pembayaran ----
  //
  // Kolom kredit dan uang muka dikunci bila terminnya tidak memakainya:
  // angka yang tertinggal di sana ikut tersimpan dan tercetak, padahal
  // ketentuannya tidak menyebut tempo sama sekali.
  private readonly CREDIT_TERMS = ['PPD', 'CR', 'CRD'];
  private readonly PREPAID_TERMS = ['PPD', 'CRD'];

  get creditEnabled(): boolean {
    return this.CREDIT_TERMS.includes(this.formGroup.get('paymentTerm')?.value);
  }
  get prepaidEnabled(): boolean {
    return this.PREPAID_TERMS.includes(
      this.formGroup.get('paymentTerm')?.value,
    );
  }

  onPaymentTermChange(): void {
    const credit = this.formGroup.get('creditTerm');
    const prepaid = this.formGroup.get('prepaidTerm');

    if (this.creditEnabled) credit?.enable();
    else {
      credit?.setValue(0);
      credit?.disable();
    }

    if (this.prepaidEnabled) prepaid?.enable();
    else {
      prepaid?.setValue(0);
      prepaid?.disable();
    }
  }
  /** Kode jenis PO, dipakai pada pill di kepala halaman. */
  get typeCode(): string {
    return '5.1.1';
  }

  /** Nama jenis PO, dipakai pada pill di kepala halaman. */
  get typeLabel(): string {
    return PURCHASE_TYPE_LABELS['5.1.1'] || '';
  }

  private readonly typeSwitcher = inject(PurchaseOrderTypeSwitcher);

  /** Buka pemilih jenis PO; isian yang sudah ada dikonfirmasi lebih dulu. */
  onChangeType() {
    this.typeSwitcher.open(this.formGroup?.dirty === true);
  }
  constructor(
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  isSubmitting: boolean = false;

  units: string[] = [
    'pcs',
    'set',
    'Kg',
    'gram',
    'ton',
    'm',
    'm2',
    'm3',
    'batang',
    'lembar',
    'roll',
    'dus',
    'sak',
    'pasang',
    'lusin',
    'unit',
    'liter',
    'box',
    'kaleng',
  ];

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    purchaseType: new FormControl('5.1.1'),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierAddress: new FormControl('', Validators.required),
    supplierNpwp: new FormControl(''),
    /*
     * Pengeluaran ini selalu dibebankan ke PUSAT, tidak pernah ke proyek.
     *
     * Nilainya dikunci, bukan sekadar diisikan sebagai bawaan: bila masih
     * dapat diubah, cepat atau lambat ada yang membebankannya ke kode proyek
     * — dan biaya yang salah pos baru ketahuan saat laporan per proyek
     * dibaca, ketika dokumennya sudah lama tersimpan.
     */
    projectName: new FormControl({ value: 'PUSAT', disabled: true }, [
      Validators.required,
    ]),
    deliveryMethod: new FormControl('', Validators.required),
    deliveryAddress: new FormControl('', Validators.required),
    paymentTerm: new FormControl('', Validators.required),
    creditTerm: new FormControl(0, Validators.required),
    prepaidTerm: new FormControl(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
    ]),
    supplierPICName: new FormControl('', Validators.required),
    supplierPICPhoneNumber: new FormControl('', Validators.required),
    officePICName: new FormControl('', Validators.required),
    officePICPhoneNumber: new FormControl('', Validators.required),
    // items are picked from the master-item catalog (type G)
    purchase_order: new FormArray([]),
    // Poin tambahan bebas, dicetak setelah ketentuan baku. Disimpan sebagai
    // daftar agar tiap poin dapat dinomori dan dirakit ulang saat dicetak.
    additionalClauses: new FormArray([]),
    includePPN: new FormControl(true),
  });

  get f() {
    return this.formGroup.controls;
  }

  get t() {
    return this.formGroup.get('purchase_order') as FormArray;
  }

  getFormGroupAt(i: number) {
    return this.t.at(i) as FormGroup;
  }

  removeAt(i: number) {
    this.t.removeAt(i);
  }

  private buildItemGroup(item: any): FormGroup {
    return this.formBuilder.group({
      item_id: [item.id, Validators.required],
      sku: [item.sku],
      description: [item.description],
      unit: [item.unit || '', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      price: [0, [Validators.required, Validators.min(0)]],
      remarks: [''],
    });
  }

  openItemSelector() {
    this.dialog
      .open(MasterItemSelectorComponent, {
        data: { purchaseType: '5.1.1' },
        width: '560px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((item) => {
        if (!item) return;
        // prevent adding the exact same catalog item twice
        const exists = this.t.value.some((x: any) => x.item_id === item.id);
        if (exists) {
          this.snackBar.open(
      this.translate.instant('notify.alreadyInList'), 'Close', {
            duration: 2500,
          });
          return;
        }
        this.t.push(this.buildItemGroup(item));
      });
  }

  // ----- live summary (read-only, safe getters) -----
  get rawTotal(): number {
    return this.t.value.reduce(
      (acc: number, x: any) =>
        acc + (Number(x.price) || 0) * (Number(x.quantity) || 0),
      0,
    );
  }

  get subTotal(): number {
    // Harga yang diisi user adalah DPP; PPN ditambahkan di atasnya.
    return this.rawTotal;
  }

  get ppnAmount(): number {
    return this.formGroup.get('includePPN')?.value ? this.rawTotal * 0.11 : 0;
  }

  get grandTotal(): number {
    return this.subTotal + this.ppnAmount;
  }

  get lineTotal(): (i: number) => number {
    return (i: number) => {
      const g = this.getFormGroupAt(i).value;
      return (Number(g.price) || 0) * (Number(g.quantity) || 0);
    };
  }

  openSupplierSelector() {
    this.dialog
      .open(SupplierSelectorComponent, {})
      .afterClosed()
      .subscribe((data) => {
        if (data) {
          this.formGroup.patchValue({
            supplierID: data.id,
            supplierName: data.name,
            supplierAddress: data.address,
            // Diambil hanya bila terisi; vendor perorangan kerap
            // belum ber-NPWP, dan baris kosong pada dokumen resmi
            // lebih mengganggu daripada tidak ada barisnya.
            supplierNpwp: data.npwp || '',
          });
        }
      });
  }

  formatData() {
    const dpp = this.t.value.reduce(
      (acc: any, x: any) =>
        acc + (Number(x.price) || 0) * (Number(x.quantity) || 0),
      0,
    );
    const ppn = this.formGroup.get('includePPN')?.value ? 11 : 0;
    const projectCode = this.formGroup.get('projectName')?.value;
    return {
      date: tanggalLokal(this.formGroup.get('date')?.value),
      supplierID: this.formGroup.get('supplierID')?.value,
      purchaseType: this.formGroup.get('purchaseType')?.value,
      projectName: projectCode,
      projectCode: projectCode,
      name: '',
      dpp: dpp,
      ppn: ppn,
      payment_term: this.formGroup.get('paymentTerm')?.value,
      templateVersion: '1.0',
      billing_requirements: {},
      // Baris item PO. Tanpa ini `purchase_order_items` tidak pernah terisi,
      // sehingga dokumen yang dicetak ulang kehilangan seluruh daftar barang.
      items: this.t.controls.map((c) => {
        const x = c.getRawValue();
        return {
          item_id: x.item_id,
          // Nama barang tidak disalin: sudah tersimpan di
          // master_item dan diambil lewat item_id saat dibaca.
          // Menyalinnya berarti dokumen menyimpan nama yang bisa
          // berbeda dari katalognya, dan nama panjang melampaui
          // batas kolomnya.
          task: null,
          quantity: x.unit === 'LS' ? 1 : x.quantity,
          price: x.price,
          unit: x.unit,
          remarks_1: x.remarks,
          // SKU tidak disalin ke sini: sudah tersimpan di master_item
          // dan ikut terbaca lewat item_id saat PO dibuka kembali.
        };
      }),
      customData: {
        deliveryMethod: this.formGroup.get('deliveryMethod')?.value,
        deliveryAddress: this.formGroup.get('deliveryAddress')?.value,
        paymentTerm: this.formGroup.get('paymentTerm')?.value,
        creditTerm: this.formGroup.get('creditTerm')?.value,
        prepaidTerm: this.formGroup.get('prepaidTerm')?.value,
        supplierPICName: this.formGroup.get('supplierPICName')?.value,
        supplierPICPhoneNumber: this.formGroup.get('supplierPICPhoneNumber')
          ?.value,
        officePICName: this.formGroup.get('officePICName')?.value,
        officePICPhoneNumber: this.formGroup.get('officePICPhoneNumber')?.value,
        additionalClauses: this.additionalClauseValues,
      },
    };
  }

  get additionalClauses(): FormArray {
    return this.formGroup.get('additionalClauses') as FormArray;
  }

  get additionalClauseValues(): string[] {
    return (this.additionalClauses.value as string[])
      .map((x) => (x || '').trim())
      .filter((x) => x.length > 0);
  }

  addClause() {
    this.additionalClauses.push(new FormControl(''));
  }

  removeClause(i: number) {
    this.additionalClauses.removeAt(i);
  }

  /** Data sumber klausul; dipakai bersama pratinjau dan pencetakan. */
  private clauseContext() {
    const v = this.formGroup.getRawValue();
    return {
      paymentTerm: v.paymentTerm,
      creditTerm: v.creditTerm,
      prepaidTerm: v.prepaidTerm,
      deliveryMethod: v.deliveryMethod,
      deliveryAddress: v.deliveryAddress,
      supplierPICName: v.supplierPICName,
      supplierPICPhoneNumber: v.supplierPICPhoneNumber,
      officePICName: v.officePICName,
      officePICPhoneNumber: v.officePICPhoneNumber,
    };
  }

  /**
   * Ketentuan baku yang akan tercetak, ditampilkan sejak awal.
   *
   * Dirakit dari template yang sama dengan pencetakan, sehingga yang terbaca
   * di layar tidak mungkin berbeda dari yang keluar di dokumen.
   */
  get clausePreview(): (string | string[])[] {
    return buildClauseLines(
      '5.1.1',
      this.clauseContext(),
      '1.0',
      this.additionalClauseValues,
    );
  }

  isSubList(x: string | string[]): boolean {
    return Array.isArray(x);
  }
  asList(x: string | string[]): string[] {
    return Array.isArray(x) ? x : [];
  }
  asText(x: string | string[]): string {
    return Array.isArray(x) ? '' : String(x ?? '');
  }

  /**
   * Susun data cetak.
   *
   * Pembelian aset adalah pembelian barang biasa, sehingga memakai tata
   * letak dokumen yang sama dengan PO G — seperti 5.1.6.
   */
  private buildPrintData(purchaseOrderName: string) {
    const v = this.formGroup.getRawValue();
    return {
      poType: '5.1.1',
      purchaseOrderName,
      date: v.date,
      projectName: v.projectName,
      supplierName: v.supplierName,
      supplierPrefix: v.supplierPrefix,
      supplierAddress: v.supplierAddress,
      supplierNpwp: v.supplierNpwp,
      supplierCity: v.supplierCity,
      items: this.t.controls.map((c) => {
        const x = c.getRawValue();
        return {
          name: x.description || x.sku || '',
          quantity: x.unit === 'LS' ? 1 : Number(x.quantity) || 0,
          unit: x.unit,
          price: Number(x.price) || 0,
          remarks: x.remarks,
        };
      }),
      includePpn: !!v.includePPN,
      templateVersion: '1.0',
      clauseContext: this.clauseContext(),
      additionalClauses: this.additionalClauseValues,
    };
  }

  /**
   * Buka pratinjau dokumen tanpa menyimpan apa pun.
   *
   * Memakai penyusun data dan helper cetak YANG SAMA dengan penyimpanan,
   * sehingga yang dilihat di layar benar-benar dokumen yang nanti terbit —
   * bukan tiruan yang bisa menyimpang sendiri.
   *
   * Nomor PO belum ada karena diberikan server saat penyimpanan; sebagai
   * gantinya dokumen ditandai sebagai draf, supaya tidak ada yang menyimpan
   * berkas ini lalu mengiranya SPK yang sah.
   */
  /**
   * Buka pratinjau dokumen di dalam dialog, tanpa menyimpan apa pun.
   *
   * Memakai penyusun data dan helper cetak YANG SAMA dengan penyimpanan,
   * sehingga yang dilihat benar-benar dokumen yang nanti terbit — bukan
   * tiruan yang bisa menyimpang sendiri.
   */
  async pratinjau(): Promise<void> {
    const src = await this.dokumenPratinjau();
    if (!src) return;
    this.dialog.open(PoPreviewDialogComponent, {
      data: { src },
      maxWidth: '96vw',
      autoFocus: false,
    });
  }

  /**
   * Susun dokumen sebagai data URL.
   *
   * Nomor PO belum ada karena diberikan server saat penyimpanan; sebagai
   * gantinya dokumen ditandai draf, supaya tidak ada yang menyimpan berkas
   * ini lalu mengiranya SPK yang sah.
   */
  private async dokumenPratinjau(): Promise<string | null> {
    try {
      return (await printPurchaseOrderG(
        this.buildPrintData('(DRAF — BELUM TERBIT)'),
        'dataurl',
      )) as string;
    } catch (e) {
      console.error('Gagal menyusun pratinjau purchase order:', e);
      this.snackBar.open('Gagal membuat pratinjau dokumen', 'Close', {
        duration: 3000,
      });
      return null;
    }
  }

  /**
   * Tampilkan dokumennya lebih dulu, terbitkan setelah dinyatakan terbaca.
   *
   * SPK mengikat kedua pihak dan tidak dapat diubah setelah terbit —
   * nomornya sudah terpakai dan salinannya sudah beredar. Menampilkan
   * dokumen jadi pada langkah terakhir memindahkan koreksi ke saat masih
   * murah: sebelum dokumennya ada.
   *
   * Gagal menyusun dokumen TIDAK meloloskan penerbitan. Melewatinya berarti
   * PO terbit tanpa seorang pun pernah melihat isinya.
   */
  async onSubmit(): Promise<void> {
    const src = await this.dokumenPratinjau();
    if (!src) return;

    const setuju = await firstValueFrom(
      this.dialog
        .open(PoPreviewDialogComponent, {
          data: { src, konfirmasi: true },
          maxWidth: '96vw',
          autoFocus: false,
          disableClose: true,
        })
        .afterClosed(),
    );
    if (setuju) this.terbitkan();
  }

  /** Kirim ke server; dipanggil setelah dokumennya dikonfirmasi. */
  private terbitkan() {
    this.isSubmitting = true;
    this.apiService
      .post('purchase-orders', this.formatData())
      .subscribe({
        next: (res: any) => {
          this.snackBar.open(
            `Purchase order ${res?.purchase_order_name ?? ''} berhasil dibuat`,
            'Close',
            { duration: 3000 },
          );
          // Buka PDF-nya; gagal cetak tidak membatalkan PO yang tersimpan.
          try {
            printPurchaseOrderG(
              this.buildPrintData(res?.purchase_order_name ?? ''),
            );
          } catch (e) {
            console.error('Gagal membuat PDF purchase order:', e);
          }

          this.router.navigate(['/Purchase-order']);
        },
        error: (error) => {
          this.snackBar.open(
            error?.error?.detail ?? 'Gagal membuat purchase order',
            'Close',
            { duration: 3000 },
          );
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

}
