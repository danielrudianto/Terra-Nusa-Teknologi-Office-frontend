import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CalendarDaySelectorComponent } from './calendar-day-selector/calendar-day-selector.component';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CalendarMonthSelectorComponent } from './calendar-month-selector/calendar-month-selector.component';
import { CalendarAccountSelectorComponent } from './calendar-account-selector/calendar-account-selector.component';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { CalendarTableComponent } from './calendar-table/calendar-table.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RefreshButtonComponent } from '../../components/refresh-button/refresh-button.component';

@Component({
  selector: 'app-calendar',
  imports: [
    TranslatePipe,
    FormsModule,
    ReactiveFormsModule,
    CalendarMonthSelectorComponent,
    CalendarAccountSelectorComponent,
    MatButtonToggleModule,
    CalendarTableComponent,
    MatButtonModule,
    MatIconModule,
    RefreshButtonComponent,
  ],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
  standalone: true,
})
export class CalendarComponent {
  constructor(private dialog: MatDialog) {}

  month: number = new Date().getMonth(); // Months are 0-indexed in JS
  year: number = new Date().getFullYear();
  bankAccounts: any[] = [];
  isLoadingData: boolean = false;

  // mode tampilan calendar: 'expense' | 'income' | 'balance'
  viewMode: FormControl = new FormControl('expense');

  /**
   * Dinaikkan untuk memuat ulang isi kalender.
   *
   * Kalender menarik beberapa hal sekaligus — pembayaran, rencana kas, yang
   * tertunda, ringkasan — dan semuanya berubah karena tindakan orang lain.
   * Tanpa cara menyegarkan, satu-satunya jalan adalah memuat ulang halaman,
   * yang mengembalikan bulan dan saringan rekening ke keadaan awal.
   */
  penyegar = 0;

  muatUlang(): void {
    this.penyegar++;
  }

  onCalendarBoxClicked(event: number | null) {
    if (event == null) return;

    this.dialog
      .open(CalendarDaySelectorComponent, {
        data: {
          date: event,
          month: this.month,
          year: this.year,
          bankAccountID: this.bankAccounts.map((x) => {
            return x;
          }),
        },
        width: '80vw',
        height: '80vh',
        maxWidth: '80vw',
        maxHeight: '80vh',
      })
      .afterClosed()
      .subscribe((berubah) => {
        /*
         * Kalender dimuat ulang bila ada yang disetujui atau ditolak.
         *
         * Bannernya menghitung dari SELURUH bulan lewat rutenya sendiri,
         * sehingga menyetujui satu pembayaran di dialog tidak membuatnya
         * hilang — dan yang membacanya mengira tindakannya tidak berhasil.
         *
         * Lewat `muatUlang()` — jalur yang sama dengan tombol segarkan di
         * kepala halaman. Sebelumnya angka bulannya disentuh menjadi -1 lalu
         * dikembalikan; itu bekerja, tetapi menaruh cara memuat ulang di
         * tempat yang tidak menyebut dirinya begitu.
         */
        if (!berubah) return;
        this.muatUlang();
      });
  }

  onMonthChanged(event: any) {
    this.month = event.month;
    this.year = event.year;
  }

  onBankAccountChanges(event: any) {
    this.bankAccounts = event;
  }
}
