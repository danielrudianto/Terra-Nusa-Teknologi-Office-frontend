import { Component, Inject, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { DatePipe } from '@angular/common';
import {
  downloadRecapExcel,
  sheetFromObjects,
} from '../../../../helpers/tax-recap-excel';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { DialogGeserDirective } from '../../../../directives/dialog-geser.directive';

@Component({
  selector: 'app-bank-mutation-download',
  providers: [DatePipe],
  imports: [
    MatIconModule,
    TranslatePipe,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatButtonModule,
    DialogGeserDirective,
  ],
  templateUrl: './bank-mutation-download.component.html',
  styleUrl: './bank-mutation-download.component.scss',
})
export class BankMutationDownloadComponent {
  private readonly translate = inject(TranslateService);
  constructor(
    private datePipe: DatePipe,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      id: number;
      /** Diisi bila pemanggil mengetahui detail rekeningnya. */
      accountNumber?: string;
      name?: string;
    },
    private apiService: ApiService,
    private snackBar: MatSnackBar,
  ) {}

  isLoading: boolean = false;
  formGroup: FormGroup = new FormGroup({
    month: new FormControl(new Date().getMonth() + 1, Validators.required),
    year: new FormControl(new Date().getFullYear(), [
      Validators.required,
      Validators.min(2023),
      Validators.max(new Date().getFullYear()),
    ]),
  });

  /** Pilihan bulan memakai label terjemahan, bukan teks Inggris tetap. */
  readonly months = [
    { value: 1, label: 'common.january' },
    { value: 2, label: 'common.february' },
    { value: 3, label: 'common.march' },
    { value: 4, label: 'common.april' },
    { value: 5, label: 'common.may' },
    { value: 6, label: 'common.june' },
    { value: 7, label: 'common.july' },
    { value: 8, label: 'common.august' },
    { value: 9, label: 'common.september' },
    { value: 10, label: 'common.october' },
    { value: 11, label: 'common.november' },
    { value: 12, label: 'common.december' },
  ];

  /** Lima tahun ke belakang sampai tahun berjalan. */
  readonly years = Array.from(
    { length: 6 },
    (_, i) => new Date().getFullYear() - i,
  );

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

  download() {
    this.isLoading = true;
    const month = Number(this.formGroup.value.month);
    const year = Number(this.formGroup.value.year);
    const periode = `${this.monthLabel[month - 1] ?? month} ${year}`;
    // Detail rekening bersifat opsional; bila tidak dikirim, judul & nama
    // berkas cukup memakai periode saja agar tidak muncul teks kosong.
    const rekening = this.data?.accountNumber || this.data?.name || '';

    this.apiService
      .post(`banks/mutation/download`, {
        bankAccountID: this.data.id,
        month,
        year,
      })
      .subscribe({
        next: (res: any) => {
          const list: any[] = Array.isArray(res) ? res : res?.data || [];
          const rows = list.map((x: any) => ({
            Tanggal: new Date(x.date),
            'Lawan Transaksi': x.opponent ?? '',
            Dokumen: x.document ?? '',
            Referensi: x.reference ?? '',
            // Dipisah debit/kredit agar mudah dijumlahkan dan dibaca;
            // sebelumnya hanya satu kolom bertanda minus.
            Debit: Number(x.amount) < 0 ? Math.abs(Number(x.amount)) : 0,
            Kredit: Number(x.amount) > 0 ? Number(x.amount) : 0,
            Saldo: Number(x.balance) || 0,
          }));

          const sheet = sheetFromObjects(
            'Mutasi',
            rekening ? `MUTASI REKENING ${rekening}` : 'MUTASI REKENING',
            rows,
            `Periode ${periode}`,
          );
          // Saldo adalah nilai berjalan, bukan komponen yang bisa dijumlah.
          sheet.columns = sheet.columns.map((c) =>
            c.key === 'Saldo' ? { ...c, total: false } : c,
          );

          downloadRecapExcel(
            sheet,
            rekening ? `Mutasi ${rekening} ${periode}` : `Mutasi ${periode}`,
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
            error?.error?.detail ?? 'Gagal mengambil data mutasi',
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
