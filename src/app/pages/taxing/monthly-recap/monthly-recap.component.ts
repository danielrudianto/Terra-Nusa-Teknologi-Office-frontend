import { Component } from '@angular/core';
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
import { ApiService } from 'src/app/services/api.service';
import { saveAs } from 'file-saver';
import * as xlsx from 'xlsx-js-style';

@Component({
  selector: 'app-monthly-recap',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatSelectModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './monthly-recap.component.html',
  styleUrl: './monthly-recap.component.scss',
})
export class MonthlyRecapComponent {
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
          const workbook = xlsx.utils.book_new();

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
              const worksheet = xlsx.utils.json_to_sheet(
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
                {
                  cellDates: true,
                },
              );

              xlsx.utils.book_append_sheet(
                workbook,
                worksheet,
                data.mutation[key].detail.bankAccountNumber,
              );

              // width of the columns (in pixel)
              // 10, 20, 15, 50, 25, 50, 15, 15, 15
              worksheet['!cols'] = [
                { wch: 10 },
                { wch: 20 },
                { wch: 15 },
                { wch: 50 },
                { wch: 25 },
                { wch: 50 },
                { wch: 15 },
                { wch: 15 },
                { wch: 15 },
              ];

              // a => date, b - f => string, g - i => number (with thousand separator)
              const range = xlsx.utils.decode_range(worksheet['!ref']!);

              for (let row = range.s.r + 1; row <= range.e.r; ++row) {
                // ===== Column A (Date) =====
                const dateCell =
                  worksheet[xlsx.utils.encode_cell({ r: row, c: 0 })];
                if (dateCell) {
                  dateCell.t = 'd';
                  dateCell.z = 'dd/mm/yyyy';
                }

                // ===== Column B - F (String) =====
                for (let col = 1; col <= 5; col++) {
                  const stringCell =
                    worksheet[xlsx.utils.encode_cell({ r: row, c: col })];
                  if (stringCell) {
                    stringCell.t = 's';
                  }
                }

                // ===== Column G - I (Number with thousand separator) =====
                for (let col = 6; col <= 8; col++) {
                  const numberCell =
                    worksheet[xlsx.utils.encode_cell({ r: row, c: col })];
                  if (numberCell) {
                    numberCell.t = 'n';
                    numberCell.z = '#,##0';
                  }
                }
              }
            });
          }

          // if sales
          if (this.formGroup.value.sales) {
            const worksheet = xlsx.utils.json_to_sheet(
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
              {
                cellDates: true,
              },
            );
            xlsx.utils.book_append_sheet(workbook, worksheet, 'Sales');
            // width of the columns should be (in pixel)
            // 10, 35, 25, 25, 35, 35, 20, 20, 20, 20, 10, 15, 35, 20
            worksheet['!cols'] = [
              { wch: 10 },
              { wch: 35 },
              { wch: 25 },
              { wch: 25 },
              { wch: 35 },
              { wch: 35 },
              { wch: 20 },
              { wch: 20 },
              { wch: 20 },
              { wch: 20 },
              { wch: 10 },
              { wch: 15 },
              { wch: 35 },
              { wch: 20 },
            ];

            // format the columns as follow
            // a => date, b - f => string, g - j => number (with thousand separator), k => percentage, l - m =>  string, n => number (with thousand separator)
            const range = xlsx.utils.decode_range(worksheet['!ref']!);

            for (let R = range.s.r + 1; R <= range.e.r; ++R) {
              // A => Date
              const cellA = worksheet[xlsx.utils.encode_cell({ r: R, c: 0 })];
              if (cellA) {
                cellA.t = 'd';
                cellA.z = 'dd/mm/yyyy';
              }

              // G-J => number with thousand separator
              for (let C = 6; C <= 9; C++) {
                const cell = worksheet[xlsx.utils.encode_cell({ r: R, c: C })];
                if (cell) {
                  cell.t = 'n';
                  cell.z = '#,##0';
                }
              }

              // K => percentage
              const cellK = worksheet[xlsx.utils.encode_cell({ r: R, c: 10 })];
              if (cellK) {
                cellK.t = 'n';
                cellK.z = '0.00%';
              }

              // N => number with thousand separator
              const cellN = worksheet[xlsx.utils.encode_cell({ r: R, c: 13 })];
              if (cellN) {
                cellN.t = 'n';
                cellN.z = '#,##0';
              }
            }

            for (let R = range.s.r; R <= range.e.r; ++R) {
              for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = xlsx.utils.encode_cell({ r: R, c: C });
                const cell = worksheet[cellAddress];

                if (cell) {
                  if (!cell.s) cell.s = {};
                  cell.s.alignment = {
                    wrapText: true,
                    vertical: 'center',
                  };
                }
              }
            }

            worksheet['!rows'] = Array.from({ length: range.e.r + 1 }, () => ({
              hpt: -1,
            }));
          }

          // if purchases
          if (this.formGroup.value.purchase) {
            const worksheet = xlsx.utils.json_to_sheet(
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
              {
                cellDates: true,
              },
            );

            xlsx.utils.book_append_sheet(workbook, worksheet, 'Purchase');
            // width of the columns should be (in pixel)
            // 10, 35, 25, 25, 35, 35, 20, 20, 20, 20, 10, 15, 35, 20
            worksheet['!cols'] = [
              { wch: 10 },
              { wch: 50 },
              { wch: 30 },
              { wch: 30 },
              { wch: 20 },
              { wch: 25 },
              { wch: 10 },
              { wch: 15 },
              { wch: 15 },
              { wch: 15 },
              { wch: 15 },
              { wch: 15 },
              { wch: 15 },
              { wch: 10 },
              { wch: 15 },
              { wch: 30 },
              { wch: 15 },
            ];

            // format the columns as follow
            // a => date, b - g => string, h - k => number (with thousand separator), l => percentage, m - n => string, o => number (with thousand separator)
            const range = xlsx.utils.decode_range(worksheet['!ref']!);

            for (let R = range.s.r + 1; R <= range.e.r; ++R) {
              // A => Date
              const cellA = worksheet[xlsx.utils.encode_cell({ r: R, c: 0 })];
              if (cellA) {
                cellA.t = 'd';
                cellA.z = 'dd/mm/yyyy';
              }

              // H - K => number (7 - 10)
              for (let C = 7; C <= 10; C++) {
                const cell = worksheet[xlsx.utils.encode_cell({ r: R, c: C })];
                if (cell) {
                  cell.t = 'n';
                  cell.z = '#,##0';
                }
              }

              // L => percentage (index 11)
              const cellL = worksheet[xlsx.utils.encode_cell({ r: R, c: 11 })];
              if (cellL) {
                cellL.t = 'n';
                cellL.z = '0.00%';
              }

              // O => total (index 14)
              const cellO = worksheet[xlsx.utils.encode_cell({ r: R, c: 16 })];
              if (cellO) {
                cellO.t = 'n';
                cellO.z = '#,##0';
              }
            }

            worksheet['!rows'] = Array.from({ length: range.e.r + 1 }, () => ({
              hpt: -1,
            }));

            //
            // 🔥 WRAP TEXT SEMUA CELL (including header)
            //
            for (let R = range.s.r; R <= range.e.r; ++R) {
              for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = xlsx.utils.encode_cell({ r: R, c: C });
                const cell = worksheet[cellAddress];

                if (cell) {
                  if (!cell.s) cell.s = {};
                  cell.s.alignment = {
                    wrapText: true,
                    vertical: 'center',
                    horizontal: 'left',
                  };
                }
              }
            }
          }

          // if loans
          if (this.formGroup.value.loans) {
            const worksheet = xlsx.utils.json_to_sheet(
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
              {
                cellDates: true,
              },
            );
            xlsx.utils.book_append_sheet(workbook, worksheet, 'Loans');

            //width for each column is as follow (in pixel)
            // 10, 30, 20, 90, 60, 20, 20, 20
            worksheet['!cols'] = [
              { wch: 10 },
              { wch: 30 },
              { wch: 20 },
              { wch: 90 },
              { wch: 60 },
              { wch: 20 },
              { wch: 20 },
              { wch: 20 },
            ];

            // a => date, b - e => string, f - h => number (with thousand separator)
            const range = xlsx.utils.decode_range(worksheet['!ref']!);

            for (let R = range.s.r + 1; R <= range.e.r; ++R) {
              // A => Date
              const cellA = worksheet[xlsx.utils.encode_cell({ r: R, c: 0 })];
              if (cellA) {
                cellA.t = 'd';
                cellA.z = 'dd/mm/yyyy';
              }

              // F - H => number (7 - 9)
              for (let C = 7; C <= 9; C++) {
                const cell = worksheet[xlsx.utils.encode_cell({ r: R, c: C })];
                if (cell) {
                  cell.t = 'n';
                  cell.z = '#,##0';
                }
              }
            }

            worksheet['!rows'] = Array.from({ length: range.e.r + 1 }, () => ({
              hpt: -1,
            }));
          }

          // if asset
          if (this.formGroup.value.asset) {
            const worksheet = xlsx.utils.json_to_sheet(
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
              {
                cellDates: true,
              },
            );
            xlsx.utils.book_append_sheet(workbook, worksheet, 'Asset');

            // width of each column is as follow (in pixel)
            // 50, 175, 25, 15, 15, 15, 25, 15, 15
            worksheet['!cols'] = [
              { wch: 50 },
              { wch: 175 },
              { wch: 25 },
              { wch: 15 },
              { wch: 15 },
              { wch: 15 },
              { wch: 25 },
              { wch: 15 },
              { wch: 15 },
            ];

            //a - d => string, e => number, f - g => string, h => date, i => number (with thousand separator)
            const range = xlsx.utils.decode_range(worksheet['!ref']!);

            for (let row = range.s.r + 1; row <= range.e.r; ++row) {
              // ===== A - D (String) =====
              for (let col = 0; col <= 3; col++) {
                const cell =
                  worksheet[xlsx.utils.encode_cell({ r: row, c: col })];
                if (cell) {
                  cell.t = 's';
                }
              }

              // ===== E (Number) =====
              const depreciationCell =
                worksheet[xlsx.utils.encode_cell({ r: row, c: 4 })];
              if (depreciationCell) {
                depreciationCell.t = 'n';
                depreciationCell.z = '0'; // integer
              }

              // ===== F - G (String) =====
              for (let col = 5; col <= 6; col++) {
                const cell =
                  worksheet[xlsx.utils.encode_cell({ r: row, c: col })];
                if (cell) {
                  cell.t = 's';
                }
              }

              // ===== H (Date) =====
              const dateCell =
                worksheet[xlsx.utils.encode_cell({ r: row, c: 7 })];
              if (dateCell) {
                dateCell.t = 'd';
                dateCell.z = 'dd/mm/yyyy';
              }

              // ===== I (Number with thousand separator) =====
              const valueCell =
                worksheet[xlsx.utils.encode_cell({ r: row, c: 8 })];
              if (valueCell) {
                valueCell.t = 'n';
                valueCell.z = '#,##0';
              }
            }
          }

          // if Account Receivable (AR)
          if (this.formGroup.value.ar) {
            const worksheet = xlsx.utils.json_to_sheet(
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
              {
                cellDates: true,
              },
            );
            xlsx.utils.book_append_sheet(workbook, worksheet, 'Piutang');

            // width of each column in (pixel)
            // 10, 35, 25, 25, 15, 35, 35, 20, 20, 20, 20, 15, 20, 30, 20, 20
            worksheet['!cols'] = [
              { wch: 10 },
              { wch: 35 },
              { wch: 25 },
              { wch: 25 },
              { wch: 15 },
              { wch: 35 },
              { wch: 35 },
              { wch: 20 },
              { wch: 20 },
              { wch: 20 },
              { wch: 20 },
              { wch: 15 },
              { wch: 20 },
              { wch: 30 },
              { wch: 20 },
              { wch: 20 },
            ];

            // a => date, b - g => string, h - k => number (with thousand separator), l => percentage, m - n => string, o - p => number (with thousand separator)
            const range = xlsx.utils.decode_range(worksheet['!ref']!);

            for (let row = range.s.r + 1; row <= range.e.r; ++row) {
              // ===== A (Date) =====
              const dateCell =
                worksheet[xlsx.utils.encode_cell({ r: row, c: 0 })];
              if (dateCell) {
                dateCell.t = 'd';
                dateCell.z = 'dd/mm/yyyy';
              }

              // ===== B - G (String) =====
              for (let col = 1; col <= 6; col++) {
                const cell =
                  worksheet[xlsx.utils.encode_cell({ r: row, c: col })];
                if (cell) {
                  cell.t = 's';
                }
              }

              // ===== H - K (Number with thousand separator) =====
              for (let col = 7; col <= 10; col++) {
                const cell =
                  worksheet[xlsx.utils.encode_cell({ r: row, c: col })];
                if (cell) {
                  cell.t = 'n';
                  cell.z = '#,##0';
                }
              }

              // ===== L (Percentage) =====
              const percentCell =
                worksheet[xlsx.utils.encode_cell({ r: row, c: 11 })];
              if (percentCell) {
                percentCell.t = 'n';
                percentCell.z = '0%';
              }

              // ===== M - N (String) =====
              for (let col = 12; col <= 13; col++) {
                const cell =
                  worksheet[xlsx.utils.encode_cell({ r: row, c: col })];
                if (cell) {
                  cell.t = 's';
                }
              }

              // ===== O - P (Number with thousand separator) =====
              for (let col = 14; col <= 15; col++) {
                const cell =
                  worksheet[xlsx.utils.encode_cell({ r: row, c: col })];
                if (cell) {
                  cell.t = 'n';
                  cell.z = '#,##0';
                }
              }
            }
          }

          // if Account Payable (AP)
          if (this.formGroup.value.ap) {
            const worksheet = xlsx.utils.json_to_sheet(
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
            );

            // width
            // 10, 50, 30, 30, 20, 25, 10, 15, 15, 15, 15, 15, 15, 10, 15, 30, 15, 15
            worksheet['!cols'] = [
              { wch: 10 },
              { wch: 50 },
              { wch: 30 },
              { wch: 30 },
              { wch: 20 },
              { wch: 25 },
              { wch: 10 },
              { wch: 15 },
              { wch: 15 },
              { wch: 15 },
              { wch: 15 },
              { wch: 15 },
              { wch: 15 },
              { wch: 15 },
              { wch: 10 },
              { wch: 15 },
              { wch: 30 },
              { wch: 15 },
              { wch: 15 },
            ];

            // a => date, b - g => string, h - k => number (with thousand separator), l => string, m => number (with thousand separator), n => percentage
            // o - p => string, q - r => number (with thousand separator),

            xlsx.utils.book_append_sheet(workbook, worksheet, 'Hutang');

            const range = xlsx.utils.decode_range(worksheet['!ref']!);

            for (let row = range.s.r + 1; row <= range.e.r; ++row) {
              // ===== A (Date) =====
              const dateCell =
                worksheet[xlsx.utils.encode_cell({ r: row, c: 0 })];
              if (dateCell) {
                dateCell.t = 'd';
                dateCell.z = 'dd/mm/yyyy';
              }

              // ===== B - G (String) =====
              for (let col = 1; col <= 6; col++) {
                const cell =
                  worksheet[xlsx.utils.encode_cell({ r: row, c: col })];
                if (cell) {
                  cell.t = 's';
                }
              }

              // ===== H - K (Number with thousand separator) =====
              for (let col = 7; col <= 10; col++) {
                const cell =
                  worksheet[xlsx.utils.encode_cell({ r: row, c: col })];
                if (cell) {
                  cell.t = 'n';
                  cell.z = '#,##0';
                }
              }

              // ===== L (String) =====
              const lCell =
                worksheet[xlsx.utils.encode_cell({ r: row, c: 11 })];
              if (lCell) {
                lCell.t = 's';
              }

              // ===== M (Number with thousand separator) =====
              const mCell =
                worksheet[xlsx.utils.encode_cell({ r: row, c: 12 })];
              if (mCell) {
                mCell.t = 'n';
                mCell.z = '#,##0';
              }

              // ===== N (Percentage) =====
              const percentCell =
                worksheet[xlsx.utils.encode_cell({ r: row, c: 13 })];
              if (percentCell) {
                percentCell.t = 'n';
                percentCell.z = '0%';
              }

              // ===== O - P (String) =====
              for (let col = 14; col <= 15; col++) {
                const cell =
                  worksheet[xlsx.utils.encode_cell({ r: row, c: col })];
                if (cell) {
                  cell.t = 's';
                }
              }

              // ===== Q - R (Number with thousand separator) =====
              for (let col = 16; col <= 17; col++) {
                const cell =
                  worksheet[xlsx.utils.encode_cell({ r: row, c: col })];
                if (cell) {
                  cell.t = 'n';
                  cell.z = '#,##0';
                }
              }
            }
          }

          // save as the file
          xlsx.writeFile(workbook, 'Monthly Recap.xlsx');
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
