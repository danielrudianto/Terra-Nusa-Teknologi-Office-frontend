import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from 'src/app/services/api.service';
import { ReimbursementCreateItemDialogComponent } from './reimbursement-create-item-dialog/reimbursement-create-item-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { banks, IBank } from 'src/app/utils/bank';
import { PdfViewerComponent } from 'src/app/components/pdf-viewer/pdf-viewer.component';

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
    isFileAttached: new FormControl(false, Validators.requiredTrue),
    fileName: new FormControl(''),
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
      });
    }
  }

  onSubmit() {
    this.isSubmitting = true;
    const date = this.formGroup.get('date')?.value;
    const formattedDate = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const dueDate = this.formGroup.get('dueDate')?.value;
    const formattedDueDate = `${dueDate.getFullYear()}-${String(
      dueDate.getMonth() + 1
    ).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;

    this.apiService
      .post('reimbursement', {
        ...this.formGroup.value,
        date: formattedDate,
        dueDate: formattedDueDate,
        reimbursementItems: this.formGroup.value.items.map((item: any) => ({
          ...item,
          date: `${item.date.getFullYear()}-${String(
            item.date.getMonth() + 1
          ).padStart(2, '0')}-${String(item.date.getDate()).padStart(2, '0')}`,
        })),
      })
      .subscribe({
        next: (data: any) => {
          const reimbursementID = data.reimbursementID;
          const formData = new FormData();
          formData.append('file', this.file as any);
          formData.append('reimbursementID', reimbursementID);
          this.apiService
            .post('reimbursement/upload', formData)
            .subscribe({
              next: (_) => {
                this.snackBar.open(
                  'Reimbursement created successfully',
                  'Close',
                  {
                    duration: 3000,
                  }
                );
              },
            })
            .add(() => {
              this.isSubmitting = false;
              this.formGroup.reset();
              this.items.clear();
              this.file = undefined;
              this.formGroup.patchValue({
                isFileAttached: false,
              });
              this.input.nativeElement.value = '';
            });
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
}
