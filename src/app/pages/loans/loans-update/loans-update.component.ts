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
  ],
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
      bankName: d.bankName ?? '',
      bankAccountID: d.bankAccountID ?? '',
    });
  }

  onCancel() {
    this.dialog.close();
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
          this.snackBar.open(
            error?.error?.detail || 'Gagal memperbarui data pinjaman',
            'Close',
            { duration: 3000 },
          );
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
