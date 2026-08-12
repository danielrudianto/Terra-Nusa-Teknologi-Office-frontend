import { CommonModule, DatePipe } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { PurchaseOrderViewComponent } from '../../purchase-order/purchase-order-view/purchase-order-view.component';
import { TranslatePipe } from '@ngx-translate/core';
import { Component, Inject, inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { provideNgxMask } from 'ngx-mask';
import { ApiService } from 'src/app/services/api.service';
import { PurchaseType } from '../../../utils/purchase-type';
import { MatIconModule } from '@angular/material/icon';
import { Clipboard } from '@angular/cdk/clipboard';
import { AvatarComponent } from '../../../components/avatar/avatar.component';
import { AuditTrailComponent } from '../../../components/audit-trail/audit-trail.component';

@Component({
  selector: 'app-purchase-view',
  imports: [
    AuditTrailComponent,
    AvatarComponent,
    MatStepperModule,
    MatInputModule,
    MatDialogModule,
    MatButtonModule,
    CommonModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatListModule,
    MatIconModule,
    TranslatePipe,
  ],
  providers: [provideNgxMask()],
  templateUrl: './purchase-view.component.html',
  styleUrl: './purchase-view.component.scss',
})
export class PurchaseViewComponent {
  private readonly translate = inject(TranslateService);

  /** Id purchase order yang cocok; kosong bila dokumennya belum ada. */
  purchaseOrderId: number | null = null;

  private readonly matDialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  /**
   * Buka dokumen purchase order asal pembelian ini.
   *
   * Nomor PO tersimpan sebagai teks, sehingga dokumennya belum tentu ada —
   * pembelian lama kerap mengacu pada nomor yang dicatat sebelum purchase
   * order dibuat di sistem.
   */
  viewPurchaseOrder() {
    if (!this.purchaseOrderId) {
      this.snack.open(
        'Dokumen purchase order belum tersedia di sistem',
        'Close',
        { duration: 3000 },
      );
      return;
    }
    this.matDialog.open(PurchaseOrderViewComponent, {
      data: { id: this.purchaseOrderId },
      width: '900px',
      maxWidth: '94vw',
      autoFocus: false,
    });
  }
  constructor(
    private apiService: ApiService,
    private dialog: MatDialogRef<PurchaseViewComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private formBuilder: FormBuilder,
    private datePipe: DatePipe,
    private clipboard: Clipboard,
  ) {}

  isLoading: boolean = true;

  /** raw purchase payload, kept for exact numeric calculations + copy */
  raw: any = null;

  metaFormGroup: FormGroup = new FormGroup({
    supplierName: new FormControl('', Validators.required),
    supplierAddress: new FormControl('', Validators.required),
    invoiceName: new FormControl('', Validators.required),
    receiptName: new FormControl(''),
    taxInvoiceName: new FormControl(''),
    purchaseOrderName: new FormControl('', [
      Validators.required,
      Validators.pattern(
        /^\d{3,4}-(PO|SPK|PKS)-[A-Z0-9]{4,5}-(A|B|C|D|E|F|G|H1|H2|5\.1\.1|5\.1\.2|5\.1\.6|5\.1\.7|6\.3\.1|6\.3\.2|5\.1\.12|6\.4\.1)$/,
      ),
    ]),
    purchaseType: new FormControl('', Validators.required),
    projectName: new FormControl('', Validators.required),
    lastStatus: new FormControl(''),
    date: new FormControl('', Validators.required),
    dueDate: new FormControl('', Validators.required),
    createdAt: new FormControl(''),
    isInternal: new FormControl('', Validators.required),
    dpp: new FormControl(''),
    ppn: new FormControl(''),
    ppnValue: new FormControl(''),
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(''),
    pph: new FormControl(''),
    pbbkb: new FormControl(''),
    otherValue: new FormControl(''),
    otherValueNote: new FormControl(''),
    total: new FormControl(''),
    paymentTotal: new FormControl(''),
    payments: new FormArray([]),
    paymentMethod: new FormControl(''),
    bankName: new FormControl(''),
    bankAccountNumber: new FormControl(''),
    bankAccountName: new FormControl(''),
  });

  /** Pembuat dokumen; dipakai untuk menampilkan avatar. */
  createdBy: number | null = null;
  createdByName = '';

  ngOnInit(): void {
    this.fetchData();
  }

  get f() {
    return this.metaFormGroup.controls;
  }

  get t(): FormArray {
    return this.f['payments'] as FormArray;
  }

  // ---- computed monetary values (exact, from raw) ----
  get vDpp(): number {
    return this.raw?.dpp || 0;
  }
  get vPpn(): number {
    return this.raw ? (this.raw.ppn * this.raw.dpp) / 100 : 0;
  }
  get vPph(): number {
    return this.raw ? (this.raw.pphPercentage * this.raw.dpp) / 100 : 0;
  }
  get vPbbkb(): number {
    return this.raw?.pbbkb || 0;
  }
  get vOther(): number {
    return this.raw?.otherValue || 0;
  }
  get vTotalInvoice(): number {
    return this.vDpp + this.vPpn + this.vPbbkb + this.vOther;
  }
  get vTotalPay(): number {
    return this.vDpp + this.vPpn - this.vPph + this.vPbbkb + this.vOther;
  }

  fetchData() {
    this.apiService.get('purchases/' + this.data.id, {}).subscribe({
      next: (response: any) => {
        const data = response.purchase;
        this.raw = data;
        this.createdBy = data.createdBy ?? null;
        this.createdByName = data.createdByName ?? '';
        this.purchaseOrderId = data.purchase_order_id ?? null;
        this.metaFormGroup.patchValue({
          date: this.datePipe.transform(data.date, 'dd MMMM yyyy'),
          dueDate: this.datePipe.transform(data.dueDate, 'dd MMMM yyyy'),
          createdAt: this.datePipe.transform(data.createdAt, 'dd MMMM yyyy'),
          invoiceName: data.invoiceName,
          receiptName: data.receiptName,
          taxInvoiceName: data.taxInvoiceName,
          projectName: data.projectName,
          supplierName: `${data.supplier.name}, ${data.supplier.prefix}`,
          supplierAddress: `${data.supplier.address}, ${data.supplier.city}, ${data.supplier.province}`,
          lastStatus: data.lastStatus,
          purchaseOrderName: data.purchaseOrderName,
          isInternal: data.isInternal ? 'Yes' : 'No',
          dpp: data.dpp,
          ppn: data.ppn,
          ppnValue: ((data.ppn * data.dpp) / 100).toFixed(2),
          pphCode: data.pphCode,
          pphTaxObject: data.pphTaxObject,
          pphPercentage: data.pphPercentage,
          pph: ((data.pphPercentage * data.dpp) / 100).toFixed(2),
          pbbkb: data.pbbkb,
          otherValue: data.otherValue,
          otherValueNote: data.otherValueNote,
          total: (
            data.dpp +
            (data.ppn * data.dpp) / 100 +
            data.pbbkb +
            data.otherValue
          ).toFixed(2),
          paymentTotal: (
            data.dpp +
            (data.ppn * data.dpp) / 100 -
            (data.pphPercentage * data.dpp) / 100 +
            data.pbbkb +
            data.otherValue
          ).toFixed(2),
          purchaseType: PurchaseType.getPurchaseType(data.purchaseType),
          paymentMethod: data.paymentMethod,
          bankName: data.bankName,
          bankAccountNumber: data.bankAccountNumber,
          bankAccountName: data.bankAccountName,
        });

        response.payments.forEach((x: any) => {
          this.t.push(
            this.formBuilder.group({
              id: [x.id],
              bankAccountName: [x.bankAccountName],
              bankAccountNumber: [x.bankAccountNumber],
              bankName: [x.bankName],
              amount: [x.amount],
              date: [x.date],
              isApprove: [x.isApprove],
            }),
          );
        });

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching purchase data:', error);
        this.isLoading = false;
        this.snackBar.open(
      this.translate.instant('notify.loadFailed'), 'Close', {
          duration: 3000,
        });
      },
    });
  }

  formatDate(date: string): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Date(date).toLocaleDateString('id-ID', options);
  }

  /** "[24-100-02] Sewa dan penghasilan lain ..." — empty when no PPh applies. */
  get pphLabel(): string {
    const code = this.metaFormGroup.get('pphCode')?.value;
    const name = this.metaFormGroup.get('pphTaxObject')?.value;
    if (!code && !name) return '';
    return `[${code || '-'}] ${name || ''}`.trim();
  }

  /** Copy the PPh object line on its own. */
  copyPphObject(): void {
    if (!this.pphLabel) return;
    this.clipboard.copy(this.pphLabel);
    this.snackBar.open(
      this.translate.instant('notify.copied'), 'Close', { duration: 3000 });
  }

  private rp(n: number): string {
    return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
  }

  /** Build a WhatsApp-friendly text summary and copy it to the clipboard. */
  copyDocument(): void {
    const f = this.metaFormGroup.value;
    const lines = [
      '*DATA PURCHASE*',
      f.supplierName || '-',
      '',
      `*Tanggal:* ${f.date || '-'}`,
      `*Invoice:* ${f.invoiceName || '-'}`,
      `*Faktur Pajak:* ${f.taxInvoiceName || '-'}`,
      `*Nomor PO:* ${f.purchaseOrderName || '-'}`,
      `*Project:* ${f.projectName || '-'}`,
      '',
      '*RINCIAN NILAI*',
      `DPP: ${this.rp(this.vDpp)}`,
      `PPN: ${this.rp(this.vPpn)}`,
      `PPh: -${this.rp(this.vPph)}`,
      ...(this.vPph && this.pphLabel ? [`Objek PPh: ${this.pphLabel}`] : []),
      `Other Value: ${this.rp(this.vOther)}`,
      '',
      `*Total Invoice:* ${this.rp(this.vTotalInvoice)}`,
      `*Total Harus Dibayar:* ${this.rp(this.vTotalPay)}`,
    ];
    this.clipboard.copy(lines.join('\n'));
    this.snackBar.open(
      this.translate.instant('notify.copied'),
      'Close',
      {
        duration: 3000,
      },
    );
  }

  deletePurchaseData() {
    this.dialog.close('delete');
  }

  copyBankAccountNumber() {
    this.clipboard.copy(this.metaFormGroup.get('bankAccountNumber')!.value);
    this.snackBar.open(
      this.translate.instant('notify.copied'), 'Close', {
      duration: 3000,
    });
  }
}
