import { Component, ElementRef, ViewChild } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { SupplierSelectorComponent } from '../../../components/supplier-selector/supplier-selector.component';
import { ApiService } from 'src/app/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { provideNgxMask } from 'ngx-mask';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-purchase-draft-create',
  providers: [provideNgxMask()],
  imports: [
    CommonModule,
    MatButtonModule,
    ReactiveFormsModule,
    FormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    HeaderTitleComponent,
  ],
  templateUrl: './purchase-draft-create.component.html',
  styleUrl: './purchase-draft-create.component.scss',
  standalone: true,
})
export class PurchaseDraftCreateComponent {
  constructor(
    private dialog: MatDialog,
    private apiService: ApiService,
    private snackBar: MatSnackBar
  ) {}

  @ViewChild('input') input!: ElementRef<HTMLInputElement>;
  isSubmitting: boolean = false;

  ngAfterViewInit() {
    this.metaFormGroup.controls['ppn'].valueChanges.subscribe((value) => {
      if (value) {
        this.metaFormGroup.controls['ppnValue'].setValue(
          ((this.metaFormGroup.controls['dpp'].value * value) / 100).toFixed(2)
        );
      } else {
        this.metaFormGroup.controls['ppnValue'].setValue(0);
      }
    });

    this.metaFormGroup.controls['dpp'].valueChanges.subscribe((value) => {
      if (value) {
        this.metaFormGroup.controls['ppnValue'].setValue(
          ((this.metaFormGroup.controls['ppn'].value * value) / 100).toFixed(2)
        );
      } else {
        this.metaFormGroup.controls['ppnValue'].setValue(0);
      }
    });

    this.metaFormGroup.controls['purchaseOrderName'].valueChanges.subscribe(
      (_) => {
        const purchaseOrderName =
          this.metaFormGroup.controls['purchaseOrderName'].value;
        const regex =
          /^\d{3,4}-(PO|SPK|PKS)-[A-Z]{1,5}-(A|B|C|D|E|F|G|5\.1\.1|5\.1\.2|5\.1\.6|5\.1\.7|6\.3\.1|6\.3\.2|5\.1\.12|6\.4\.1|6\.4\.2)$/;
        const isValid = regex.test(purchaseOrderName);
        if (isValid) {
          // set the project name based on the purchase order name
          const projectName = purchaseOrderName.split('-')[2];
          const expenseType = purchaseOrderName.split('-')[3];
          this.metaFormGroup.controls['projectName'].setValue(projectName);
          this.metaFormGroup.controls['purchaseType'].setValue(expenseType);
        } else {
          // set the project name to empty string if the purchase order name is not valid
          this.metaFormGroup.controls['projectName'].setValue('');
        }
      }
    );
  }

  metaFormGroup: FormGroup = new FormGroup({
    description: new FormControl('', Validators.required),
    taxInvoiceName: new FormControl('', Validators.maxLength(17)),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl(''),
    supplierAddress: new FormControl(''),
    date: new FormControl('', Validators.required),
    purchaseOrderName: new FormControl('', [
      Validators.required,
      Validators.pattern(
        /^\d{3,4}-(PO|SPK|PKS)-[A-Z0-9]{4,5}-(A|B|C|D|E|F|G|5\.1\.1|5\.1\.2|5\.1\.6|5\.1\.7|6\.3\.1|6\.3\.2|5\.1\.12|6\.4\.1|6\.4\.2)$/
      ),
    ]),
    projectName: new FormControl('', [
      Validators.required,
      Validators.minLength(4),
      Validators.maxLength(5),
    ]),
    purchaseType: new FormControl('', [
      Validators.required,
      Validators.pattern(
        /^\A|B|C|D|E|F|G|5\.1\.1|5\.1\.2|5\.1\.6|5\.1\.7|6\.3\.1|6\.3\.2|5\.1\.12|6\.4\.1|6\.4\.2$/
      ),
    ]),
    dpp: new FormControl(0, [Validators.required, Validators.min(1)]),
    ppn: new FormControl(0, [Validators.required, Validators.min(0)]),
    ppnValue: new FormControl(0, [Validators.required, Validators.min(0)]),
    pbbkb: new FormControl(0, [Validators.required, Validators.min(0)]),
  });

  openSupplierSelector() {
    this.dialog
      .open(SupplierSelectorComponent, {
        minWidth: '400px',
      })
      .afterClosed()
      .subscribe((data) => {
        if (data) {
          this.metaFormGroup.patchValue({
            supplierID: data.id,
            supplierName: data.name,
            supplierAddress: data.address,
          });
        }
      });
  }

  onSubmit() {
    this.isSubmitting = true;
    const date = new Date(this.metaFormGroup.controls['date'].value);
    const dateFormatted = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const purchaseData = {
      supplierID: this.metaFormGroup.controls['supplierID'].value,
      date: dateFormatted,
      purchaseOrderName: this.metaFormGroup.controls['purchaseOrderName'].value,
      projectName: this.metaFormGroup.controls['projectName'].value,
      dpp: this.metaFormGroup.controls['dpp'].value,
      ppn: this.metaFormGroup.controls['ppn'].value,
      pbbkb: this.metaFormGroup.controls['pbbkb'].value,
      description: this.metaFormGroup.controls['description'].value,
      purchaseType: this.metaFormGroup.controls['purchaseType'].value,
    };

    this.apiService
      .post('purchase-draft', purchaseData)
      .subscribe({
        next: () => {
          this.snackBar.open('Successfully created draft purchase', 'Close', {
            duration: 3000,
          });
          this.metaFormGroup.reset();
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

  get total(): number {
    return (
      this.metaFormGroup.controls['dpp'].value +
      this.metaFormGroup.controls['ppnValue'].value +
      this.metaFormGroup.controls['pbbkb'].value
    );
  }
}
