import { CommonModule, DecimalPipe } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChange,
  SimpleChanges,
  inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { saveAs } from 'file-saver';
import { ICalendarValue } from 'src/app/models/calendar.model';
import { ShortCurrencyPipe } from 'src/app/pipes/short-currency.pipe';
import { ApiService } from 'src/app/services/api.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  PaymentPlanService,
  cariKategori,
} from 'src/app/services/payment-plan.service';
import { RencanaDialogComponent } from '../rencana-dialog/rencana-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { RencanaHariDialogComponent } from '../rencana-hari-dialog/rencana-hari-dialog.component';
import { TerlewatDialogComponent } from '../terlewat-dialog/terlewat-dialog.component';
import ExcelJS from 'exceljs';
import {
  AkunRekap,
  MutasiRekap,
  RencanaRekap,
  lembarNaskah,
  lembarRencana,
  lembarRincian,
  lembarSaldo,
  lembarHarian,
  lembarKalender,
  HarianRekap,
  SelKalender,
} from 'src/app/helpers/kalender-rekap-excel';

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
    private planService: PaymentPlanService,
    private dialog: MatDialog,
  ) {}

  @Input('month') month!: number;
  @Input('year') year!: number;
  @Input('bankAccounts') bankAccounts: any[] = [];
  @Input('values') values: ICalendarValue[] = [];
  @Input('selectedDay') selectedDay: number | null = null;
  @Input('viewMode') viewMode: 'expense' | 'income' | 'balance' = 'expense';

  /**
   * Penanda muat-ulang.
   *
   * Nilainya sendiri tidak berarti apa-apa — yang berarti adalah ia BERUBAH.
   * `ngOnChanges` menyala atas perubahan input apa pun selain `selectedDay`,
   * jadi menaikkannya memuat ulang seluruh isi kalender lewat jalur yang
   * sama persis dengan pergantian bulan. Tidak ada jalur kedua yang harus
   * dijaga tetap sepakat dengan yang pertama.
   */
  @Input('penyegar') penyegar = 0;
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
    // Rencana ikut dimuat ulang setiap bulannya berganti.
    //
    // Dipasang di sini, bukan di `ngOnInit` saja: bulan diganti lewat
    // `@Input`, dan pemuatan yang hanya sekali membuat rencana bulan
    // pertama terus ditampilkan pada bulan mana pun.
    this.muatRencana();
    // Yang tertunda tidak bergantung pada bulan yang dilihat — ia menyangkut
    // seluruh yang lewat — tetapi dimuat di sini supaya menyegar bersama
    // saringan rekeningnya.
    this.muatTertunda();
    this.muatRingkasan();

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

  /**
   * Rencana pengeluaran bulan ini.
   *
   * Kalender sudah menampilkan pembayaran yang SUDAH terjadi; yang belum ada
   * adalah yang AKAN terjadi — dan itu yang menentukan apakah kasnya cukup.
   *
   * Dipisahkan dari `data`, tidak digabungkan: keduanya berbeda sifatnya, dan
   * menjumlahkannya jadi satu angka membuat yang membaca tidak tahu bagian
   * mana yang sudah pasti.
   */
  rencana: any[] = [];

  private muatRencana(): void {
    const dd = (n: number) => String(n).padStart(2, '0');
    const awal = `${this.year}-${dd(this.month + 1)}-01`;
    const akhirHari = new Date(this.year, this.month + 1, 0).getDate();
    const akhir = `${this.year}-${dd(this.month + 1)}-${dd(akhirHari)}`;

    this.planService.rentang(awal, akhir).subscribe({
      next: (res: any) => (this.rencana = res?.data ?? []),
      // Gagal memuat TIDAK mengosongkan kalendernya; pembayaran yang sudah
      // terjadi tetap tampil seperti biasa.
      error: () => (this.rencana = []),
    });
  }

  /**
   * Rencana yang MASIH menunggu — belum terpakai, belum dibatalkan.
   *
   * `status` bernilai `rencana` | `terpakai` | `batal`. Yang sudah ditandai
   * terpakai uangnya sudah bergerak dan pembayarannya sudah tampil sebagai
   * transaksi sungguhan pada hari itu; membiarkannya tetap terhitung sebagai
   * rencana membuat hari itu seolah menuntut uang dua kali.
   */
  private get rencanaMenunggu(): any[] {
    return this.rencana.filter((r) => r.status === 'rencana');
  }

  /**
   * Jumlah rencana pada satu tanggal; nol bila tidak ada.
   *
   * Yang sudah terpakai atau dibatalkan TIDAK ikut — sebelumnya ikut, dan
   * angka kuningnya tidak pernah hilang setelah rencananya ditandai selesai.
   * Yang TERLEWAT tetap ikut: uangnya memang belum bergerak, dan tanggal itu
   * masih menyimpan kewajiban yang belum dibereskan.
   */
  rencanaHari(day: number | null): number {
    if (day == null) return 0;
    const dd = (n: number) => String(n).padStart(2, '0');
    const tgl = `${this.year}-${dd(this.month + 1)}-${dd(day)}`;
    return this.rencanaMenunggu
      .filter((r) => String(r.date).slice(0, 10) === tgl)
      .reduce((a, r) => a + Number(r.amount || 0), 0);
  }

  adaRencana(day: number | null): boolean {
    return this.rencanaHari(day) > 0;
  }

  /**
   * Total rencana bulan ini, DIPISAH menurut arahnya.
   *
   * Yang terlewat tidak ikut: rencana yang tanggalnya lewat tanpa pernah
   * ditandai terpakai praktis tidak terjadi, dan membiarkannya membuat
   * angkanya menunjukkan uang yang tidak akan bergerak ke mana pun.
   */
  private get rencanaDihitung(): any[] {
    return this.rencanaMenunggu.filter((r) => !r.lewat);
  }

  get totalRencanaKeluar(): number {
    return this.rencanaDihitung
      .filter((r) => r.planType !== 'masuk')
      .reduce((a, r) => a + Number(r.amount || 0), 0);
  }

  get totalRencanaMasuk(): number {
    return this.rencanaDihitung
      .filter((r) => r.planType === 'masuk')
      .reduce((a, r) => a + Number(r.amount || 0), 0);
  }

  get totalRencana(): number {
    return this.totalRencanaMasuk - this.totalRencanaKeluar;
  }

  /**
   * Rencana yang tanggalnya sudah LEWAT tanpa pernah ditandai terpakai.
   *
   * Bukan sekadar tidak dihitung — ia perlu DITUNJUKKAN. Rencana yang
   * terlewat berarti ada pembayaran yang belum dikerjakan atau tagihan yang
   * belum cair, dan keduanya menuntut tindakan. Menyembunyikannya membuat
   * angka posisi kas benar tetapi persoalannya tidak pernah terlihat.
   */
  get rencanaTerlewat(): any[] {
    return this.rencana.filter((r) => r.lewat);
  }

  get nilaiTerlewat(): number {
    return this.rencanaTerlewat.reduce(
      (a, r) =>
        a + (r.planType === 'masuk' ? 1 : -1) * Number(r.amount || 0),
      0,
    );
  }

  /**
   * Pembayaran yang JATUH TEMPO tetapi belum disetujui.
   *
   * Sumbernya berbeda dari rencana — ini dokumen sungguhan yang menunggu
   * persetujuan, bukan taksiran. Keduanya ditunjukkan berdampingan karena
   * yang membuka kalender menanyakan hal yang sama: apa yang tertinggal.
   */
  /**
   * Pembayaran yang jatuh temponya lewat tetapi belum disetujui.
   *
   * Dimuat dari rutenya SENDIRI, tidak disaring dari `data`.
   *
   * Jawaban `GET /calendar` sudah dijumlahkan per tanggal — satu baris per
   * hari, tanpa nama dokumen dan tanpa status. Menyaringnya dari sana
   * menghasilkan daftar yang seluruh keterangannya kosong, dan `isApprove`
   * yang tidak disertakan terbaca sebagai belum disetujui untuk SEMUANYA.
   *
   * Batas tanggalnya ditentukan SERVER, bukan jam peramban.
   */
  pembayaranTerlewat: any[] = [];
  nilaiPembayaranTerlewat = 0;

  /**
   * Ringkasan rencana kas per kategori.
   *
   * Menjawab pertanyaan yang berbeda dari kalender: bukan "apa yang terjadi
   * tanggal berapa", melainkan "ke mana kasnya pergi bulan ini".
   *
   * Dihitung SERVER, bukan dijumlahkan dari `rencana` yang sudah dimuat —
   * yang terlewat dikecualikan di sana, dan menghitungnya ulang di sini
   * berarti dua tempat yang harus tetap sepakat tentang apa yang dihitung.
   */
  ringkasan: any = null;
  ringkasanTerbuka = false;

  private muatRingkasan(): void {
    const dd = (n: number) => String(n).padStart(2, '0');
    const awal = `${this.year}-${dd(this.month + 1)}-01`;
    const akhirHari = new Date(this.year, this.month + 1, 0).getDate();
    const akhir = `${this.year}-${dd(this.month + 1)}-${dd(akhirHari)}`;

    this.planService.ringkasan(awal, akhir).subscribe({
      next: (res: any) => (this.ringkasan = res),
      error: () => (this.ringkasan = null),
    });
  }

  /** Kategori yang benar-benar ada isinya, terbesar lebih dulu. */
  ringkasanKategori(arah: 'masuk' | 'keluar'): any[] {
    return (this.ringkasan?.perKategori ?? [])
      .filter((x: any) => x.planType === arah && Number(x.total) > 0)
      .sort((a: any, b: any) => Number(b.total) - Number(a.total));
  }

  labelKategori(nilai: string): string {
    return cariKategori(nilai)?.label ?? 'rencana.katLain';
  }

  ikonKategori(nilai: string): string {
    return cariKategori(nilai)?.ikon ?? 'more_horiz';
  }

  private muatTertunda(): void {
    this.apiService
      .get('calendar/tertunda', {
        bankAccounts: this.bankAccounts
          .filter((x) => x.selected)
          .map((x) => x.id),
      })
      .subscribe({
        next: (res: any) => {
          this.pembayaranTerlewat = res?.data ?? [];
          this.nilaiPembayaranTerlewat = Number(res?.total || 0);
        },
        // Gagal memuat TIDAK mengosongkan kalendernya; bannernya saja yang
        // tidak muncul.
        error: () => {
          this.pembayaranTerlewat = [];
          this.nilaiPembayaranTerlewat = 0;
        },
      });
  }

  /**
   * Keterangan satu mutasi.
   *
   * Datanya BERSARANG: satu pembayaran menunjuk tepat satu dokumen, dan yang
   * tidak terpakai bernilai `null`. Membacanya dari tingkat atas menghasilkan
   * `undefined` untuk semuanya — seluruh baris tampil sebagai tanda hubung,
   * dan tidak ada galat yang memberi tahu.
   *
   * Dikumpulkan di sini supaya dialog dan unduhan membaca dengan cara yang
   * sama; dua salinan berarti satu di antaranya pasti tertinggal.
   */
  ketMutasi(t: any): string {
    if (t?.purchase) {
      return t.purchase.purchaseOrderName || t.purchase.invoiceName || '';
    }
    if (t?.expense) {
      return t.expense.invoiceName || t.expense.description || '';
    }
    if (t?.reimbursement) return t.reimbursement.name || '';
    if (t?.salarySlip) {
      const b = t.salarySlip.month ?? '';
      const y = t.salarySlip.year ?? '';
      return `Slip gaji ${b}/${y} — ${t.salarySlip.name ?? ''}`.trim();
    }
    if (t?.loan) return t.loan.description || 'Pembayaran pinjaman';
    // Transfer antar rekening dan pemasukan memakai bentuk yang lebih datar.
    return t?.description || t?.name || t?.invoiceName || '';
  }

  lawanMutasi(t: any): string {
    return (
      t?.purchase?.accountName ||
      t?.expense?.accountName ||
      t?.reimbursement?.accountName ||
      t?.salarySlip?.name ||
      t?.loan?.creditorName ||
      t?.accountName ||
      ''
    );
  }

  proyekMutasi(t: any): string {
    return (
      t?.purchase?.projectName || t?.reimbursement?.projectName || ''
    );
  }

  /**
   * Mutasi yang DIHITUNG.
   *
   * Yang dihapus dan yang ditolak dikecualikan: keduanya sudah selesai
   * urusannya, dan memasukkannya membuat saldo berjalan menunjukkan uang
   * yang tidak pernah bergerak.
   */
  private mutasiSah(t: any): boolean {
    if (t?.isDelete) return false;
    if (String(t?.status).toLowerCase() === 'reject') return false;
    return true;
  }

  /** Tampilkan pembayaran mana saja yang terlewat. */
  lihatPembayaranTerlewat(): void {
    this.dialog.open(TerlewatDialogComponent, {
      data: { daftar: this.pembayaranTerlewat },
      width: '640px',
      maxWidth: '95vw',
      autoFocus: false,
    });
  }

  /** Buka bulan tempat rencana terlewat pertama berada. */
  bukaTerlewat(): void {
    const p = this.rencanaTerlewat[0];
    if (!p) return;
    const hari = Number(String(p.date).slice(8, 10));
    this.bukaRencana(hari);
  }

  /** Rencana pada satu tanggal, untuk daftar yang dapat disunting. */
  rencanaPada(day: number | null): any[] {
    if (day == null) return [];
    const dd = (n: number) => String(n).padStart(2, '0');
    const tgl = `${this.year}-${dd(this.month + 1)}-${dd(day)}`;
    return this.rencana.filter((r) => String(r.date).slice(0, 10) === tgl);
  }

  /**
   * Buka daftar rencana pada satu tanggal.
   *
   * Dipisahkan dari membuat baru: sel yang sudah berisi rencana lebih sering
   * dibuka untuk MENGUBAH — tanggal digeser, nominalnya disesuaikan — daripada
   * untuk menambah rencana kedua di hari yang sama.
   */
  bukaRencana(day: number | null, event?: Event): void {
    event?.stopPropagation();
    if (day == null) return;
    const isi = this.rencanaPada(day);
    if (!isi.length) {
      this.buatRencana(day);
      return;
    }
    this.dialog
      .open(RencanaHariDialogComponent, {
        data: { tanggal: this.tanggalIso(day), rencana: isi },
        width: '620px',
        maxWidth: '95vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((perlu) => {
        // Dialog mengurus penyimpanannya sendiri; yang dikembalikan hanya
        // penanda bahwa ada yang berubah dan kalendernya perlu dimuat ulang.
        if (perlu) this.muatRencana();
      });
  }

  private tanggalIso(day: number): string {
    const dd = (n: number) => String(n).padStart(2, '0');
    return `${this.year}-${dd(this.month + 1)}-${dd(day)}`;
  }

  /**
   * Buka daftar rencana pada satu tanggal, atau buat baru.
   *
   * Tanggal yang diklik ikut terbawa: yang menekan sel tanggal 20 bermaksud
   * membuat rencana pada tanggal itu, bukan hari ini.
   */
  buatRencana(day: number | null, event?: Event): void {
    event?.stopPropagation();

    /*
     * `day` boleh KOSONG.
     *
     * Dari tombol di atas kalender, tanggalnya belum ditentukan — formulirnya
     * yang menanyakan. Dari sel, tanggalnya ikut terbawa karena yang menekan
     * sel tanggal 20 memang bermaksud tanggal itu.
     *
     * Bila kosong, tanggal awalnya diarahkan ke bulan yang SEDANG DILIHAT,
     * bukan hari ini — yang membuka November lalu menekan tambah bermaksud
     * merencanakan November.
     */
    const dd = (n: number) => String(n).padStart(2, '0');
    const hariIni = new Date();
    const bulanIniYangDilihat =
      hariIni.getFullYear() === this.year && hariIni.getMonth() === this.month;
    const hari =
      day ?? (bulanIniYangDilihat ? hariIni.getDate() : 1);
    const tgl = `${this.year}-${dd(this.month + 1)}-${dd(hari)}`;

    this.dialog
      .open(RencanaDialogComponent, {
        data: { tanggal: tgl },
        width: '640px',
        maxWidth: '95vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((hasil) => {
        if (!hasil) return;
        this.planService.buat(hasil).subscribe({
          next: () => this.muatRencana(),
          error: () => {},
        });
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
          const month = this.month + 1;
          const year = this.year;
          const dd = (n: number) => String(n).padStart(2, '0');
          const totalHari = new Date(year, month, 0).getDate();
          const namaBulan = new Date(year, month - 1, 1).toLocaleString(
            'id-ID',
            { month: 'long' },
          );
          // 0 = Senin, mengikuti susunan kolom kalendernya.
          const hariPertama = (new Date(year, month - 1, 1).getDay() + 6) % 7;

          /*
           * Satu bentuk transaksi untuk SELURUH lembar.
           *
           * Sebelumnya masing-masing lembar menyusunnya sendiri dari bidang
           * yang berbeda-beda — dan yang satu memakai `opponent`, yang lain
           * `accountName`, sehingga lembar yang sama menampilkan nama yang
           * berbeda untuk transaksi yang sama.
           */
          const mutasiRekening = (bankID: number) => {
            const bayar = (data.payments || [])
              .filter(
                (t: any) => t.bankAccountID === bankID && this.mutasiSah(t),
              )
              .map((t: any) => ({
                date: String(t.date).slice(0, 10),
                lawan: this.lawanMutasi(t) || t.opponent || '-',
                keterangan: this.ketMutasi(t) || t.documentName || '',
                proyek: this.proyekMutasi(t),
                nilai: -Math.abs(Number(t.amount || 0)),
                antar: false,
              }));

            const masuk = (data.incomes || [])
              .filter((t: any) => t.bankAccountID === bankID)
              .map((t: any) => ({
                date: String(t.date).slice(0, 10),
                lawan: t.opponent || '-',
                keterangan: t.document_name || '',
                proyek: '',
                nilai: Math.abs(Number(t.amount || 0)),
                antar: false,
              }));

            /*
             * Transfer antar rekening dicatat DUA KALI — keluar di asal,
             * masuk di tujuan — dan itu memang benar per rekening.
             *
             * Tetapi pada ringkasan gabungan keduanya saling meniadakan dan
             * tidak boleh dihitung sebagai pemasukan atau pengeluaran; karena
             * itu ditandai `antar`.
             */
            const antar = (data.interpayments || [])
              .map((t: any) => {
                if (t.bankAccountIDOrigin === bankID) {
                  return {
                    date: String(t.date).slice(0, 10),
                    lawan: t.destinationBankAccountName || 'Transfer keluar',
                    keterangan: `Transfer ke ${t.destinationBankAccountName ?? ''}`,
                    proyek: '',
                    nilai: -Math.abs(Number(t.amount || 0)),
                    antar: true,
                  };
                }
                if (t.bankAccountIDDestination === bankID) {
                  return {
                    date: String(t.date).slice(0, 10),
                    lawan: t.originBankAccountName || 'Transfer masuk',
                    keterangan: `Transfer dari ${t.originBankAccountName ?? ''}`,
                    proyek: '',
                    nilai: Math.abs(Number(t.amount || 0)),
                    antar: true,
                  };
                }
                return null;
              })
              .filter(Boolean) as any[];

            return [...bayar, ...masuk, ...antar].sort((a, b) =>
              a.date.localeCompare(b.date),
            );
          };

          const wb = new ExcelJS.Workbook();

          const akun: AkunRekap[] = [];
          const rincian: MutasiRekap[] = [];
          const perTanggal: Record<
            string,
            { masuk: number; keluar: number; ketMasuk: string[]; ketKeluar: string[] }
          > = Object.create(null);

          for (const a of data.bank_accounts ?? []) {
            const mutasi = mutasiRekening(a.id);
            const awal = this.getOpeningBalance(data.balances, a.id);

            let saldo = awal;
            const sel: SelKalender[] = [];
            const harianSaldo: number[] = [];

            for (let hari = 1; hari <= totalHari; hari++) {
              const tgl = `${year}-${dd(month)}-${dd(hari)}`;
              const hariIni = mutasi.filter((t: any) => t.date === tgl);

              for (const t of hariIni) {
                saldo += t.nilai;
                rincian.push({
                  date: tgl,
                  rekening: a.bankAccountNumber,
                  bank: a.bankName ?? '',
                  keterangan: t.keterangan,
                  lawan: t.lawan,
                  proyek: t.proyek,
                  nilai: t.nilai,
                  saldo,
                });

                // Transfer antar rekening TIDAK masuk ringkasan gabungan:
                // uangnya tidak keluar dari perusahaan, hanya berpindah.
                if (t.antar) continue;
                const g = (perTanggal[tgl] ??= {
                  masuk: 0,
                  keluar: 0,
                  ketMasuk: [],
                  ketKeluar: [],
                });
                if (t.nilai > 0) {
                  g.masuk += t.nilai;
                  if (t.lawan && !g.ketMasuk.includes(t.lawan)) {
                    g.ketMasuk.push(t.lawan);
                  }
                } else {
                  g.keluar += Math.abs(t.nilai);
                  if (t.lawan && !g.ketKeluar.includes(t.lawan)) {
                    g.ketKeluar.push(t.lawan);
                  }
                }
              }

              harianSaldo.push(saldo);
              if (hariIni.length) {
                sel.push({
                  hari,
                  transaksi: hariIni.map((t: any) => ({
                    lawan: t.lawan,
                    nilai: t.nilai,
                  })),
                  saldoAkhir: saldo,
                });
              } else {
                sel.push({ hari, transaksi: [], saldoAkhir: saldo });
              }
            }

            akun.push({
              id: a.id,
              nomor: a.bankAccountNumber,
              atasNama: a.bankAccountName ?? '',
              bank: a.bankName ?? '(tanpa nama bank)',
              saldoAwal: awal,
              harian: harianSaldo,
            });
          }

          const saldoAwalGabungan = akun.reduce((x, a) => x + a.saldoAwal, 0);

          // Ringkasan harian gabungan: saldonya berjalan lintas rekening.
          let saldoGabungan = saldoAwalGabungan;
          const harian: HarianRekap[] = [];
          /*
           * RENCANA KAS ikut ke ringkasan harian, sebagai barisnya SENDIRI
           * di bawah realisasi tanggal yang sama.
           *
           * Yang dicari lembar ini bukan sekadar "sudah keluar berapa",
           * melainkan "saldonya nanti jadi berapa" — dan itu tidak terjawab
           * tanpa yang belum terjadi. Saldo gabungannya karena itu berjalan
           * MELEWATI baris rencana juga.
           *
           * Hanya yang berstatus `rencana` yang ikut. Yang sudah ditandai
           * TERPAKAI uangnya sudah bergerak dan sudah tampil sebagai
           * transaksi sungguhan di baris atasnya — menghitungnya lagi berarti
           * satu pembayaran mengurangi saldo dua kali. Yang batal sudah
           * disaring server.
           */
          const rencanaPerTanggal: Record<string, any[]> = Object.create(null);
          for (const r of this.rencanaMenunggu) {
            const t = String(r.date).slice(0, 10);
            (rencanaPerTanggal[t] ??= []).push(r);
          }

          for (let hari = 1; hari <= totalHari; hari++) {
            const tgl = `${year}-${dd(month)}-${dd(hari)}`;
            const g = perTanggal[tgl];
            const masuk = g?.masuk ?? 0;
            const keluar = g?.keluar ?? 0;
            saldoGabungan += masuk - keluar;
            harian.push({
              tanggal: tgl,
              ketMasuk: (g?.ketMasuk ?? []).join(', '),
              masuk,
              ketKeluar: (g?.ketKeluar ?? []).join(', '),
              keluar,
              selisih: masuk - keluar,
              saldoGabungan,
            });

            /*
             * Satu baris per rencana, tidak digabung menjadi satu.
             *
             * Keterangannya yang membuat barisnya berguna: "Tunas Ruang" dan
             * "sewa crane ke-2" pada hari yang sama adalah dua keputusan
             * berbeda, dan digabung menjadi satu angka keduanya berhenti
             * dapat ditindaklanjuti.
             */
            for (const r of rencanaPerTanggal[tgl] ?? []) {
              const nilai = Number(r.amount || 0);
              const keMasuk = r.planType === 'masuk';
              const masukR = keMasuk ? nilai : 0;
              const keluarR = keMasuk ? 0 : nilai;
              saldoGabungan += masukR - keluarR;
              harian.push({
                tanggal: tgl,
                ketMasuk: keMasuk ? r.description || '' : '',
                masuk: masukR,
                ketKeluar: keMasuk ? '' : r.description || '',
                keluar: keluarR,
                selisih: masukR - keluarR,
                saldoGabungan,
                // Menandai barisnya agar lembarnya menyorotnya beda warna.
                rencana: true,
              });
            }
          }

          const kini = new Date();
          const berjalan =
            kini.getFullYear() === year && kini.getMonth() + 1 === month;
          const hariRekap = berjalan ? kini.getDate() : totalHari;
          const tanggalRekap = new Date(
            year,
            month - 1,
            hariRekap,
          ).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });

          const rencanaRekap: RencanaRekap[] = (this.rencana ?? []).map(
            (r: any) => ({
              date: String(r.date).slice(0, 10),
              arah: r.planType === 'masuk' ? 'masuk' : 'keluar',
              keterangan: r.description ?? '',
              kategori: r.category ?? '',
              proyek: r.projectName ?? '',
              rekening: r.bankName ?? '',
              nilai: Number(r.amount || 0),
              status: r.lewat ? 'Terlewat' : (r.status ?? 'rencana'),
            }),
          );

          /*
           * Urutan lembar mengikuti seberapa sering dibuka.
           *
           * Excel membuka lembar PERTAMA; menaruh kisi kalender di depan
           * berarti yang membukanya harus menggulir tab lebih dulu setiap
           * kali, dan jumlah tabnya sebanyak rekeningnya.
           */
          lembarNaskah(wb, akun, hariRekap, tanggalRekap, namaBulan, year);
          lembarHarian(wb, harian, saldoAwalGabungan, namaBulan, year);
          lembarSaldo(wb, akun, totalHari, namaBulan, year);
          lembarRincian(wb, rincian, namaBulan, year);
          lembarRencana(wb, rencanaRekap, namaBulan, year);

          for (const a of data.bank_accounts ?? []) {
            const isi = akun.find((x) => x.id === a.id);
            if (!isi) continue;
            const mutasi = mutasiRekening(a.id);
            const sel: SelKalender[] = [];
            let saldo = isi.saldoAwal;
            for (let hari = 1; hari <= totalHari; hari++) {
              const tgl = `${year}-${dd(month)}-${dd(hari)}`;
              const hariIni = mutasi.filter((t: any) => t.date === tgl);
              for (const t of hariIni) saldo += t.nilai;

              /*
               * Rencana kas rekening INI, menyusul di bawah realisasinya.
               *
               * Disaring menurut rekeningnya: kisi ini menyatakan keadaan
               * SATU rekening, dan rencana yang belum ditentukan rekeningnya
               * tidak dapat dibebankan ke salah satunya — ia tetap tampil di
               * Ringkasan Harian, yang memang lintas rekening.
               *
               * Saldo akhirnya berjalan melewati rencana, sama seperti pada
               * ringkasan harian: yang dicari kisi ini "nanti jadi berapa".
               */
              const rencanaHariIni = (rencanaPerTanggal[tgl] ?? []).filter(
                (r: any) => Number(r.bankAccountID) === Number(a.id),
              );
              const barisRencana = rencanaHariIni.map((r: any) => {
                const nilai = Number(r.amount || 0);
                return {
                  lawan: r.description || '-',
                  nilai: r.planType === 'masuk' ? nilai : -nilai,
                  rencana: true,
                };
              });
              for (const t of barisRencana) saldo += t.nilai;

              sel.push({
                hari,
                transaksi: [
                  ...hariIni.map((t: any) => ({
                    lawan: t.lawan,
                    nilai: t.nilai,
                  })),
                  ...barisRencana,
                ],
                saldoAkhir: saldo,
              });
            }
            lembarKalender(
              wb,
              a.bankAccountNumber,
              a.bankAccountName ?? '',
              isi.saldoAwal,
              sel,
              namaBulan,
              year,
              hariPertama,
              totalHari,
            );
          }

          wb.xlsx
            .writeBuffer()
            .then((buf) => {
              const blob = new Blob([buf], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Kalender_Kas_${namaBulan}_${year}.xlsx`;
              a.click();
              // Alamat objek dilepas; tanpa ini berkasnya tetap di memori
              // peramban sampai halamannya ditutup.
              URL.revokeObjectURL(url);
            })
            .finally(() => (this.isDownloading = false));
        },
        error: () => {
          this.snackBar.open(
            this.translate.instant('notify.loadFailed'),
            'Close',
            { duration: 3000 },
          );
          this.isDownloading = false;
        },
      });
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
