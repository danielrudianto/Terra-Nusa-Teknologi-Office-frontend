import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { SupplierSelectorComponent } from '../../../components/supplier-selector/supplier-selector.component';

@Component({
  selector: 'app-purchase-draft-create',
  standalone: false,
  templateUrl: './purchase-draft-create.component.html',
  styleUrl: './purchase-draft-create.component.scss',
})
export class PurchaseDraftCreateComponent {
  constructor(private dialog: MatDialog) {}

  @ViewChild('stepper') stepper: MatStepper | undefined;
  @ViewChild('input') input!: ElementRef<HTMLInputElement>;

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
        /^\d{3,4}-(PO|SPK|PKS)-[A-Z0-9]{4,5}-(A|B|C|D|E|F|G|5\.1\.1|5\.1\.2|5\.1\.6|5\.1\.7)$/
      ),
    ]),
    projectName: new FormControl('', [
      Validators.required,
      Validators.minLength(4),
      Validators.maxLength(5),
    ]),
    purchaseType: new FormControl('', [
      Validators.required,
      Validators.pattern(/^\A|B|C|D|E|F|G|5\.1\.1|5\.1\.2|5\.1\.6|5\.1\.7$/),
    ]),
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
}
