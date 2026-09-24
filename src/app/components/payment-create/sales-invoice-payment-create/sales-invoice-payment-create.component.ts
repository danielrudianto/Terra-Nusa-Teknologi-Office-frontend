import { Component, Inject, inject } from '@angular/core';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { TranslateService } from '@ngx-translate/core';
import {
  bpjsFaktur,
  dppFaktur,
  nilaiDibayarkan,
  pphFaktur,
  ppnFaktur,
} from 'src/app/helpers/nilai-faktur.helper';
import { ApiService } from '../../../services/api.service';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import moment from 'moment';
import { CommonModule } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { TranslatePipe } from '@ngx-translate/core';
import { BankAccountSelectorComponent } from '../../../components/bank-account-selector/bank-account-selector.component';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';
import { CanDirective } from '../../../directives/can.directive';
import { DeleteConfirmationComponent } from '../../delete-confirmation/delete-confirmation.component';

@Component({
  selector: 'app-sales-invoice-payment-create',
  standalone: true,
  providers: [provideNgxMask()],
  templateUrl: './sales-invoice-payment-create.component.html',
  styleUrl: './sales-invoice-payment-create.component.scss',
  imports: [
    BankAccountSelectorComponent,
    NgxMaskDirective,
    MatInputModule,
    MatIconModule,
    MatDialogModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    TranslatePipe,
    DialogGeserDirective,
    CanDirective,
  ],
})
export class SalesInvoicePaymentCreateComponent {
  private readonly serverMessage = inject(ServerMessageService);
  private readonly translate = inject(TranslateService);
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private apiService: ApiService,
    private dialog: MatDialog,
    private dialogRef: MatDialogRef<SalesInvoicePaymentCreateComponent>,
    private snackBar: MatSnackBar,
    private formBuilder: FormBuilder,
  ) {}

  isLoading: boolean = false;
  isSubmitting: boolean = false;
  bankAccounts: any[] = [];

  formGroup: FormGroup = new FormGroup({
    name: new FormControl('', Validators.required),
    clientName: new FormControl('', Validators.required),
    dpp: new FormControl(0, Validators.required),
    ppn: new FormControl(0, Validators.required),
    pph: new FormControl('', Validators.required),
    // BPJS: potongan yang juga TIDAK pernah masuk ke rekening.
    //
    // Sebelumnya tidak ada di sini sama sekali, sehingga nilainya tidak
    // dapat ditampilkan dan selisihnya tidak dapat diterangkan.
    bpjs: new FormControl(0),
    total: new FormControl('', Validators.required),
    payments: new FormArray([]),
  });

  paymentFormGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    amount: new FormControl(0, [Validators.required, Validators.min(0)]),
    bankAccountID: new FormControl('', Validators.required),
  });

  get f() {
    return this.formGroup.controls;
  }

  get t(): FormArray {
    return this.f['payments'] as FormArray;
  }

  get totalPaid(): number {
    return this.t.controls.reduce(
      (a, c) => a + (Number(c.get('amount')?.value) || 0),
      0,
    );
  }

  get remaining(): number {
    return (Number(this.formGroup.get('total')?.value) || 0) - this.totalPaid;
  }

  ngOnInit(): void {
    this.fetchBankData();
    this.fetchData();
  }

  fetchBankData() {
    this.apiService.get('banks/all', {}).subscribe({
      next: (data: any) => {
        this.bankAccounts = data;
      },
      error: (error) => {
        this.snackBar.open(
      this.translate.instant('notify.loadFailed'), 'Close', {
          duration: 3000,
        });
        this.dialogRef.close();
      },
    });
  }

  fetchData() {
    this.isLoading = true;
    this.apiService
      .get(`sales-invoices/${this.data.id}`, {})
      .subscribe({
        next: (data: any) => {
          this.formGroup.patchValue({
            name: data.name,
            clientName: `${data.client_name}, ${data.client_prefix}`,
            dpp: dppFaktur(data),
            ppn: ppnFaktur(data),
            pph: pphFaktur(data),
            bpjs: bpjsFaktur(data),
            /*
             * BPJS ikut dipotong — sebelumnya TIDAK.
             *
             * Server menyimpulkan lunas dengan `DPP + PPN − PPh − BPJS`.
             * Dialog ini memakai rumus tanpa BPJS, sehingga pada faktur yang
             * ada potongan BPJS-nya: klien mentransfer jumlah yang benar,
             * daftar faktur menandainya LUNAS, dan dialog ini masih
             * menampilkan "Sisa" sebesar BPJS — tanpa satu pun baris yang
             * menerangkan dari mana angka itu, karena barisnya memang tidak
             * ada di layar ini.
             *
             * Yang mencatat pembayaran lalu menagih lagi uang yang tidak akan
             * pernah datang.
             */
            total: nilaiDibayarkan(data),
          });

          /*
           * Rekening IKUT dibawa ke barisnya.
           *
           * Tanpa ini riwayat hanya menyebut tanggal dan nominal — dan
           * justru rekeninglah yang paling sering salah ketik, sehingga
           * satu-satunya kolom yang perlu diperiksa ulang adalah kolom
           * yang tidak pernah ditampilkan.
           */
          this.t.clear();
          data.payments.forEach((x: any) => {
            this.t.push(
              this.formBuilder.group({
                id: [x.id],
                amount: [x.amount],
                date: [x.date],
                bankAccountID: [x.bankAccountID],
                bankAccountNumber: [x.bankAccountNumber],
                bankAccountName: [x.bankAccountName],
                bankName: [x.bankName],
              }),
            );
          });
        },
        error: (error) => {
          this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
            duration: 3000,
          });
          this.dialogRef.close();
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  /**
   * Id pembayaran yang sedang dibetulkan; `null` bila sedang mencatat baru.
   *
   * SATU formulir dipakai untuk keduanya, bukan dua. Tanggal, nominal, dan
   * rekeningnya sama persis — formulir kedua berarti dua tempat yang harus
   * sama-sama diingat setiap kali penjagaannya berubah.
   */
  sedangSunting: number | null = null;

  mulaiSunting(baris: any): void {
    this.sedangSunting = Number(baris.get('id')?.value);
    this.paymentFormGroup.patchValue({
      date: baris.get('date')?.value,
      amount: baris.get('amount')?.value,
      bankAccountID: baris.get('bankAccountID')?.value,
    });
  }

  batalSunting(): void {
    this.sedangSunting = null;
    this.paymentFormGroup.reset({ date: '', amount: 0, bankAccountID: '' });
  }

  /**
   * Hapus pembayaran yang tidak pernah terjadi.
   *
   * Dijaga level 4 di server. Tombolnya disembunyikan `*appCan` sebagai
   * kenyamanan — bukan pengamanan; rutenya tetap menolak.
   */
  hapus(baris: any): void {
    const id = Number(baris.get('id')?.value);
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: this.translate.instant('salesInvoicePayment.hapusJudul'),
          prompt: this.translate.instant('salesInvoicePayment.hapusKet'),
        },
        width: '440px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ya) => {
        if (!ya) return;
        this.apiService.delete(`incoming-payments/${id}`).subscribe({
          next: () => {
            this.snackBar.open(
              this.translate.instant('notify.deleteSuccess'),
              'Close',
              { duration: 3000 },
            );
            // Kalau yang dihapus sedang disunting, penyuntingannya ikut
            // batal — jika tidak, tombol simpan menunjuk baris yang sudah
            // tidak ada.
            if (this.sedangSunting === id) this.batalSunting();
            this.muatUlang();
          },
          error: (error) => {
            this.snackBar.open(this.serverMessage.terjemahkan(error), 'Close', {
              duration: 4000,
            });
          },
        });
      });
  }

  /** Muat ulang faktur beserta riwayat pembayarannya, tanpa menutup dialog. */
  private muatUlang(): void {
    this.t.clear();
    this.fetchData();
  }

  onSubmit() {
    if (this.sedangSunting !== null) {
      this.simpanSuntingan();
      return;
    }

    this.isSubmitting = true;
    this.apiService
      .post('incoming-payments', {
        date: moment(this.paymentFormGroup.value.date).format('YYYY-MM-DD'),
        amount: this.paymentFormGroup.value.amount,
        bankAccountID: this.paymentFormGroup.value.bankAccountID,
        loanID: null,
        incomeID: null,
        salesInvoiceID: this.data.id,
      })
      .subscribe({
        next: () => {
          this.dialogRef.close('paid');
          this.snackBar.open(
      this.translate.instant('notify.createSuccess'), 'Close', {
            duration: 3000,
          });
        },
        error: (error) => {
          this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

  /**
   * Simpan pembetulan.
   *
   * Hanya tiga kolom yang dikirim — rekening, tanggal, nominal. Fakturnya
   * TIDAK ikut: memindahkan pembayaran ke faktur lain melewati seluruh
   * penjagaan yang berjalan saat pembayaran dibuat, dan servernya memang
   * menolaknya.
   */
  simpanSuntingan(): void {
    const id = this.sedangSunting;
    if (id === null) return;

    this.isSubmitting = true;
    this.apiService
      .put(`incoming-payments/${id}`, {
        date: moment(this.paymentFormGroup.value.date).format('YYYY-MM-DD'),
        amount: this.paymentFormGroup.value.amount,
        bankAccountID: this.paymentFormGroup.value.bankAccountID,
      })
      .subscribe({
        next: () => {
          this.snackBar.open(
            this.translate.instant('notify.updateSuccess'),
            'Close',
            { duration: 3000 },
          );
          this.batalSunting();
          this.muatUlang();
        },
        error: (error) => {
          this.snackBar.open(this.serverMessage.terjemahkan(error), 'Close', {
            duration: 4000,
          });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
