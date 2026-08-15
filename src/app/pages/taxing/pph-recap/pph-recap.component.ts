import { CommonModule, DatePipe } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../services/api.service';
import { downloadRecapExcel } from '../../../helpers/tax-recap-excel';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';

@Component({
  selector: 'app-pph-recap',
  standalone: true,
  templateUrl: './pph-recap.component.html',
  styleUrl: './pph-recap.component.scss',
  imports: [
    TranslatePipe,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatDialogModule,
    MatInputModule,
    MatButtonModule,
    DialogGeserDirective,
  ],
})
export class PphRecapComponent {
  private readonly translate = inject(TranslateService);
  // period passed from the tax hub (select month/year once, reused everywhere)
  private periodData: any = inject(MAT_DIALOG_DATA, { optional: true });

  /** Label bulan singkat mengikuti bahasa aplikasi. */
  months: { n: number; key: string }[] = [
    { n: 1, key: 'common.janShort' },
    { n: 2, key: 'common.febShort' },
    { n: 3, key: 'common.marShort' },
    { n: 4, key: 'common.aprShort' },
    { n: 5, key: 'common.mayShort' },
    { n: 6, key: 'common.junShort' },
    { n: 7, key: 'common.julShort' },
    { n: 8, key: 'common.augShort' },
    { n: 9, key: 'common.sepShort' },
    { n: 10, key: 'common.octShort' },
    { n: 11, key: 'common.novShort' },
    { n: 12, key: 'common.decShort' },
  ];

  ngOnInit(): void {
    if (this.periodData?.month && this.periodData?.year) {
      this.formGroup.patchValue({
        month: this.periodData.month,
        year: this.periodData.year,
      });
    }
  }

  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe,
  ) {}

  isLoading: boolean = false;

  formGroup: FormGroup = new FormGroup({
    month: new FormControl('', Validators.required),
    year: new FormControl('', Validators.required),
  });

  private readonly monthLabel = [
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
  ];

  private money(width = 16) {
    return {
      width,
      align: 'right' as const,
      numFmt: '#,##0',
      total: true,
    };
  }

  onSubmit() {
    this.isLoading = true;
    const month = Number(this.formGroup.get('month')?.value);
    const year = Number(this.formGroup.get('year')?.value);
    const periode = `${this.monthLabel[month - 1] ?? month} ${year}`;
    const tanggal = (v: any) =>
      v ? this.datePipe.transform(new Date(v), 'dd MMMM yyyy') : '';

    this.apiService
      .get('taxes/pph', this.formGroup.value)
      .subscribe({
        next: (data: any) => {
          const purchaseRows = (data?.purchase || []).map((x: any) => ({
            date: tanggal(x.date),
            paymentDate: tanggal(x.payment_date),
            supplier: [x.supplier_prefix, x.supplier_name]
              .filter(Boolean)
              .join(' '),
            npwp: x.supplier_npwp,
            projectName: x.projectName,
            purchaseOrderName: x.purchaseOrderName,
            invoiceName: x.invoiceName,
            receiptName: x.receiptName,
            taxInvoiceName: x.taxInvoiceName,
            dpp: Number(x.dpp) || 0,
            ppn: ((Number(x.ppn) || 0) * (Number(x.dpp) || 0)) / 100,
            pphPercentage: Number(x.pphPercentage) || 0,
            pphValue:
              ((Number(x.pphPercentage) || 0) * (Number(x.dpp) || 0)) / 100,
            pphCode: x.pphCode,
            pphTaxObject: x.pphTaxObject,
            amount: Number(x.amount) || 0,
            previousAmount: Number(x.previous_amount) || 0,
          }));

          const expenseRows = (data?.expense || []).map((x: any) => ({
            date: tanggal(x.date),
            paymentDate: tanggal(x.payment_date),
            opponent: x.opponent_name,
            npwp: x.opponent_npwp,
            invoiceName: x.invoiceName,
            receiptName: x.receiptName,
            dpp: Number(x.dpp) || 0,
            pphPercentage: Number(x.pphPercentage) || 0,
            pphValue:
              ((Number(x.pphPercentage) || 0) * (Number(x.dpp) || 0)) / 100,
            pphCode: x.pphCode,
            pphTaxObject: x.pphTaxObject,
            amount: Number(x.amount) || 0,
            previousAmount: Number(x.previous_amount) || 0,
          }));

          downloadRecapExcel(
            [
              {
                fileName: `Rekap PPh ${periode}`,
                sheetName: 'Pembelian',
                title: 'REKAP PPh — PEMBELIAN',
                subtitle: `Periode ${periode}`,
                rows: purchaseRows,
                columns: [
                  { header: 'Tanggal', key: 'date', width: 18 },
                  { header: 'Tgl. Bayar', key: 'paymentDate', width: 18 },
                  { header: 'Supplier', key: 'supplier', width: 30 },
                  { header: 'NPWP', key: 'npwp', width: 22 },
                  { header: 'Proyek', key: 'projectName', width: 18 },
                  { header: 'No. PO', key: 'purchaseOrderName', width: 22 },
                  { header: 'No. Invoice', key: 'invoiceName', width: 22 },
                  { header: 'No. Kwitansi', key: 'receiptName', width: 22 },
                  {
                    header: 'No. Faktur Pajak',
                    key: 'taxInvoiceName',
                    width: 24,
                  },
                  { header: 'DPP', key: 'dpp', ...this.money() },
                  { header: 'PPN', key: 'ppn', ...this.money() },
                  {
                    header: 'PPh (%)',
                    key: 'pphPercentage',
                    width: 10,
                    align: 'center' as const,
                  },
                  { header: 'Nilai PPh', key: 'pphValue', ...this.money() },
                  { header: 'Kode PPh', key: 'pphCode', width: 12 },
                  { header: 'Objek Pajak', key: 'pphTaxObject', width: 28 },
                  {
                    header: 'Bayar Periode Ini',
                    key: 'amount',
                    ...this.money(18),
                  },
                  {
                    header: 'Bayar Sebelumnya',
                    key: 'previousAmount',
                    ...this.money(18),
                  },
                ],
              },
              {
                fileName: `Rekap PPh ${periode}`,
                sheetName: 'Pengeluaran',
                title: 'REKAP PPh — PENGELUARAN',
                subtitle: `Periode ${periode}`,
                rows: expenseRows,
                columns: [
                  { header: 'Tanggal', key: 'date', width: 18 },
                  { header: 'Tgl. Bayar', key: 'paymentDate', width: 18 },
                  { header: 'Nama', key: 'opponent', width: 30 },
                  { header: 'NPWP', key: 'npwp', width: 22 },
                  { header: 'No. Invoice', key: 'invoiceName', width: 22 },
                  { header: 'No. Kwitansi', key: 'receiptName', width: 22 },
                  { header: 'DPP', key: 'dpp', ...this.money() },
                  {
                    header: 'PPh (%)',
                    key: 'pphPercentage',
                    width: 10,
                    align: 'center' as const,
                  },
                  { header: 'Nilai PPh', key: 'pphValue', ...this.money() },
                  { header: 'Kode PPh', key: 'pphCode', width: 12 },
                  { header: 'Objek Pajak', key: 'pphTaxObject', width: 28 },
                  {
                    header: 'Bayar Periode Ini',
                    key: 'amount',
                    ...this.money(18),
                  },
                  {
                    header: 'Bayar Sebelumnya',
                    key: 'previousAmount',
                    ...this.money(18),
                  },
                ],
              },
            ],
            `Rekap PPh ${periode}`,
          ).catch((e) => {
            console.error('Gagal membuat berkas Excel:', e);
            this.snackBar.open(
      this.translate.instant('notify.createFailed'), 'Close', {
              duration: 3000,
            });
          });
        },
        error: (error: any) => {
          this.snackBar.open(
            error?.error?.detail ?? 'Gagal mengambil data PPh',
            'Close',
            { duration: 3000 },
          );
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }
}
