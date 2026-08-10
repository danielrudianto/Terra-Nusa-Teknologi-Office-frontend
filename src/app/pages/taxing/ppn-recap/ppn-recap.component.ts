import { DatePipe, CommonModule } from '@angular/common';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { downloadRecapExcel } from '../../../helpers/tax-recap-excel';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-ppn-recap',
  standalone: true,
  templateUrl: './ppn-recap.component.html',
  styleUrl: './ppn-recap.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatSelectModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatInputModule,
    MatButtonModule,
    TranslatePipe,
  ],
})
export class PpnRecapComponent {
  // period passed from the tax hub (select month/year once, reused everywhere)
  private periodData: any = inject(MAT_DIALOG_DATA, { optional: true });

  months: { n: number; label: string }[] = [
    { n: 1, label: 'Jan' },
    { n: 2, label: 'Feb' },
    { n: 3, label: 'Mar' },
    { n: 4, label: 'Apr' },
    { n: 5, label: 'Mei' },
    { n: 6, label: 'Jun' },
    { n: 7, label: 'Jul' },
    { n: 8, label: 'Agu' },
    { n: 9, label: 'Sep' },
    { n: 10, label: 'Okt' },
    { n: 11, label: 'Nov' },
    { n: 12, label: 'Des' },
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
            this.snackBar.open('Gagal membuat berkas Excel', 'Close', {
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
