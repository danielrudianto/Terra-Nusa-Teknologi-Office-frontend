import { DatePipe, CommonModule } from '@angular/common';
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
import { ApiService } from 'src/app/services/api.service';
import { downloadRecapExcel } from '../../../helpers/tax-recap-excel';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';

@Component({
  selector: 'app-ppn-recap',
  standalone: true,
  templateUrl: './ppn-recap.component.html',
  styleUrl: './ppn-recap.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatDialogModule,
    MatInputModule,
    MatButtonModule,
    TranslatePipe,
    DialogGeserDirective,
  ],
})
export class PpnRecapComponent {
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

  onSubmit() {
    this.isLoading = true;
    const month = Number(this.formGroup.get('month')?.value);
    const year = Number(this.formGroup.get('year')?.value);
    const periode = `${this.monthLabel[month - 1] ?? month} ${year}`;

    this.apiService
      .get('taxes/ppn', this.formGroup.value)
      .subscribe({
        next: (data: any) => {
          const rows = (data || []).map((x: any) => ({
            date: this.datePipe.transform(new Date(x.date), 'dd MMMM yyyy'),
            /*
             * Asal baris ikut tercetak.
             *
             * Rekap kini menggabungkan pembelian dan beban. Tanpa kolom ini,
             * baris dari beban tidak dapat dibedakan — dan saat konsultan
             * mencocokkan ke dokumen sumbernya, ia akan mencarinya di daftar
             * pembelian dan tidak menemukannya.
             */
            sumber:
              x.sumber === 'expense'
                ? this.translate.instant('tax.sourceExpense')
                : this.translate.instant('tax.sourcePurchase'),
            supplier: [x.supplier?.prefix, x.supplier?.name]
              .filter(Boolean)
              .join(' '),
            npwp: x.supplier?.npwp,
            invoiceName: x.invoiceName,
            receiptName: x.receiptName,
            taxInvoiceName: x.taxInvoiceName,
            dpp: Number(x.dpp) || 0,
            ppn: ((Number(x.ppn) || 0) * (Number(x.dpp) || 0)) / 100,
          }));

          downloadRecapExcel({
            fileName: `Rekap PPN ${periode}`,
            sheetName: 'PPN',
            title: 'REKAP PAJAK PERTAMBAHAN NILAI (PPN)',
            subtitle: `Periode ${periode}`,
            rows,
            columns: [
              { header: 'Tanggal', key: 'date', width: 18 },
              { header: 'Sumber', key: 'sumber', width: 14 },
              // prefix digabung ke nama supaya tidak ada kolom sempit
              // berisi "PT."/"CV." saja
              { header: 'Supplier', key: 'supplier', width: 32 },
              { header: 'NPWP', key: 'npwp', width: 22 },
              { header: 'No. Invoice', key: 'invoiceName', width: 24 },
              { header: 'No. Kwitansi', key: 'receiptName', width: 24 },
              { header: 'No. Faktur Pajak', key: 'taxInvoiceName', width: 26 },
              {
                header: 'DPP',
                key: 'dpp',
                width: 16,
                align: 'right',
                numFmt: '#,##0',
                total: true,
              },
              {
                header: 'PPN',
                key: 'ppn',
                width: 16,
                align: 'right',
                numFmt: '#,##0',
                total: true,
              },
            ],
          }).catch((e) => {
            console.error('Gagal membuat berkas Excel:', e);
            this.snackBar.open(
      this.translate.instant('notify.createFailed'), 'Close', {
              duration: 3000,
            });
          });
        },
        error: (error: any) => {
          this.snackBar.open(
            error?.error?.detail ?? 'Gagal mengambil data PPN',
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
