import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';
import { RupiahComponent } from '../../../components/rupiah/rupiah.component';
import { ApiService } from '../../../services/api.service';
import { CertificateOfPayment } from '../../../services/certificate-of-payment.service';
import { IInvoiceItem, printInvoiceDocument } from '../../../helpers/invoice.helper';
import { buildPurchaseOrderDContent } from '../../../helpers/purchase-order-d.helper';
import { proxyPaymentContent } from '../../../helpers/proxy-payment.helper';
import { vendorDisplayName } from '../../../helpers/purchase-order-shared.helper';
import {
  barisInvoiceDariCop,
  dataCetakSpkD,
  keteranganKuitansi,
  nomorInvoiceCop,
  periodeInvoice,
  totalBarisInvoice,
} from '../../../helpers/invoice-tenaga.helper';
import { IBank, banks } from '../../../utils/bank';

export interface DataInvoiceCop {
  cop: CertificateOfPayment;
  /** Nomor invoice pembelian yang SUDAH dibuat dari CoP ini, bila ada. */
  nomorTerbit?: string | null;
  /** CoP ini masih boleh dibuatkan pembelian (disetujui, belum ditagihkan). */
  bolehBuatPembelian: boolean;
}

/** Hasil dialog: lanjut membuat pembelian dengan nomor invoice ini. */
export interface HasilInvoiceCop {
  lanjutPembelian: true;
  nomorInvoice: string;
}

/**
 * Invoice & kuitansi tenaga kerja dari CoP yang sudah disetujui.
 *
 * Menggantikan Generator Invoice. Yang diisi di sini hanya yang memang bukan
 * milik CoP — tanggal dokumen, kota, rekening, surat pengalihan. Baris,
 * volume, dan harga dibaca dari CoP dan SPK-nya, dan tidak dapat disunting:
 * mengubahnya berarti invoice berbeda dari berita acara yang ditandatangani.
 */
@Component({
  selector: 'app-certificate-of-payment-invoice',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    DialogGeserDirective,
    RupiahComponent,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './certificate-of-payment-invoice.component.html',
  styleUrl: './certificate-of-payment-invoice.component.scss',
})
export class CertificateOfPaymentInvoiceComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  constructor(
    @Inject(MAT_DIALOG_DATA) readonly data: DataInvoiceCop,
    private readonly dialogRef: MatDialogRef<CertificateOfPaymentInvoiceComponent>,
  ) {}

  readonly memuat = signal(true);
  readonly mencetak = signal(false);

  /** SPK-nya — pemasok, baris (untuk label), PPh, lampiran. */
  private po: any = null;

  baris: IInvoiceItem[] = [];

  formGroup = new FormGroup({
    date: new FormControl<Date | null>(new Date(), Validators.required),
    city: new FormControl('Bandung', Validators.required),
    bankName: new FormControl('', Validators.required),
    bankAccountName: new FormControl('', Validators.required),
    bankAccountNumber: new FormControl('', Validators.required),
    proxyPayment: new FormControl(false),
  });

  readonly bankOptions: IBank[] = banks;
  filteredBanks: IBank[] = banks;

  async ngOnInit(): Promise<void> {
    try {
      this.po = await firstValueFrom(
        this.api.get(`purchase-orders/${this.data.cop.purchaseOrderID}`, {}),
      );
    } catch {
      this.po = null;
    }

    this.baris = barisInvoiceDariCop(
      this.data.cop,
      this.po?.items ?? [],
      (k) => this.translate.instant('cop.kat_' + k),
    );

    const supplierID = this.supplierID;
    if (supplierID) {
      try {
        const r: any = await firstValueFrom(
          this.api.get(`purchases/frequent-payment/${supplierID}`, {}),
        );
        if (r) {
          this.formGroup.patchValue({
            bankName: r.bankName ?? '',
            bankAccountName: r.bankAccountName ?? '',
            bankAccountNumber: r.bankAccountNumber ?? '',
          });
        }
      } catch {
        // Rekening dapat diisi tangan.
      }
    }
    this.memuat.set(false);
  }

  get supplierID(): number | null {
    return Number(this.po?.supplierID) || null;
  }

  get namaPemasok(): string {
    const nama = this.po?.supplierName ?? this.data.cop.supplierName ?? '';
    const bentuk = this.po?.supplierPrefix ?? this.data.cop.supplierPrefix ?? '';
    return vendorDisplayName(nama, bentuk);
  }

  /** Tanggal cut-off = akhir periode CoP (atau tanggal CoP bila tanpa periode). */
  get potong(): string | null {
    return this.data.cop.periodEnd || this.data.cop.date || null;
  }

  /**
   * Nomor invoice.
   *
   * Bila pembeliannya SUDAH dibuat, nomornya dipakai apa adanya — mencetak
   * ulang tidak boleh menghasilkan nomor lain dari yang tercatat.
   */
  get nomorInvoice(): string {
    if (this.data.nomorTerbit) return this.data.nomorTerbit;
    // Penyusunnya SATU, dipakai bersama formulir pembelian — lihat
    // `nomorInvoiceCop`. Nomor di kertas dan nomor di pembukuan tidak boleh
    // disusun oleh dua potong kode yang dapat berselisih.
    return nomorInvoiceCop({
      cop: this.data.cop as any,
      poItems: this.po?.items ?? [],
      supplierID: this.supplierID,
      tanggal: this.formGroup.value.date,
      labelKategori: (k) => this.translate.instant('cop.kat_' + k),
    });
  }

  get periodeTeks(): string {
    return periodeInvoice(this.potong);
  }

  get total(): number {
    return totalBarisInvoice(this.baris);
  }

  /** Total baris harus sama dengan nilai bersih CoP; bila tidak, dikatakan. */
  get selisih(): number {
    const bersih = Number(this.data.cop.netAmount) || 0;
    return Math.round((this.total - bersih) * 100) / 100;
  }

  get pphPersen(): number {
    return Number(this.data.cop.spkSyarat?.pphPercentage ?? this.po?.pphPercentage) || 0;
  }

  get pphNilai(): number {
    return Math.round(((this.total * this.pphPersen) / 100) * 100) / 100;
  }

  get dibayarkan(): number {
    return this.total - this.pphNilai;
  }

  get bisaCetak(): boolean {
    return !this.memuat() && this.formGroup.valid && !!this.nomorInvoice && this.baris.length > 0;
  }

  filterBanks(event?: Event): void {
    const kata = String(
      (event?.target as HTMLInputElement | undefined)?.value ??
        this.formGroup.value.bankName ??
        '',
    )
      .toLowerCase()
      .trim();
    const persis = this.bankOptions.some((b) => b.name.toLowerCase() === kata);
    this.filteredBanks =
      !kata || persis
        ? this.bankOptions.slice()
        : this.bankOptions.filter(
            (b) =>
              b.name.toLowerCase().includes(kata) ||
              (b.alias ?? '').toLowerCase().includes(kata),
          );
  }

  cetak(output: 'open' | 'download'): void {
    if (!this.bisaCetak) {
      this.formGroup.markAllAsTouched();
      return;
    }
    const v = this.formGroup.getRawValue();
    this.mencetak.set(true);
    try {
      printInvoiceDocument(
        {
          invoiceNumber: this.nomorInvoice,
          city: String(v.city ?? ''),
          date: v.date ?? new Date(),
          supplierName: this.namaPemasok,
          attachment: this.po ? buildPurchaseOrderDContent(dataCetakSpkD(this.po)) : [],
          attachmentPolos: v.proxyPayment
            ? proxyPaymentContent({
                invoiceName: this.nomorInvoice,
                // Invoice tenaga kerja tidak menerbitkan faktur pajak.
                taxInvoiceName: '',
                supplierName: this.namaPemasok,
                bankName: String(v.bankName ?? ''),
                bankAccountNumber: String(v.bankAccountNumber ?? ''),
                bankAccountName: String(v.bankAccountName ?? ''),
                // Yang dialihkan adalah yang benar-benar dibayarkan.
                totalPayment: this.dibayarkan,
                date: v.date ?? new Date(),
              })
            : [],
          items: this.baris,
          bankAccountNumber: String(v.bankAccountNumber ?? ''),
          bankAccountName: String(v.bankAccountName ?? ''),
          bankName: String(v.bankName ?? ''),
          keterangan: keteranganKuitansi(this.baris),
          periode: periodeInvoice(this.potong),
        },
        output,
      );
    } catch (e) {
      console.error('Gagal membuat invoice dari CoP:', e);
      this.snackBar.open(this.translate.instant('notify.createFailed'), 'Close', {
        duration: 3000,
      });
    } finally {
      this.mencetak.set(false);
    }
  }

  lanjutPembelian(): void {
    if (!this.bisaCetak) return;
    this.dialogRef.close({
      lanjutPembelian: true,
      nomorInvoice: this.nomorInvoice,
    } as HasilInvoiceCop);
  }

  tutup(): void {
    this.dialogRef.close();
  }
}
