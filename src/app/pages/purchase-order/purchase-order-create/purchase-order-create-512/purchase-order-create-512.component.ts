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
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupplierSelectorComponent } from '../../../../components/supplier-selector/supplier-selector.component';
import { MasterItemSelectorComponent } from '../../../../components/master-item-selector/master-item-selector.component';
import { HeaderTitleComponent } from '../../../../components/header-title/header-title.component';
import { WysiwygComponent } from '../../../../components/wysiwyg/wysiwyg.component';
import { ApiService } from '../../../../services/api.service';
import { PurchaseOrder512ModeDialogComponent } from './purchase-order-512-mode-dialog/purchase-order-512-mode-dialog.component';

/**
 * 5.1.2 Asset maintenance.
 * Maintenance spending comes in two shapes, so the form asks up front:
 *   'barang' — sparepart / material, picked from master item (like PO-G)
 *   'jasa'   — repair or service work, free-text scope (like PO-H)
 */
@Component({
  selector: 'app-purchase-order-create-512',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule,
    MatInputModule, MatDatepickerModule, MatSelectModule, MatIconModule,
    MatButtonModule, MatSlideToggleModule, TextFieldModule, NgxMaskDirective,
    HeaderTitleComponent, WysiwygComponent,
  ],
  templateUrl: './purchase-order-create-512.component.html',
  styleUrl: './purchase-order-create-512.component.scss',
})
export class PurchaseOrderCreate512Component {
  constructor(
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  isSubmitting = false;

  /** null until the mode dialog is answered */
  mode: 'barang' | 'jasa' | null = null;

  serviceUnits: string[] = ['LS', 'unit', 'kali', 'hari', 'jam', 'paket', 'orang'];

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    purchaseType: new FormControl('5.1.2'),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierAddress: new FormControl('', Validators.required),
    projectName: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[A-Z0-9]{4,5}$/),
    ]),
    paymentTerm: new FormControl('', Validators.required),
    creditTerm: new FormControl(0, Validators.required),
    prepaidTerm: new FormControl(0, [Validators.required, Validators.min(0), Validators.max(100)]),
    notes: new FormControl(''),
    lines: new FormArray([]),
    includePPN: new FormControl(true),
  });

  ngOnInit(): void {
    this.askMode(true);
  }

  /** `initial` = dismissing sends the user back to the PO hub */
  askMode(initial: boolean = false) {
    this.dialog
      .open(PurchaseOrder512ModeDialogComponent, {
        width: '600px',
        maxWidth: '94vw',
        autoFocus: false,
        disableClose: initial,
      })
      .afterClosed()
      .subscribe((picked) => {
        if (!picked) {
          if (initial) this.router.navigate(['/Purchase-order/Create']);
          return;
        }
        if (picked === this.mode) return;
        this.mode = picked;
        this.t.clear(); // line shape differs per mode
        if (picked === 'jasa') this.addService();
      });
  }

  get isGoods(): boolean { return this.mode === 'barang'; }
  get modeLabel(): string {
    return this.mode === 'barang' ? 'Beli barang (sparepart)' : 'Pesan jasa (perbaikan)';
  }

  get f() { return this.formGroup.controls; }
  get t() { return this.formGroup.get('lines') as FormArray; }
  getFormGroupAt(i: number) { return this.t.at(i) as FormGroup; }
  removeAt(i: number) { this.t.removeAt(i); }

  // ---- jasa lines ----
  private buildServiceLine(): FormGroup {
    return this.formBuilder.group({
      task: ['', [Validators.required, Validators.maxLength(100)]],
      asset: [''], // aset yang diperbaiki -> remarks_2
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unit: ['LS', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      note: [''],
    });
  }
  addService() { this.t.push(this.buildServiceLine()); }

  // ---- barang lines ----
  private buildGoodsLine(item: any): FormGroup {
    return this.formBuilder.group({
      item_id: [item.id, Validators.required],
      sku: [item.sku],
      description: [item.description],
      asset: [''], // aset tujuan sparepart -> remarks_2
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unit: [item.unit || 'pcs', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      note: [''],
    });
  }

  openItemSelector() {
    this.dialog
      .open(MasterItemSelectorComponent, {
        data: { purchaseType: '5.1.2' },
        width: '560px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((item) => {
        if (!item) return;
        if (this.t.value.some((x: any) => x.item_id === item.id)) {
          this.snackBar.open('Barang ini sudah ada di daftar', 'Close', { duration: 2500 });
          return;
        }
        this.t.push(this.buildGoodsLine(item));
      });
  }

  /** LS (lump sum) locks the volume to 1 */
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
      purchaseType: '5.1.2',
      projectName: projectCode,
      projectCode: projectCode,
      name: '',
      dpp: dpp,
      ppn: ppn,
      payment_term: this.formGroup.get('paymentTerm')?.value,
      templateVersion: '1.0',
      billing_requirements: {},
      items: this.t.controls.map((c) => {
        const x = c.getRawValue();
        return {
          item_id: this.isGoods ? x.item_id : null,
          task: this.isGoods ? null : x.task,
          quantity: x.unit === 'LS' ? 1 : x.quantity,
          price: x.price,
          unit: x.unit,
          remarks_1: x.note, // catatan
          remarks_2: x.asset, // aset yang dirawat / diperbaiki
        };
      }),
      customData: {
        maintenanceMode: this.mode, // 'barang' | 'jasa'
        paymentTerm: this.formGroup.get('paymentTerm')?.value,
        creditTerm: this.formGroup.get('creditTerm')?.value,
        prepaidTerm: this.formGroup.get('prepaidTerm')?.value,
        notes: this.formGroup.get('notes')?.value,
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