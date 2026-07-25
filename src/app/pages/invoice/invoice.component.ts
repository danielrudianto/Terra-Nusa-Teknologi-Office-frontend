import { Component } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { InvoiceCreateItemComponent } from './invoice-create-item/invoice-create-item.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';

@Component({
  selector: 'app-invoice',
  providers: [provideNativeDateAdapter()],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    HeaderTitleComponent,
  ],
  templateUrl: './invoice.component.html',
  styleUrl: './invoice.component.scss',
})
export class InvoiceComponent {
  constructor(private dialog: MatDialog) {}

  formGroup: FormGroup = new FormGroup({
    name: new FormControl('', Validators.required),
    opponent_name: new FormControl('', Validators.required),
    location: new FormControl('', Validators.required),
    date: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    bankAccountName: new FormControl('', Validators.required),
    bankAccountNumber: new FormControl('', Validators.required),
    bankName: new FormControl('', Validators.required),
    items: new FormArray([]),
  });

  get f() {
    return this.formGroup.controls;
  }

  get t() {
    return this.f['items'] as FormArray;
  }

  onAddItem() {
    this.dialog
      .open(InvoiceCreateItemComponent, {})
      .afterClosed()
      .subscribe((data) => {
        if (data) {
          this.t.push(
            new FormGroup({
              name: new FormControl(data.name, Validators.required),
              quantity: new FormControl(data.quantity, [
                Validators.required,
                Validators.min(1),
              ]),
              unit: new FormControl(data.unit, Validators.required),
              price: new FormControl(data.price, [
                Validators.required,
                Validators.min(1),
              ]),
            }),
          );
        }
      });
  }

  onUpdateItem(index: number) {
    this.dialog
      .open(InvoiceCreateItemComponent, {
        data: {
          name: this.t.at(index).value.name,
          quantity: this.t.at(index).value.quantity,
          unit: this.t.at(index).value.unit,
          price: this.t.at(index).value.price,
        },
      })
      .afterClosed()
      .subscribe((data) => {
        if (data) {
          this.t.at(index).patchValue({
            name: data.name,
            quantity: data.quantity,
            unit: data.unit,
            price: data.price,
          });
        }
      });
  }
}
