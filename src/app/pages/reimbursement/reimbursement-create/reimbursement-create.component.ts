import { Component, ElementRef, ViewChild } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from 'src/app/services/api.service';
import { ReimbursementCreateItemDialogComponent } from './reimbursement-create-item-dialog/reimbursement-create-item-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { banks, IBank } from 'src/app/utils/bank';
import { PdfViewerComponent } from 'src/app/components/pdf-viewer/pdf-viewer.component';
import { ReimbursementHelper } from '../../../helpers/reimbursement.helper';
import { DeleteConfirmationComponent } from 'src/app/components/delete-confirmation/delete-confirmation.component';
import { Clipboard } from '@angular/cdk/clipboard';

@Component({
  selector: 'app-reimbursement-create',
  templateUrl: './reimbursement-create.component.html',
  styleUrls: ['./reimbursement-create.component.scss'],
  standalone: false,
})
export class ReimbursementCreateComponent {
  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private formBuilder: FormBuilder,
    private clipboard: Clipboard
  ) {
    this.filteredOptions = this.options.slice();
  }

  ngOnInit(): void {}

  toUpperCase() {
    const value = this.formGroup.get('projectName')?.value;
    if (value && value.toUpperCase() !== value) {
      this.formGroup.patchValue({
        projectName: value.toUpperCase(),
      });
    }
  }

  @ViewChild('input') input!: ElementRef<HTMLInputElement>;
  isSubmitting: boolean = false;
  filteredOptions: IBank[] = [];
  options: IBank[] = banks;
  file: File | undefined;

  expenseTypes: any[] = [
    {
      name: 'Transportation',
      code: 'A',
    },
    {
      name: 'Coordination; Consumption; and Accomodation',
      code: 'E',
    },
    {
      name: 'Document handling & Stationery',
      code: '5.1.6',
    },
  ];

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    dueDate: new FormControl('', Validators.required),
    items: new FormArray([]),
    projectName: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[A-Z0-9]{3,5}$/),
    ]),
    purchaseType: new FormControl('', Validators.required),
    bankName: new FormControl('', Validators.required),
    bankAccountName: new FormControl('', Validators.required),
    bankAccountNumber: new FormControl('', Validators.required),
    paymentMethod: new FormControl('', Validators.required),
    // isFileAttached: new FormControl(false, Validators.requiredTrue),
    // fileName: new FormControl(''),
  });

  get f() {
    return this.formGroup.controls;
  }

  get items(): FormArray {
    return this.formGroup.get('items') as FormArray;
  }

  getFormGroupAtIndex(i: number) {
    return this.items.at(i) as FormGroup;
  }

  filter(): void {
    const filterValue = this.input.nativeElement.value.toLowerCase();
    this.filteredOptions = this.options.filter(
      (option) =>
        option.name.toLowerCase().includes(filterValue) ||
        option.alias.toLowerCase().includes(filterValue)
    );
  }

  removeItem(i: number) {
    this.items.removeAt(i);
  }

  addItem() {
    this.dialog
      .open(ReimbursementCreateItemDialogComponent, {})
      .afterClosed()
      .subscribe((data) => {
        if (data) {
          const date = new Date(data.date);
          console.log(date.getDate());
          console.log(date.getMonth());
          console.log(date.getFullYear());
          console.log(date.getUTCFullYear());

          this.items.push(
            this.formBuilder.group({
              date: new FormControl(date, Validators.required),
              description: new FormControl(
                data.description,
                Validators.required
              ),
              amount: new FormControl(data.amount, [
                Validators.required,
                Validators.min(1),
              ]),
            })
          );
        }
      });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.file = file;
      this.formGroup.patchValue({
        isFileAttached: true,
        fileName: file.name,
      });
    }
  }

  openFile() {
    if (this.file) {
      // open dialog
      this.dialog.open(PdfViewerComponent, {
        data: {
          file: this.file,
        },
        width: '90vw',
        height: '90vh',
        panelClass: 'pdf-dialog-panel',
      });
    }
  }

  onSubmitConfirmation() {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: 'Submit reimbursement data',
          prompt: 'Are you sure to submit this reimbursement data?',
        },
      })
      .afterClosed()
      .subscribe((data) => {
        if (data == true) {
          this.onSubmit();
        }
      });
  }

  onSubmit() {
    this.isSubmitting = true;
    const date = new Date(this.formGroup.get('date')?.value);
    const formattedDate = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const dueDate = new Date(this.formGroup.get('dueDate')?.value);
    const formattedDueDate = `${dueDate.getFullYear()}-${String(
      dueDate.getMonth() + 1
    ).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;

    this.apiService
      .post('reimbursements', {
        ...this.formGroup.value,
        date: formattedDate,
        dueDate: formattedDueDate,
        reimbursementItems: this.formGroup.value.items.map((item: any) => {
          const itemDate = new Date(item.date);
          return {
            ...item,
            date: `${itemDate.getFullYear()}-${String(
              itemDate.getMonth() + 1
            ).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`,
          };
        }),
      })
      .subscribe({
        next: (data: any) => {
          ReimbursementHelper.generatePDF({
            name: data.name,
            date: date,
            projectName: this.formGroup.value.projectName,
            bankName: this.formGroup.value.bankName,
            bankAccountName: this.formGroup.value.bankAccountName,
            bankAccountNumber: this.formGroup.value.bankAccountNumber,
            reimbursementItems: this.formGroup.value.items.map((item: any) => {
              const itemDate = new Date(item.date);
              return {
                ...item,
                date: `${itemDate.getFullYear()}-${String(
                  itemDate.getMonth() + 1
                ).padStart(2, '0')}-${String(itemDate.getDate()).padStart(
                  2,
                  '0'
                )}`,
              };
            }),
          });

          this.snackBar.open('Reimbursement created successfully', 'Close', {
            duration: 3000,
          });
          this.formGroup.reset();
          this.items.clear();
        },
        error: (error) => {
          console.error('Error creating reimbursement:', error);
          this.snackBar.open(
            'Failed to create reimbursement. Please try again.',
            'Close',
            {
              duration: 3000,
            }
          );
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

  copyBankAccountNumber() {
    this.clipboard.copy(this.formGroup.get('bankAccountNumber')!.value);
    this.snackBar.open('Bank account number copied to clipboard', 'Close', {
      duration: 3000,
    });
  }

  get total() {
    let total = 0;
    for (let i = 0; i < this.items.length; i++) {
      total += this.items.at(i).get('amount')?.value;
    }
    return total;
  }
}
