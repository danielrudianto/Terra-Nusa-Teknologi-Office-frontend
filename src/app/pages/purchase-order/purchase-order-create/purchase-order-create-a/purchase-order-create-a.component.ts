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
import { TranslatePipe } from '@ngx-translate/core';
import {
  buildClauseLines,
  buildTransportClauses,
  transportUsesRentalLayout,
} from '../../../../constants/clause-templates';
import { IPPh } from '../../../../utils/pph';
import { PphSelectorComponent } from '../../../../components/pph-selector/pph-selector.component';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-purchase-order-create-a',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [
    MatSelectModule,
    TranslatePipe,
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
    // Jenis pekerjaan menentukan template klausul: pengiriman memakai
    // template transportasi, sewa alat memakai template PO-B.
    workKind: new FormControl('pengiriman', Validators.required),
    transportMode: new FormControl('darat'),
    insuranceDays: new FormControl(3, [Validators.min(0)]),
    consignmentDays: new FormControl(3, [Validators.min(0)]),
    deliveryRisk: new FormControl('penyedia'),
    unloadingRisk: new FormControl('penerima'),
    // khusus sewa alat (template PO-B)
    shiftHours: new FormControl(6, [Validators.min(0)]),
    overtimeRate: new FormControl(0, [Validators.min(0)]),
    paymentTermText: new FormControl(''),
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0),
    additionalClauses: new FormArray([]),
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
    // Harga yang diisi user adalah DPP; PPN ditambahkan di atasnya.
    return this.rawTotal;
  }
  get ppnAmount(): number {
    return this.formGroup.get('includePPN')?.value ? this.rawTotal * 0.11 : 0;
  }
  get grandTotal(): number {
    return this.subTotal + this.ppnAmount;
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
    const dpp = this.rawTotal;
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

  get isSewaAlat(): boolean {
    return this.formGroup.get('workKind')?.value === 'sewa-alat';
  }

  get additionalClauses(): FormArray {
    return this.formGroup.get('additionalClauses') as FormArray;
  }

  addClause() {
    this.additionalClauses.push(new FormControl(''));
  }

  removeClause(i: number) {
    this.additionalClauses.removeAt(i);
  }

  private get additionalClauseValues(): string[] {
    return ((this.additionalClauses.value as string[]) || [])
      .map((x) => (x || '').trim())
      .filter((x) => x.length > 0);
  }

  openPphSelector() {
    this.dialog
      .open(PphSelectorComponent, {})
      .afterClosed()
      .subscribe((data: IPPh) => {
        if (!data) return;
        this.formGroup.patchValue({
          pphCode: data.code,
          pphTaxObject: data.taxObjectName,
          pphPercentage: data.tariff,
        });
      });
  }

  clearPph() {
    this.formGroup.patchValue({
      pphCode: '',
      pphTaxObject: '',
      pphPercentage: 0,
    });
  }

  /** Data sumber klausul; dipakai bersama pratinjau dan pencetakan. */
  private clauseContext() {
    const v = this.formGroup.getRawValue();
    // Baris pengiriman pertama dipakai sebagai titik kirim pada klausul.
    const s = this.t.controls[0]?.getRawValue?.() ?? {};
    const tgl = (d: any) =>
      d
        ? new Date(d).toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : '';
    return {
      paymentTerm: v.paymentTerm,
      creditTerm: v.creditTerm,
      prepaidTerm: v.prepaidTerm,
      paymentTermText: v.paymentTermText,
      pphCode: v.pphCode,
      pphTaxObject: v.pphTaxObject,
      pphPercentage: v.pphPercentage,
      workKind: v.workKind,
      transportMode: v.transportMode,
      insuranceDays: v.insuranceDays,
      consignmentDays: v.consignmentDays,
      deliveryRisk: v.deliveryRisk,
      unloadingRisk: v.unloadingRisk,
      shiftHours: v.shiftHours,
      overtimeRate: v.overtimeRate,
      includeTransportCoordination: true,
      // Titik kirim diambil dari baris pengiriman pertama.
      deliveryDateText: tgl(s.deliveryDate),
      originName: v.picFromName,
      originAddress: s.from,
      destinationName: v.picToName,
      destinationAddress: s.to,
      officePICName: v.picFromName,
    };
  }

  /**
   * Pratinjau catatan perjanjian.
   *
   * Sewa alat angkut memakai template PO-B, sehingga hasilnya satu daftar
   * tanpa judul seksi; jasa pengiriman memakai template transportasi yang
   * terbagi seksi Umum dan moda angkutan.
   */
  get previewSections(): { title?: string; items: (string | string[])[] }[] {
    const ctx = this.clauseContext();
    const extra = this.additionalClauseValues;

    const sections = transportUsesRentalLayout(ctx.workKind)
      ? [
          {
            items: buildClauseLines('B', ctx as any, '1.0') as (
              | string
              | string[]
            )[],
          },
        ]
      : buildTransportClauses(ctx as any);

    if (!extra.length || !sections.length) return sections;
    const last = sections[sections.length - 1];
    return [
      ...sections.slice(0, -1),
      { ...last, items: [...last.items, ...extra] },
    ];
  }

  isSubList(x: string | string[]): boolean {
    return Array.isArray(x);
  }

  asList(x: string | string[]): string[] {
    return Array.isArray(x) ? x : [];
  }

  asText(x: string | string[]): string {
    return Array.isArray(x) ? '' : String(x ?? '');
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
