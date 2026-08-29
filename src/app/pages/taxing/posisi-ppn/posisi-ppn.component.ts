import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ApiService } from 'src/app/services/api.service';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { downloadRecapExcel } from '../../../helpers/tax-recap-excel';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';

/**
 * Posisi PPN satu periode: estimasi kurang atau lebih bayar.
 *
 * Menyandingkan PPN keluaran (faktur penjualan) dengan PPN masukan yang sudah
 * dapat dikreditkan (pembelian/beban yang fakturnya sudah terbit). Masukan
 * yang belum ada fakturnya dipisah sebagai catatan — nilainya nyata tetapi
 * belum boleh mengurangi setoran sampai fakturnya keluar.
 *
 * Angkanya ESTIMASI: bergantung pada kelengkapan faktur pajak yang tercatat
 * saat laporan dibuka, bukan angka final setoran.
 */
@Component({
  selector: 'app-posisi-ppn',
  standalone: true,
  templateUrl: './posisi-ppn.component.html',
  styleUrl: './posisi-ppn.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    TranslatePipe,
    DialogGeserDirective,
  ],
})
export class PosisiPpnComponent {
  private readonly serverMessage = inject(ServerMessageService);
  private readonly translate = inject(TranslateService);
  private periodData: any = inject(MAT_DIALOG_DATA, { optional: true });

  isLoading = false;
  /** Hasil dari server; null selama belum dimuat. */
  posisi: any = null;

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

  formGroup: FormGroup = new FormGroup({
    month: new FormControl('', Validators.required),
    year: new FormControl('', Validators.required),
  });

  private readonly monthLabel = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe,
  ) {}

  ngOnInit(): void {
    if (this.periodData?.month && this.periodData?.year) {
      this.formGroup.patchValue({
        month: this.periodData.month,
        year: this.periodData.year,
      });
    }
  }

  /** Ganti periode berarti hasil lama tidak berlaku lagi. */
  private pilih(patch: any) {
    this.formGroup.patchValue(patch);
    this.posisi = null;
  }

  /**
   * MASA PAJAK PALING AWAL yang boleh dibuka — lihat `utils/pajak.py`.
   *
   * Servernya yang menegakkan; batas di sini hanya supaya tombolnya tidak
   * menuntun orang ke masa yang sudah pasti kosong.
   */
  readonly tahunAwal = 2025;

  get bisaMundur(): boolean {
    return Number(this.formGroup.value.year) > this.tahunAwal;
  }

  gantiTahun(delta: number) {
    const tujuan = +this.formGroup.value.year + delta;
    if (tujuan < this.tahunAwal) return;
    this.pilih({ year: tujuan });
  }

  pilihBulan(n: number) {
    this.pilih({ month: n });
  }

  onSubmit() {
    if (this.formGroup.invalid) return;
    this.isLoading = true;
    this.posisi = null;
    this.apiService
      .get('taxes/ppn-position', this.formGroup.value)
      .subscribe({
        next: (data: any) => {
          this.posisi = data;
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

  /** Nilai mutlak selisih, untuk ditampilkan tanpa tanda minus. */
  get selisihAbs(): number {
    return Math.abs(this.posisi?.selisih ?? 0);
  }

  private periodeLabel(): string {
    const month = Number(this.formGroup.get('month')?.value);
    const year = Number(this.formGroup.get('year')?.value);
    return `${this.monthLabel[month - 1] ?? month} ${year}`;
  }

  unduhExcel() {
    if (!this.posisi) return;
    const periode = this.periodeLabel();

    const barisKeluaran = (this.posisi.keluaran?.rows || []).map((x: any) => ({
      date: this.datePipe.transform(new Date(x.date), 'dd MMMM yyyy'),
      pihak: x.client_name,
      npwp: x.client_npwp,
      dokumen: x.name,
      faktur: x.taxInvoiceName,
      proyek: x.projectName,
      dpp: Number(x.dpp) || 0,
      ppn: Number(x.ppnValue) || 0,
    }));

    const kolomKeluaran: any[] = [
      { header: 'Tanggal', key: 'date', width: 18 },
      { header: 'Pelanggan', key: 'pihak', width: 30 },
      { header: 'NPWP', key: 'npwp', width: 22 },
      { header: 'No. Invoice', key: 'dokumen', width: 24 },
      { header: 'No. Faktur Pajak', key: 'faktur', width: 26 },
      { header: 'Proyek', key: 'proyek', width: 22 },
      { header: 'DPP', key: 'dpp', width: 16, align: 'right', numFmt: '#,##0', total: true },
      { header: 'PPN', key: 'ppn', width: 16, align: 'right', numFmt: '#,##0', total: true },
    ];

    const barisMasukan = (rows: any[]) =>
      (rows || []).map((x: any) => ({
        date: this.datePipe.transform(new Date(x.date), 'dd MMMM yyyy'),
        sumber:
          x.sumber === 'expense'
            ? this.translate.instant('tax.sourceExpense')
            : this.translate.instant('tax.sourcePurchase'),
        pihak: [x.supplier?.prefix, x.supplier?.name].filter(Boolean).join(' '),
        npwp: x.supplier?.npwp,
        faktur: x.taxInvoiceName,
        dpp: Number(x.dpp) || 0,
        ppn: Number(x.ppnValue) || 0,
      }));

    const kolomMasukan: any[] = [
      { header: 'Tanggal', key: 'date', width: 18 },
      { header: 'Sumber', key: 'sumber', width: 14 },
      { header: 'Supplier', key: 'pihak', width: 30 },
      { header: 'NPWP', key: 'npwp', width: 22 },
      { header: 'No. Faktur Pajak', key: 'faktur', width: 26 },
      { header: 'DPP', key: 'dpp', width: 16, align: 'right', numFmt: '#,##0', total: true },
      { header: 'PPN', key: 'ppn', width: 16, align: 'right', numFmt: '#,##0', total: true },
    ];

    downloadRecapExcel(
      [
        {
          fileName: `Posisi PPN ${periode}`,
          sheetName: 'PPN Keluaran',
          title: 'PPN KELUARAN (FAKTUR PENJUALAN)',
          subtitle: `Periode ${periode}`,
          rows: barisKeluaran,
          columns: kolomKeluaran,
        },
        {
          fileName: `Posisi PPN ${periode}`,
          sheetName: 'Masukan Dikreditkan',
          title: 'PPN MASUKAN — DAPAT DIKREDITKAN',
          subtitle: `Periode ${periode}`,
          rows: barisMasukan(this.posisi.masukanKreditable?.rows),
          columns: kolomMasukan,
        },
        {
          fileName: `Posisi PPN ${periode}`,
          sheetName: 'Masukan Tanpa Faktur',
          title: 'PPN MASUKAN — BELUM ADA FAKTUR PAJAK',
          subtitle: `Periode ${periode}`,
          rows: barisMasukan(this.posisi.masukanTanpaFaktur?.rows),
          columns: kolomMasukan,
        },
      ],
      `Posisi PPN ${periode}`,
    ).catch((e) => {
      console.error('Gagal membuat berkas Excel:', e);
      this.snackBar.open(
        this.translate.instant('notify.createFailed'),
        'Close',
        { duration: 3000 },
      );
    });
  }
}
