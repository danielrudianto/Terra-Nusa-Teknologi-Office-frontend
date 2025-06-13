import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepper } from '@angular/material/stepper';
import { PphSelectorComponent } from 'src/app/components/pph-selector/pph-selector.component';
import { ApiService } from 'src/app/services/api.service';
import { banks, IBank } from 'src/app/utils/bank';
import { IPPh } from 'src/app/utils/pph';
import { ExpenseOpponentSelectorComponent } from '../../../components/expense-opponent-selector/expense-opponent-selector.component';

@Component({
  selector: 'app-expense-create',
  templateUrl: './expense-create.component.html',
  styleUrl: './expense-create.component.scss',
  standalone: false,
})
export class ExpenseCreateComponent {
  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  @ViewChild('stepper') stepper: MatStepper | undefined;
  @ViewChild('input') input!: ElementRef<HTMLInputElement>;

  isFinal: boolean = false;
  filteredOptions: IBank[] = [];
  options: IBank[] = banks;
  isSubmitting: boolean = false;

  metaFormGroup: FormGroup = new FormGroup({
    invoiceName: new FormControl(''),
    receiptName: new FormControl(''),
    taxInvoiceName: new FormControl('', Validators.maxLength(17)),
    description: new FormControl('', [
      Validators.required,
      Validators.minLength(10),
    ]),
    purchaseType: new FormControl('', Validators.required),
    opponentID: new FormControl(''),
    opponentName: new FormControl(''),
    opponentDescription: new FormControl(''),
    date: new FormControl('', Validators.required),
    dueDate: new FormControl('', Validators.required),
  });

  valueFormGroup: FormGroup = new FormGroup({
    dpp: new FormControl('', [Validators.required, Validators.min(1)]),
    ppn: new FormControl('', [
      Validators.required,
      Validators.min(0),
      Validators.max(11),
    ]),
    ppnValue: new FormControl(0),
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
  });

  ngAfterViewInit() {
    this.valueFormGroup.controls['ppn'].valueChanges.subscribe((value) => {
      if (value) {
        this.valueFormGroup.controls['ppnValue'].setValue(
          ((this.valueFormGroup.controls['dpp'].value * value) / 100).toFixed(2)
        );
      } else {
        this.valueFormGroup.controls['ppnValue'].setValue(0);
      }

      this.isFinal = false;
    });

    this.valueFormGroup.controls['dpp'].valueChanges.subscribe((value) => {
      if (value) {
        this.valueFormGroup.controls['ppnValue'].setValue(
          ((this.valueFormGroup.controls['ppn'].value * value) / 100).toFixed(2)
        );

        const pphPercentage =
          this.valueFormGroup.controls['pphPercentage'].value;
        const pphValue = (value * pphPercentage) / 100;
        this.valueFormGroup.controls['pphValue'].setValue(pphValue.toFixed(2));
      } else {
        this.valueFormGroup.controls['ppnValue'].setValue(0);
      }

      this.isFinal = false;
    });

    this.valueFormGroup.controls['pbbkb'].valueChanges.subscribe((value) => {
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
            pphValue.toFixed(2)
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
      this.valueFormGroup.controls['ppn'].valid &&
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
        option.alias.toLowerCase().includes(filterValue)
    );
  }

  calculateTotal() {
    const dpp = Number(this.valueFormGroup.controls['dpp'].value);
    const ppn = Number(this.valueFormGroup.controls['ppn'].value);
    const pbbkb = Number(this.valueFormGroup.controls['pbbkb'].value);
    const total = dpp + (dpp * ppn) / 100 + pbbkb;
    const pph = Number(this.valueFormGroup.controls['pphPercentage'].value);
    const pphValue = (dpp * pph) / 100;

    this.valueFormGroup.patchValue({
      total: total.toFixed(2),
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
      date.getMonth() + 1
    ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const dueDateFormatted = `${dueDate.getFullYear()}-${String(
      dueDate.getMonth() + 1
    ).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;

    this.isSubmitting = true;

    this.apiService
      .post('expenses', {
        invoiceName: this.metaFormGroup.controls['invoiceName'].value,
        receiptName: this.metaFormGroup.controls['receiptName'].value,
        taxInvoiceName:
          this.metaFormGroup.controls['taxInvoiceName'].value == ''
            ? null
            : this.metaFormGroup.controls['taxInvoiceName'].value,
        opponentID: this.metaFormGroup.controls['opponentID'].value,
        // change from date object to YYYY-MM-DD
        date: dateFormatted,
        dueDate: dueDateFormatted,
        purchaseType: this.metaFormGroup.controls['purchaseType'].value,
        description: this.metaFormGroup.controls['description'].value,
        dpp: this.valueFormGroup.controls['dpp'].value,
        ppn: this.valueFormGroup.controls['ppn'].value,
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
        bankAccountName:
          this.paymentFormGroup.controls['bankAccountName'].value,
        bankAccountNumber:
          this.paymentFormGroup.controls['bankAccountNumber'].value,
        paymentMethod: this.paymentFormGroup.controls['paymentMethod'].value,
      })
      .subscribe({
        next: (_) => {
          this.snackBar.open('Expense created successfully', 'Close', {
            duration: 3000,
          });

          this.metaFormGroup.reset({
            invoiceName: '',
            receiptName: '',
            taxInvoiceName: '',
            supplierID: '',
            supplierName: '',
            supplierAddress: '',
            description: '',
            date: '',
            dueDate: '',
            purchaseType: '',
          });

          this.valueFormGroup.reset({
            dpp: '',
            ppn: '',
            ppnValue: 0,
            pbbkb: 0,
            pphCode: '',
            pphTaxObject: '',
            pphPercentage: 0,
            pphValue: 0,
            total: 0,
          });

          this.paymentFormGroup.reset({
            bankName: '',
            bankAccountName: '',
            bankAccountNumber: '',
            paymentMethod: '',
            paymentTotal: 0,
          });

          this.stepper!.selectedIndex = 0;
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
