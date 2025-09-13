import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-supplier-update',
  templateUrl: './supplier-update.component.html',
  styleUrl: './supplier-update.component.scss',
  standalone: false,
})
export class SupplierUpdateComponent {
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    public route: ActivatedRoute
  ) {}

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

    this.fetchData();
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
      .put('suppliers', {
        id: Number(this.route.snapshot.params['id']),
        ...this.supplierFormGroup.value,
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

  fetchData() {
    this.apiService
      .get('suppliers/' + this.route.snapshot.params['id'], {})
      .subscribe({
        next: (data: any) => {
          this.supplierFormGroup.patchValue({
            prefix: data.prefix,
            name: data.name,
            address: data.address,
            city: data.city,
            province: data.province,
            npwp: data.npwp || '',
            phoneNumber: data.phoneNumber,
            email: data.email || '',
          });

          this.items = data.itemsSold.split(',').map((item: string) => {
            return item;
          });

          this.areas = data.serviceArea.split(',').map((item: string) => {
            return item;
          });
        },
        error: (error) => {
          console.error(error);
        },
      });
  }
}
