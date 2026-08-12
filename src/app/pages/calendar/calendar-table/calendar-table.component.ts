import { CommonModule, DecimalPipe } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChange,
  SimpleChanges, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { saveAs } from 'file-saver';
import { ICalendarValue } from 'src/app/model/calendar.model';
import { ShortCurrencyPipe } from 'src/app/pipes/short-currency.pipe';
import { ApiService } from 'src/app/services/api.service';
import * as xlsx from 'xlsx-js-style';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-calendar-table',
  providers: [DecimalPipe],
  imports: [
    TranslatePipe,
    MatTooltipModule,
    CommonModule,
    MatIconModule,
    ShortCurrencyPipe,
    MatButtonModule,
  ],
  templateUrl: './calendar-table.component.html',
  styleUrl: './calendar-table.component.scss',
  standalone: true,
})
export class CalendarTableComponent {
  private readonly translate = inject(TranslateService);
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
  ) {}

  @Input('month') month!: number;
  @Input('year') year!: number;
  @Input('bankAccounts') bankAccounts: any[] = [];
  @Input('values') values: ICalendarValue[] = [];
  @Input('selectedDay') selectedDay: number | null = null;
  @Input('viewMode') viewMode: 'expense' | 'income' | 'balance' = 'expense';
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
      this.translate.instant('notify.loadFailed'),
            'Close',
            {
              duration: 3000,
            },
          );
        },
      });
  }

  /**
   * Penanda akhir pekan.
   *
   * Sebelumnya ditentukan lewat urutan sel (nth-child), yang meleset begitu
   * jumlah sel kosong di awal bulan berubah.
   */
  isWeekend(day: number | null): boolean {
    if (day == null) return false;
    const d = new Date(this.year, this.month - 1, day).getDay();
    return d === 0 || d === 6;
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
    const currentDate = new Date(this.year, this.month, day);

    if (this.viewMode === 'balance') {
      const previousExpenses = this.data
        .filter((x) => new Date(x.date).getTime() < currentDate.getTime())
        .reduce((acc, x) => acc + x.amount, 0);
      const previousIncomes = this.incomeData
        .filter((x) => new Date(x.date).getTime() < currentDate.getTime())
        .reduce((acc, x) => acc + x.amount, 0);

      return this.balance - previousExpenses + previousIncomes;
    } else if (this.viewMode === 'income') {
      // total pemasukan di hari itu
      return this.incomeData
        .filter((x) => new Date(x.date).getDate() == day)
        .reduce((acc, x) => acc + (Number(x.amount) || 0), 0);
    } else {
      // expense (default): total pengeluaran di hari itu
      const index = this.data.findIndex(
        (x) => new Date(x.date).getDate() == day,
      );
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

  /** kelas warna untuk nominal per cell sesuai mode & nilai */
  valueClass(day: number | null): string {
    if (day == null) return '';
    const v = this.dataForDay(day);
    if (this.viewMode === 'income') {
      return v > 0 ? 'is-income' : '';
    }
    if (this.viewMode === 'expense') {
      return v > 0 ? 'is-expense' : '';
    }
    // balance: hijau kalau positif, merah kalau minus
    if (this.viewMode === 'balance') {
      return v < 0 ? 'is-expense' : v > 0 ? 'is-income' : '';
    }
    return '';
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

          const formatLocalDate = (date: Date): string => {
            const y = date.getFullYear();
            const m = (date.getMonth() + 1).toString().padStart(2, '0');
            const d = date.getDate().toString().padStart(2, '0');
            return `${y}-${m}-${d}`;
          };

          // [SUMMARY] Kumpulkan semua transaksi dari semua rekening
          let masterTransactions: any[] = [];

          const border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
          };

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

            days.forEach((day, i) => {
              const cell = xlsx.utils.encode_cell({ r: 2, c: i * 4 });
              worksheet[cell] = { t: 's', v: day, s: headerStyle };
            });

            worksheet['!merges'] = [
              { s: { r: 0, c: 0 }, e: { r: 0, c: 27 } },
              { s: { r: 1, c: 0 }, e: { r: 1, c: 27 } },
              ...Array.from({ length: 7 }).map((_, i) => ({
                s: { r: 2, c: i * 4 },
                e: { r: 2, c: i * 4 + 3 },
              })),
            ];

            worksheet['!cols'] = Array.from({ length: 28 }).map((_, i) => {
              const mod = i % 4;
              if (mod === 0) return { wpx: 110 };
              if (mod === 1) return { wpx: 140 };
              if (mod === 2) return { wpx: 190 };
              return { wpx: 120 };
            });

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
                documentDate: p.documentDate,
                documentName: p.documentName || '-',
                counterparty: p.opponent || p.bankAccountName || '-',
                nominal:
                  typeof p.amount === 'object'
                    ? -Number(p.amount)
                    : -Number(p.amount),
              }));

            const interpayments = (data.interpayments || [])
              .map((ip: any) => {
                if (ip.bankAccountIDOrigin === sheetBankID) {
                  return {
                    date: ip.date,
                    documentDate: ip.date,
                    documentName: `INTER-${ip.id}`,
                    counterparty: ip.destinationBankAccountName,
                    nominal: -Number(ip.amount),
                  };
                } else if (ip.bankAccountIDDestination === sheetBankID) {
                  return {
                    date: ip.date,
                    documentDate: ip.date,
                    documentName: `INTER-${ip.id}`,
                    counterparty: ip.originBankAccountName,
                    nominal: Number(ip.amount),
                  };
                }
                return null;
              })
              .filter(Boolean);

            // ===== INCOMES =====
            const incomes = (data.incomes || [])
              .filter((inc: any) => inc.bankAccountID === sheetBankID)
              .map((inc: any) => ({
                date: inc.date,
                documentDate: inc.document_date,
                documentName: inc.document_name || '-',
                counterparty: inc.opponent || '-',
                nominal: Number(inc.amount), // positif (pemasukan)
              }));

            // Gabungkan semua transaksi
            const allTransactions = [
              ...normalPayments,
              ...interpayments,
              ...incomes,
            ];

            // [SUMMARY] Tambahkan ke master
            masterTransactions.push(...allTransactions);

            if (allTransactions.length === 0) {
              return; // skip sheet kalau kosong
            }

            const grouped: Record<string, any[]> = Object.create(null);

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

              const dateStr = formatLocalDate(new Date(year, month - 1, day));
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

            weeks.forEach((w) => {
              w.maxTrans = Math.max(w.maxTrans, 5);
            });

            const dayToWeekMap: Record<number, any> = {};
            weeks.forEach((w) => {
              w.days.forEach((d: number) => {
                dayToWeekMap[d] = w;
              });
            });

            let currentRow = 3;
            for (let w of weeks) {
              w.startRow = currentRow;
              currentRow += 3 + w.maxTrans;
            }
            let maxRow = currentRow - 1;

            // ===============================
            // PASS 2: Tulis data per hari
            // ===============================
            let previousSaldoAkhirCell = '';
            let isFirstDay = true;

            for (let day = 1; day <= totalDays; day++) {
              const currentDate = new Date(year, month - 1, day);
              const isoDate = formatLocalDate(currentDate);

              const week = dayToWeekMap[day];
              const weekStartRow = week.startRow!;
              const maxTrans = week.maxTrans;

              const firstDayOfWeek = week.days[0];
              const firstDateOfWeek = new Date(year, month - 1, firstDayOfWeek);
              const firstCol = convertDay(firstDateOfWeek.getDay());
              const dayIndexInWeek = day - firstDayOfWeek;
              const colStart = (firstCol + dayIndexInWeek) * 4;

              // Tanggal
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

              // Saldo label
              worksheet[
                xlsx.utils.encode_cell({ r: weekStartRow + 1, c: colStart })
              ] = { t: 's', v: 'Saldo Awal', s: center };
              worksheet[
                xlsx.utils.encode_cell({ r: weekStartRow + 1, c: colStart + 2 })
              ] = { t: 's', v: 'Saldo Akhir', s: center };

              const saldoAwalCell = xlsx.utils.encode_cell({
                r: weekStartRow + 1,
                c: colStart + 1,
              });
              const saldoAkhirCell = xlsx.utils.encode_cell({
                r: weekStartRow + 1,
                c: colStart + 3,
              });

              const nominalStart = xlsx.utils.encode_cell({
                r: weekStartRow + 3,
                c: colStart + 3,
              });
              const nominalEnd = xlsx.utils.encode_cell({
                r: weekStartRow + 2 + maxTrans,
                c: colStart + 3,
              });

              // Saldo awal
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

              // Saldo akhir
              worksheet[saldoAkhirCell] = {
                t: 'n',
                f: `=${saldoAwalCell}+SUM(${nominalStart}:${nominalEnd})`,
                z: '#,##0.00',
                s: { ...numberStyle, font: { bold: true } },
              };

              // Header tabel
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
                ] = { t: 's', v: val, s: headerStyle };
              });

              // Transaksi
              const transaksi = grouped[isoDate] || [];
              for (let i = 0; i < maxTrans; i++) {
                const row = weekStartRow + 3 + i;
                if (i < transaksi.length) {
                  const trx = transaksi[i];
                  const rawDate = trx.documentDate || trx.date || '';
                  const displayDate = rawDate.substring(0, 10);

                  worksheet[xlsx.utils.encode_cell({ r: row, c: colStart })] = {
                    t: 's',
                    v: displayDate,
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
                  // Baris kosong
                  worksheet[xlsx.utils.encode_cell({ r: row, c: colStart })] = {
                    t: 's',
                    v: '',
                    s: center,
                  };
                  worksheet[
                    xlsx.utils.encode_cell({ r: row, c: colStart + 1 })
                  ] = { t: 's', v: '', s: center };
                  worksheet[
                    xlsx.utils.encode_cell({ r: row, c: colStart + 2 })
                  ] = { t: 's', v: '', s: center };
                  worksheet[
                    xlsx.utils.encode_cell({ r: row, c: colStart + 3 })
                  ] = { t: 's', v: '', s: numberStyle };
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
              }
            }

            // ===============================
            // SET PRINT PREVIEW A3 LANDSCAPE
            // ===============================
            worksheet['!pageSetup'] = {
              paperSize: 8, // A3
              orientation: 'landscape',
            };

            worksheet['!rows'] = Array.from({ length: maxRow + 1 }).map(() => ({
              hpx: 22,
            }));

            worksheet['!ref'] = xlsx.utils.encode_range({
              s: { r: 0, c: 0 },
              e: { r: maxRow, c: 27 },
            });

            xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
          });

          // ===============================
          // [SUMMARY] Buat sheet Ringkasan
          // ===============================
          // ===============================
          // [SUMMARY] Buat sheet Ringkasan
          // ===============================
          if (masterTransactions.length > 0) {
            // Hitung total opening balance dari semua rekening
            let totalOpeningBalance = 0;
            data.bank_accounts.forEach((account: any) => {
              totalOpeningBalance += this.getOpeningBalance(
                data.balances,
                account.id,
              );
            });

            const summarySheetName = 'Ringkasan';
            const summaryRows: any[][] = [];

            const monthName = new Date(year, month - 1).toLocaleString(
              'id-ID',
              {
                month: 'long',
              },
            );
            summaryRows.push([`Ringkasan Harian - ${monthName} ${year}`]); // r=0
            summaryRows.push([]); // r=1
            summaryRows.push([
              'Tanggal',
              'Jumlah Transaksi',
              'Total Pemasukan',
              'Total Pengeluaran',
              'Selisih',
              'Saldo Gabungan',
            ]); // r=2

            // Baris saldo awal (r=3)
            summaryRows.push([
              'Saldo Awal',
              '',
              '',
              '',
              '',
              totalOpeningBalance,
            ]);

            // Group per tanggal, skip interpayment
            const summaryGroup: Record<
              string,
              { count: number; income: number; expense: number }
            > = {};

            masterTransactions.forEach((trx: any) => {
              // Lewati interpayment
              if (
                trx.documentName &&
                typeof trx.documentName === 'string' &&
                trx.documentName.startsWith('INTER-')
              ) {
                return;
              }
              const date = trx.date;
              if (!date) return; // lewati jika tidak ada tanggal

              if (!summaryGroup[date]) {
                summaryGroup[date] = { count: 0, income: 0, expense: 0 };
              }
              summaryGroup[date].count++;

              // Pastikan nominal berupa angka
              const nominal =
                typeof trx.nominal === 'number'
                  ? trx.nominal
                  : Number(trx.nominal) || 0;
              if (nominal > 0) {
                summaryGroup[date].income += nominal;
              } else {
                summaryGroup[date].expense += Math.abs(nominal);
              }
            });

            const sortedDates = Object.keys(summaryGroup).sort();
            let totalCount = 0,
              totalIncome = 0,
              totalExpense = 0;

            sortedDates.forEach((date) => {
              const { count, income, expense } = summaryGroup[date];
              totalCount += count;
              totalIncome += income;
              totalExpense += expense;
              summaryRows.push([
                date,
                count,
                income,
                expense,
                income - expense,
                0,
              ]); // kolom F diisi 0 sementara
            });

            // Baris total
            summaryRows.push([
              'TOTAL',
              totalCount,
              totalIncome,
              totalExpense,
              totalIncome - totalExpense,
              0,
            ]);

            const summaryWs = xlsx.utils.aoa_to_sheet(summaryRows);

            // Style header kolom (6 kolom)
            const summaryHeaderStyle = {
              font: { bold: true },
              alignment: { horizontal: 'center' },
              border: border,
            };
            for (let c = 0; c < 6; c++) {
              const cell = xlsx.utils.encode_cell({ r: 2, c });
              if (summaryWs[cell]) summaryWs[cell].s = summaryHeaderStyle;
            }

            // Tentukan indeks baris
            const firstDataRow = 4; // r=4 adalah baris data pertama
            const lastDataRow = firstDataRow + sortedDates.length - 1;
            const totalRow = lastDataRow + 1;

            // Set formula untuk kolom Saldo Gabungan di baris data
            for (let r = firstDataRow; r <= lastDataRow; r++) {
              const cellF = xlsx.utils.encode_cell({ r, c: 5 });
              summaryWs[cellF] = {
                t: 'n',
                f: `=F${r}+E${r + 1}`, // r 0-based: F4 + E5 untuk baris pertama, dst.
                z: '#,##0',
                s: { border: border, alignment: { horizontal: 'right' } },
              };
            }

            // Baris total: set formula =F${lastDataRow} (ambil nilai dari baris data terakhir)
            const totalCellF = xlsx.utils.encode_cell({ r: totalRow, c: 5 });
            summaryWs[totalCellF] = {
              t: 'n',
              f: `=F${lastDataRow}`,
              z: '#,##0',
              s: {
                border: border,
                alignment: { horizontal: 'right' },
                font: { bold: true },
              },
            };

            // Loop semua sel untuk border dan format angka
            const lastRow = summaryRows.length - 1;
            for (let r = 0; r <= lastRow; r++) {
              for (let c = 0; c < 6; c++) {
                const cellRef = xlsx.utils.encode_cell({ r, c });
                if (!summaryWs[cellRef]) {
                  summaryWs[cellRef] = { t: 's', v: '', s: { border: border } };
                } else {
                  if (!summaryWs[cellRef].s) summaryWs[cellRef].s = {};
                  summaryWs[cellRef].s.border = border;

                  // Untuk baris data (r >= 3), atur alignment dan format number
                  if (r >= 3) {
                    if (c === 0) {
                      summaryWs[cellRef].s.alignment = { horizontal: 'left' };
                    } else {
                      summaryWs[cellRef].s.alignment = { horizontal: 'right' };
                      // Format number untuk kolom 2-5 jika berisi angka
                      if (c >= 2 && c <= 5 && summaryWs[cellRef].t === 'n') {
                        summaryWs[cellRef].z = '#,##0';
                      }
                    }
                  }

                  // Baris total bold
                  if (r === totalRow) {
                    if (!summaryWs[cellRef].s.font)
                      summaryWs[cellRef].s.font = {};
                    summaryWs[cellRef].s.font.bold = true;
                  }
                }
              }
            }

            // Lebar kolom
            summaryWs['!cols'] = [
              { wpx: 120 }, // tanggal
              { wpx: 100 }, // jumlah
              { wpx: 150 }, // pemasukan
              { wpx: 150 }, // pengeluaran
              { wpx: 150 }, // selisih
              { wpx: 180 }, // saldo gabungan
            ];

            // Merge judul
            summaryWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];

            // Page setup
            summaryWs['!pageSetup'] = {
              paperSize: 8,
              orientation: 'landscape',
            };

            // Tambahkan sheet
            xlsx.utils.book_append_sheet(workbook, summaryWs, summarySheetName);

            // Pindahkan ke posisi pertama
            const sheetNames = workbook.SheetNames;
            const idx = sheetNames.indexOf(summarySheetName);
            if (idx > 0) {
              sheetNames.splice(idx, 1);
              sheetNames.unshift(summarySheetName);
            }
          }

          // Tulis file
          const excelBuffer = xlsx.write(workbook, {
            bookType: 'xlsx',
            type: 'array',
            cellStyles: true,
            compression: true,
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

    return Number(raw) || 0;
  }
}
