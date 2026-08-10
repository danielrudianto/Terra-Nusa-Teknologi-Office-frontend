import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
  AbstractControl,
  Form,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../services/api.service';
import { saveAs } from 'file-saver';
import { CommonModule } from '@angular/common';
import {
  downloadRecapExcel,
  sheetFromObjects,
} from '../../../helpers/tax-recap-excel';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-monthly-recap',
  imports: [
    TranslatePipe,
    FormsModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatSelectModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatInputModule,
    MatButtonModule,
    CommonModule,
  ],
  templateUrl: './monthly-recap.component.html',
  styleUrl: './monthly-recap.component.scss',
})
export class MonthlyRecapComponent {
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
  ) {}

  atLeastOneCheckedValidator: ValidatorFn = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    const group = control as FormGroup;

    const fields = [
      'mutation',
      'purchase',
      'sales',
      'asset',
      'ar',
      'ap',
      'loans',
    ];

    const atLeastOneChecked = fields.some(
      (field) => group.get(field)?.value === true,
    );

    return atLeastOneChecked ? null : { atLeastOneRequired: true };
  };

  isDownloading: boolean = false;

  formGroup: FormGroup = new FormGroup(
    {
      month: new FormControl('', Validators.required),
      year: new FormControl('', Validators.required),
      mutation: new FormControl(false, Validators.required),
      purchase: new FormControl(false, Validators.required),
      sales: new FormControl(false, Validators.required),
      asset: new FormControl(false, Validators.required),
      ar: new FormControl(false, Validators.required),
      ap: new FormControl(false, Validators.required),
      loans: new FormControl(false, Validators.required),
    },
    {
      validators: this.atLeastOneCheckedValidator,
    },
  );

  getMutationType(type: string) {
    switch (type) {
      // ===== Office Expenses =====
      case '5.1.1':
        return 'Pembelian aset';
      case '5.1.2':
        return 'Perawatan aset';
      case '5.1.3':
        return 'Biaya sewa dibayar dimuka';
      case '5.1.4':
        return 'Biaya karyawan';
      case '5.1.5':
        return 'Biaya logistik';
      case '5.1.6':
        return 'Biaya penanganan dokumen dan alat tulis kantor';
      case '5.1.7':
        return 'Biaya utilitas';
      case '5.1.12':
        return 'Biaya software';

      // ===== Tax =====
      case '5.1.8.1':
        return 'PPN';
      case '5.1.8.2':
        return 'PPh pasal 23 dan 4 ayat 2';
      case '5.1.8.3':
        return 'PPh pasal 21';
      case '5.1.8.4':
        return 'SPT Tahunan';
      case '5.1.8.5':
        return 'Jasa laporan pajak tahunan';
      case '5.1.8.6':
        return 'Denda pajak';
      case '5.1.8.7':
        return 'Pajak atas bunga';

      case '5.1.14':
        return 'Biaya sosial dan kemasyarakatan';
      case '5.1.9':
        return 'Biaya administrasi';
      case '5.1.10':
        return 'Biaya bunga';
      case '5.1.13':
        return 'Biaya denda';
      case '5.1.11':
        return 'Pembulatan';

      // ===== Marketing =====
      case '6.3.1':
        return 'Biaya iklan';
      case '6.3.2':
        return 'Merchandise promosi';
      case '6.3.3':
        return 'Media sosial';

      // ===== Legal =====
      case '6.4.1':
        return 'Dokumen legal (Akta, SBU)';
      case '6.4.2':
        return 'Asuransi (Marine, CAR, TPL, Surety Bond, dll)';

      // ===== Human Resources =====
      case '6.5.1':
        return 'Biaya rekrutmen';
      case '6.5.2':
        return 'Biaya pelatihan';
      case '6.5.3':
        return 'Biaya kesehatan';

      // ===== Project Expenses =====
      case 'A':
        return 'Transportasi proyek';
      case 'B':
        return 'Sewa peralatan';
      case 'C':
        return 'Bahan bakar';
      case 'D':
        return 'Tenaga kerja';
      case 'E':
        return 'Koordinasi, konsumsi, dan akomodasi';
      case 'F':
        return 'Material';
      case 'G':
        return 'Peralatan dan perlengkapan pendukung proyek';
      case 'H1':
        return 'Subkontraktor berbadan usaha';
      case 'H2':
        return 'Subkontraktor tanpa badan usaha';

      // ==== Income =====
      case '7.1':
        return 'Pendapatan bunga';
      case '7.2':
        return 'Pendapatan royalti';
      case '7.3':
        return 'Pendapatan deviden';
      case '7.5':
        return 'Pendapatan lain - lain';
      case '7.4':
        return 'Pembulatan';
      case '4.1':
        return 'Pendapatan Jasa Konstruksi';

      default:
        return type;
    }
  }

  /** Nama bulan untuk keterangan periode pada berkas. */
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

  /**
   * Kolom tarif disimpan sebagai pecahan (0,11), jadi harus diformat persen.
   * Tanpa ini Excel menampilkannya sebagai 0.
   */
  private readonly PERCENT_FORMATS: Record<string, string> = {
    'Tarif PPh': '0.00%',
  };

  onSubmit() {
    if (this.isDownloading) return;

    this.isDownloading = true;
    this.apiService
      .post(`taxes/monthly-recap`, {
        ...this.formGroup.value,
        year: Number(this.formGroup.value.year),
      })
      .subscribe({
        next: (data: any) => {
          console.log(data);
          // create an excel file
          // Semua lembar dikumpulkan dulu, lalu ditulis sekali lewat
          // helper bergaya (header berwarna, border, total, freeze).
          const m = Number(this.formGroup.value.month);
          const y = Number(this.formGroup.value.year);
          const periode = `${this.monthLabel[m - 1] ?? m} ${y}`;

          // Semua lembar dikumpulkan dulu, lalu ditulis sekali lewat
          // helper bergaya (header berwarna, border, total, freeze).
          const sheets: any[] = [];

          // if bankAccountMutation
          if (this.formGroup.value.mutation) {
            // Create sheets for each bank account
            // the data received is an array of objects with the following formats
            // {
            //  1: {
            // data: [...] // the mutation
            // detail {...} // the bankAccountNumber is stated here, the sheet name should be detail.bankAccountNumber
            // count: ... // the count of the mutation
            // }
            // }

            Object.keys(data.mutation).forEach((key) => {
              sheets.push(
                sheetFromObjects(
                  // nama lembar = nomor rekening bank
                  data.mutation[key].detail.bankAccountNumber,
                  `Mutasi ${data.mutation[key].detail.bankAccountNumber}`,
                  data.mutation[key].data.map((x: any) => {
                    return {
                      Tanggal: new Date(x.date),
                      'Nomor akun': data.mutation[key].detail.bankAccountNumber,
                      Proyek: x.projectname,
                      'Nama lawan transaksi': x.opponent,
                      'Tipe transaksi': this.getMutationType(x.type),
                      Deskripsi: x.document,
                      Debit: x.amount < 0 ? Math.abs(x.amount) : 0,
                      Kredit: x.amount > 0 ? x.amount : 0,
                      Saldo: x.balance,
                    };
                  }),
                  periode,
                  undefined,
                  this.PERCENT_FORMATS,
                ),
              );
            });
          }

          // if sales
          if (this.formGroup.value.sales) {
            sheets.push(
              sheetFromObjects(
                'Sales',
                'Sales',
                (data.sales as any[]).map((x) => {
                  return {
                    'Tanggal invoice': new Date(x.date),
                    'Nama klien': x.client_name,
                    Faktur: x.name,
                    'Faktur pajak': x.taxInvoiceName,
                    'Nomor SPK': x.spkNumber,
                    Deskripsi: x.description,
                    DPP: x.dpp,
                    PPN: (x.dpp * x.ppn) / 100,
                    PPh: (x.dpp * x.pphPercentage) / 100,
                    BPJS: x.bpjs,
                    'Tarif PPh': x.pphPercentage / 100,
                    'Kode objek pajak': x.pphCode,
                    'Objek pajak': x.pphTaxObject,
                    'Total tagihan':
                      x.dpp +
                      (x.dpp * x.ppn) / 100 -
                      x.bpjs -
                      (x.dpp * x.pphPercentage) / 100,
                  };
                }),
                periode,
                undefined,
                this.PERCENT_FORMATS,
              ),
            );
            // width of the columns should be (in pixel)
            // 10, 35, 25, 25, 35, 35, 20, 20, 20, 20, 10, 15, 35, 20
          }

          // if purchases
          if (this.formGroup.value.purchase) {
            sheets.push(
              sheetFromObjects(
                'Purchase',
                'Purchase',
                (data.purchase as any[]).map((x) => {
                  return {
                    Tanggal: new Date(x.date),
                    'Nama supplier': x.supplier_name,
                    'Nama invoice': x.invoiceName,
                    'Nomor kuitansi': x.receiptName,
                    'Nomor faktur pajak': x.taxInvoiceName,
                    'PO / SPK': x.purchaseOrderName,
                    Proyek: x.projectName,
                    DPP: x.dpp,
                    'Nilai lain': x.otherValue,
                    'Keterangan nilai lain': x.otherValueNote,
                    PPN: (x.dpp * x.ppn) / 100,
                    PPh: (x.dpp * x.pphPercentage) / 100,
                    PBBKB: x.pbbkb,
                    'Tarif PPh': x.pphPercentage / 100,
                    'Kode objek pajak': x.pphCode,
                    'Objek pajak': x.pphTaxObject,
                    Total:
                      x.dpp +
                      x.pbbkb +
                      x.otherValue +
                      (x.dpp * x.ppn) / 100 -
                      (x.dpp * x.pphPercentage) / 100,
                  };
                }),
                periode,
                undefined,
                this.PERCENT_FORMATS,
              ),
            );
            // width of the columns should be (in pixel)
            // 10, 35, 25, 25, 35, 35, 20, 20, 20, 20, 10, 15, 35, 20

            //
            // 🔥 WRAP TEXT SEMUA CELL (including header)
            //
          }

          // if loans
          if (this.formGroup.value.loans) {
            sheets.push(
              sheetFromObjects(
                'Loans',
                'Loans',
                (data.loans as any[]).map((x) => {
                  return {
                    'Tanggal pinjaman': new Date(x.date),
                    'Nama peminjam': x.creditorName,
                    'NPWP peminjam': x.creditorNPWP,
                    'Alamat peminjam': x.creditorAddress,
                    Deskripsi: x.description,
                    'Manfaat diterima': x.received,
                    Hutang: x.debt,
                    Pembayaran: x.total_paid,
                  };
                }),
                periode,
                undefined,
                this.PERCENT_FORMATS,
              ),
            );
            //width for each column is as follow (in pixel)
            // 10, 30, 20, 90, 60, 20, 20, 20
            // a => date, b - e => string, f - h => number (with thousand separator)
          }

          // if asset
          if (this.formGroup.value.asset) {
            sheets.push(
              sheetFromObjects(
                'Asset',
                'Asset',
                (data.asset as any[]).map((x) => {
                  return {
                    Nama: x.name,
                    Description: x.description,
                    Merek: x.brand,
                    Type: x.type,
                    Depresiasi: x.depreciation,
                    Lokasi: x.location,
                    'Nama PO': x.purchaseOrderName,
                    'Tanggal PO': new Date(x.purchaseDate),
                    Nilai: x.value,
                  };
                }),
                periode,
                undefined,
                this.PERCENT_FORMATS,
              ),
            );
            // width of each column is as follow (in pixel)
            // 50, 175, 25, 15, 15, 15, 25, 15, 15
            //a - d => string, e => number, f - g => string, h => date, i => number (with thousand separator)
          }

          // if Account Receivable (AR)
          if (this.formGroup.value.ar) {
            sheets.push(
              sheetFromObjects(
                'Piutang',
                'Piutang',
                (data.ar.data as any[]).map((x) => {
                  return {
                    date: new Date(x.date),
                    'Nama klien': x.client_name,
                    'Nomor invoice': x.name,
                    'Nomor faktur pajak': x.taxInvoiceName,
                    Proyek: x.projectName,
                    'Nomor SPK': x.spkNumber,
                    Deskripsi: x.description,
                    DPP: x.dpp,
                    PPN: (x.ppn * x.dpp) / 100,
                    PPh: (x.pphPercentage * x.dpp) / 100,
                    BPJS: x.bpjs,
                    'Tarif PPh': x.pphPercentage / 100,
                    'Kode objek pajak': x.pphCode,
                    'Objek pajak': x.pphTaxObject,
                    'Total tagihan':
                      x.dpp +
                      (x.ppn * x.dpp) / 100 -
                      x.bpjs -
                      (x.pphPercentage * x.dpp) / 100,
                    Pembayaran: x.total_paid,
                  };
                }),
                periode,
                undefined,
                this.PERCENT_FORMATS,
              ),
            );
            // width of each column in (pixel)
            // 10, 35, 25, 25, 15, 35, 35, 20, 20, 20, 20, 15, 20, 30, 20, 20
            // a => date, b - g => string, h - k => number (with thousand separator), l => percentage, m - n => string, o - p => number (with thousand separator)
          }

          // if Account Payable (AP)
          if (this.formGroup.value.ap) {
            sheets.push(
              sheetFromObjects(
                'Hutang',
                'Hutang',
                (data.ap.data as any[]).map((x) => {
                  return {
                    Tanggal: x.date,
                    'Nama supplier': x.supplier_name,
                    'Nomor invoice': x.invoiceName,
                    'Nomor kwitansi': x.receiptName,
                    'Nomor faktur pajak': x.taxInvoiceName,
                    'PO / SPK': x.purchaseOrderName,
                    Proyek: x.projectName,
                    DPP: x.dpp,
                    PPN: (x.ppn * x.dpp) / 100,
                    PBBKB: x.pbbkb,
                    'Nilai lain': x.otherValue,
                    'Catatan nilai lain': x.otherValueNote,
                    PPh: (x.pphPercentage * x.dpp) / 100,
                    'Tarif PPh': x.pphPercentage / 100,
                    'Kode objek pajak': x.pphCode,
                    'Objek pajak': x.pphTaxObject,
                    Total:
                      x.dpp +
                      (x.ppn * x.dpp) / 100 +
                      x.pbbkb +
                      x.otherValue -
                      (x.pphPercentage * x.dpp) / 100,
                    Pembayaran: x.total_paid,
                  };
                }),
                periode,
                undefined,
                this.PERCENT_FORMATS,
              ),
            );
          }

          // save as the file
          downloadRecapExcel(sheets, `Rekap Bulanan ${periode}`).catch((e) => {
            console.error('Gagal membuat berkas Excel:', e);
            this.snackBar.open('Gagal membuat berkas Excel', 'Close', {
              duration: 3000,
            });
          });
        },
        error: (error) => {
          this.snackBar.open(error.error.detail, 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isDownloading = false;
      });
  }
}
