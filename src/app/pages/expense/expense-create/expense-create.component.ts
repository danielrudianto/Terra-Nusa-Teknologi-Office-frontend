import { Component, ElementRef, ViewChild } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { PphSelectorComponent } from 'src/app/components/pph-selector/pph-selector.component';
import { ApiService } from 'src/app/services/api.service';
import { banks, IBank } from 'src/app/utils/bank';
import { IPPh } from 'src/app/utils/pph';
import { ExpenseOpponentSelectorComponent } from '../../../components/expense-opponent-selector/expense-opponent-selector.component';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { MatDividerModule } from '@angular/material/divider';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NgxMaskDirective } from 'ngx-mask';
import { ExpenseCreateAdministrationComponent } from './expense-create-administration/expense-create-administration.component';

@Component({
  selector: 'app-expense-create',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    MatChipsModule,
    MatTableModule,
    MatIconModule,
    MatStepperModule,
    MatAutocompleteModule,
    MatDividerModule,
    MatButtonModule,
    MatSlideToggleModule,
    HeaderTitleComponent,
    NgxMaskDirective,
  ],
  templateUrl: './expense-create.component.html',
  styleUrl: './expense-create.component.scss',
  standalone: true,
})
export class ExpenseCreateComponent {
  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private decimalPipe: DecimalPipe,
  ) {}

  @ViewChild('stepper') stepper: MatStepper | undefined;
  @ViewChild('input') input!: ElementRef<HTMLInputElement>;

  isFinal: boolean = false;
  filteredOptions: IBank[] = [];
  options: IBank[] = banks;
  isSubmitting: boolean = false;
  bankAccounts: any[] = [];

  metaFormGroup: FormGroup = new FormGroup({
    invoiceName: new FormControl(''),
    receiptName: new FormControl(''),
    description: new FormControl('', [
      Validators.required,
      Validators.minLength(10),
    ]),
    purchaseType: new FormControl('', Validators.required),
    opponentID: new FormControl(''),
    opponentName: new FormControl(''),
    opponentDescription: new FormControl(''),
    date: new FormControl(new Date(), Validators.required),
    dueDate: new FormControl(new Date(), Validators.required),
  });

  valueFormGroup: FormGroup = new FormGroup({
    dpp: new FormControl('', [Validators.required, Validators.min(0.01)]),
    pbbkb: new FormControl(0, [Validators.required, Validators.min(0)]),
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0, [Validators.required, Validators.min(0)]),
    pphValue: new FormControl(0),
    total: new FormControl(0),
  });

  paymentFormGroup: FormGroup = new FormGroup({
    bankName: new FormControl('', Validators.required),
    bankAccountName: new FormControl('', Validators.required),
    bankAccountNumber: new FormControl('', Validators.required),
    paymentMethod: new FormControl('', Validators.required),
    paymentTotal: new FormControl(0, [Validators.required]),
    createPayment: new FormControl(false),
    bankAccountID: new FormControl(null),
  });

  ngOnInit(): void {
    this.fetchBankAccounts();
  }

  ngAfterViewInit() {
    this.valueFormGroup.controls['dpp'].valueChanges.subscribe((value) => {
      if (value) {
        const pphPercentage =
          this.valueFormGroup.controls['pphPercentage'].value;
        const pphValue = (value * pphPercentage) / 100;
        this.valueFormGroup.controls['pphValue'].setValue(pphValue.toFixed(2));
      }

      this.isFinal = false;
    });

    this.valueFormGroup.controls['pbbkb'].valueChanges.subscribe((_) => {
      this.isFinal = false;
    });
  }

  openOpponentSelector() {
    this.dialog
      .open(ExpenseOpponentSelectorComponent, {
        minWidth: '400px',
      })
      .afterClosed()
      .subscribe((data) => {
        if (data) {
          this.metaFormGroup.patchValue({
            opponentID: data.id,
            opponentName: data.name,
            opponentDescription: data.description,
          });
        }
      });
  }

  openPPHSelector() {
    this.dialog
      .open(PphSelectorComponent, {})
      .afterClosed()
      .subscribe((data) => {
        if (data) {
          const pph = data as IPPh;
          this.valueFormGroup.patchValue({
            pphCode: pph.code,
            pphTaxObject: pph.taxObjectName,
            pphPercentage: pph.tariff,
          });

          const pphPercentage =
            this.valueFormGroup.controls['pphPercentage'].value;
          const dpp = this.valueFormGroup.controls['dpp'].value;
          const pphValue = (dpp * pphPercentage) / 100;
          this.valueFormGroup.controls['pphValue'].setValue(
            pphValue.toFixed(2),
          );
        } else {
          this.valueFormGroup.patchValue({
            pphCode: '',
            pphTaxObject: '',
            pphPercentage: 0,
          });
        }
      });

    this.isFinal = false;
  }

  get isNumberValid() {
    return (
      this.valueFormGroup.controls['dpp'].valid &&
      this.valueFormGroup.controls['pbbkb'].valid
    );
  }

  get isValid() {
    return (
      this.metaFormGroup.valid &&
      this.valueFormGroup.valid &&
      this.paymentFormGroup.valid
    );
  }

  filter(): void {
    const filterValue = this.input.nativeElement.value.toLowerCase();
    this.filteredOptions = this.options.filter(
      (option) =>
        option.name.toLowerCase().includes(filterValue) ||
        option.alias.toLowerCase().includes(filterValue),
    );
  }

  calculateTotal() {
    const dpp = Number(this.valueFormGroup.controls['dpp'].value);
    const pbbkb = Number(this.valueFormGroup.controls['pbbkb'].value);
    const total = dpp + pbbkb;
    const pph = Number(this.valueFormGroup.controls['pphPercentage'].value);
    const pphValue = (dpp * pph) / 100;

    this.valueFormGroup.patchValue({
      total: this.decimalPipe.transform(total, '1.2-2'),
    });

    this.paymentFormGroup.patchValue({
      paymentTotal: (total - pphValue).toFixed(2),
    });

    this.isFinal = true;
  }

  onSubmit() {
    const date = new Date(this.metaFormGroup.controls['date'].value);
    const dueDate = new Date(this.metaFormGroup.controls['dueDate'].value);

    const dateFormatted = `${date.getFullYear()}-${String(
      date.getMonth() + 1,
    ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const dueDateFormatted = `${dueDate.getFullYear()}-${String(
      dueDate.getMonth() + 1,
    ).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;

    this.isSubmitting = true;

    const expenseData = {
      invoiceName: this.metaFormGroup.controls['invoiceName'].value,
      receiptName: this.metaFormGroup.controls['receiptName'].value,
      opponentID: this.metaFormGroup.controls['opponentID'].value,
      // change from date object to YYYY-MM-DD
      date: dateFormatted,
      dueDate: dueDateFormatted,
      purchaseType: this.metaFormGroup.controls['purchaseType'].value,
      description: this.metaFormGroup.controls['description'].value,
      dpp: this.valueFormGroup.controls['dpp'].value,
      pbbkb: this.valueFormGroup.controls['pbbkb'].value,
      pphCode:
        this.valueFormGroup.controls['pphCode'].value == ''
          ? null
          : this.valueFormGroup.controls['pphCode'].value,
      pphTaxObject:
        this.valueFormGroup.controls['pphCode'].value == ''
          ? null
          : this.valueFormGroup.controls['pphTaxObject'].value,
      pphPercentage:
        this.valueFormGroup.controls['pphCode'].value == ''
          ? 0
          : this.valueFormGroup.controls['pphPercentage'].value,
      bankName: this.paymentFormGroup.controls['bankName'].value,
      bankAccountName: this.paymentFormGroup.controls['bankAccountName'].value,
      bankAccountNumber:
        this.paymentFormGroup.controls['bankAccountNumber'].value,
      paymentMethod: this.paymentFormGroup.controls['paymentMethod'].value,
    };

    if (this.paymentFormGroup.controls['createPayment'].value === true) {
      this.apiService
        .post('expenses', expenseData)
        .subscribe({
          next: (result: any) => {
            const expenseID = result.expense_id;
            const paymentData = {
              purchaseID: null,
              expenseID: expenseID,
              reimbursementID: null,
              salarySlipID: null,
              date: dueDateFormatted,
              amount: this.paymentFormGroup.controls['paymentTotal'].value,
              bankAccountID:
                this.paymentFormGroup.controls['bankAccountID'].value,
              status: 'ready',
            };
            this.apiService
              .post('outgoing-payments', paymentData)
              .subscribe({
                next: (_) => {
                  this.snackBar.open('Expense created successfully', 'Close', {
                    duration: 3000,
                  });
                  this.metaFormGroup.reset();
                  this.valueFormGroup.reset();
                  this.paymentFormGroup.reset();
                  this.stepper?.reset();

                  this.metaFormGroup.patchValue({
                    date: new Date(),
                    dueDate: new Date(),
                    invoiceName: '',
                    receiptName: '',
                  });

                  this.valueFormGroup.patchValue({
                    dpp: '',
                    pbbkb: 0,
                    pphPercentage: 0,
                    pphCode: '',
                  });
                },
                error: (error) => {
                  this.snackBar.open(error.error.detail, 'Close', {
                    duration: 3000,
                  });
                },
              })
              .add(() => {
                this.isSubmitting = false;
              });
          },
        })
        .add(() => {
          this.isSubmitting = false;
        });
    } else {
      this.apiService
        .post('expenses', expenseData)
        .subscribe({
          next: (_) => {
            this.snackBar.open('Expense created successfully', 'Close', {
              duration: 3000,
            });
            this.metaFormGroup.reset();
            this.valueFormGroup.reset();
            this.paymentFormGroup.reset();
            this.stepper?.reset();

            this.metaFormGroup.patchValue({
              date: new Date(),
              dueDate: new Date(),
              invoiceName: '',
              receiptName: '',
            });

            this.valueFormGroup.patchValue({
              dpp: '',
              pbbkb: 0,
              pphPercentage: 0,
              pphCode: '',
            });
          },
          error: (error) => {
            this.snackBar.open(error.error.detail, 'Close', {
              duration: 3000,
            });
          },
        })
        .add(() => {
          this.isSubmitting = false;
        });
    }
  }

  fetchBankAccounts() {
    this.apiService.get('banks/all', {}).subscribe({
      next: (data: any) => {
        this.bankAccounts = data;
      },
      error: (error) => {
        this.snackBar.open('Error fetching bank accounts', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  createNewAdministrationExpense() {
    if (this.bankAccounts.length == 0) return;
    this.dialog.open(ExpenseCreateAdministrationComponent, {
      data: this.bankAccounts,
    });
  }
}
