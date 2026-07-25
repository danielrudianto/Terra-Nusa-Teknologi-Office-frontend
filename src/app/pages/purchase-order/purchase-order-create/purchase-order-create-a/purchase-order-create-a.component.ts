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
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TextFieldModule } from '@angular/cdk/text-field';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupplierSelectorComponent } from '../../../../components/supplier-selector/supplier-selector.component';
import { HeaderTitleComponent } from '../../../../components/header-title/header-title.component';
import { ApiService } from '../../../../services/api.service';
import {
  FLEET_OPTIONS,
  FleetOption,
  MODE_FLEET_ID,
} from '../../../../constants/fleet';
import { FleetIconComponent } from '../../../../components/fleet-icon/fleet-icon.component';
import { FleetInfoDialogComponent } from '../../../../components/fleet-info-dialog/fleet-info-dialog.component';

@Component({
  selector: 'app-purchase-order-create-a',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    TextFieldModule,
    NgxMaskDirective,
    HeaderTitleComponent,
    FleetIconComponent,
  ],
  templateUrl: './purchase-order-create-a.component.html',
  styleUrl: './purchase-order-create-a.component.scss',
})
export class PurchaseOrderCreateAComponent {
  constructor(
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  isSubmitting: boolean = false;

  // fleet catalogue is hardcoded (not stored in the database)
  fleets: FleetOption[] = FLEET_OPTIONS;

  // transport modes (segmented control per leg)
  modes = [
    { value: 'darat', label: 'Darat' },
    { value: 'laut', label: 'Laut' },
    { value: 'udara', label: 'Udara' },
    { value: 'ekspedisi', label: 'Ekspedisi' },
  ];

  providerLabel(mode: string): string {
    if (mode === 'laut') return 'Nama kapal / pelayaran';
    if (mode === 'udara') return 'Maskapai';
    return 'Nama ekspedisi';
  }
  refLabel(mode: string): string {
    if (mode === 'laut') return 'No. kontainer';
    if (mode === 'udara') return 'No. AWB';
    return 'No. resi';
  }

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    purchaseType: new FormControl('A'),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierAddress: new FormControl('', Validators.required),
    picFromName: new FormControl('', Validators.required),
    picToName: new FormControl('', Validators.required),
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
    shipments: new FormArray([]),
    includePPN: new FormControl(true),
  });

  get f() {
    return this.formGroup.controls;
  }

  get t() {
    return this.formGroup.get('shipments') as FormArray;
  }

  getFormGroupAt(i: number) {
    return this.t.at(i) as FormGroup;
  }

  private buildShipment(): FormGroup {
    return this.formBuilder.group({
      mode: ['darat', Validators.required],
      deliveryDate: ['', Validators.required],
      from: ['', Validators.required],
      to: ['', Validators.required],
      fleet_id: ['', Validators.required], // darat only (validator toggled by mode)
      nopol: [''],
      driver: [''], // darat: nama & NIK supir -> remarks_4
      provider: [''], // laut/udara/ekspedisi -> remarks_3
      refNumber: [''], // no. kontainer / AWB / resi -> remarks_4
      amount: [0, [Validators.required, Validators.min(1)]],
    });
  }

  setMode(i: number, mode: string) {
    const g = this.getFormGroupAt(i);
    g.patchValue({ mode });
    const fleet = g.get('fleet_id');
    const provider = g.get('provider');
    if (mode === 'darat') {
      fleet?.setValidators([Validators.required]);
      provider?.clearValidators();
    } else {
      fleet?.clearValidators();
      provider?.setValidators([Validators.required]);
    }
    fleet?.updateValueAndValidity();
    provider?.updateValueAndValidity();
  }

  addShipment() {
    this.t.push(this.buildShipment());
  }

  removeAt(i: number) {
    this.t.removeAt(i);
  }

  selectFleet(i: number, fleetId: number) {
    this.getFormGroupAt(i).patchValue({ fleet_id: fleetId });
  }

  openFleetInfo() {
    this.dialog.open(FleetInfoDialogComponent, {
      width: '720px',
      maxWidth: '94vw',
      autoFocus: false,
    });
  }

  // ----- summary -----
  get rawTotal(): number {
    return this.t.value.reduce(
      (acc: number, x: any) => acc + (Number(x.amount) || 0),
      0,
    );
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
    const value = this.formGroup.get('projectName')?.value;
    if (value && value.toUpperCase() !== value) {
      this.formGroup.patchValue({ projectName: value.toUpperCase() });
    }
  }

  formatData() {
    const includePPN = this.formGroup.get('includePPN')?.value;
    const dpp = includePPN ? this.rawTotal / 1.11 : this.rawTotal;
    const ppn = includePPN ? 11 : 0;
    const projectCode = this.formGroup.get('projectName')?.value;
    return {
      date: this.formGroup.get('date')?.value.toISOString().split('T')[0],
      supplierID: this.formGroup.get('supplierID')?.value,
      purchaseType: 'A',
      projectName: projectCode,
      projectCode: projectCode,
      name: '',
      dpp: dpp,
      ppn: ppn,
      payment_term: this.formGroup.get('paymentTerm')?.value,
      templateVersion: '1.0',
      billing_requirements: {},
      // structured items -> purchase_order_items table
      items: this.t.value.map((x: any) => ({
        fleet_id: x.mode === 'darat' ? x.fleet_id : MODE_FLEET_ID[x.mode], // 1000/1001/1002 for udara/laut/ekspedisi
        remarks_1: x.from, // lokasi asal
        remarks_2: x.to, // lokasi tujuan
        // darat: nopol | others: provider (nama kapal / maskapai / ekspedisi)
        remarks_3: x.mode === 'darat' ? x.nopol : x.provider,
        // darat: nama & NIK supir | others: reference no. (kontainer / AWB / resi)
        remarks_4: x.mode === 'darat' ? x.driver : x.refNumber,
        quantity: 1,
        price: x.amount,
        unit: x.mode, // 'darat' | 'laut' | 'udara' | 'ekspedisi'
        task: x.deliveryDate
          ? new Date(x.deliveryDate).toISOString().split('T')[0]
          : null,
      })),
      // customData is kept lean — PO-wide PIC contacts + notes
      customData: {
        paymentTerm: this.formGroup.get('paymentTerm')?.value,
        creditTerm: this.formGroup.get('creditTerm')?.value,
        prepaidTerm: this.formGroup.get('prepaidTerm')?.value,
        picFromName: this.formGroup.get('picFromName')?.value,
        picToName: this.formGroup.get('picToName')?.value,
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
}
