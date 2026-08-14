import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-supplier-create',
  templateUrl: './supplier-create.component.html',
  styleUrls: ['./supplier-create.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatChipsModule,
    MatDividerModule,
    MatIconModule,
    TranslatePipe,
  ],
})
export class SupplierCreateComponent {
  private readonly translate = inject(TranslateService);
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialogRef<SupplierCreateComponent>,
  ) {}

  supplierFormGroup: FormGroup = new FormGroup({
    prefix: new FormControl('', Validators.required),
    name: new FormControl('', [Validators.required, Validators.maxLength(255)]),
    address: new FormControl('', [Validators.required, Validators.maxLength(255)]),
    city: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    province: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    npwp: new FormControl('', [
      Validators.maxLength(16),
      Validators.pattern(/^$|^\d{16}$/),
    ]),
    phoneNumber: new FormControl('', [
      Validators.required,
      Validators.pattern(/^\d{10,20}$/),
      Validators.maxLength(20),
    ]),
    email: new FormControl('', [Validators.email, Validators.maxLength(255)]),
    soldItems: new FormControl(''),
    serviceAreas: new FormControl(''),
  });

  isSubmitting: boolean = false;
  items: string[] = [];
  areas: string[] = [];

  ngOnInit(): void {
    this.supplierFormGroup.controls['soldItems'].valueChanges.subscribe(
      (value) => {
        // if there is a comma, split the string into an array
        if (value.includes(',') && value.length > 1) {
          const item = value.slice(0, -1);
          if (!this.items.includes(item)) {
            this.items.push(item);
            this.supplierFormGroup.patchValue({
              soldItems: '',
            });
          }
        }
      },
    );

    this.supplierFormGroup.controls['serviceAreas'].valueChanges.subscribe(
      (value) => {
        // if there is a comma, split the string into an array
        if (value.includes(',') && value.length > 1) {
          const item = value.slice(0, -1);
          if (!this.areas.includes(item)) {
            this.areas.push(item);
            this.supplierFormGroup.patchValue({
              serviceAreas: '',
            });
          }
        }
      },
    );
  }

  remove(item: string) {
    const index = this.items.indexOf(item);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  removeArea(area: string) {
    const index = this.areas.indexOf(area);
    if (index >= 0) {
      this.areas.splice(index, 1);
    }
  }

  onCancel() {
    this.dialog.close();
  }

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .post('suppliers', {
        prefix: this.supplierFormGroup.value.prefix,
        name: this.supplierFormGroup.value.name.trim(),
        address: this.supplierFormGroup.value.address,
        city: this.supplierFormGroup.value.city.trim(),
        province: this.supplierFormGroup.value.province.trim(),
        phoneNumber: this.supplierFormGroup.value.phoneNumber.trim(),
        email: this.supplierFormGroup.value.email || null,
        npwp:
          this.supplierFormGroup.value.npwp.length < 16
            ? null
            : this.supplierFormGroup.value.npwp,
        itemsSold: this.items.map((item) => item.trim()).join(','),
        serviceArea: this.areas.map((item) => item.trim()).join(','),
      })
      .subscribe({
        next: (data) => {
          this.snackBar.open(
      this.translate.instant('notify.createSuccess'), 'Close', {
            duration: 3000,
          });
          // close and signal the list to refresh
          this.dialog.close(true);
        },
        error: (error) => {
          console.error(`Error: ${error.error.detail}`);
          this.snackBar.open('Error: ' + error.error.detail, 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
