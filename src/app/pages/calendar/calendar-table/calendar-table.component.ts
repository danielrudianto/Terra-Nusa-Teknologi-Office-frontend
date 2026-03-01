import { CommonModule, DecimalPipe } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChange,
  SimpleChanges,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { saveAs } from 'file-saver';
import { ICalendarValue } from 'src/app/model/calendar.model';
import { ShortCurrencyPipe } from 'src/app/pipes/short-currency.pipe';
import { ApiService } from 'src/app/services/api.service';
import * as xlsx from 'xlsx-js-style';

@Component({
  selector: 'app-calendar-table',
  providers: [DecimalPipe],
  imports: [CommonModule, MatIconModule, ShortCurrencyPipe, MatButtonModule],
  templateUrl: './calendar-table.component.html',
  styleUrl: './calendar-table.component.scss',
  standalone: true,
})
export class CalendarTableComponent {
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
  ) {}

  @Input('month') month!: number;
  @Input('year') year!: number;
  @Input('bankAccounts') bankAccounts: any[] = [];
  @Input('values') values: ICalendarValue[] = [];
  @Input('selectedDay') selectedDay: number | null = null;
  @Input('isBalance') isBalance!: boolean;
  @Output('onCalendarBoxClicked') onCalendarBoxClicked: EventEmitter<
    number | null
  > = new EventEmitter<number | null>();

  weeks: (number | null)[][] = [];
  data: any[] = [];
  incomeData: any[] = [];
  interpayments: any[] = [];
  balance: number = 0;
  isDownloading: boolean = false;

  ngOnInit() {
    this.generateCalendar();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.hasOwnProperty('selectedDay')) {
      return;
    }

    if (this.month === undefined || this.year === undefined) {
      console.error(
        'Month and year inputs are required for CalendarTableComponent.',
      );
      return;
    }

    this.generateCalendar();
  }

  generateCalendar() {
    this.weeks = [];
    const firstDay = new Date(this.year, this.month, 1);
    const daysInMonth = new Date(this.year, this.month + 1, 0).getDate();
    let firstDayOfWeek = (firstDay.getDay() + 6) % 7;

    let week: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      week.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(this.year, this.month, day);
      const currentDayOfWeek = (currentDate.getDay() + 6) % 7;

      if (currentDayOfWeek <= 6) {
        week.push(day);
      }

      if (week.length > 0) {
        if (currentDayOfWeek === 6 || day === daysInMonth) {
          while (week.length <= 6) {
            week.push(null);
          }
          this.weeks.push(week);
          week = [];
        }
      }
    }

    this.fetchData();
  }

  fetchData() {
    this.apiService
      .get('calendar', {
        month: this.month + 1,
        year: this.year,
        bankAccounts: this.bankAccounts
          .filter((x) => x.selected)
          .map((x) => x.id),
      })
      .subscribe({
        next: (data: any) => {
          this.data = data.payments;
          this.incomeData = data.incomes;
          this.interpayments = data.interpayments;
          this.balance = data.balances;
        },
        error: (error) => {
          this.snackBar.open(
            'Failed to load calendar data. Please try again later.',
            'Close',
            {
              duration: 3000,
            },
          );
        },
      });
  }

  dayIsToday(day: number | null): boolean {
    if (day === null) {
      return false;
    }

    const thisDay = new Date(this.year, this.month, day);
    const today = new Date();
    return (
      thisDay.getDate() === today.getDate() &&
      thisDay.getMonth() === today.getMonth() &&
      thisDay.getFullYear() === today.getFullYear()
    );
  }

  dataForDay(day: number): number {
    const index = this.data.findIndex((x) => new Date(x.date).getDate() == day);
    const currentDate = new Date(this.year, this.month, day);
    if (this.isBalance) {
      const previousExpenses = this.data
        .filter((x) => new Date(x.date).getTime() < currentDate.getTime())
        .reduce((acc, x) => acc + x.amount, 0);
      const previousIncomes = this.incomeData
        .filter((x) => new Date(x.date).getTime() < currentDate.getTime())
        .reduce((acc, x) => acc + x.amount, 0);

      const currentBalance = this.balance - previousExpenses + previousIncomes;

      return currentBalance;
    } else {
      return index == -1 ? 0 : this.data[index].amount;
    }
  }

  onDayClick(day: number | null) {
    if (day === null) {
      this.onCalendarBoxClicked.emit(null);
      return;
    }
    this.onCalendarBoxClicked.emit(day);
  }

  interpaymentExistsForDay(day: number | null): boolean {
    if (day == null) {
      return false;
    }

    const index = this.interpayments.findIndex(
      (x) => new Date(x.date).getDate() == day,
    );
    return index >= 0;
  }

  onCalendarDownload() {
    if (this.isDownloading) return;
    this.isDownloading = true;

    this.apiService
      .get('calendar/download', {
        month: this.month + 1,
        year: this.year,
        bankAccounts: this.bankAccounts
          .filter((x) => x.selected)
          .map((x) => x.id),
      })
      .subscribe({
        next: (data: any) => {
          const workbook = xlsx.utils.book_new();

          const month = this.month + 1;
          const year = this.year;

          const firstDate = new Date(year, month - 1, 1);
          const lastDate = new Date(year, month, 0);
          const totalDays = lastDate.getDate();

          const convertDay = (jsDay: number) => (jsDay === 0 ? 6 : jsDay - 1);

          data.bank_accounts.forEach((account: any) => {
            const sheetName = account.bankAccountNumber;
            const sheetBankID = account.id;

            const totalCols = 28;
            const header: any[][] = [];

            header[0] = new Array(totalCols).fill('');
            header[0][0] = 'Kalender Pembayaran';

            header[1] = new Array(totalCols).fill('');
            header[1][0] = `Rekening ${account.bankAccountNumber}`;

            header[2] = new Array(totalCols).fill('');

            const worksheet = xlsx.utils.aoa_to_sheet(header);

            // ===============================
            // STYLE BASE
            // ===============================
            worksheet['!freeze'] = { xSplit: 0, ySplit: 3 };
            const border = {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' },
            };

            const center = {
              alignment: { horizontal: 'center', vertical: 'center' },
              border,
            };

            const headerStyle = {
              font: { bold: true },
              alignment: { horizontal: 'center', vertical: 'center' },
              border,
            };

            const numberStyle = {
              alignment: { horizontal: 'right', vertical: 'center' },
              border,
            };

            const days = [
              'Senin',
              'Selasa',
              'Rabu',
              'Kamis',
              'Jumat',
              'Sabtu',
              'Minggu',
            ];

            // ===============================
            // ISI NAMA HARI (baris ke-2)
            // ===============================
            days.forEach((day, i) => {
              const cell = xlsx.utils.encode_cell({ r: 2, c: i * 4 });
              worksheet[cell] = { t: 's', v: day, s: headerStyle };
            });

            // ===============================
            // MERGE HEADER
            // ===============================
            worksheet['!merges'] = [
              { s: { r: 0, c: 0 }, e: { r: 0, c: 27 } },
              { s: { r: 1, c: 0 }, e: { r: 1, c: 27 } },
              ...Array.from({ length: 7 }).map((_, i) => ({
                s: { r: 2, c: i * 4 },
                e: { r: 2, c: i * 4 + 3 },
              })),
            ];

            // ===============================
            // COLUMN WIDTH (PIXEL BASED)
            // ===============================
            worksheet['!cols'] = Array.from({ length: 28 }).map((_, i) => {
              const mod = i % 4;
              if (mod === 0) return { wpx: 110 };
              if (mod === 1) return { wpx: 140 };
              if (mod === 2) return { wpx: 190 };
              return { wpx: 120 };
            });

            // ===============================
            // H1 & H2 STYLE
            // ===============================
            worksheet['A1'].s = {
              font: { bold: true, sz: 14 },
              alignment: { horizontal: 'center', vertical: 'center' },
            };

            worksheet['A2'].s = {
              font: { bold: true },
              alignment: { horizontal: 'center', vertical: 'center' },
            };

            // ===============================
            // BUILD TRANSACTIONS
            // ===============================
            const normalPayments = (data.payments || [])
              .filter((p: any) => p.bankAccountID === sheetBankID)
              .map((p: any) => ({
                date: p.date,
                documentName: p.documentName || '-',
                counterparty: p.bankAccountName || '-',
                nominal:
                  typeof p.amount === 'object'
                    ? -Number(p.amount.parsedValue)
                    : -Number(p.amount),
              }));

            const interpayments = (data.interpayments || [])
              .map((ip: any) => {
                if (ip.bankAccountIDOrigin === sheetBankID) {
                  return {
                    date: ip.date,
                    documentName: `INTER-${ip.id}`,
                    counterparty: ip.destinationBankAccountName,
                    nominal: -Number(ip.amount.parsedValue),
                  };
                } else if (ip.bankAccountIDDestination === sheetBankID) {
                  return {
                    date: ip.date,
                    documentName: `INTER-${ip.id}`,
                    counterparty: ip.originBankAccountName,
                    nominal: Number(ip.amount.parsedValue),
                  };
                }
                return null;
              })
              .filter(Boolean);

            const allTransactions = [...normalPayments, ...interpayments];

            const grouped: any = {};
            allTransactions.forEach((trx: any) => {
              if (!grouped[trx.date]) grouped[trx.date] = [];
              grouped[trx.date].push(trx);
            });

            const openingBalance = this.getOpeningBalance(
              data.balances,
              sheetBankID,
            );

            // ===============================
            // PASS 1: Hitung minggu dan max transaksi per minggu (minimal 5)
            // ===============================
            const firstDayIndex = convertDay(firstDate.getDay()); // 0=Senin
            let weekIndex = 0;
            let currentCol = firstDayIndex;
            const weeks: {
              days: number[];
              maxTrans: number;
              startRow?: number;
            }[] = [];

            for (let day = 1; day <= totalDays; day++) {
              if (!weeks[weekIndex]) {
                weeks[weekIndex] = { days: [], maxTrans: 0 };
              }
              weeks[weekIndex].days.push(day);

              const dateStr = new Date(year, month - 1, day)
                .toISOString()
                .split('T')[0];
              const transCount = (grouped[dateStr] || []).length;
              if (transCount > weeks[weekIndex].maxTrans) {
                weeks[weekIndex].maxTrans = transCount;
              }

              currentCol++;
              if (currentCol > 6) {
                currentCol = 0;
                weekIndex++;
              }
            }

            // Set minimal 5 baris per hari
            weeks.forEach((w) => {
              w.maxTrans = Math.max(w.maxTrans, 5);
            });

            // Hitung posisi baris awal setiap minggu
            let currentRow = 3; // baris awal minggu pertama
            for (let w of weeks) {
              w.startRow = currentRow;
              currentRow += 3 + w.maxTrans; // 3 baris (tanggal, saldo, header) + maxTrans baris transaksi
            }
            const maxRow = currentRow - 1; // baris terakhir yang ditulis

            // ===============================
            // PASS 2: Tulis data per hari
            // ===============================
            let previousSaldoAkhirCell = '';
            let isFirstDay = true;

            for (let day = 1; day <= totalDays; day++) {
              const currentDate = new Date(year, month - 1, day);
              const isoDate = currentDate.toISOString().split('T')[0];

              // Cari week yang mengandung hari ini
              const week = weeks.find((w) => w.days.includes(day))!;
              const weekStartRow = week.startRow!;
              const maxTrans = week.maxTrans;

              // Hitung colStart berdasarkan posisi hari dalam minggu
              const firstDayOfWeek = week.days[0];
              const firstDateOfWeek = new Date(year, month - 1, firstDayOfWeek);
              const firstCol = convertDay(firstDateOfWeek.getDay());
              const dayIndexInWeek = day - firstDayOfWeek; // asumsi hari berurutan
              const colStart = (firstCol + dayIndexInWeek) * 4;

              // ===== TANGGAL =====
              const tanggalCell = xlsx.utils.encode_cell({
                r: weekStartRow,
                c: colStart,
              });
              worksheet[tanggalCell] = {
                t: 's',
                v: `${day} ${currentDate.toLocaleString('id-ID', { month: 'long' })} ${year}`,
                s: headerStyle,
              };
              worksheet['!merges'].push({
                s: { r: weekStartRow, c: colStart },
                e: { r: weekStartRow, c: colStart + 3 },
              });

              // ===== SALDO LABEL =====
              worksheet[
                xlsx.utils.encode_cell({ r: weekStartRow + 1, c: colStart })
              ] = {
                t: 's',
                v: 'Saldo Awal',
                s: center,
              };
              worksheet[
                xlsx.utils.encode_cell({ r: weekStartRow + 1, c: colStart + 2 })
              ] = {
                t: 's',
                v: 'Saldo Akhir',
                s: center,
              };

              const saldoAwalCell = xlsx.utils.encode_cell({
                r: weekStartRow + 1,
                c: colStart + 1,
              });
              const saldoAkhirCell = xlsx.utils.encode_cell({
                r: weekStartRow + 1,
                c: colStart + 3,
              });

              // Range nominal untuk SUM
              const nominalStart = xlsx.utils.encode_cell({
                r: weekStartRow + 3,
                c: colStart + 3,
              });
              const nominalEnd = xlsx.utils.encode_cell({
                r: weekStartRow + 2 + maxTrans,
                c: colStart + 3,
              });

              // ===== SALDO AWAL =====
              if (isFirstDay) {
                worksheet[saldoAwalCell] = {
                  t: 'n',
                  v: openingBalance,
                  z: '#,##0.00',
                  s: { ...numberStyle, font: { bold: true } },
                };
                isFirstDay = false;
              } else {
                worksheet[saldoAwalCell] = {
                  t: 'n',
                  f: `=${previousSaldoAkhirCell}`,
                  z: '#,##0.00',
                  s: { ...numberStyle, font: { bold: true } },
                };
              }

              // ===== SALDO AKHIR =====
              worksheet[saldoAkhirCell] = {
                t: 'n',
                f: `=${saldoAwalCell}+SUM(${nominalStart}:${nominalEnd})`,
                z: '#,##0.00',
                s: { ...numberStyle, font: { bold: true } },
              };

              // ===== HEADER TABEL =====
              const tableHeaders = [
                'Tanggal',
                'Nomor Dokumen',
                'Lawan Transaksi',
                'Nominal',
              ];
              tableHeaders.forEach((val, i) => {
                worksheet[
                  xlsx.utils.encode_cell({
                    r: weekStartRow + 2,
                    c: colStart + i,
                  })
                ] = {
                  t: 's',
                  v: val,
                  s: headerStyle,
                };
              });

              // ===== TRANSAKSI =====
              const transaksi = grouped[isoDate] || [];
              for (let i = 0; i < maxTrans; i++) {
                const row = weekStartRow + 3 + i;
                if (i < transaksi.length) {
                  const trx = transaksi[i];
                  worksheet[xlsx.utils.encode_cell({ r: row, c: colStart })] = {
                    t: 's',
                    v: trx.date,
                    s: center,
                  };
                  worksheet[
                    xlsx.utils.encode_cell({ r: row, c: colStart + 1 })
                  ] = {
                    t: 's',
                    v: trx.documentName,
                    s: center,
                  };
                  worksheet[
                    xlsx.utils.encode_cell({ r: row, c: colStart + 2 })
                  ] = {
                    t: 's',
                    v: trx.counterparty,
                    s: center,
                  };
                  worksheet[
                    xlsx.utils.encode_cell({ r: row, c: colStart + 3 })
                  ] = {
                    t: 'n',
                    v: trx.nominal,
                    z: '#,##0.00',
                    s: numberStyle,
                  };
                } else {
                  // Baris kosong: tetap buat sel dengan style agar border muncul
                  worksheet[xlsx.utils.encode_cell({ r: row, c: colStart })] = {
                    t: 's',
                    v: '',
                    s: center,
                  };
                  worksheet[
                    xlsx.utils.encode_cell({ r: row, c: colStart + 1 })
                  ] = {
                    t: 's',
                    v: '',
                    s: center,
                  };
                  worksheet[
                    xlsx.utils.encode_cell({ r: row, c: colStart + 2 })
                  ] = {
                    t: 's',
                    v: '',
                    s: center,
                  };
                  worksheet[
                    xlsx.utils.encode_cell({ r: row, c: colStart + 3 })
                  ] = {
                    t: 's',
                    v: '',
                    s: numberStyle,
                  };
                }
              }

              previousSaldoAkhirCell = saldoAkhirCell;
            }

            // ===============================
            // BORDER UNTUK SEMUA SEL (A sd AB, baris 0 sd maxRow)
            // ===============================
            for (let r = 0; r <= maxRow; r++) {
              for (let c = 0; c < 28; c++) {
                const cellRef = xlsx.utils.encode_cell({ r, c });
                if (!worksheet[cellRef]) {
                  worksheet[cellRef] = { t: 's', v: '', s: { border } };
                }
                // Jika sudah ada, style-nya sudah mengandung border
              }
            }

            // ===============================
            // SET PRINT PREVIEW A3 LANDSCAPE
            // ===============================
            worksheet['!pageSetup'] = {
              paperSize: 8, // A3
              orientation: 'landscape',
            };

            // Atur tinggi baris sesuai maxRow
            worksheet['!rows'] = Array.from({ length: maxRow + 1 }).map(() => ({
              hpx: 22,
            }));

            // Perbarui range worksheet
            worksheet['!ref'] = xlsx.utils.encode_range({
              s: { r: 0, c: 0 },
              e: { r: maxRow, c: 27 },
            });

            xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
          });

          const excelBuffer = xlsx.write(workbook, {
            bookType: 'xlsx',
            type: 'array',
          });

          this.saveAsExcelFile(excelBuffer, 'Calendar');
        },
      })
      .add(() => {
        this.isDownloading = false;
      });
  }

  private saveAsExcelFile(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });
    saveAs(data, `${fileName}.xlsx`);
  }

  private getOpeningBalance(balances: any[], bankAccountId: number): number {
    const found = balances.find((b) => b.bankaccountid === bankAccountId);

    if (!found) return 0;

    const raw = found.balance;

    if (typeof raw === 'number') {
      return raw;
    }

    if (typeof raw === 'object' && raw?.parsedValue !== undefined) {
      return Number(raw.parsedValue) || 0;
    }

    return 0;
  }
}
