import { Component } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from 'src/app/services/api.service';
import { ReimbursementCreateItemDialogComponent } from './reimbursement-create-item-dialog/reimbursement-create-item-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-reimbursement-create',
  templateUrl: './reimbursement-create.component.html',
  styleUrls: ['./reimbursement-create.component.scss'],
})
export class ReimbursementCreateComponent {
  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  isSubmitting: boolean = false;

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

  removeItem(i: number) {
    this.items.removeAt(i);
  }

  addItem() {
    this.dialog
      .open(ReimbursementCreateItemDialogComponent, {})
      .afterClosed()
      .subscribe((data) => {
        if (data) {
          this.items.push(
            new FormGroup({
              date: new FormControl(data.date, Validators.required),
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

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .post('reimbursement', this.formGroup.value)
      .subscribe({
        next: (data) => {},
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
}
