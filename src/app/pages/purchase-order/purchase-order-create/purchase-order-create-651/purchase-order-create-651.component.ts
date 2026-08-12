import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe } from '@ngx-translate/core';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import moment from 'moment';

import { ApiService } from 'src/app/services/api.service';
import { HeaderTitleComponent } from '../../../../components/header-title/header-title.component';
import { SupplierSelectorComponent } from '../../../../components/supplier-selector/supplier-selector.component';
import { PphSelectorComponent } from '../../../../components/pph-selector/pph-selector.component';
import { IPPh } from '../../../../utils/pph';
import { buildClauseLines } from '../../../../constants/clause-templates';
import { printPurchaseOrderB } from '../../../../helpers/purchase-order-b.helper';
import { printPurchaseOrderG } from '../../../../helpers/purchase-order-g.helper';

/**
 * 6.5.1 Biaya rekrutmen.
 *
 * Dua bentuk yang kewajiban bayarnya berbeda:
 *
 *   kuota   — sejumlah slot lowongan/tayang dibeli di muka lalu dipakai
 *             sampai habis; dokumennya surat pesanan (tata letak PO-G)
 *   peserta — pemeriksaan atas orang (psikotes, tes kesehatan), dibayar
 *             atas peserta yang benar-benar diperiksa; dokumennya SPK
 *
 * Jasa pencarian kandidat (headhunter) sengaja belum disediakan: bentuknya
 * berbasis hasil dan bergantung pada masa jaminan penggantian, yang tidak
 * dapat dirumuskan dengan tepat sebelum ada kontrak yang benar-benar
 * dijalankan.
 */
@Component({
  selector: 'app-purchase-order-create-651',
  standalone: true,
  providers: [provideNgxMask(), provideNativeDateAdapter()],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HeaderTitleComponent,
    TranslatePipe,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatDialogModule,
    MatSnackBarModule,
    NgxMaskDirective,
  ],
  templateUrl: './purchase-order-create-651.component.html',
  styleUrl: './purchase-order-create-651.component.scss',
})
export class PurchaseOrderCreate651Component {
  constructor(
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
  ) {}

  isSubmitting = false;
  readonly purchaseType = '6.5.1';

  /** null sampai bentuknya dipilih — dokumen dan klausulnya berbeda. */
  mode: 'kuota' | 'peserta' | null = null;

  get isKuota(): boolean {
    return this.mode === 'kuota';
  }

  units: string[] = ['slot', 'lowongan', 'tayang', 'hari', 'paket', 'LS'];

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    purchaseType: new FormControl('6.5.1'),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierAddress: new FormControl('', Validators.required),
    supplierNpwp: new FormControl(''),
    projectName: new FormControl('', Validators.required),

    paymentTerm: new FormControl('', Validators.required),
    creditTerm: new FormControl(0),
    prepaidTerm: new FormControl(0),

    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0),

    // Bentuk kuota
    quotaValidUntil: new FormControl(''),
    // Bentuk peserta
    resultDueDays: new FormControl(3, [Validators.min(0)]),
    participantCancelDays: new FormControl(1, [Validators.min(0)]),

    lines: new FormArray([]),
    additionalClauses: new FormArray([]),
    includePPN: new FormControl(true),
  });

  ngOnInit(): void {
    const routeType = this.route.snapshot.data['purchaseType'];
    if (routeType) {
      this.formGroup.patchValue({ purchaseType: routeType });
    }
  }

  /**
   * Bentuk dipilih di layar, bukan lewat dialog: dialog yang ditutup membuat
   * bentuknya tetap kosong tanpa jalan kembali selain memuat ulang halaman.
   */
  chooseMode(picked: 'kuota' | 'peserta') {
    if (picked === this.mode) return;
    this.mode = picked;
    this.t.clear(); // bentuk baris berbeda per mode
    this.addLine();
  }

  resetMode() {
    this.mode = null;
    this.t.clear();
  }

  // ---- baris ----
  get t(): FormArray {
    return this.formGroup.get('lines') as FormArray;
  }
  getFormGroupAt(i: number) {
    return this.t.at(i) as FormGroup;
  }

  addLine() {
    this.t.push(
      this.formBuilder.group({
        // kuota: nama paket/slot | peserta: jenis pemeriksaan
        task: ['', [Validators.required, Validators.maxLength(120)]],
        note: [''],
        quantity: [1, [Validators.required, Validators.min(0.01)]],
        unit: [this.isKuota ? 'slot' : 'peserta', Validators.required],
        price: [0, [Validators.required, Validators.min(0)]],
      }),
    );
  }

  removeLineAt(i: number) {
    this.t.removeAt(i);
  }

  lineTotal(i: number): number {
    const x = this.t.at(i).getRawValue();
    return (Number(x.quantity) || 0) * (Number(x.price) || 0);
  }

  get subTotal(): number {
    return this.t.controls.reduce((acc, _c, i) => acc + this.lineTotal(i), 0);
  }
  get ppnAmount(): number {
    return this.formGroup.get('includePPN')?.value ? this.subTotal * 0.11 : 0;
  }
  get grandTotal(): number {
    return this.subTotal + this.ppnAmount;
  }

  // ---- poin tambahan ----
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

  // ---- termin ----
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

  openSupplierSelector() {
    this.dialog
      .open(SupplierSelectorComponent, {})
      .afterClosed()
      .subscribe((data) => {
        if (!data) return;
        this.formGroup.patchValue({
          supplierID: data.id,
          supplierName: data.name,
          supplierAddress: data.address,
          // Diambil hanya bila terisi; vendor perorangan kerap belum
          // ber-NPWP, dan baris kosong pada dokumen resmi lebih mengganggu
          // daripada tidak ada barisnya.
          supplierNpwp: data.npwp || '',
        });
      });
  }

  openPphSelector() {
    this.dialog
      .open(PphSelectorComponent, {})
      .afterClosed()
      .subscribe((data: IPPh) => {
        if (!data) return;
        this.formGroup.patchValue({
          pphCode: data.code,
          pphTaxObject: data.taxObjectName,
          pphPercentage: data.tariff,
        });
      });
  }

  clearPph() {
    this.formGroup.patchValue({
      pphCode: '',
      pphTaxObject: '',
      pphPercentage: 0,
    });
  }

  /** Data sumber klausul; dipakai bersama pratinjau dan pencetakan. */
  private clauseContext() {
    const v = this.formGroup.getRawValue();
    return {
      paymentTerm: v.paymentTerm,
      creditTerm: v.creditTerm,
      prepaidTerm: v.prepaidTerm,
      pphCode: v.pphCode,
      pphTaxObject: v.pphTaxObject,
      pphPercentage: v.pphPercentage,
      recruitmentMode: this.mode ?? 'kuota',
      quotaValidUntil: this.tanggalPanjang(v.quotaValidUntil),
      resultDueDays: v.resultDueDays,
      participantCancelDays: v.participantCancelDays,
    };
  }

  /** Tanggal dalam penulisan panjang, mis. "1 September 2026". */
  private tanggalPanjang(nilai: any): string {
    if (!nilai) return '';
    const d = new Date(nilai);
    return isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
  }

  /**
   * Ketentuan baku yang akan tercetak, ditampilkan sejak awal.
   *
   * Dirakit dari template yang sama dengan pencetakan, sehingga yang terbaca
   * di layar tidak mungkin berbeda dari yang keluar di dokumen.
   */
  get clausePreview(): (string | string[])[] {
    return buildClauseLines(
      '6.5.1',
      this.clauseContext() as any,
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

  private formatData() {
    const v = this.formGroup.getRawValue();
    const dpp = this.subTotal;

    return {
      date: moment(v.date).format('YYYY-MM-DD'),
      supplierID: v.supplierID,
      purchaseType: '6.5.1',
      projectName: v.projectName,
      dpp: dpp,
      ppn: v.includePPN ? 11 : 0,
      pphCode: v.pphCode || null,
      pphTaxObject: v.pphTaxObject || null,
      pphPercentage: Number(v.pphPercentage) || 0,
      payment_term: v.paymentTerm,
      templateVersion: '1.0',
      items: this.t.controls.map((c) => {
        const x = c.getRawValue();
        return {
          task: x.task,
          quantity: x.unit === 'LS' ? 1 : x.quantity,
          price: x.price,
          unit: x.unit,
          remarks_1: x.note || null,
        };
      }),
      customData: {
        recruitmentMode: this.mode,
        paymentTerm: v.paymentTerm,
        creditTerm: v.creditTerm,
        prepaidTerm: v.prepaidTerm,
        pphCode: v.pphCode,
        pphTaxObject: v.pphTaxObject,
        pphPercentage: v.pphPercentage,
        // Tanggal disimpan dalam bentuk ISO; kalimatnya dirakit ulang saat
        // dokumen dicetak.
        quotaValidUntil: v.quotaValidUntil
          ? new Date(v.quotaValidUntil).toISOString().split('T')[0]
          : null,
        resultDueDays: v.resultDueDays,
        participantCancelDays: v.participantCancelDays,
        additionalClauses: this.additionalClauseValues,
      },
    };
  }

  /**
   * Susun data cetak.
   *
   * Kuota adalah pembelian slot, sehingga memakai tata letak surat pesanan
   * (PO-G). Pemeriksaan peserta adalah pemesanan jasa, sehingga memakai tata
   * letak Surat Perintah Kerja.
   */
  private buildPrintData(purchaseOrderName: string) {
    const v = this.formGroup.getRawValue();
    return {
      poType: '6.5.1',
      purchaseOrderName,
      date: v.date,
      projectName: v.projectName,
      supplierName: v.supplierName,
      supplierAddress: v.supplierAddress,
      supplierNpwp: v.supplierNpwp,
      items: this.t.controls.map((c) => {
        const x = c.getRawValue();
        return {
          name: x.task,
          remarks: x.note,
          quantity: x.unit === 'LS' ? 1 : Number(x.quantity) || 0,
          unit: x.unit,
          price: Number(x.price) || 0,
        };
      }),
      includePpn: !!v.includePPN,
      templateVersion: '1.0',
      clauseContext: this.clauseContext(),
      additionalClauses: this.additionalClauseValues,
    };
  }

  onSubmit() {
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
            const printData = this.buildPrintData(
              res?.purchase_order_name ?? '',
            );
            if (this.isKuota) {
              printPurchaseOrderG(printData);
            } else {
              printPurchaseOrderB(printData);
            }
          } catch (e) {
            console.error('Gagal membuat PDF purchase order:', e);
          }

          this.router.navigate(['/Purchase-order']);
        },
        error: (error) => {
          this.snackBar.open(
            error?.error?.detail || 'Gagal membuat purchase order',
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
