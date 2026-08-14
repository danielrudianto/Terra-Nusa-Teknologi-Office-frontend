import { Component, inject } from '@angular/core';
import { DeleteConfirmationComponent } from 'src/app/components/delete-confirmation/delete-confirmation.component';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { SalarySlipEmployeePickerComponent } from '../salary-slip-employee-picker/salary-slip-employee-picker.component';
import { TranslateService } from '@ngx-translate/core';
import { CanDirective } from '../../../directives/can.directive';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ApiService } from '../../../services/api.service';
import { MatDialog } from '@angular/material/dialog';
import { SalarySlipViewComponent } from '../salary-slip-view/salary-slip-view.component';
import { SalaryPaymentCreateComponent } from 'src/app/components/payment-create/salary-payment-create/salary-payment-create.component';
import { debounceTime } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { TranslatePipe } from '@ngx-translate/core';
import * as _moment from 'moment';
// tslint:disable-next-line:no-duplicate-imports
import { default as _rollupMoment, Moment } from 'moment';
import {
  MatDatepicker,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SalarySlipHelper } from 'src/app/helpers/salary-slip.helper';
import { SettingsService } from '../../../services/setting.service';
import { RefreshButtonComponent } from '../../../components/refresh-button/refresh-button.component';

const moment = _rollupMoment || _moment;

// See the Moment.js docs for the meaning of these formats:
// https://momentjs.com/docs/#/displaying/format/
export const MY_FORMATS = {
  parse: {
    dateInput: 'MM/YYYY',
  },
  display: {
    dateInput: 'MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-salary-slip-list',
  providers: [provideMomentDateAdapter(MY_FORMATS)],
  imports: [
    CanDirective,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatPaginatorModule,
    HeaderTitleComponent,
    MatDatepickerModule,
    MatMenuModule,
    TranslatePipe,
    RefreshButtonComponent,
  ],
  templateUrl: './salary-slip-list.component.html',
  styleUrl: './salary-slip-list.component.scss',
  standalone: true,
})
export class SalarySlipListComponent {
  private readonly serverMessage = inject(ServerMessageService);
  private readonly translate = inject(TranslateService);
  /**
   * Buka pemilih karyawan dan periode.
   *
   * Dialognya mengarahkan sendiri ke halaman pembuatan slip bila periodenya
   * belum terpakai; di sini tidak ada yang perlu dikerjakan setelahnya.
   */
  buatSlip(): void {
    this.dialog.open(SalarySlipEmployeePickerComponent, {
      width: '520px',
      maxWidth: '94vw',
      autoFocus: false,
    });
  }

  constructor(
    public settings: SettingsService,
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}
  month: number = new Date().getMonth();
  year: number = new Date().getFullYear();
  readonly date = new FormControl(
    moment(new Date(this.year, this.month - 1, 1)),
  );

  ngOnInit(): void {
    this.fetchSalarySlips();

    this.formControl.valueChanges.pipe(debounceTime(500)).subscribe(() => {
      this.fetchSalarySlips(1);
    });

    this.date.valueChanges.subscribe((date) => {
      if (date) {
        const month = date.month() + 1;
        const year = date.year();

        this.month = month;
        this.year = year;

        this.fetchSalarySlips(1);
      }
    });
  }

  setMonthAndYear(
    normalizedMonthAndYear: Moment,
    datepicker: MatDatepicker<Moment>,
  ) {
    const ctrlValue = this.date.value ?? moment();
    ctrlValue.month(normalizedMonthAndYear.month());
    ctrlValue.year(normalizedMonthAndYear.year());
    this.date.setValue(ctrlValue);
    datepicker.close();
  }

  dataSource: any[] = [];
  dataCount: number = 0;
  page: number = 1;
  /** Nilai awal dari pengaturan pengguna; tetap bisa diubah per halaman. */
  pageSize: number = this.settings.pageSize;
  displayedColumns = [
    'name',
    'month',
    'year',
    'basic',
    'transportation',
    'overtime',
    'meal',
    'allowances',
    'deductions',
    'pph',
    'status',
    'action',
  ];
  formControl: FormControl = new FormControl('');

  /*
   * Bulan punya DUA sebutan, dan keduanya diperlukan.
   *
   * `key`  — untuk yang tampil di layar; ikut bahasa aplikasi.
   * `nama` — nama Indonesia tetap, dipakai pada dokumen yang dicetak.
   *
   * Slip gaji seluruhnya berbahasa Indonesia ("SLIP GAJI", "Periode"),
   * sehingga bulannya harus Indonesia berapa pun bahasa aplikasinya.
   * Sebelumnya kolom ini berisi teks Inggris, dan slip yang tercetak
   * berbunyi "Periode January 2026".
   */
  months: { value: number; key: string; nama: string }[] = [
    { value: 1, key: 'common.january', nama: 'Januari' },
    { value: 2, key: 'common.february', nama: 'Februari' },
    { value: 3, key: 'common.march', nama: 'Maret' },
    { value: 4, key: 'common.april', nama: 'April' },
    { value: 5, key: 'common.may', nama: 'Mei' },
    { value: 6, key: 'common.june', nama: 'Juni' },
    { value: 7, key: 'common.july', nama: 'Juli' },
    { value: 8, key: 'common.august', nama: 'Agustus' },
    { value: 9, key: 'common.september', nama: 'September' },
    { value: 10, key: 'common.october', nama: 'Oktober' },
    { value: 11, key: 'common.november', nama: 'November' },
    { value: 12, key: 'common.december', nama: 'Desember' },
  ];

  changePage(page: PageEvent) {
    if ((this.pageSize = page.pageSize)) {
      this.fetchSalarySlips(page.pageIndex + 1);
    } else {
      this.pageSize = page.pageSize;
      this.fetchSalarySlips(1);
    }
  }

  /** Kolom & arah pengurutan; dikirim ke server agar mencakup seluruh data. */
  sortBy: string = 'name';
  sortByDirection: 'asc' | 'desc' = 'asc';

  /** Mengklik kolom yang sama membalik arahnya. */
  changeSortBy(sortBy: string) {
    if (this.sortBy === sortBy) {
      this.sortByDirection = this.sortByDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortByDirection = 'asc';
    }

    this.fetchSalarySlips(1);
  }

  fetchSalarySlips(targetPage: number = this.page) {
    this.page = targetPage;
    this.apiService
      .get('salary-slips', {
        sortBy: this.sortBy,
        sortByDirection: this.sortByDirection,
        page: this.page,
        pageSize: this.pageSize,
        keyword: this.formControl.value,
        month: this.month,
        year: this.year,
      })
      .subscribe((response: any) => {
        this.dataSource = response.data;
        this.dataCount = response.count;
      });
  }

  viewSalarySlip(id: number) {
    this.dialog
      .open(SalarySlipViewComponent, {
        data: {
          id: id,
        },
        width: '620px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((data) => {
        if (data === 'deleted') {
          const index = this.dataSource.findIndex((x) => x.id == id);
          if (index != -1) {
            this.dataSource[index].isDelete = true;
          }
        }
      });
  }

  createPayment(id: number) {
    this.dialog
      .open(SalaryPaymentCreateComponent, {
        data: {
          id: id,
        },
      })
      .afterClosed()
      .subscribe((data) => {});
  }

  printSalarySlip(id: number) {
    // Ambil detail lengkap lalu cetak lewat helper YANG SAMA dengan create & view,
    // supaya format PDF-nya seragam di semua tempat.
    this.apiService.get(`salary-slips/${id}`, {}).subscribe({
      next: (res: any) => {
        const d = res.data || {};
        const allowances = res.allowances || [];
        const deductions = res.deductions || [];
        const data = {
          name: d.name,
          nik: d.nik ?? d.userID ?? '',
          department: d.department,
          position: d.position,
          address: d.address,
          taxCategory: d.taxCategory,
          taxAmount: d.taxAmount ?? 0,
          basicSalary: d.basicSalary ?? 0,
          transportationAllowanceQuantity:
            d.transportationAllowanceQuantity ?? 0,
          transportationAllowanceRate: d.transportationAllowanceRate ?? 0,
          mealAllowanceQuantity: d.mealAllowanceQuantity ?? 0,
          mealAllowanceRate: d.mealAllowanceRate ?? 0,
          overtimeQuantity: d.overtimeQuantity ?? 0,
          overtimeRate: d.overtimeRate ?? 0,
          paymentMethod: d.paymentMethod ?? '',
          year: d.year,
          month: d.month,
          monthName: this.months[d.month - 1]?.nama || '',
          otherAllowances: allowances.map((x: any) => ({
            name: x.name,
            description: x.description,
            amount: x.amount,
          })),
          deductions: deductions.map((x: any) => ({
            name: x.name,
            description: x.description,
            amount: x.amount,
          })),
          bankAccountName: d.bankAccountName,
          bankAccountNumber: d.bankAccountNumber,
          bankName: d.bankName,
        };
        SalarySlipHelper.createProxyPaymentPDF(data as any);
      },
      error: (error) => {
        this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
          duration: 3000,
        });
      },
    });
  }

  sendSalarySlip(id: number) {
    this.apiService
      .post(`salary-slips/send`, {
        id: id,
      })
      .subscribe({
        next: (data) => {
          this.snackBar.open(
      this.translate.instant('notify.salarySlipSent'), 'Close', {
            duration: 3000,
          });
        },
        error: (error) => {
          this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
            duration: 3000,
          });
        },
      });
  }

  isSendingBulk = false;

  /**
   * Slip pada halaman ini yang dapat dikirim.
   *
   * Alamat surel diperiksa bila memang ikut terkirim dari server. Bila
   * kolomnya tidak ada sama sekali — misalnya pada versi backend yang belum
   * menyertakannya — seluruh slip dianggap dapat dikirim, dan server yang
   * memutuskan mana yang gagal.
   *
   * Menonaktifkan tombol karena kolom yang tidak ada berarti fitur ini mati
   * tanpa satu pun penjelasan, dan itu lebih membingungkan daripada
   * kegagalan yang disebutkan.
   */
  get slipDapatDikirim(): any[] {
    const data = this.dataSource || [];
    const adaKolomEmail = data.some((x) => x?.email !== undefined);
    return adaKolomEmail ? data.filter((x) => !!x?.email) : data;
  }

  /**
   * Kirim seluruh slip pada halaman ini.
   *
   * Dikonfirmasi lebih dulu karena surel tidak dapat ditarik kembali —
   * dan yang dikirim adalah dokumen gaji, yang keliru alamat berarti orang
   * lain membaca gaji seseorang.
   *
   * Yang dikirim hanya slip pada halaman yang sedang tampil, mengikuti
   * penyaring bulan dan pencarian. Dengan begitu "kirim semua" selalu
   * berarti "kirim yang terlihat", bukan sesuatu yang lebih luas dari yang
   * sedang dilihat.
   */
  kirimSemua(): void {
    const slip = this.slipDapatDikirim;
    if (!slip.length) {
      this.snackBar.open(
        this.translate.instant('salarySlip.noneToSend'),
        'Close',
        { duration: 3000 },
      );
      return;
    }

    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: this.translate.instant('salarySlip.sendAllTitle'),
          prompt: this.translate.instant('salarySlip.sendAllPrompt', {
            count: slip.length,
          }),
          confirmLabel: this.translate.instant('salarySlip.sendAllConfirm'),
          isDestructive: false,
        },
      })
      .afterClosed()
      .subscribe((setuju) => {
        if (!setuju) return;
        this.isSendingBulk = true;

        this.apiService
          .post('salary-slips/send-bulk', { ids: slip.map((x) => x.id) })
          .subscribe({
            next: (r: any) => {
              const terkirim = r?.sent ?? 0;
              const gagal = r?.failed ?? 0;

              // Kegagalan disebut jumlahnya, bukan disembunyikan: yang
              // mengirim perlu tahu ada yang harus diulang.
              this.snackBar.open(
                gagal
                  ? this.translate.instant('salarySlip.sendAllPartial', {
                      sent: terkirim,
                      failed: gagal,
                    })
                  : this.translate.instant('salarySlip.sendAllDone', {
                      sent: terkirim,
                    }),
                'Close',
                { duration: gagal ? 6000 : 4000 },
              );

              if (gagal) console.warn('[Slip gaji] gagal dikirim:', r?.failures);
            },
            error: (e) => {
              this.snackBar.open(this.serverMessage.terjemahkan(e), 'Close', {
                duration: 4000,
              });
            },
          })
          .add(() => (this.isSendingBulk = false));
      });
  }

  generateSalarySlip(data: any) {
    SalarySlipHelper.createProxyPaymentPDF(data);
  }
}
