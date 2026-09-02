import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Component, ElementRef, Inject, ViewChild, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { banks, IBank } from 'src/app/utils/bank';
import { BankAccountSelectorComponent } from '../../../components/bank-account-selector/bank-account-selector.component';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

/**
 * Ubah data pinjaman.
 *
 * Hanya data kreditur dan rekening yang dapat disunting. Nilai pinjaman dan
 * sisa utang sengaja tidak ada di sini: keduanya sudah menjadi dasar
 * pencatatan pembayaran masuk dan keluar, sehingga mengubahnya membuat
 * angkanya tidak lagi cocok dengan riwayat transaksi — dan selisihnya tidak
 * akan terlihat di mana pun.
 *
 * Batasnya juga ditegakkan di server; yang di sini hanya agar tidak ada
 * kolom yang tampak dapat diubah padahal pasti ditolak.
 */
@Component({
  selector: 'app-loans-update',
  standalone: true,
  imports: [
    BankAccountSelectorComponent,
    TranslatePipe,
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatIconModule,
    DialogGeserDirective,
    NgxMaskDirective,
  ],
  // `provideNgxMask()` WAJIB ada di komponen yang memakai mask;
  // tanpa itu atribut `mask` hanya teks yang diabaikan Angular.
  providers: [provideNgxMask()],
  templateUrl: './loans-update.component.html',
  styleUrl: './loans-update.component.scss',
})
export class LoansUpdateComponent {
  private readonly translate = inject(TranslateService);
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialogRef<LoansUpdateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  @ViewChild('input') input!: ElementRef<HTMLInputElement>;
  filteredOptions: IBank[] = [];
  options: IBank[] = banks;
  isSubmitting: boolean = false;

  bankAccounts: any[] = [];

  formGroup: FormGroup = new FormGroup({
    creditorName: new FormControl('', Validators.required),
    creditorAddress: new FormControl('', Validators.required),
    creditorNPWP: new FormControl(''),
    description: new FormControl('', Validators.required),
    bankAccountName: new FormControl('', Validators.required),
    bankAccountNumber: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[0-9]*$/),
    ]),
    bankName: new FormControl('', Validators.required),
    // Nilai pinjaman kini dapat disunting. Batas bawahnya — jumlah yang sudah
    // dibayarkan — diperiksa server, karena hanya server yang tahu riwayat
    // pembayaran terkini.
    debt: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
    ]),
    received: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
    ]),
    // rekening PERUSAHAAN tujuan penerimaan dana pinjaman
    bankAccountID: new FormControl('', Validators.required),
  });

  ngOnInit(): void {
    this.apiService.get('banks/all', {}).subscribe({
      next: (accounts: any) => {
        this.bankAccounts = accounts;
      },
    });

    const d = this.data?.loan || {};
    this.formGroup.patchValue({
      creditorName: d.creditorName ?? '',
      creditorAddress: d.creditorAddress ?? '',
      creditorNPWP: d.creditorNPWP ?? '',
      description: d.description ?? '',
      bankAccountName: d.bankAccountName ?? '',
      bankAccountNumber: d.bankAccountNumber ?? '',
      debt: d.debt ?? 0,
      received: d.received ?? 0,
      bankName: d.bankName ?? '',
      bankAccountID: d.bankAccountID ?? '',
    });

    this.muatPembayaran();
  }

  onCancel() {
    this.dialog.close();
  }

  /**
   * Dana diterima melebihi nilai utang.
   *
   * `debt` adalah pokok DITAMBAH bunga dan biaya, jadi ia selalu >=
   * `received`; sama persis pun sah (pinjaman tanpa bunga). Kebalikannya
   * mencatat penerimaan uang yang tidak berutang kepada siapa pun — dan
   * angkanya masuk ke saldo bank lewat penerimaan yang menyertainya.
   *
   * Ditulis sebagai getter, bukan validator lintas-kolom: memanggil
   * `setErrors` dari validator tingkat grup memicu perhitungan ulang ke atas
   * dan mudah berputar. Server tetap penjaga yang sesungguhnya; ini hanya
   * supaya salahnya ketahuan sebelum tombol simpan ditekan.
   *
   * Toleransi lima rupiah, sama dengan ambang di server: nilainya desimal di
   * basis data dan pecahan di layar, jadi selisih beberapa rupiah adalah
   * pembulatan.
   */
  get melebihiUtang(): boolean {
    const utang = Number(this.formGroup.get('debt')?.value) || 0;
    const diterima = Number(this.formGroup.get('received')?.value) || 0;
    return diterima > utang + 5;
  }

  /**
   * Jumlah pembayaran yang sudah disetujui atas pinjaman ini.
   *
   * Diambil sendiri dari server, bukan dari data yang dikirim pemanggil:
   * dialog ini dibuka dari daftar yang hanya membawa data pinjaman, dan
   * mengandalkan pemanggil berarti keterangannya hilang begitu dialog dibuka
   * dari tempat lain.
   *
   * Ditampilkan sebagai keterangan di bawah kolom utang agar batas bawahnya
   * terlihat sebelum disimpan, bukan baru diketahui setelah server menolak.
   */
  private _dibayar = 0;

  sudahDibayar(): number {
    return this._dibayar;
  }

  private muatPembayaran(): void {
    const id = this.data?.loan?.id;
    if (!id) return;
    this.apiService.get(`loans/payments/${id}`, {}).subscribe({
      next: (r: any) => {
        const daftar = Array.isArray(r) ? r : (r?.payments ?? r?.data ?? []);
        this._dibayar = daftar
          .filter((p: any) => p.isApprove && !p.isDelete)
          .reduce((t: number, p: any) => t + (Number(p.amount) || 0), 0);
      },
      // Gagal memuat hanya menghilangkan keterangannya; penjaga yang
      // sesungguhnya tetap ada di server.
      error: () => (this._dibayar = 0),
    });
  }

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .put(`loans/${this.data?.loan?.id}`, this.formGroup.getRawValue())
      .subscribe({
        next: (_) => {
          this.snackBar.open(
      this.translate.instant('notify.updateSuccess'), 'Close', {
            duration: 3000,
          });
          this.dialog.close(true);
        },
        error: (error) => {
          /*
           * Kode tetap dipetakan ke kalimat.
           *
           * Penolakan karena nilai lebih kecil daripada yang sudah dibayar
           * perlu menyebut angkanya — tanpa itu, yang menekan simpan tidak
           * tahu harus mengisi berapa, dan akan mencoba lagi dengan hasil
           * sama.
           */
          const detail = error?.error?.detail;
          const kode = typeof detail === 'string' ? detail : detail?.code;
          let pesan: string;
          if (kode === 'LOAN_BELOW_PAID') {
            const dibayar = Number(detail?.paid ?? this.sudahDibayar()) || 0;
            pesan = this.translate.instant('loans.belowPaid', {
              paid: dibayar.toLocaleString('id-ID'),
            });
          } else if (kode === 'LOAN_RECEIVED_ABOVE_DEBT') {
            pesan = this.translate.instant('loans.receivedAboveDebt', {
              debt: (Number(detail?.debt) || 0).toLocaleString('id-ID'),
            });
          } else if (kode === 'LOAN_RECEIPT_AMBIGUOUS') {
            // Pinjaman ini punya lebih dari satu penerimaan — mungkin
            // pencairan bertahap. Server sengaja tidak menebak yang mana yang
            // harus diubah, dan kalimatnya harus mengatakan itu, bukan
            // "gagal menyimpan" yang membuat orang mencoba lagi.
            pesan = this.translate.instant('loans.receiptAmbiguous');
          } else if (kode === 'LOAN_RECEIPT_SYNC_FAILED') {
            // Kasus paling perlu disebut apa adanya: nilainya tersimpan,
            // tetapi penerimaannya tidak — jadi saldo bank sedang tidak
            // sejalan, dan diam soal itu jauh lebih berbahaya.
            pesan = this.translate.instant('loans.receiptSyncFailed');
          } else {
            pesan =
              detail?.message ??
              (typeof detail === 'string' ? detail : null) ??
              this.translate.instant('notify.updateFailed');
          }
          this.snackBar.open(pesan, 'Close', { duration: 6000 });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

  filter(): void {
    const filterValue = this.input.nativeElement.value.toLowerCase();
    this.filteredOptions = this.options.filter(
      (option) =>
        option.name.toLowerCase().includes(filterValue) ||
        option.alias.toLowerCase().includes(filterValue),
    );
  }
}
