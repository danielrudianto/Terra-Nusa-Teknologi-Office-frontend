import { CommonModule, DatePipe } from '@angular/common';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { TranslateService } from '@ngx-translate/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Component, Inject, inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { provideNgxMask } from 'ngx-mask';
import { ApiService } from 'src/app/services/api.service';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { AuditTrailComponent } from '../../../components/audit-trail/audit-trail.component';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';

@Component({
  selector: 'app-sales-invoice-view',
  providers: [provideNgxMask()],
  imports: [
    AuditTrailComponent,
    TranslatePipe,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatSnackBarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    DialogGeserDirective,
  ],
  templateUrl: './sales-invoice-view.component.html',
  styleUrl: './sales-invoice-view.component.scss',
})
export class SalesInvoiceViewComponent {
  private readonly serverMessage = inject(ServerMessageService);
  private readonly translate = inject(TranslateService);
  path: any;
  constructor(
    private apiService: ApiService,
    private dialog: MatDialogRef<SalesInvoiceViewComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private datePipe: DatePipe,
    private formBuilder: FormBuilder,
    private clipboard: Clipboard,
  ) {}

  formGroup: FormGroup = new FormGroup({
    date: new FormControl(''),
    createdAt: new FormControl(''),
    name: new FormControl(''),
    projectName: new FormControl(''),
    clientName: new FormControl(''),
    clientAddress: new FormControl(''),
    clientNPWP: new FormControl(''),
    description: new FormControl(''),
    spkNumber: new FormControl(''),
    dpp: new FormControl(0),
    ppn: new FormControl(0),
    bpjs: new FormControl(0),
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0),
    pphValue: new FormControl(0),
    taxInvoiceName: new FormControl(''),
    incomeTaxInvoiceName: new FormControl(''),
    taxingStatus: new FormControl(''),
    total: new FormControl(0),
    totalPayment: new FormControl(0),
    payments: new FormArray([]),
  });

  get f() {
    return this.formGroup.controls;
  }

  get t() {
    return this.f['payments'] as FormArray;
  }

  // ---- computed monetary values ----
  get vDpp(): number {
    return this.formGroup.get('dpp')?.value || 0;
  }
  get vPpn(): number {
    const ppn = this.formGroup.get('ppn')?.value || 0;
    return (ppn * this.vDpp) / 100;
  }
  get vBpjs(): number {
    return this.formGroup.get('bpjs')?.value || 0;
  }
  get vPph(): number {
    const pct = this.formGroup.get('pphPercentage')?.value || 0;
    return (pct * this.vDpp) / 100;
  }
  get vTotalInvoice(): number {
    return this.formGroup.get('total')?.value || 0;
  }
  get vTotalPayment(): number {
    return this.formGroup.get('totalPayment')?.value || 0;
  }

  /** Total already received from payments. */
  get vPaid(): number {
    return this.t.controls.reduce(
      (sum, p) => sum + (Number(p.get('amount')?.value) || 0),
      0,
    );
  }

  get vOutstanding(): number {
    return this.vTotalPayment - this.vPaid;
  }

  /** "[24-100-02] Sewa dan penghasilan lain ..." — empty when no PPh applies. */
  get pphLabel(): string {
    const code = this.formGroup.get('pphCode')?.value;
    const name = this.formGroup.get('pphTaxObject')?.value;
    if (!code && !name) return '';
    return `[${code || '-'}] ${name || ''}`.trim();
  }

  copyPphObject(): void {
    if (!this.pphLabel) return;
    this.clipboard.copy(this.pphLabel);
    this.snackBar.open(
      this.translate.instant('notify.copied'), 'Close', { duration: 3000 });
  }

  formatDate(date: string): string {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  private rp(n: number): string {
    return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
  }

  /** Build a WhatsApp-friendly summary and copy it to the clipboard. */
  copyDocument(): void {
    const f = this.formGroup.value;
    const lines = [
      '*SALES INVOICE*',
      f.name || '-',
      '',
      `*Tanggal:* ${f.date || '-'}`,
      `*Klien:* ${f.clientName || '-'}`,
      `*Project:* ${f.projectName || '-'}`,
      `*No. SPK:* ${f.spkNumber || '-'}`,
      `*Deskripsi:* ${f.description || '-'}`,
      '',
      '*RINCIAN NILAI*',
      `DPP: ${this.rp(this.vDpp)}`,
      `PPN: ${this.rp(this.vPpn)}`,
      ...(this.vBpjs ? [`BPJS: ${this.rp(this.vBpjs)}`] : []),
      `PPh: -${this.rp(this.vPph)}`,
      ...(this.vPph && this.pphLabel ? [`Objek PPh: ${this.pphLabel}`] : []),
      '',
      `*Total Invoice:* ${this.rp(this.vTotalInvoice)}`,
      `*Total Diterima:* ${this.rp(this.vTotalPayment)}`,
      ...(this.t.length
        ? [
            '',
            `Sudah dibayar: ${this.rp(this.vPaid)}`,
            `Sisa: ${this.rp(this.vOutstanding)}`,
          ]
        : []),
    ];
    this.clipboard.copy(lines.join('\n'));
    this.snackBar.open(
      this.translate.instant('notify.copied'),
      'Close',
      { duration: 3000 },
    );
  }

  close() {
    this.dialog.close();
  }

  ngOnInit(): void {
    this.apiService.get(`sales-invoices/${this.data.id}`, {}).subscribe({
      next: (data: any) => {
        this.formGroup.patchValue({
          date: this.datePipe.transform(data.date, 'dd MMMM yyyy'),
          createdAt: this.datePipe.transform(data.createdAt, 'dd MMMM yyyy'),
          name: data.name,
          clientName: `${data.client_name}, ${data.client_prefix}`,
          clientAddress: `${data.client_address}, ${data.client_city}, ${data.client_province}`,
          clientNPWP: data.client_npwp,
          description: data.description,
          spkNumber: data.spkNumber,
          dpp: data.dpp,
          ppn: data.ppn,
          bpjs: data.bpjs,
          pphCode: data.pphCode,
          pphTaxObject: data.pphTaxObject,
          pphPercentage: data.pphPercentage,
          pphValue: data.pphValue,
          taxInvoiceName: data.taxInvoiceName,
          incomeTaxInvoiceName: data.incomeTaxInvoiceName,
          taxingStatus: data.taxingStatus,
          total: data.dpp + (data.ppn * data.dpp) / 100,
          totalPayment:
            data.dpp +
            (data.ppn * data.dpp) / 100 -
            (data.pphPercentage * data.dpp) / 100 -
            (data.bpjs || 0),
          projectName: data.projectName,
        });

        data.payments.forEach((x: any) => {
          this.t.push(
            this.formBuilder.group({
              id: [x.id],
              amount: [x.amount],
              date: [x.date],
              bankAccountName: [x.bankAccountName],
              bankAccountNumber: [x.bankAccountNumber],
              bankName: [x.bankName],
            }),
          );
        });
      },
      error: (error) => {
        this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
          duration: 3000,
        });
        this.dialog.close();
      },
    });
  }
}
