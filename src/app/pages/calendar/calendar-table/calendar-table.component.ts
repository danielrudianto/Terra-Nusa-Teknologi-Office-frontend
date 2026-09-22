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
  RencanaRekap,
  lembarRencana,
  lembarHarian,
  lembarKalender,
  HarianRekap,
  SelKalender,
} from 'src/app/helpers/kalender-rekap-excel';
import {
  LampiranRekening,
  berkasKalenderPdf,
} from 'src/app/helpers/kalender-rekap-pdf';
import { mutasiInterpayment } from 'src/app/helpers/kalender-mutasi.helper';
import {
  blokBulan,
  daftarTanggal,
  hariDalamBulan,
  labelBerkas,
  labelPeriode,
  teksTanggal,
  uraiTanggal,
} from 'src/app/helpers/kalender-periode';
import { MatMenuModule } from '@angular/material/menu';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  DataUnduhKalender,
  HasilUnduhKalender,
  UnduhKalenderDialogComponent,
} from '../unduh-kalender-dialog/unduh-kalender-dialog.component';

/** [awal, akhir] 12 bulan sebelum `mulai` ('YYYY-MM-DD'), akhir = sehari sebelumnya. */
export function rentangBawaan(mulai: string): [string, string] {
  const [y, m, d] = mulai.slice(0, 10).split('-').map(Number);
  const dd = (n: number) => String(n).padStart(2, '0');
  const iso = (t: Date) =>
    `${t.getFullYear()}-${dd(t.getMonth() + 1)}-${dd(t.getDate())}`;
  return [iso(new Date(y, m - 1 - 12, 1)), iso(new Date(y, m - 1, d - 1))];
}

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
    MatMenuModule,
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
  /**
   * Mode tampilan kalender.
   *
   * KENAPA `income` HILANG, DAN `balance` JADI DUA
   *
   * Mode lama adalah Pengeluaran / Pemasukan / Saldo. Dua yang pertama
   * menjawab "berapa yang bergerak hari itu", yang ketiga menjawab "posisi
   * kasnya berapa" — tetapi hanya atas uang yang SUDAH bergerak. Padahal
   * yang menentukan kasnya cukup atau tidak justru yang BELUM: rencana kas.
   *
   * Maka saldo dipecah menurut apa yang ikut dihitung:
   *
   *   `balance-actual` — hanya yang sudah terjadi. Angka yang dapat
   *                      dipertanggungjawabkan; cocok dicocokkan ke rekening.
   *   `balance-plan`   — ditambah rencana yang masih menunggu. Angka untuk
   *                      MEMUTUSKAN: apakah bulan ini kasnya sampai.
   *
   * Keduanya ada karena keduanya menjawab pertanyaan berbeda, dan satu angka
   * yang mencoba menjawab keduanya sekaligus tidak dapat dipercaya untuk
   * salah satunya.
   *
   * `income` dilepas: pemasukan per hari sudah terbaca dari selisih saldo,
   * dan mode yang jarang dibuka membuat dua mode yang penting jadi lebih
   * jauh dijangkau.
   */
  @Input('viewMode') viewMode:
    | 'expense'
    | 'balance-plan'
    | 'balance-actual' = 'expense';

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

  /*
   * Keadaan tampilan kisi:
   *   memuat  — angka sel diganti kilau kerangka;
   *   muncul  — sel masuk bergelombang dari pojok kiri atas.
   * `muncul` dimatikan saat memuat dan dinyalakan lagi saat data tiba,
   * supaya animasinya diputar ulang setiap ganti bulan atau rekening.
   */
  memuat = false;
  muncul = false;

  fetchData() {
    this.memuat = true;
    this.muncul = false;
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
          this.memuat = false;
          this.muncul = true;
        },
        error: (error) => {
          this.memuat = false;
          this.muncul = true;
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

  /**
   * Rencana MENUNGGU dari SEBELUM bulan ini (sampai 12 bulan ke belakang).
   *
   * Saldo awal bulan hanya memuat yang SUDAH terjadi. Rencana yang belum
   * jalan dari bulan-bulan sebelumnya karena itu tidak ada di mana pun:
   * membuka November menampilkan saldo rencana tanpa rencana Oktober yang
   * masih menunggu, dan rencana Agustus yang terlewat tidak pernah ditandai.
   * Keduanya dibawa masuk sebagai satu suku di awal bulan.
   */
  rencanaBawaan: any[] = [];

  /** Penanda muatan terakhir — jawaban bulan lama yang telat dibuang. */
  private muatanRencana = 0;

  private muatRencana(): void {
    const dd = (n: number) => String(n).padStart(2, '0');
    const awal = `${this.year}-${dd(this.month + 1)}-01`;
    const akhirHari = new Date(this.year, this.month + 1, 0).getDate();
    const akhir = `${this.year}-${dd(this.month + 1)}-${dd(akhirHari)}`;
    // Rekening yang sama dengan saldonya — lihat `PaymentPlanService.rentang`.
    const rekening = this.bankAccounts
      .filter((x) => x.selected)
      .map((x) => x.id);
    const ke = ++this.muatanRencana;

    this.planService.rentang(awal, akhir, '', rekening).subscribe({
      next: (res: any) => {
        if (ke === this.muatanRencana) this.rencana = res?.data ?? [];
      },
      // Gagal memuat TIDAK mengosongkan kalendernya; pembayaran yang sudah
      // terjadi tetap tampil seperti biasa.
      error: () => {
        if (ke === this.muatanRencana) this.rencana = [];
      },
    });
    this.muatPembayaranBawaan(awal, rekening, ke);
    this.planService
      .rentang(...rentangBawaan(awal), '', rekening)
      .subscribe({
        next: (res: any) => {
          if (ke !== this.muatanRencana) return;
          this.rencanaBawaan = (res?.data ?? []).filter(
            (r: any) => r.status === 'rencana',
          );
        },
        error: () => {
          if (ke === this.muatanRencana) this.rencanaBawaan = [];
        },
      });
  }

  /**
   * Pembayaran BELUM DISETUJUI bertanggal sebelum bulan ini.
   *
   * Saldo awal bulan datang dari view `mutation`, yang hanya memuat
   * pembayaran yang SUDAH disetujui. Pembayaran 24–30 September yang masih
   * menunggu persetujuan karena itu hilang begitu kalender dibuka di
   * Oktober: tidak ada di saldo awal, tidak ada di daftar bulan ini. Saldo
   * rencana Oktober jadi lebih tinggi persis sebesar jumlahnya.
   *
   * Dibawa masuk sebagai satu suku di awal bulan, sama seperti rencana
   * bawaan, dan hanya pada mode saldo rencana.
   */
  pembayaranBawaan = { keluar: 0, masuk: 0, jumlah: 0 };

  private muatPembayaranBawaan(awal: string, rekening: number[], ke: number): void {
    this.apiService
      .get('calendar/terjadwal', { mulai: awal, bankAccounts: rekening })
      .subscribe({
        next: (res: any) => {
          if (ke !== this.muatanRencana) return;
          this.pembayaranBawaan = {
            keluar: Number(res?.bawaanKeluar) || 0,
            masuk: Number(res?.bawaanMasuk) || 0,
            jumlah: Number(res?.bawaanJumlah) || 0,
          };
        },
        error: () => {
          if (ke === this.muatanRencana)
            this.pembayaranBawaan = { keluar: 0, masuk: 0, jumlah: 0 };
        },
      });
  }

  /** Nilai bersih pembayaran bawaan: masuk (+), keluar (−). */
  get nilaiPembayaranBawaan(): number {
    return this.pembayaranBawaan.masuk - this.pembayaranBawaan.keluar;
  }

  /** Nilai bersih rencana bawaan: masuk (+), keluar (−). */
  get nilaiBawaan(): number {
    return this.rencanaBawaan.reduce(
      (a, r) =>
        a + (r.planType === 'masuk' ? 1 : -1) * Number(r.amount || 0),
      0,
    );
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
   * YANG TERLEWAT IKUT DIHITUNG — ini berubah.
   *
   * Sebelumnya disaring keluar, dengan alasan rencana yang lewat tanpa
   * pernah ditandai terpakai praktis tidak terjadi. Alasan itu tidak
   * bertahan: rencana yang terlewat bukan rencana yang batal, melainkan
   * kewajiban yang belum dikerjakan. Mengeluarkannya membuat angkanya
   * terbaca lebih sehat justru pada bulan yang paling perlu diwaspadai.
   *
   * Dan sejak saldo (rencana) ikut menghitungnya, menyaringnya di sini
   * berarti ringkasan bulan dan saldo di kisi kalender melaporkan dua angka
   * berbeda dari data yang sama — tepat kelas kesalahan yang paling sulit
   * disadari, karena keduanya sama-sama tampak masuk akal sendiri-sendiri.
   *
   * Yang terlewat tetap ditunjukkan terpisah lewat `rencanaTerlewat` dan
   * spanduk peringatannya, jadi ia dihitung TANPA menjadi tidak terlihat.
   */
  private get rencanaDihitung(): any[] {
    return this.rencanaMenunggu;
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
    // Yang terlewat di bulan-bulan SEBELUMNYA ikut disebut.
    return [...this.rencanaBawaan, ...this.rencana].filter((r) => r.lewat);
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
    const tgl = String(p.date).slice(0, 10);
    if (tgl.slice(0, 7) === this.tanggalIso(1).slice(0, 7)) {
      this.bukaRencana(Number(tgl.slice(8, 10)));
      return;
    }
    // Dari bulan sebelumnya: dibuka di tempat, tanpa pindah bulan.
    this.dialog
      .open(RencanaHariDialogComponent, {
        data: {
          tanggal: tgl,
          rencana: this.rencanaBawaan.filter(
            (r) => String(r.date).slice(0, 10) === tgl,
          ),
        },
        width: '620px',
        maxWidth: '95vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((perlu) => {
        if (perlu) this.muatRencana();
      });
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

  /** `YYYY-MM-DD` untuk satu tanggal di bulan yang sedang dibuka. */
  private tanggalHari(day: number): string {
    const dd = (n: number) => String(n).padStart(2, '0');
    return `${this.year}-${dd(this.month + 1)}-${dd(day)}`;
  }

  /**
   * Saldo pada AKHIR hari `day`.
   *
   * DUA HAL YANG BERUBAH DARI VERSI SEBELUMNYA, keduanya disengaja:
   *
   * 1. DIBANDINGKAN SEBAGAI TEKS, bukan lewat `Date`.
   *
   *    Sebelumnya: `new Date(x.date).getTime() < new Date(y, m, day).getTime()`.
   *    Ruas kiri mengurai `"2026-09-15"` sebagai tengah malam UTC; ruas kanan
   *    membangun tengah malam WAKTU SETEMPAT. Di Jakarta (UTC+7) transaksi
   *    hari itu jatuh pada pukul 07:00 setempat sehingga TIDAK ikut; di zona
   *    barat UTC ia jatuh sebelumnya sehingga IKUT. Saldo yang sama
   *    menghasilkan angka berbeda tergantung jam komputer yang membukanya,
   *    tanpa satu pun galat. `'YYYY-MM-DD' <= 'YYYY-MM-DD'` tidak punya zona
   *    waktu untuk salah.
   *
   * 2. AKHIR hari, bukan awal hari.
   *
   *    Yang lama mengecualikan transaksi hari itu sendiri. Untuk mode yang
   *    ada justru supaya orang tahu "tanggal 30 kasnya cukup atau tidak",
   *    angka yang belum memperhitungkan pembayaran tanggal 30 tidak dapat
   *    menjawabnya — dipnya baru terlihat di sel berikutnya, dan pada hari
   *    terakhir bulan ia tidak terlihat sama sekali.
   *
   * `ikutRencana` menentukan apakah yang belum terjadi ikut dihitung. Rencana
   * yang TERLEWAT tetap ikut: uangnya memang belum bergerak, kewajibannya
   * belum hilang, dan spanduk peringatan di atas kalender sudah menyebutkan
   * keberadaannya. Menyembunyikannya dari saldo membuat proyeksinya terbaca
   * lebih sehat daripada keadaan sebenarnya.
   */
  private saldoSampai(day: number, ikutRencana: boolean): number {
    const tgl = this.tanggalHari(day);
    const sampai = (v: any) => String(v ?? '').slice(0, 10) <= tgl;

    let saldo = Number(this.balance) || 0;

    for (const x of this.data) {
      if (sampai(x.date)) saldo -= Number(x.amount) || 0;
    }
    for (const x of this.incomeData) {
      if (sampai(x.date)) saldo += Number(x.amount) || 0;
    }

    /*
     * Transfer antar rekening yang MELINTASI saringan rekening.
     *
     * Dulu tidak dihitung sama sekali. Transfer antara dua rekening yang
     * sama-sama dicentang memang saling meniadakan, tetapi transfer ke
     * rekening yang DIKECUALIKAN (atau yang tidak dicentang) adalah uang
     * yang benar-benar keluar dari kalender — dan sebaliknya. Saldo awal
     * bulan berikutnya (view `mutation`) sudah memperhitungkannya, unduhan
     * Excel juga (`mutasiInterpayment`); hanya kisi ini yang tidak, sehingga
     * sepanjang sisa bulan saldonya lebih tinggi sebesar transfer keluar itu.
     */
    const dicentang = new Set<number>(
      this.bankAccounts.filter((x) => x.selected).map((x) => Number(x.id)),
    );
    for (const t of this.interpayments ?? []) {
      if (!sampai(t.date) || t.isDelete) continue;
      const n = Math.abs(Number(t.amount) || 0);
      const asal = dicentang.has(Number(t.bankAccountIDOrigin));
      const tujuan = dicentang.has(Number(t.bankAccountIDDestination));
      if (asal && !tujuan) saldo -= n;
      else if (tujuan && !asal) saldo += n;
    }

    if (ikutRencana) {
      // Rencana menunggu dari bulan-bulan sebelumnya — semuanya sebelum `tgl`.
      saldo += this.nilaiBawaan;
      // Pembayaran belum disetujui dari sebelum bulan ini — lihat
      // `pembayaranBawaan`.
      saldo += this.nilaiPembayaranBawaan;
      for (const r of this.rencanaMenunggu) {
        if (!sampai(r.date)) continue;
        const n = Number(r.amount) || 0;
        saldo += r.planType === 'masuk' ? n : -n;
      }
    }

    return saldo;
  }

  dataForDay(day: number): number {
    if (this.viewMode === 'balance-actual') {
      return this.saldoSampai(day, false);
    } else if (this.viewMode === 'balance-plan') {
      return this.saldoSampai(day, true);
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
    if (this.viewMode === 'expense') {
      return v > 0 ? 'is-expense' : '';
    }
    // Kedua mode saldo: hijau kalau positif, merah kalau minus.
    //
    // Merahnya justru inti dari mode `balance-plan` — hari pertama saldo
    // menembus nol adalah satu-satunya angka yang benar-benar dicari orang
    // di layar ini.
    return v < 0 ? 'is-expense' : v > 0 ? 'is-income' : '';
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

  /**
   * Unduh kalender kas — Excel atau PDF, dari data yang SAMA.
   *
   * Formatnya hanya menentukan bentuk akhirnya; seluruh perhitungan di
   * bawah — saldo berjalan, rencana yang ikut, transfer antar rekening yang
   * dikecualikan — berlaku untuk keduanya. Menyalinnya menjadi dua jalur
   * berarti dua tempat yang harus dijaga tetap sepakat, dan pada saat
   * salah satunya diperbaiki, yang lain diam-diam melaporkan angka lain.
   *
   * Isinya kini terbatas pada dua hal yang benar-benar dibaca: RINGKASAN
   * HARIAN, dan kisi kalender tiap rekening sebagai lampiran. Lembar Naskah
   * rekap, Saldo per rekening, dan Rincian transaksi dihapus — ketiganya
   * menyusun ulang angka yang sudah ada di kedua lembar itu, dan berkas yang
   * memuat hal sama tiga kali membuat penerimanya harus memilih mana yang
   * dipercaya.
   */
  /**
   * Membuka dialog unduhan: CAKUPAN dulu, format belakangan.
   *
   * Sebelumnya menu ini hanya menawarkan format, dan cakupannya diam-diam
   * mengikuti bulan yang sedang dibuka. Yang butuh dua bulan sekaligus harus
   * mengunduh dua kali lalu menggabungkannya sendiri — dan saldo awal lembar
   * kedua tidak menyambung ke saldo akhir lembar pertama, sehingga hasil
   * gabungannya salah tanpa satu pun angka yang terlihat ganjil.
   */
  bukaDialogUnduh(): void {
    if (this.isDownloading) return;

    const ikutRencana = this.viewMode !== 'balance-actual';

    this.dialog
      .open(UnduhKalenderDialogComponent, {
        data: <DataUnduhKalender>{
          month: this.month,
          year: this.year,
          modeSaldo: this.translate.instant(
            ikutRencana ? 'calendar.exportPlan' : 'calendar.exportActual',
          ),
        },
      })
      .afterClosed()
      .subscribe((hasil: HasilUnduhKalender | undefined) => {
        if (hasil) this.onCalendarDownload(hasil);
      });
  }

  /**
   * Unduh kalender kas — Excel atau PDF, dari data yang SAMA.
   *
   * Formatnya hanya menentukan bentuk akhirnya; seluruh perhitungan di
   * bawah — saldo berjalan, rencana yang ikut, transfer antar rekening yang
   * dikecualikan — berlaku untuk keduanya. Menyalinnya menjadi dua jalur
   * berarti dua tempat yang harus dijaga tetap sepakat, dan pada saat
   * salah satunya diperbaiki, yang lain diam-diam melaporkan angka lain.
   *
   * Isinya terbatas pada dua hal yang benar-benar dibaca: RINGKASAN HARIAN,
   * dan kisi kalender tiap rekening sebagai lampiran.
   *
   * CAKUPANNYA kini rentang tanggal, bukan bulan. Perulangan
   * `hari = 1..totalHari` yang dulu dipakai tiga kali di sini tidak sekadar
   * membatasi — ia membuat rentang lintas bulan mustahil dinyatakan.
   * Penyusunan tanggalnya seluruhnya pindah ke `kalender-periode.helper`
   * supaya ketiga tempat itu tidak dapat lagi berbeda.
   */
  onCalendarDownload(pilihan: HasilUnduhKalender): void {
    if (this.isDownloading) return;
    this.isDownloading = true;

    const format = pilihan.format;

    const mulaiDiminta =
      pilihan.mode === 'bulan'
        ? teksTanggal(pilihan.year, pilihan.month + 1, 1)
        : pilihan.mulai;
    const akhirDiminta =
      pilihan.mode === 'bulan'
        ? teksTanggal(
            pilihan.year,
            pilihan.month + 1,
            hariDalamBulan(pilihan.year, pilihan.month + 1),
          )
        : pilihan.akhir;

    const rekening = this.bankAccounts.filter((x) => x.selected).map((x) => x.id);

    /*
     * RENCANA KAS ikut ditarik ulang untuk rentangnya, tidak dipinjam dari
     * layar.
     *
     * `this.rencana` hanya memuat bulan yang sedang dibuka. Dipakai apa
     * adanya untuk unduhan dua bulan, rencana bulan kedua hilang seluruhnya
     * dari berkasnya — dan berkas itu tetap terbuka, tetap rapi, dan
     * saldonya tetap terbaca masuk akal. Tidak ada yang akan menyadarinya
     * sampai ada yang mencocokkannya dengan layar.
     */
    forkJoin({
      data: this.apiService.get('calendar/download', {
        start: mulaiDiminta,
        end: akhirDiminta,
        bankAccounts: rekening,
      }),
      rencana: this.planService
        .rentang(mulaiDiminta, akhirDiminta, '', rekening)
        .pipe(
          // Gagal memuat rencana TIDAK menggagalkan unduhannya; yang sudah
          // terjadi tetap dapat diunduh.
          catchError(() => of({ data: [] })),
        ),
      // Rencana menunggu dari SEBELUM rentangnya — sama dengan layar
      // (`rencanaBawaan`), supaya saldo berkas dan kalender tetap sama.
      bawaan: this.planService
        .rentang(...rentangBawaan(mulaiDiminta), '', rekening)
        .pipe(catchError(() => of({ data: [] }))),
      // Pembayaran BELUM disetujui dari sebelum rentangnya — sama dengan
      // layar (`pembayaranBawaan`). Saldo awal berkas juga dari view
      // `mutation`, yang hanya memuat yang sudah disetujui.
      terjadwal: this.apiService
        .get('calendar/terjadwal', { mulai: mulaiDiminta, bankAccounts: rekening })
        .pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ data, rencana, bawaan, terjadwal }: any) => {
        /*
         * Rentangnya diambil dari JAWABAN SERVER, bukan dari yang dikirim.
         *
         * Servernya menegakkan batas 60 hari sendiri. Kalau ia memotong atau
         * menolak sebagian, berkas yang dirakit dari tanggal yang dikirim
         * peramban akan memuat baris kosong untuk hari yang datanya memang
         * tidak pernah datang — dan barisnya terlihat seperti hari tanpa
         * transaksi.
         */
        const mulai = String(data?.start ?? mulaiDiminta).slice(0, 10);
        const akhir = String(data?.end ?? akhirDiminta).slice(0, 10);

        const tanggalRentang = daftarTanggal(mulai, akhir);
        const blok = blokBulan(mulai, akhir);
        const periode = labelPeriode(mulai, akhir);

        if (!tanggalRentang.length) {
          this.snackBar.open(
            this.translate.instant('notify.downloadFailed'),
            'Close',
            { duration: 4000 },
          );
          this.isDownloading = false;
          return;
        }

        /*
         * Rekening yang IKUT DIHITUNG pada rekap ini.
         *
         * Bukan seluruh rekening yang ada, melainkan yang tercentang di
         * pemilih rekening — rekening yang ditandai dikecualikan tidak ikut.
         * Inilah yang menentukan apakah sebuah transfer sekadar berpindah
         * saku atau uangnya benar-benar meninggalkan rekap.
         */
        const dalamKalender = new Set<number>(
          (data.bank_accounts ?? []).map((a: any) => Number(a.id)),
        );

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
            .filter((t: any) => t.bankAccountID === bankID && this.mutasiSah(t))
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
           * Transfer antar rekening — meniadakan HANYA bila kedua sisinya
           * ikut dihitung; kalau tidak, uangnya benar-benar keluar.
           *
           * Aturannya di `kalender-mutasi.helper`, beserta alasannya.
           */
          const antar = (data.interpayments || [])
            .map((t: any) => mutasiInterpayment(t, bankID, dalamKalender))
            .filter(Boolean) as any[];

          return [...bayar, ...masuk, ...antar].sort((a, b) =>
            a.date.localeCompare(b.date),
          );
        };

        /*
         * Berkasnya mengikuti MODE YANG SEDANG DIPILIH di layar.
         *
         * Sebelumnya berkasnya selalu menghitung rencana sementara layarnya
         * tidak pernah — jadi Excel dan kalender melaporkan saldo berbeda
         * untuk bulan yang sama, dan tidak ada yang memberi tahu mana yang
         * dimaksud. Itu lebih buruk daripada salah satunya salah.
         *
         * Konsekuensinya yang harus diakui: dua orang dapat mengunduh
         * "kalender September" dan mendapat angka berbeda. Karena itu mode
         * yang dipakai DICETAK di berkasnya (`modeLabel` di bawah) — supaya
         * perbedaannya dapat dijelaskan, bukan diperdebatkan.
         */
        const ikutRencana = this.viewMode !== 'balance-actual';
        const modeLabel = this.translate.instant(
          ikutRencana ? 'calendar.exportPlan' : 'calendar.exportActual',
        );

        // Bawaan dicatat pada TANGGAL PERTAMA rentang, keterangannya
        // menyebut tanggal aslinya.
        const dibawa: any[] = (bawaan?.data ?? [])
          .filter((r: any) => r.status === 'rencana')
          .map((r: any) => ({
            ...r,
            date: mulai,
            description: `(${String(r.date).slice(0, 10)}) ${r.description ?? ''}`.trim(),
          }));
        /*
         * Pembayaran belum disetujui dari sebelum rentangnya, PER REKENING,
         * dicatat pada tanggal pertama rentang dengan bentuk baris rencana —
         * supaya kisi rekening dan ringkasan harian membawanya dengan aturan
         * yang sama. Ditandai `terjadwal` dan TIDAK ikut ke lembar rencana:
         * ini pembayaran yang sudah diinput, bukan rencana kas.
         */
        const bayarDibawa: any[] = [];
        for (const b of terjadwal?.bawaan ?? []) {
          const ket = this.translate.instant('rencana.bayarBawaanBaris', {
            n: b.jumlah,
            tanggal: mulai,
          });
          for (const [planType, n] of [
            ['keluar', b.keluar],
            ['masuk', b.masuk],
          ] as const) {
            const amount = Number(n) || 0;
            if (!amount) continue;
            bayarDibawa.push({
              status: 'rencana',
              terjadwal: true,
              date: mulai,
              planType,
              amount,
              bankAccountID: b.bankAccountID,
              description: ket,
            });
          }
        }
        const semuaRencana: any[] = [
          ...bayarDibawa,
          ...dibawa,
          ...(rencana?.data ?? []),
        ];
        const rencanaPerTanggal: Record<string, any[]> = Object.create(null);
        for (const r of ikutRencana
          ? semuaRencana.filter((r: any) => r.status === 'rencana')
          : []) {
          const t = String(r.date).slice(0, 10);
          (rencanaPerTanggal[t] ??= []).push(r);
        }

        /** Sel kisi satu rekening, dikelompokkan per bulan: `YYYY-MM`. */
        const kunciBulan = (tgl: string) => tgl.slice(0, 7);

        const akun: AkunRekap[] = [];
        const perTanggal: Record<
          string,
          { masuk: number; keluar: number; ketMasuk: string[]; ketKeluar: string[] }
        > = Object.create(null);

        for (const a of data.bank_accounts ?? []) {
          const mutasi = mutasiRekening(a.id);
          const awal = this.getOpeningBalance(data.balances, a.id);

          let saldo = awal;
          const harianSaldo: number[] = [];

          for (const tgl of tanggalRentang) {
            const hariIni = mutasi.filter((t: any) => t.date === tgl);

            for (const t of hariIni) {
              saldo += t.nilai;

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
         * satu pembayaran mengurangi saldo dua kali.
         */
        for (const tgl of tanggalRentang) {
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

        const rencanaRekap: RencanaRekap[] = semuaRencana
          .filter((r: any) => !r.terjadwal)
          .map((r: any) => ({
          date: String(r.date).slice(0, 10),
          arah: r.planType === 'masuk' ? 'masuk' : 'keluar',
          keterangan: r.description ?? '',
          kategori: r.category ?? '',
          proyek: r.projectName ?? '',
          rekening: r.bankName ?? '',
          nilai: Number(r.amount || 0),
          status: r.lewat ? 'Terlewat' : (r.status ?? 'rencana'),
        }));

        /*
         * Kisi tiap rekening disusun SEKALI, sebelum formatnya dipilih.
         *
         * Excel dan PDF menampilkan kisi yang sama; menyusunnya di dalam
         * masing-masing cabang berarti saldo berjalan dan penyaringan
         * rencananya ditulis dua kali, dan perbaikan pada satu format
         * diam-diam tidak sampai ke yang lain.
         *
         * SATU BLOK PER BULAN yang tersentuh rentangnya. Kisi tujuh kolom
         * itu memang bentuk bulan; memaksa rentang 36 hari menjadi satu kisi
         * membuat kolom harinya berhenti sejajar dengan tanggalnya di tengah
         * jalan, dan yang membacanya salah membaca hari.
         */
        const lampiran: LampiranRekening[] = [];

        for (const a of data.bank_accounts ?? []) {
          const isi = akun.find((x) => x.id === a.id);
          if (!isi) continue;
          const mutasi = mutasiRekening(a.id);

          const selPerBulan: Record<string, SelKalender[]> = Object.create(null);
          let saldo = isi.saldoAwal;

          for (const tgl of tanggalRentang) {
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

            const urai = uraiTanggal(tgl);
            (selPerBulan[kunciBulan(tgl)] ??= []).push({
              hari: urai ? urai[2] : 1,
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

          lampiran.push({
            nomor: a.bankAccountNumber,
            atasNama: a.bankAccountName ?? '',
            saldoAwal: isi.saldoAwal,
            blok: blok.map((b) => ({
              label: b.label,
              hariPertama: b.hariPertama,
              totalHari: b.totalHari,
              dariHari: b.dariHari,
              sampaiHari: b.sampaiHari,
              sel: selPerBulan[`${b.tahun}-${String(b.bulan).padStart(2, '0')}`] ?? [],
            })),
          });
        }

        /*
         * Cakupan dan mode ikut ke NAMA BERKAS, bukan hanya ke kopnya.
         *
         * Di sinilah perbedaannya paling cepat terlihat: dua berkas dengan
         * angka berbeda tidak lagi punya nama yang sama persis, sehingga
         * yang menerimanya tidak perlu membuka keduanya untuk tahu mana
         * yang mana — dan tidak ada yang tanpa sadar menimpa yang satu
         * dengan yang lain di folder yang sama.
         */
        const nama =
          `Kalender_Kas_${labelBerkas(mulai, akhir)}_` +
          (ikutRencana ? 'rencana' : 'aktual');

        if (format === 'pdf') {
          berkasKalenderPdf(harian, saldoAwalGabungan, lampiran, periode, modeLabel)
            .then((blob) => saveAs(blob, `${nama}.pdf`))
            .catch(() =>
              this.snackBar.open(
                this.translate.instant('notify.downloadFailed'),
                'Close',
                { duration: 4000 },
              ),
            )
            .finally(() => (this.isDownloading = false));
          return;
        }

        const wb = new ExcelJS.Workbook();
        /*
         * Urutan lembar mengikuti seberapa sering dibuka.
         *
         * Excel membuka lembar PERTAMA; menaruh kisi kalender di depan
         * berarti yang membukanya harus menggulir tab lebih dulu setiap
         * kali, dan jumlah tabnya sebanyak rekeningnya.
         */
        lembarHarian(wb, harian, saldoAwalGabungan, periode, modeLabel);
        lembarRencana(wb, rencanaRekap, periode, modeLabel);

        /*
         * Nama lembar dibuat UNIK sendiri, tidak diserahkan ke nomor
         * rekeningnya.
         *
         * Rentang dua bulan menghasilkan dua kisi untuk rekening yang sama.
         * Dengan nama yang sama, ExcelJS menolak lembar kedua dan seluruh
         * unduhannya gagal — bukan cuma lembar itu. Dan nomor rekening
         * sendiri sudah bisa kembar antar bank.
         */
        const terpakai = new Set<string>();
        const namaUnik = (dasar: string): string => {
          const bersih = dasar.replace(/[\\/?*[\]]/g, '-').slice(0, 31);
          if (!terpakai.has(bersih)) {
            terpakai.add(bersih);
            return bersih;
          }
          for (let n = 2; n < 100; n++) {
            const alt = `${bersih.slice(0, 31 - String(n).length - 1)} ${n}`;
            if (!terpakai.has(alt)) {
              terpakai.add(alt);
              return alt;
            }
          }
          return bersih;
        };

        for (const l of lampiran) {
          for (const b of l.blok) {
            // Bulan disebut di nama lembar HANYA bila rentangnya lebih dari
            // satu bulan; kalau tidak, seluruh tab jadi bertele-tele untuk
            // membedakan sesuatu yang tidak perlu dibedakan.
            const dasar =
              lampiran[0].blok.length > 1
                ? `${l.nomor} ${b.label.slice(0, 3)}`
                : l.nomor;
            lembarKalender(
              wb,
              l.nomor,
              l.atasNama,
              l.saldoAwal,
              b.sel,
              b.label,
              b.hariPertama,
              b.totalHari,
              modeLabel,
              namaUnik(dasar),
              b.dariHari,
              b.sampaiHari,
            );
          }
        }

        wb.xlsx
          .writeBuffer()
          .then((buf) => {
            const blob = new Blob([buf], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            saveAs(blob, `${nama}.xlsx`);
          })
          .finally(() => (this.isDownloading = false));
      },
      /*
       * Alasan penolakan dari SERVER ditampilkan apa adanya, bukan ditelan.
       *
       * Batas 60 hari ditegakkan di dua tempat — dialognya dan servernya.
       * Kalau suatu saat keduanya tidak lagi sepakat (salah satunya diubah,
       * yang lain tidak), pesan `notify.loadFailed` yang generik membuat
       * dialognya tampak rusak: rentang yang jelas-jelas boleh dipilih
       * ditolak tanpa alasan. Pesan servernya menyebut angkanya sendiri,
       * jadi ketidaksepakatan itu terbaca sebagai apa adanya.
       */
      error: (err: any) => {
        const alasan =
          err?.status === 400
            ? (err?.error?.detail?.error ??
              err?.error?.detail ??
              err?.error?.error)
            : null;

        this.snackBar.open(
          typeof alasan === 'string' && alasan
            ? alasan
            : this.translate.instant('notify.loadFailed'),
          'Close',
          { duration: 5000 },
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
