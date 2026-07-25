import { Component } from '@angular/core';
import {
  FormArray, FormBuilder, FormControl, FormGroup, FormsModule,
  ReactiveFormsModule, Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TextFieldModule } from '@angular/cdk/text-field';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupplierSelectorComponent } from '../../../../components/supplier-selector/supplier-selector.component';
import { EquipmentSelectorComponent } from '../../../../components/equipment-selector/equipment-selector.component';
import { HeaderTitleComponent } from '../../../../components/header-title/header-title.component';
import { WysiwygComponent } from '../../../../components/wysiwyg/wysiwyg.component';
import { ApiService } from '../../../../services/api.service';

@Component({
  selector: 'app-purchase-order-create-b',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule,
    MatInputModule, MatDatepickerModule, MatSelectModule, MatIconModule,
    MatButtonModule, MatSlideToggleModule, TextFieldModule, NgxMaskDirective,
    HeaderTitleComponent,
    WysiwygComponent,
  ],
  templateUrl: './purchase-order-create-b.component.html',
  styleUrl: './purchase-order-create-b.component.scss',
})
export class PurchaseOrderCreateBComponent {
  constructor(
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  isSubmitting = false;
  units: string[] = ['jam', 'hari', 'bulan', 'LS'];

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    purchaseType: new FormControl('B'),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierAddress: new FormControl('', Validators.required),
    projectName: new FormControl('', [Validators.required, Validators.pattern(/^[A-Z0-9]{4,5}$/)]),
    paymentTerm: new FormControl('', Validators.required),
    creditTerm: new FormControl(0, Validators.required),
    prepaidTerm: new FormControl(0, [Validators.required, Validators.min(0), Validators.max(100)]),
    notes: new FormControl(''),
    rentals: new FormArray([]),
    includePPN: new FormControl(true),
  });

  get f() { return this.formGroup.controls; }
  get t() { return this.formGroup.get('rentals') as FormArray; }
  getFormGroupAt(i: number) { return this.t.at(i) as FormGroup; }
  removeAt(i: number) { this.t.removeAt(i); }

  private buildRental(eq: any): FormGroup {
    return this.formBuilder.group({
      equipment_id: [eq.id, Validators.required],
      name: [eq.name],
      category: [eq.category],
      capacity: [eq.capacity],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unit: [eq.unit || 'hari', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      fromDate: ['', Validators.required],
      toDate: ['', Validators.required],
      location: ['', Validators.required],
    });
  }

  openEquipmentSelector() {
    this.dialog
      .open(EquipmentSelectorComponent, { width: '560px', maxWidth: '94vw', autoFocus: false })
      .afterClosed()
      .subscribe((eq) => {
        if (!eq) return;
        this.t.push(this.buildRental(eq));
      });
  }

  /** LS (lump sum) forces quantity = 1 and locks the field */
  onUnitChange(i: number) {
    const g = this.getFormGroupAt(i);
    const qty = g.get('quantity');
    if (g.get('unit')?.value === 'LS') {
      qty?.setValue(1);
      qty?.disable();
    } else {
      qty?.enable();
    }
  }

  lineTotal(i: number): number {
    const g = this.getFormGroupAt(i).getRawValue();
    return (Number(g.price) || 0) * (Number(g.quantity) || 0);
  }

  get rawTotal(): number {
    return this.t.controls.reduce((acc, _c, i) => acc + this.lineTotal(i), 0);
  }
  get subTotal(): number {
    return this.formGroup.get('includePPN')?.value ? this.rawTotal / 1.11 : this.rawTotal;
  }
  get ppnAmount(): number {
    return this.formGroup.get('includePPN')?.value ? this.rawTotal - this.rawTotal / 1.11 : 0;
  }
  get grandTotal(): number { return this.rawTotal; }

  openSupplierSelector() {
    this.dialog.open(SupplierSelectorComponent, {}).afterClosed().subscribe((data) => {
      if (data) {
        this.formGroup.patchValue({
          supplierID: data.id, supplierName: data.name, supplierAddress: data.address,
        });
      }
    });
  }

  toUpperCase() {
    const v = this.formGroup.get('projectName')?.value;
    if (v && v.toUpperCase() !== v) this.formGroup.patchValue({ projectName: v.toUpperCase() });
  }

  private toISO(d: any): string | null {
    return d ? new Date(d).toISOString().split('T')[0] : null;
  }

  formatData() {
    const includePPN = this.formGroup.get('includePPN')?.value;
    const dpp = includePPN ? this.rawTotal / 1.11 : this.rawTotal;
    const ppn = includePPN ? 11 : 0;
    const projectCode = this.formGroup.get('projectName')?.value;
    return {
      date: this.toISO(this.formGroup.get('date')?.value),
      supplierID: this.formGroup.get('supplierID')?.value,
      purchaseType: 'B',
      projectName: projectCode,
      projectCode: projectCode,
      name: '',
      dpp: dpp,
      ppn: ppn,
      payment_term: this.formGroup.get('paymentTerm')?.value,
      templateVersion: '1.0',
      billing_requirements: {},
      // equipment rentals -> purchase_order_items (equipment_id -> master_equipment)
      items: this.t.controls.map((c) => {
        const x = c.getRawValue();
        return {
          equipment_id: x.equipment_id,
          quantity: x.unit === 'LS' ? 1 : x.quantity,
          price: x.price,
          unit: x.unit,
          remarks_1: this.toISO(x.fromDate), // dari tanggal
          remarks_2: this.toISO(x.toDate),   // sampai tanggal
          remarks_3: x.location,             // lokasi kerja
        };
      }),
      customData: {
        paymentTerm: this.formGroup.get('paymentTerm')?.value,
        creditTerm: this.formGroup.get('creditTerm')?.value,
        prepaidTerm: this.formGroup.get('prepaidTerm')?.value,
        notes: this.formGroup.get('notes')?.value, // poin perjanjian / operator dll
      },
    };
  }

  onSubmit() {
    this.isSubmitting = true;
    this.apiService.post('purchase-orders', this.formatData()).subscribe({
      next: (res: any) => {
        this.snackBar.open(`Purchase order ${res?.purchase_order_name ?? ''} berhasil dibuat`, 'Close', { duration: 3000 });
        this.router.navigate(['/Purchase-order']);
      },
      error: (error) => this.snackBar.open(error?.error?.detail ?? 'Gagal membuat purchase order', 'Close', { duration: 3000 }),
    }).add(() => (this.isSubmitting = false));
  }
}