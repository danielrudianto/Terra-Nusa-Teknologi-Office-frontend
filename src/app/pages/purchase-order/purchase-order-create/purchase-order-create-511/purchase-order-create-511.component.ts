import { Component } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SupplierSelectorComponent } from '../../../../components/supplier-selector/supplier-selector.component';
import { MasterItemSelectorComponent } from '../../../../components/master-item-selector/master-item-selector.component';
import { MatButtonModule } from '@angular/material/button';
import { HeaderTitleComponent } from '../../../../components/header-title/header-title.component';
import { WysiwygComponent } from '../../../../components/wysiwyg/wysiwyg.component';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiService } from '../../../../services/api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-purchase-order-create-511',
  providers: [provideNgxMask()],
  imports: [
    TranslatePipe,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    HeaderTitleComponent,
    WysiwygComponent,
    MatSlideToggleModule,
    NgxMaskDirective,
  ],
  templateUrl: './purchase-order-create-511.component.html',
  styleUrl: './purchase-order-create-511.component.scss',
})
export class PurchaseOrderCreate511Component {
  constructor(
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  isSubmitting: boolean = false;

  units: string[] = [
    'pcs',
    'set',
    'Kg',
    'gram',
    'ton',
    'm',
    'm2',
    'm3',
    'batang',
    'lembar',
    'roll',
    'dus',
    'sak',
    'pasang',
    'lusin',
    'unit',
    'liter',
    'box',
    'kaleng',
  ];

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    purchaseType: new FormControl('5.1.1'),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierAddress: new FormControl('', Validators.required),
    projectName: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[A-Z0-9]{4,5}$/),
    ]),
    deliveryMethod: new FormControl('', Validators.required),
    deliveryAddress: new FormControl('', Validators.required),
    paymentTerm: new FormControl('', Validators.required),
    creditTerm: new FormControl(0, Validators.required),
    prepaidTerm: new FormControl(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
    ]),
    supplierPICName: new FormControl('', Validators.required),
    supplierPICPhoneNumber: new FormControl('', Validators.required),
    officePICName: new FormControl('', Validators.required),
    officePICPhoneNumber: new FormControl('', Validators.required),
    // items are picked from the master-item catalog (type G)
    purchase_order: new FormArray([]),
    notes: new FormControl(''),
    includePPN: new FormControl(true),
  });

  get f() {
    return this.formGroup.controls;
  }

  get t() {
    return this.formGroup.get('purchase_order') as FormArray;
  }

  getFormGroupAt(i: number) {
    return this.t.at(i) as FormGroup;
  }

  removeAt(i: number) {
    this.t.removeAt(i);
  }

  private buildItemGroup(item: any): FormGroup {
    return this.formBuilder.group({
      item_id: [item.id, Validators.required],
      sku: [item.sku],
      description: [item.description],
      unit: [item.unit || '', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      price: [0, [Validators.required, Validators.min(0)]],
      remarks: [''],
    });
  }

  openItemSelector() {
    this.dialog
      .open(MasterItemSelectorComponent, {
        data: { purchaseType: '5.1.1' },
        width: '560px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((item) => {
        if (!item) return;
        // prevent adding the exact same catalog item twice
        const exists = this.t.value.some((x: any) => x.item_id === item.id);
        if (exists) {
          this.snackBar.open('Barang sudah ada di daftar', 'Close', {
            duration: 2500,
          });
          return;
        }
        this.t.push(this.buildItemGroup(item));
      });
  }

  // ----- live summary (read-only, safe getters) -----
  get rawTotal(): number {
    return this.t.value.reduce(
      (acc: number, x: any) =>
        acc + (Number(x.price) || 0) * (Number(x.quantity) || 0),
      0,
    );
  }

  get subTotal(): number {
    // Harga yang diisi user adalah DPP; PPN ditambahkan di atasnya.
    return this.rawTotal;
  }

  get ppnAmount(): number {
    return this.formGroup.get('includePPN')?.value ? this.rawTotal * 0.11 : 0;
  }

  get grandTotal(): number {
    return this.subTotal + this.ppnAmount;
  }

  get lineTotal(): (i: number) => number {
    return (i: number) => {
      const g = this.getFormGroupAt(i).value;
      return (Number(g.price) || 0) * (Number(g.quantity) || 0);
    };
  }

  openSupplierSelector() {
    this.dialog
      .open(SupplierSelectorComponent, {})
      .afterClosed()
      .subscribe((data) => {
        if (data) {
          this.formGroup.patchValue({
            supplierID: data.id,
            supplierName: data.name,
            supplierAddress: data.address,
          });
        }
      });
  }

  formatData() {
    const dpp = this.t.value.reduce(
      (acc: any, x: any) =>
        acc + (Number(x.price) || 0) * (Number(x.quantity) || 0),
      0,
    );
    const ppn = this.formGroup.get('includePPN')?.value ? 11 : 0;
    const projectCode = this.formGroup.get('projectName')?.value;
    return {
      date: this.formGroup.get('date')?.value.toISOString().split('T')[0],
      supplierID: this.formGroup.get('supplierID')?.value,
      purchaseType: this.formGroup.get('purchaseType')?.value,
      projectName: projectCode,
      projectCode: projectCode,
      name: '',
      dpp: dpp,
      ppn: ppn,
      payment_term: this.formGroup.get('paymentTerm')?.value,
      templateVersion: '1.0',
      billing_requirements: {},
      // Baris item PO. Tanpa ini `purchase_order_items` tidak pernah terisi,
      // sehingga dokumen yang dicetak ulang kehilangan seluruh daftar barang.
      items: this.t.controls.map((c) => {
        const x = c.getRawValue();
        return {
          item_id: x.item_id,
          task: x.description,
          quantity: x.unit === 'LS' ? 1 : x.quantity,
          price: x.price,
          unit: x.unit,
          remarks_1: x.remarks,
          // SKU tidak disalin ke sini: sudah tersimpan di master_item
          // dan ikut terbaca lewat item_id saat PO dibuka kembali.
        };
      }),
      customData: {
        deliveryMethod: this.formGroup.get('deliveryMethod')?.value,
        deliveryAddress: this.formGroup.get('deliveryAddress')?.value,
        paymentTerm: this.formGroup.get('paymentTerm')?.value,
        creditTerm: this.formGroup.get('creditTerm')?.value,
        prepaidTerm: this.formGroup.get('prepaidTerm')?.value,
        supplierPICName: this.formGroup.get('supplierPICName')?.value,
        supplierPICPhoneNumber: this.formGroup.get('supplierPICPhoneNumber')
          ?.value,
        officePICName: this.formGroup.get('officePICName')?.value,
        officePICPhoneNumber: this.formGroup.get('officePICPhoneNumber')?.value,
        // rich-text agreement points / notes (HTML string)
        notes: this.formGroup.get('notes')?.value,
      },
    };
  }

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .post('purchase-orders', this.formatData())
      .subscribe({
        next: (res: any) => {
          this.snackBar.open(
            `Purchase order ${res?.purchase_order_name ?? ''} berhasil dibuat`,
            'Close',
            { duration: 3000 },
          );
          this.router.navigate(['/Purchase-order']);
        },
        error: (error) => {
          this.snackBar.open(
            error?.error?.detail ?? 'Gagal membuat purchase order',
            'Close',
            { duration: 3000 },
          );
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

  toUpperCase() {
    const value = this.formGroup.get('projectName')?.value;
    if (value && value.toUpperCase() !== value) {
      this.formGroup.patchValue({ projectName: value.toUpperCase() });
    }
  }
}
