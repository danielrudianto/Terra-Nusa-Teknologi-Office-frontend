import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-supplier-create',
  templateUrl: './supplier-create.component.html',
  styleUrls: ['./supplier-create.component.scss'],
})
export class SupplierCreateComponent {
  constructor(private apiService: ApiService, private snackBar: MatSnackBar) {}

  supplierFormGroup: FormGroup = new FormGroup({
    prefix: new FormControl('', Validators.required),
    name: new FormControl('', Validators.required),
    address: new FormControl('', Validators.required),
    npwp: new FormControl('', [Validators.maxLength(16)]),
    phone: new FormControl('', [
      Validators.required,
      Validators.pattern(/^\+?\d{1,4}?\s?\d{1,4}?\s?\d{1,4}?\s?\d{1,9}$/),
    ]),
    email: new FormControl('', [Validators.email]),
    soldItems: new FormControl(''),
  });

  isSubmitting: boolean = false;
  items: string[] = [];

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
  }

  remove(item: string) {
    const index = this.items.indexOf(item);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .post('supplier', {
        ...this.supplierFormGroup.value,
        soldItems: this.items,
      })
      .subscribe({
        next: (data) => {},
        error: (error) => {
          console.error(`Error: ${error.error.message}`);
          this.snackBar.open('Error: ' + error.error.message, 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
