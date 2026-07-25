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
import { MasterItemSelectorComponent } from '../../../../components/master-item-selector/master-item-selector.component';
import { HeaderTitleComponent } from '../../../../components/header-title/header-title.component';
import { WysiwygComponent } from '../../../../components/wysiwyg/wysiwyg.component';
import { ApiService } from '../../../../services/api.service';
import { PURCHASE_TYPE_LABELS } from '../../../../constants/purchase-type-label';
import { PurchaseOrderCreate63ModeDialogComponent } from './purchase-order-create-63-mode-dialog/purchase-order-create-63-mode-dialog.component';

/**
 * Marketing purchase orders:
 *   6.3.1 Advertising Expense
 *   6.3.2 Promotional Merchandise
 * The code comes from the route data. Goods and services are never mixed in
 * one order — the mode is chosen up front and drives the whole line editor.
 */
@Component({
  selector: 'app-purchase-order-create-63',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    TextFieldModule,
    NgxMaskDirective,
    HeaderTitleComponent,
    WysiwygComponent,
  ],
  templateUrl: './purchase-order-create-63.component.html',
  styleUrl: './purchase-order-create-63.component.scss',
})
export class PurchaseOrderCreate63Component {
  constructor(
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  isSubmitting = false;

  /** null until the mode dialog is answered — a PO is either goods or services */
  mode: 'barang' | 'jasa' | null = null;

  /** '6.3.1' or '6.3.2', taken from the route definition */
  purchaseType: string = '6.3.2';

  get typeLabel(): string {
    return PURCHASE_TYPE_LABELS[this.purchaseType] || this.purchaseType;
  }

  serviceUnits: string[] = [
    'LS',
    'kegiatan',
    'hari',
    'jam',
    'paket',
    'video',
    'sesi',
    'bulan',
  ];

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    purchaseType: new FormControl('6.3.2'),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierAddress: new FormControl('', Validators.required),
    projectName: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[A-Z0-9]{4,5}$/),
    ]),
    paymentTerm: new FormControl('', Validators.required),
    creditTerm: new FormControl(0, Validators.required),
    prepaidTerm: new FormControl(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
    ]),
    notes: new FormControl(''),
    lines: new FormArray([]),
    includePPN: new FormControl(true),
  });

  ngOnInit(): void {
    const routeType = this.route.snapshot.data?.['purchaseType'];
    if (routeType) {
      this.purchaseType = routeType;
      this.formGroup.patchValue({ purchaseType: routeType });
    }
    this.askMode(true);
  }

  /** `initial` = dismissing sends the user back to the PO hub */
  askMode(initial: boolean = false) {
    this.dialog
      .open(PurchaseOrderCreate63ModeDialogComponent, {
        width: '600px',
        maxWidth: '94vw',
        autoFocus: false,
        disableClose: initial,
        data: { typeLabel: this.typeLabel },
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

  get isGoods(): boolean {
    return this.mode === 'barang';
  }
  get modeLabel(): string {
    return this.mode === 'barang' ? 'Barang / merchandise' : 'Jasa';
  }

  get f() {
    return this.formGroup.controls;
  }
  get t() {
    return this.formGroup.get('lines') as FormArray;
  }
  getFormGroupAt(i: number) {
    return this.t.at(i) as FormGroup;
  }
  removeAt(i: number) {
    this.t.removeAt(i);
  }

  // ---- service line (free text, like PO-D) ----
  private buildServiceLine(): FormGroup {
    return this.formBuilder.group({
      task: ['', [Validators.required, Validators.maxLength(100)]],
      item_id: [null],
      sku: [''],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unit: ['LS', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      note: [''],
    });
  }

  addService() {
    this.t.push(this.buildServiceLine());
  }

  // ---- goods line (from master item, like PO-G) ----
  private buildGoodsLine(item: any): FormGroup {
    return this.formBuilder.group({
      task: [''],
      item_id: [item.id, Validators.required],
      sku: [item.sku],
      description: [item.description],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unit: [item.unit || 'pcs', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      note: [''],
    });
  }

  openItemSelector() {
    this.dialog
      .open(MasterItemSelectorComponent, {
        data: { purchaseType: this.purchaseType },
        width: '560px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((item) => {
        if (!item) return;
        const exists = this.t.value.some((x: any) => x.item_id === item.id);
        if (exists) {
          this.snackBar.open('Barang ini sudah ada di daftar', 'Close', {
            duration: 2500,
          });
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
    return this.formGroup.get('includePPN')?.value
      ? this.rawTotal / 1.11
      : this.rawTotal;
  }
  get ppnAmount(): number {
    return this.formGroup.get('includePPN')?.value
      ? this.rawTotal - this.rawTotal / 1.11
      : 0;
  }
  get grandTotal(): number {
    return this.rawTotal;
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

  toUpperCase() {
    const v = this.formGroup.get('projectName')?.value;
    if (v && v.toUpperCase() !== v) {
      this.formGroup.patchValue({ projectName: v.toUpperCase() });
    }
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
      purchaseType: this.purchaseType,
      projectName: projectCode,
      projectCode: projectCode,
      name: '',
      dpp: dpp,
      ppn: ppn,
      payment_term: this.formGroup.get('paymentTerm')?.value,
      templateVersion: '1.0',
      billing_requirements: {},
      // mixed lines -> purchase_order_items
      items: this.t.controls.map((c) => {
        const x = c.getRawValue();
        return {
          // goods carry the catalogue id; services carry a free-text task
          item_id: this.isGoods ? x.item_id : null,
          task: this.isGoods ? null : x.task,
          quantity: x.unit === 'LS' ? 1 : x.quantity,
          price: x.price,
          unit: x.unit,
          remarks_1: x.note, // catatan (ex. sablon 1 warna, ukuran, deadline)
        };
      }),
      customData: {
        marketingMode: this.mode, // 'barang' | 'jasa'
        paymentTerm: this.formGroup.get('paymentTerm')?.value,
        creditTerm: this.formGroup.get('creditTerm')?.value,
        prepaidTerm: this.formGroup.get('prepaidTerm')?.value,
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
        error: (error) =>
          this.snackBar.open(
            error?.error?.detail ?? 'Gagal membuat purchase order',
            'Close',
            { duration: 3000 },
          ),
      })
      .add(() => (this.isSubmitting = false));
  }
}
