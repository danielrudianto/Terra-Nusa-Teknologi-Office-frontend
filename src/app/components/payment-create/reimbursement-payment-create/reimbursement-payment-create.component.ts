import { CommonModule, DatePipe } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Component, Inject, inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe } from '@ngx-translate/core';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { ApiService } from 'src/app/services/api.service';
import { BankAccountSelectorComponent } from '../../../components/bank-account-selector/bank-account-selector.component';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-reimbursement-payment-create',
  providers: [provideNgxMask()],
  imports: [
    BankAccountSelectorComponent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatDialogModule,
    MatButtonModule,
    MatDatepickerModule,
    MatSelectModule,
    MatInputModule,
    NgxMaskDirective,
    TranslatePipe,
    DialogGeserDirective,
    MatIconModule,
  ],
  templateUrl: './reimbursement-payment-create.component.html',
  styleUrl: './reimbursement-payment-create.component.scss',
  standalone: true,
})
export class ReimbursementPaymentCreateComponent {
  private readonly translate = inject(TranslateService);
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apiService: ApiService,
    private dialog: MatDialogRef<ReimbursementPaymentCreateComponent>,
    private snackBar: MatSnackBar,
    private formBuilder: FormBuilder,
    private datePipe: DatePipe,
  ) {}

  isLoading: boolean = false;
  isSubmitting: boolean = false;
  bankAccounts: any[] = [];
  payments: any[] = [];
  totalAmount: number = 0;

  metaFormGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    dueDate: new FormControl(''),
    createdAt: new FormControl('', Validators.required),
    reimbursementName: new FormControl('', Validators.required),
    projectName: new FormControl('', Validators.required),
    bankAccountName: new FormControl(''),
    bankAccountNumber: new FormControl(''),
    bankName: new FormControl(''),
  });

  valueFormGroup: FormGroup = new FormGroup({
    reimbursementItems: new FormArray([]),
    total: new FormControl('', Validators.required),
  });

  formGroup: FormGroup = new FormGroup({
    dueDate: new FormControl(''),
    date: new FormControl('', Validators.required),
    bankAccountID: new FormControl('', Validators.required),
    amount: new FormControl(0, [Validators.required, Validators.min(0.01)]),
  });

  /**
   * Tidak ada lagi sisa yang dapat dibayarkan.
   *
   * Toleransi lima rupiah, sama seperti pada perhitungan `isPaid` di server:
   * pembulatan pajak menyisakan selisih beberapa rupiah yang bukan kekurangan
   * bayar, dan tanpa toleransi itu dokumen yang sebenarnya lunas tetap
   * menerima pembayaran satu rupiah.
   *
   * Server tetap menolaknya secara terpisah — ini hanya agar tombolnya tidak
   * mengundang penekanan yang pasti gagal.
   */
  get sudahLunas(): boolean {
    return (Number(this.totalAmount) || 0) <= 5;
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
        this.dialog.close();
      },
    });
  }

  fetchData() {
    this.isLoading = true;
    this.apiService.get('reimbursements/' + this.data.id, {}).subscribe({
      next: (data: any) => {
        this.metaFormGroup.patchValue({
          date: this.datePipe.transform(
            data.reimbursement.date,
            'dd MMMM yyyy',
          ),
          dueDate: this.datePipe.transform(
            data.reimbursement.dueDate,
            'dd MMMM yyyy',
          ),
          createdAt: this.datePipe.transform(data.createdAt, 'dd MMMM yyyy'),
          reimbursementName: data.reimbursement.name,
          projectName: data.reimbursement.projectName,
          bankAccountName: data.reimbursement.bankAccountName,
          bankAccountNumber: data.reimbursement.bankAccountNumber,
          bankName: data.reimbursement.bankName,
        });

        data.reimbursement_items.forEach((item: any) => {
          this.t.push(
            this.formBuilder.group({
              id: [item.id],
              date: [
                `${new Date(item.date).toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'long',
                  day: '2-digit',
                })}`,
              ],
              description: [item.description, Validators.required],
              amount: [item.amount, [Validators.required, Validators.min(1)]],
            }),
          );
        });

        const nilaiDokumen = data.reimbursement_items.reduce(
          (a: number, b: any) => a + Number(b.amount || 0),
          0,
        );

        /*
         * SISA tagihan, bukan nilai dokumennya.
         *
         * Pembayaran yang sudah masuk dikurangkan lebih dulu — sama seperti
         * pembayaran pembelian, biaya, dan pinjaman. Tanpa itu, dokumen yang
         * sudah dibayar sebagian menawarkan nilai penuh sekali lagi.
         *
         * `isDelete` disaring: pembayaran yang dibatalkan tidak mengurangi
         * apa pun, dan menghitungnya membuat sisanya lebih kecil daripada
         * yang sebenarnya masih harus dibayar.
         */
        const sudahDibayar = (data.payments || [])
          .filter((x: any) => !x.isDelete)
          .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

        const sisa = Math.round((nilaiDokumen - sudahDibayar) * 100) / 100;

        this.valueFormGroup.patchValue({
          total: nilaiDokumen,
        });

        /*
         * `totalAmount` HARUS diisi di sini.
         *
         * `sudahLunas` membacanya, dan nilai awalnya nol. Selama tidak
         * pernah diisi, `0 <= 5` selalu benar — setiap reimbursement dibuka
         * dengan banner "sudah lunas" dan tombol simpan yang mati, termasuk
         * yang belum pernah dibayar sepeser pun. Tidak ada galat yang
         * muncul: nilainya sah, hanya tidak pernah berpindah dari nol.
         *
         * Ketiga layar pembayaran lain sudah mengisinya; hanya yang ini
         * tertinggal.
         */
        this.totalAmount = sisa;

        this.formGroup
          .get('amount')
          ?.setValidators([
            Validators.required,
            Validators.min(0.01),
            Validators.max(sisa),
          ]);
        this.formGroup.get('amount')?.updateValueAndValidity();

        this.formGroup.patchValue({
          date: new Date(data.reimbursement.dueDate),
          amount: sisa,
        });
      },
      error: (error) => {
        this.snackBar.open(
      this.translate.instant('notify.loadFailed'), 'Close', {
          duration: 3000,
        });
        this.isLoading = false;
      },
    });
  }

  onSubmit() {
    this.isSubmitting = true;

    const date = new Date(this.formGroup.value.date);
    const formattedDate = `${date.getFullYear()}-${String(
      date.getMonth() + 1,
    ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    this.isSubmitting = false;
    this.apiService
      .post('outgoing-payments', {
        purchaseID: null,
        expenseID: null,
        loanID: null,
        reimbursementID: this.data.id,
        date: formattedDate,
        amount: this.formGroup.value.amount,
        bankAccountID: this.formGroup.value.bankAccountID,
      })
      .subscribe({
        next: (data) => {
          // create pdf document
          // PaymentSlipHelper.generateReimbursementPaymentSlipPDF({
          //   reimbursementName: this.metaFormGroup.value.reimbursementName,
          //   projectName: this.metaFormGroup.value.projectName,
          //   date: this.metaFormGroup.value.date,
          //   paymentDate: formattedDate,
          //   dueDate: this.metaFormGroup.value.dueDate,
          //   createdAt: this.metaFormGroup.value.createdAt,
          //   amount: this.formGroup.value.amount,
          //   bankAccountName: this.metaFormGroup.value.bankAccountName,
          //   bankAccountNumber: this.metaFormGroup.value.bankAccountNumber,
          //   bankName: this.metaFormGroup.value.bankName,
          //   bankAccountNameOrigin: this.bankAccounts.find(
          //     (x) => x.id === this.formGroup.value.bankAccountID
          //   )?.bankAccountName,
          //   bankAccountNumberOrigin: this.bankAccounts.find(
          //     (x) => x.id === this.formGroup.value.bankAccountID
          //   )?.bankAccountNumber,
          //   bankNameOrigin: this.bankAccounts.find(
          //     (x) => x.id === this.formGroup.value.bankAccountID
          //   )?.bankName,
          // });
          this.snackBar.open(
      this.translate.instant('notify.createSuccess'), 'Close', {
            duration: 3000,
          });
          this.dialog.close();
        },
        error: (error) => {
          this.snackBar.open(
      this.translate.instant('notify.createFailed'), 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

  onClose() {
    if (this.isSubmitting) {
      return;
    }
    this.dialog.close();
  }

  get f() {
    return this.valueFormGroup.controls;
  }

  get t() {
    return this.valueFormGroup.get('reimbursementItems') as FormArray;
  }
}
