import { DatePipe, CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { ServerMessageService } from 'src/app/services/server-message.service';
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
  selector: 'app-pph-salary-recap',
  standalone: true,
  templateUrl: './pph-salary-recap.component.html',
  styleUrl: './pph-salary-recap.component.scss',

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
export class PphSalaryRecapComponent {
  private readonly serverMessage = inject(ServerMessageService);

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

  /** Jumlahkan tunjangan/potongan sesuai statusnya terhadap hitungan PPh. */
  private sumBy(list: any[], included: boolean): number {
    return (list || [])
      .filter((x: any) => !!x.isIncluded === included)
      .reduce((a: number, b: any) => a + (Number(b.amount) || 0), 0);
  }

  onSubmit() {
    this.isLoading = true;
    const month = Number(this.formGroup.get('month')?.value);
    const year = Number(this.formGroup.get('year')?.value);
    const periode = `${this.monthLabel[month - 1] ?? month} ${year}`;

    this.apiService
      .get('taxes/pph-salary', this.formGroup.value)
      .subscribe({
        next: (res: any) => {
          // Endpoint mengembalikan { data: [...] }, bukan array langsung —
          // membacanya sebagai array membuat rekap selalu kosong.
          const list: any[] = Array.isArray(res) ? res : res?.data || [];
          const rows = list.map((x: any) => {
            const meal =
              (Number(x.mealAllowanceQuantity) || 0) *
              (Number(x.mealAllowanceRate) || 0);
            const transport =
              (Number(x.transportationAllowanceQuantity) || 0) *
              (Number(x.transportationAllowanceRate) || 0);
            const overtime =
              (Number(x.overtimeQuantity) || 0) * (Number(x.overtimeRate) || 0);
            const allowanceIn = this.sumBy(x.allowances, true);
            const allowanceOut = this.sumBy(x.allowances, false);
            const deductionIn = this.sumBy(x.deductions, true);
            const deductionOut = this.sumBy(x.deductions, false);
            const basic = Number(x.basicSalary) || 0;
            // Penghasilan yang menjadi dasar hitungan PPh: hanya komponen
            // yang ditandai included.
            const taxable =
              basic + meal + transport + overtime + allowanceIn - deductionIn;
            const tax = Number(x.taxAmount) || 0;

            return {
              name: x.name,
              nik: x.nik,
              position: x.position,
              department: x.department,
              taxCategory: x.taxCategory,
              basicSalary: basic,
              meal,
              transport,
              overtime,
              allowanceIn,
              allowanceOut,
              deductionIn,
              deductionOut,
              taxable,
              tax,
              total: taxable + allowanceOut - deductionOut - tax,
            };
          });

          // Selain lembar ringkasan, dokumen lama juga memuat satu lembar
          // rincian per karyawan (dinamai NIK) — tetap dipertahankan.
          const detailSheets = list.map((x: any) => {
            const meal =
              (Number(x.mealAllowanceQuantity) || 0) *
              (Number(x.mealAllowanceRate) || 0);
            const transport =
              (Number(x.transportationAllowanceQuantity) || 0) *
              (Number(x.transportationAllowanceRate) || 0);
            const overtime =
              (Number(x.overtimeQuantity) || 0) * (Number(x.overtimeRate) || 0);
            const allowanceTotal = (x.allowances || []).reduce(
              (a: number, b: any) => a + (Number(b.amount) || 0),
              0,
            );

            const detailRows: any[] = [
              { kind: 'field', label: 'Nama', value: x.name },
              { kind: 'field', label: 'NIK', value: x.nik },
              { kind: 'field', label: 'Jabatan', value: x.position },
              { kind: 'field', label: 'Departemen', value: x.department },
              { kind: 'field', label: 'Kelas Pajak', value: x.taxCategory },
              { kind: 'section', label: 'PENDAPATAN' },
              {
                kind: 'item',
                label: 'Gaji Pokok',
                quantity: 1,
                unit: 'LS',
                rate: Number(x.basicSalary) || 0,
                amount: Number(x.basicSalary) || 0,
              },
              {
                kind: 'item',
                label: 'Tunjangan uang makan',
                quantity: x.mealAllowanceQuantity,
                unit: 'hari',
                rate: Number(x.mealAllowanceRate) || 0,
                amount: meal,
              },
              {
                kind: 'item',
                label: 'Tunjangan transportasi',
                quantity: x.transportationAllowanceQuantity,
                unit: 'hari',
                rate: Number(x.transportationAllowanceRate) || 0,
                amount: transport,
              },
              {
                kind: 'item',
                label: 'Lembur',
                quantity: x.overtimeQuantity,
                unit: 'jam',
                rate: Number(x.overtimeRate) || 0,
                amount: overtime,
              },
              { kind: 'section', label: 'PENDAPATAN LAINNYA' },
            ];

            if ((x.allowances || []).length === 0) {
              detailRows.push({
                kind: 'note',
                label: 'Tidak ada pendapatan lainnya',
              });
            } else {
              (x.allowances as any[]).forEach((u) =>
                detailRows.push({
                  kind: 'item',
                  label: u.name,
                  quantity: 1,
                  unit: 'LS',
                  rate: Number(u.amount) || 0,
                  amount: Number(u.amount) || 0,
                }),
              );
            }

            detailRows.push({
              kind: 'total',
              label: 'Jumlah pendapatan',
              amount:
                (Number(x.basicSalary) || 0) +
                meal +
                transport +
                overtime +
                allowanceTotal,
            });

            detailRows.push({ kind: 'section', label: 'PENGURANGAN' });
            if ((x.deductions || []).length === 0) {
              detailRows.push({ kind: 'note', label: 'Tidak ada pengurangan' });
            } else {
              (x.deductions as any[]).forEach((u) =>
                detailRows.push({
                  kind: 'item',
                  label: u.name,
                  quantity: 1,
                  unit: 'LS',
                  rate: Number(u.amount) || 0,
                  amount: Number(u.amount) || 0,
                }),
              );
            }
            detailRows.push({
              kind: 'total',
              label: 'Potongan PPh 21',
              amount: Number(x.taxAmount) || 0,
            });

            return {
              // nama lembar Excel maksimal 31 karakter
              sheetName: String(x.nik || x.name || 'Slip').slice(0, 31),
              title: x.name,
              subtitle: `NIK ${x.nik ?? '-'}  •  Periode ${periode}`,
              rows: detailRows,
            };
          });

          downloadRecapExcel(
            [
              {
                fileName: `Rekap PPh Gaji ${periode}`,
                sheetName: 'Ringkasan',
                title: 'REKAP PPh PASAL 21 — GAJI KARYAWAN',
                subtitle: `Periode ${periode}`,
                rows,
                columns: [
                  { header: 'Nama', key: 'name', width: 28 },
                  { header: 'NIK', key: 'nik', width: 22 },
                  { header: 'Jabatan', key: 'position', width: 20 },
                  { header: 'Departemen', key: 'department', width: 18 },
                  {
                    header: 'Kelas Pajak',
                    key: 'taxCategory',
                    width: 12,
                    align: 'center' as const,
                  },
                  { header: 'Gaji Pokok', key: 'basicSalary', ...this.money() },
                  { header: 'Uang Makan', key: 'meal', ...this.money() },
                  { header: 'Transportasi', key: 'transport', ...this.money() },
                  { header: 'Lembur', key: 'overtime', ...this.money() },
                  {
                    header: 'Tunjangan\n(kena PPh)',
                    key: 'allowanceIn',
                    ...this.money(18),
                  },
                  {
                    header: 'Tunjangan\n(non-PPh)',
                    key: 'allowanceOut',
                    ...this.money(18),
                  },
                  {
                    header: 'Potongan\n(kena PPh)',
                    key: 'deductionIn',
                    ...this.money(18),
                  },
                  {
                    header: 'Potongan\n(non-PPh)',
                    key: 'deductionOut',
                    ...this.money(18),
                  },
                  {
                    header: 'Dasar Hitung PPh',
                    key: 'taxable',
                    ...this.money(18),
                  },
                  { header: 'PPh 21', key: 'tax', ...this.money() },
                  { header: 'Diterima', key: 'total', ...this.money() },
                ],
              },
              ...detailSheets,
            ],
            `Rekap PPh Gaji ${periode}`,
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
            this.serverMessage.terjemahkan(error, 'notify.loadFailed'),
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
