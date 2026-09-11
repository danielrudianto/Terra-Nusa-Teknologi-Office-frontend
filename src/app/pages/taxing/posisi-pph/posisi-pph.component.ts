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
 * Posisi PPh satu masa: berapa yang TERUTANG, dipisah gaji dan pembelian.
 *
 * Setorannya tidak dilaporkan di sini, dan itu disengaja. Sempat ada, dicari
 * di antara beban dengan kode tertentu, lalu dikurangkan dari terutang untuk
 * menyimpulkan "kurang setor" atau "lunas" — dan pemetaan kodenya tidak
 * bertahan. Yang berbahaya bukan angkanya melainkan kesimpulannya: masa yang
 * sebenarnya sudah disetor tampil merah, dan yang membacanya menyetor dua
 * kali. Yang disetor dibaca dari bukti setornya sendiri.
 *
 * Sengaja tidak dijumlahkan menjadi satu angka. PPh 21 (gaji) dan PPh 23/4(2)
 * (potongan ke vendor) disetor dengan kode billing dan formulir SPT yang
 * berbeda, dan yang melapor mengisinya sendiri-sendiri. Satu total gabungan
 * membuat satu masa tampak lunas padahal yang disetor baru salah satunya —
 * dan sekali dijumlahkan, tidak ada cara membacanya kembali menjadi dua.
 *
 * Bedanya dengan posisi PPN: TIDAK ADA kompensasi antar masa. Lebih bayar PPN
 * dikreditkan ke masa berikutnya; PPh potongan tidak — tiap masa berdiri
 * sendiri.
 *
 * Angkanya ESTIMASI, bergantung kelengkapan pencatatan saat laporan dibuka.
 */
@Component({
  selector: 'app-posisi-pph',
  standalone: true,
  templateUrl: './posisi-pph.component.html',
  styleUrl: './posisi-pph.component.scss',
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
export class PosisiPphComponent {
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

  /** Batas yang sama dengan posisi PPN; servernya yang menegakkan. */
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
      .get('taxes/pph-position', this.formGroup.value)
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

  /**
   * Dua bagian, urut gaji lalu pembelian — sesuai permintaan di layar.
   *
   * Disusun sebagai larik supaya templatnya menuliskan bentuk baris SEKALI.
   * Dua salinan blok yang sama berarti satu di antaranya tertinggal ketika
   * bentuknya disesuaikan, dan dua bagian yang mestinya kembar akan terbaca
   * seperti dua hal berbeda.
   */
  get bagian(): any[] {
    if (!this.posisi) return [];
    return [
      { ...this.posisi.gaji, judul: 'taxing.pphPositionSalary' },
      { ...this.posisi.pembelian, judul: 'taxing.pphPositionPurchase' },
    ];
  }

  /**
   * Periode slip yang menjadi sumber satu bagian — "Agustus 2026".
   *
   * Kosong bila bagiannya memang bicara tentang masanya sendiri, seperti
   * PPh 23/4(2) atas pembelian. Yang menentukan SERVER: pergeserannya satu
   * aturan pajak, dan aturan yang disalin ke layar akan berselisih dengan
   * angkanya sendiri pada perubahan berikutnya.
   */
  periodeSlip(b: any): string {
    const p = b?.periodeSlip;
    if (!p?.month || !p?.year) return '';
    return `${this.monthLabel[Number(p.month) - 1] ?? p.month} ${p.year}`;
  }

  private periodeLabel(): string {
    const month = Number(this.formGroup.get('month')?.value);
    const year = Number(this.formGroup.get('year')?.value);
    return `${this.monthLabel[month - 1] ?? month} ${year}`;
  }

  private tgl(v: any): string {
    return v ? (this.datePipe.transform(new Date(v), 'dd MMMM yyyy') ?? '') : '';
  }

  unduhExcel() {
    if (!this.posisi) return;
    const periode = this.periodeLabel();
    const nama = `Posisi PPh ${periode}`;

    const barisGaji = (this.posisi.gaji?.rows || []).map((x: any) => ({
      nama: x.name,
      nik: x.nik,
      jabatan: x.position,
      departemen: x.department,
      kategori: x.taxCategory,
      pph: Number(x.pphValue) || 0,
    }));

    const barisPembelian = (this.posisi.pembelian?.rows || []).map((x: any) => ({
      date: this.tgl(x.date),
      sumber:
        x.sumber === 'expense'
          ? this.translate.instant('tax.sourceExpense')
          : this.translate.instant('tax.sourcePurchase'),
      pihak:
        x.sumber === 'expense'
          ? x.opponent_name
          : [x.supplier_prefix, x.supplier_name].filter(Boolean).join(' '),
      npwp: x.sumber === 'expense' ? x.opponent_npwp : x.supplier_npwp,
      invoiceName: x.invoiceName,
      pphCode: x.pphCode,
      pphTaxObject: x.pphTaxObject,
      dpp: Number(x.dpp) || 0,
      pphPercentage: Number(x.pphPercentage) || 0,
      pph: Number(x.pphValue) || 0,
    }));

    downloadRecapExcel([
      {
        fileName: nama,
        sheetName: 'PPh 21 Gaji',
        title: 'PPh 21 — GAJI',
        subtitle: `Periode ${periode}`,
        rows: barisGaji,
        columns: [
          { header: 'Nama', key: 'nama', width: 30 },
          { header: 'NIK', key: 'nik', width: 22 },
          { header: 'Jabatan', key: 'jabatan', width: 24 },
          { header: 'Departemen', key: 'departemen', width: 20 },
          { header: 'Kategori Pajak', key: 'kategori', width: 16 },
          { header: 'PPh 21', key: 'pph', width: 16, align: 'right', numFmt: '#,##0', total: true },
        ],
      },
      {
        fileName: nama,
        sheetName: 'PPh 23 & 4(2)',
        title: 'PPh 23 & 4(2) — POTONGAN ATAS PEMBAYARAN',
        subtitle: `Periode ${periode}`,
        rows: barisPembelian,
        columns: [
          { header: 'Tanggal', key: 'date', width: 18 },
          { header: 'Sumber', key: 'sumber', width: 14 },
          { header: 'Pihak', key: 'pihak', width: 30 },
          { header: 'NPWP', key: 'npwp', width: 22 },
          { header: 'No. Invoice', key: 'invoiceName', width: 24 },
          { header: 'Kode PPh', key: 'pphCode', width: 14 },
          { header: 'Objek Pajak', key: 'pphTaxObject', width: 34 },
          { header: 'DPP', key: 'dpp', width: 16, align: 'right', numFmt: '#,##0', total: true },
          { header: '%', key: 'pphPercentage', width: 8, align: 'right' },
          { header: 'PPh', key: 'pph', width: 16, align: 'right', numFmt: '#,##0', total: true },
        ],
      },
    ]);
  }
}
