import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-supplier-create',
  templateUrl: './supplier-create.component.html',
  styleUrls: ['./supplier-create.component.scss'],
  standalone: false,
})
export class SupplierCreateComponent {
  constructor(private apiService: ApiService, private snackBar: MatSnackBar) {}

  supplierFormGroup: FormGroup = new FormGroup({
    prefix: new FormControl('', Validators.required),
    name: new FormControl('', Validators.required),
    address: new FormControl('', Validators.required),
    city: new FormControl('', Validators.required),
    province: new FormControl('', Validators.required),
    npwp: new FormControl('', [
      Validators.maxLength(16),
      Validators.pattern(/^$|^\d{16}$/),
    ]),
    phoneNumber: new FormControl('', [
      Validators.required,
      Validators.pattern(/^\d{10,20}$/),
    ]),
    email: new FormControl('', [Validators.email]),
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
      }
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
      }
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
          console.log('Success:', data);
          this.snackBar.open('Supplier created successfully', 'Close', {
            duration: 3000,
          });
          this.supplierFormGroup.patchValue({
            prefix: '',
            name: '',
            address: '',
            city: '',
            province: '',
            npwp: '',
            phoneNumber: '',
            email: '',
            soldItems: '',
            serviceAreas: '',
          });
          this.items = [];
          this.areas = [];
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
