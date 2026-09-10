import { Component, ElementRef, Inject, ViewChild, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
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
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { banks, IBank } from 'src/app/utils/bank';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';
import { AuditTrailComponent } from '../../../components/audit-trail/audit-trail.component';

@Component({
  selector: 'app-bank-update',
  templateUrl: './bank-update.component.html',
  styleUrl: './bank-update.component.scss',
  standalone: true,
  imports: [
    MatSlideToggleModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatDialogModule,
    TranslatePipe,
    DialogGeserDirective,
    AuditTrailComponent,
  ],
})
export class BankUpdateComponent {
  private readonly translate = inject(TranslateService);
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialogRef<BankUpdateComponent>,
  ) {}

  @ViewChild('input') input!: ElementRef<HTMLInputElement>;
  isLoading: boolean = true;
  isSubmitting: boolean = false;
  filteredOptions: IBank[] = [];
  options: IBank[] = banks;

  formGroup: FormGroup = new FormGroup({
    id: new FormControl('', Validators.required),
    bankAccountName: new FormControl('', Validators.required),
    bankAccountNumber: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[0-9]*$/),
    ]),
    bankName: new FormControl('', Validators.required),
    /*
     * Rekening ini TIDAK ikut perhitungan kalender kas.
     *
     * Untuk rekening yang uangnya ada tetapi bukan kas yang dapat
     * dibelanjakan bulan ini — deposito, escrow, penampung uang muka.
     * Memasukkannya ke saldo gabungan membuat perencanaan kas terbaca
     * lebih longgar daripada keadaan sebenarnya.
     *
     * Disimpan sebagai pengecualian (bawaan `false`), bukan sebagai
     * "ikut sertakan": mayoritas rekening memang ikut, dan baris lama
     * yang belum punya kolom ini tetap terbaca sebagai ikut.
     */
    excludeFromCalendar: new FormControl(false),
  });

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData() {
    const id = this.data.id;
    this.apiService
      .get('banks/' + id, {})
      .subscribe({
        next: (data: any) => {
          this.formGroup.patchValue({
            id: data.id,
            bankAccountName: data.bankAccountName,
            bankAccountNumber: data.bankAccountNumber,
            bankName: data.bankName,
            // Baris lama belum punya kolomnya; `undefined` diperlakukan
            // sebagai ikut perhitungan, sama seperti bawaan di server.
            excludeFromCalendar: !!data.excludeFromCalendar,
          });
          this.filteredOptions = this.options.slice();
        },
        error: (error) => {
          this.snackBar.open(
      this.translate.instant('notify.loadFailed'), 'Close', {
            duration: 2000,
          });
          this.dialog.close();
        },
      })
      .add(() => {
        this.isLoading = false;
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

  onClose() {
    this.dialog.close();
  }

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .put('banks/' + this.data.id, this.formGroup.value)
      .subscribe({
        next: (_) => {
          this.snackBar.open(
      this.translate.instant('notify.updateSuccess'), 'Close', {
            duration: 2000,
          });
          this.dialog.close();
        },
        error: (err) => {
          this.snackBar.open(
      this.translate.instant('notify.updateFailed'), 'Close', {
            duration: 2000,
          });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
