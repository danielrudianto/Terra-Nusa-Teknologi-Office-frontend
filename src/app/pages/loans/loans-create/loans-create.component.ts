import { CommonModule } from '@angular/common';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { TranslateService } from '@ngx-translate/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import moment from 'moment';
import { ApiService } from 'src/app/services/api.service';
import { banks, IBank } from 'src/app/utils/bank';

@Component({
  selector: 'app-loans-create',
  standalone: true,
  providers: [provideNgxMask(), provideNativeDateAdapter()],
  imports: [
    TranslatePipe,
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatAutocompleteModule,
    MatIconModule,
    MatButtonModule,
    NgxMaskDirective,
  ],
  templateUrl: './loans-create.component.html',
  styleUrl: './loans-create.component.scss',
})
export class LoansCreateComponent {
  private readonly serverMessage = inject(ServerMessageService);
  private readonly translate = inject(TranslateService);
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialogRef<LoansCreateComponent>,
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
    date: new FormControl('', Validators.required),
    debt: new FormControl(0, [Validators.required, Validators.min(1)]),
    received: new FormControl(0, [Validators.required, Validators.min(0)]),
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
      next: (data: any) => {
        this.bankAccounts = data;
      },
    });
  }

  onCancel() {
    this.dialog.close();
  }

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .post(`loans`, {
        date: moment(this.formGroup.value.date).format('YYYY-MM-DD'),
        creditorName: this.formGroup.value.creditorName,
        creditorAddress: this.formGroup.value.creditorAddress,
        creditorNPWP: this.formGroup.value.creditorNPWP,
        description: this.formGroup.value.description,
        debt: this.formGroup.value.debt,
        received: this.formGroup.value.received,
        bankAccountName: this.formGroup.value.bankAccountName,
        bankAccountNumber: this.formGroup.value.bankAccountNumber,
        bankName: this.formGroup.value.bankName,
        bankAccountID: this.formGroup.value.bankAccountID,
      })
      .subscribe({
        next: (_) => {
          this.formGroup.reset();
          this.snackBar.open(
      this.translate.instant('notify.createSuccess'), 'Close', {
            duration: 3000,
          });
          // close and signal the list to refresh
          this.dialog.close(true);
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

  filter(): void {
    const filterValue = this.input.nativeElement.value.toLowerCase();
    this.filteredOptions = this.options.filter(
      (option) =>
        option.name.toLowerCase().includes(filterValue) ||
        option.alias.toLowerCase().includes(filterValue),
    );
  }
}
