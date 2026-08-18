import { Component, inject, OnInit } from '@angular/core';
import { ClauseLineComponent } from '../../../../components/clause-line/clause-line.component';
import { PurchaseOrderTypeSwitcher } from '../../../../services/purchase-order-type-switcher.service';
import { purchaseTypeLabel } from '../../../../constants/purchase-type-label.constant';
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
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  buildClauseLines,
  buildTransportBillingTerms,
  buildTransportClauses,
  transportUsesRentalLayout,
} from '../../../../constants/clause-templates';
import {
  IPurchaseOrderA,
  printPurchaseOrderA,
} from '../../../../helpers/purchase-order-a.helper';
import { IPPh } from '../../../../utils/pph';
import { PphSelectorComponent } from '../../../../components/pph-selector/pph-selector.component';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ProjectSelectorComponent } from '../../../../components/project-selector/project-selector.component';
import { tanggalLokal } from '../../../../utils/tanggal';
import { firstValueFrom } from 'rxjs';
import { PurchaseOrderViewComponent } from '../../../../pages/purchase-order/purchase-order-view/purchase-order-view.component';
import { AdendumService } from '../../../../services/adendum.service';
import { BALIK_BARIS } from '../../../../constants/balik-baris-po';
import { SupplierTerkunciComponent } from '../../../../components/supplier-terkunci/supplier-terkunci.component';

@Component({
  selector: 'app-purchase-order-create-a',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [
    ProjectSelectorComponent,
    ClauseLineComponent,
    MatAutocompleteModule,
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
    SupplierTerkunciComponent,
  ],
  templateUrl: './purchase-order-create-a.component.html',
  styleUrl: './purchase-order-create-a.component.scss',
})
export class PurchaseOrderCreateAComponent implements OnInit {
  private readonly translateSvc = inject(TranslateService);


  /**
   * Satuan berubah pada satu baris.
   *
   * Untuk satuan borongan (LS), volumenya dikunci pada 1. Nilainya memang
   * selalu dihitung satu saat menjumlahkan, sehingga membiarkan kolomnya
   * dapat diisi berarti menawarkan angka yang diabaikan diam-diam — dan yang
   * mengisinya baru sadar setelah totalnya tidak sesuai harapan.
   */
  onUnitChange(i: number): void {
    this.selaraskanVolume(this.getFormGroupAt(i));
  }

  /**
   * Kunci volume hanya untuk satuan borongan.
   *
   * Dipisah agar dapat dipanggil dari PENDENGAR NILAI, bukan hanya dari
   * peristiwa `change` templatnya.
   *
   * Satuan dipilih lewat autocomplete, dan memilih dari daftar TIDAK memicu
   * `change` — peristiwa itu hanya menyala bila penggunanya mengetik lalu
   * memindahkan fokus. Akibatnya baris baru terkunci pada 'LS' dan tetap
   * terkunci walaupun satuannya sudah diganti menjadi rit atau trip.
   */
  private selaraskanVolume(g: FormGroup): void {
    const qty = g.get('quantity');
    if (!qty) return;
    if (String(g.get('unit')?.value || '').toUpperCase() === 'LS') {
      // `emitEvent: false` supaya tidak memicu pendengarnya sendiri.
      qty.setValue(1, { emitEvent: false });
      qty.disable({ emitEvent: false });
    } else {
      qty.enable({ emitEvent: false });
    }
  }
  /** Kode jenis PO, dipakai pada pill di kepala halaman. */
  ngOnInit(): void {
    // Bila dibuka sebagai adendum atau koreksi, isinya diambil dari
    // dokumen induknya. Dipanggil di `ngOnInit` — bukan di penangan
    // tombol — karena alamatnya sudah membawa `adendumDari` sejak
    // halaman dibuka, dan yang membukanya tidak menekan apa pun.
    this.muatAdendum();
    // Bila dibuka sebagai adendum ATAU koreksi, isinya diambil dari dokumen
    // lamanya.
    //
    // Sebelumnya baris ini berada SETELAH `return` pada sebuah getter,
    // sehingga tidak pernah berjalan sama sekali — adendum terbuka dengan
    // formulir kosong tanpa satu pun galat.
    if (this.adendum.memuatDokumenLama) this.muatAdendum();
  }

  get typeCode(): string {
    return 'A';
  }

  /** Nama jenis PO, dipakai pada pill di kepala halaman. */
  get typeLabel(): string {
    return purchaseTypeLabel(this.translateSvc, 'A');
  }

  private readonly typeSwitcher = inject(PurchaseOrderTypeSwitcher);

  /** Buka pemilih jenis PO; isian yang sudah ada dikonfirmasi lebih dulu. */
  onChangeType() {
    this.typeSwitcher.open(this.formGroup?.dirty === true);
  }
  constructor(
    public adendum: AdendumService,
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
    { value: 'darat', key: 'poA.modeLand' },
    { value: 'laut', key: 'poA.modeSea' },
    { value: 'udara', key: 'poA.modeAir' },
  ];

  /** Apakah ada baris pengiriman dengan moda tersebut. */
  /*
   * Termin pembayaran mengikuti pola PO-G: kode baku, bukan teks bebas.
   * Dengan begitu isinya seragam antar dokumen dan bisa direkap.
   */
  private readonly CREDIT_TERMS = ['PPD', 'CR', 'CRD'];
  private readonly PREPAID_TERMS = ['PPD', 'CRD'];

  get creditEnabled(): boolean {
    return this.CREDIT_TERMS.includes(this.formGroup.get('paymentTerm')?.value);
  }

  get prepaidEnabled(): boolean {
    return this.PREPAID_TERMS.includes(
      this.formGroup.get('paymentTerm')?.value,
    );
  }

  /** Kolom tempo/uang muka hanya aktif bila terminnya memang memakainya. */
  onPaymentTermChange(): void {
    const credit = this.formGroup.get('creditTerm');
    const prepaid = this.formGroup.get('prepaidTerm');

    if (this.creditEnabled) {
      credit?.enable();
    } else {
      credit?.setValue(0);
      credit?.disable();
    }

    if (this.prepaidEnabled) {
      prepaid?.enable();
    } else {
      prepaid?.setValue(0);
      prepaid?.disable();
    }
  }

  usesMode(mode: string): boolean {
    return this.barisPengiriman.some((x: any) => x.mode === mode);
  }

  providerLabel(mode: string): string {
    if (mode === 'laut') return 'Nama kapal / pelayaran';
    if (mode === 'udara') return 'Maskapai';
    // Tersisa untuk PO lama yang masih bermoda ekspedisi.
    return 'Nama penyedia';
  }
  refLabel(mode: string): string {
    if (mode === 'laut') return 'No. kontainer';
    if (mode === 'udara') return 'No. AWB';
    return 'No. resi';
  }

  /**
   * Satuan yang lazim dipakai. Daftar ini hanya saran — kolomnya tetap bisa
   * diketik sendiri bila vendor memakai satuan lain.
   */
  unitOptions: string[] = ['LS', 'kg', 'rit', 'trip', 'unit', 'koli', 'm3'];

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    purchaseType: new FormControl('A'),
    // Jenis pekerjaan menentukan template klausul: pengiriman memakai
    // template transportasi, sewa alat memakai template PO-B.
    workKind: new FormControl('pengiriman', Validators.required),
    transportMode: new FormControl('darat'),
    insuranceDays: new FormControl(3, [Validators.min(0)]),
    consignmentDays: new FormControl(3, [Validators.min(0)]),
    // Kewajiban PIHAK PERTAMA pada pengiriman laut; berdiri sendiri karena
    // tetap berlaku walau asuransi diurus sendiri.
    cargoListDays: new FormControl(3, [Validators.min(0)]),
    // Asuransi kadang diurus sendiri oleh PIHAK PERTAMA; bila dimatikan,
    // klausulnya tidak dicetak sama sekali.
    requireInsuranceDoc: new FormControl(true),
    insuranceValue: new FormControl(null),
    // Udara: cakupan layanan yang tercetak di poin pertama.
    airService: new FormControl('door-to-door'),
    containerInsuranceValue: new FormControl(200000000),
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
    supplierNpwp: new FormControl(''),
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
    /*
     * Jasa pengiriman bisa dikenakan dua tarif:
     *   11%  — jasa angkutan pada umumnya
     *   1,1% — jasa pengurusan transportasi (freight forwarding) yang memakai
     *          DPP nilai lain, yaitu 10% dari nilai tagihan
     * Bila PPN dimatikan, tarif yang tercatat adalah 0.
     */
    ppnRate: new FormControl(11),
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
    const g = this.formBuilder.group({
      mode: ['darat', Validators.required],
      deliveryDate: ['', Validators.required],
      from: ['', Validators.required],
      to: ['', Validators.required],
      fleet_id: ['', Validators.required], // darat only (validator toggled by mode)
      nopol: [''],
      driver: [''], // darat: nama & NIK supir -> remarks_4
      provider: [''], // laut/udara -> remarks_3
      refNumber: [''], // no. kontainer / AWB / resi -> remarks_4
      amount: [0, [Validators.required, Validators.min(1)]],
      // Volume & satuan mengikuti bentuk tagihan vendor: jasa antar udara
      // kerap ditagih per kilogram, bukan lump sum.
      quantity: [1, [Validators.required, Validators.min(1)]],
      // Penulisan disamakan dengan formulir lain ('LS'). Dokumen lama yang
      // menyimpan 'Ls' tetap terbaca karena pembandingnya tidak peduli
      // huruf besar-kecil.
      unit: ['LS', Validators.required],
      // Jadwal melekat pada pengiriman, bukan pada kontrak: satu SPK bisa
      // memuat beberapa pengiriman dengan jadwal dan rute berbeda.
      unloadingDate: [''],
      closingDate: [''],
      etd: [''],
      eta: [''],
      // Penanggung jawab per pengiriman. Sebagian penyedia (mis. layanan
      // antar berbasis aplikasi) tidak punya satu PIC untuk seluruh
      // kontrak — tiap pengiriman ditangani orang berbeda.
      picName: [''],
      picPhone: [''],
    });

    /*
     * Volume mengikuti satuannya, apa pun cara satuannya diubah.
     *
     * Pendengar nilai menangkap PILIHAN DARI DAFTAR juga — sedangkan
     * peristiwa `change` pada templat hanya menyala bila penggunanya
     * mengetik lalu memindahkan fokus. Tanpa pendengar ini, baris baru
     * terkunci pada 'LS' dan tetap terkunci setelah satuannya diganti.
     */
    g.get('unit')?.valueChanges.subscribe(() => this.selaraskanVolume(g));
    this.selaraskanVolume(g);
    return g;
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

    // Baris baru memakai satuan borongan, sehingga volumenya langsung
    // dikunci — tanpa ini kolomnya terbuka sampai satuannya disentuh.
    this.onUnitChange(this.t.length - 1);
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
  /**
   * Nilai satu baris pengiriman: harga satuan dikali volumenya.
   *
   * Kolom "amount" berisi harga PER SATUAN, bukan jumlah barisnya. Sebelumnya
   * nilainya dijumlahkan apa adanya sehingga volume 2 tetap dihitung sebagai
   * satu — layar dan nilai yang tersimpan menjadi lebih kecil daripada
   * dokumen yang tercetak, dan selisihnya baru terlihat saat keduanya
   * dibandingkan.
   *
   * Satuan "Ls" (lump sum) selalu dihitung satu, sama seperti pada tabel
   * dokumen.
   */
  lineTotal(x: any): number {
    const harga = Number(String(x?.amount ?? '').replace(/[^\d.-]/g, '')) || 0;
    const volume = String(x?.unit || '').toUpperCase() === 'LS' ? 1 : Number(x?.quantity) || 1;
    return harga * volume;
  }

  /**
   * Isi seluruh baris pengiriman, termasuk kolom yang sedang dikunci.
   *
   * `this.t.value` tidak memuat kontrol yang di-disable — dan volume dikunci
   * pada satuan borongan. Membacanya lewat sana membuat volumenya hilang saat
   * disimpan, dan angkanya baru terlihat keliru setelah dokumennya terbit.
   */
  private get barisPengiriman(): any[] {
    return this.t.getRawValue() || [];
  }

  get rawTotal(): number {
    return this.barisPengiriman.reduce(
      (acc: number, x: any) => acc + this.lineTotal(x),
      0,
    );
  }
  get subTotal(): number {
    // Harga yang diisi user adalah DPP; PPN ditambahkan di atasnya.
    return this.rawTotal;
  }
  /** Tarif PPN yang sedang dipilih, dalam persen. */
  get ppnRate(): number {
    return Number(this.formGroup.get('ppnRate')?.value ?? 11);
  }

  get ppnAmount(): number {
    return this.formGroup.get('includePPN')?.value
      ? this.rawTotal * (this.ppnRate / 100)
      : 0;
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
            // Diambil hanya bila terisi; vendor perorangan kerap
            // belum ber-NPWP, dan baris kosong pada dokumen resmi
            // lebih mengganggu daripada tidak ada barisnya.
            supplierNpwp: data.npwp || '',
          });
        }
      });
  }


  formatData() {
    const includePPN = this.formGroup.get('includePPN')?.value;
    const dpp = this.rawTotal;
    const ppn = includePPN ? this.ppnRate : 0;
    const projectCode = this.formGroup.get('projectName')?.value;
    return {
      date: tanggalLokal(this.formGroup.get('date')?.value),
      supplierID: this.formGroup.get('supplierID')?.value,
      purchaseType: 'A',
      projectName: projectCode,
      projectCode: projectCode,
      // Penanda induk bila dokumen ini ADENDUM; server yang
      // menghitung nomor adendumnya.
      parentPurchaseOrderID: this.adendum.indukId ?? undefined,
      name: '',
      dpp: dpp,
      ppn: ppn,
      payment_term: this.formGroup.get('paymentTerm')?.value,
      templateVersion: '1.0',
      billing_requirements: {},
      // structured items -> purchase_order_items table
      items: this.barisPengiriman.map((x: any) => ({
        fleet_id: x.mode === 'darat' ? x.fleet_id : MODE_FLEET_ID[x.mode], // 1000 udara, 1001 laut
        remarks_1: x.from, // lokasi asal
        remarks_2: x.to, // lokasi tujuan
        // darat: nopol | lainnya: provider (nama kapal / maskapai)
        remarks_3: x.mode === 'darat' ? x.nopol : x.provider,
        // darat: nama & NIK supir | others: reference no. (kontainer / AWB / resi)
        remarks_4: x.mode === 'darat' ? x.driver : x.refNumber,
        // Penanggung jawab: yang ditulis pada baris menimpa yang di atas.
        // Dengan begitu satu pengiriman cukup mengisi sekali di tingkat
        // kontrak, sementara SPK rapelan bisa berbeda tiap barisnya — tanpa
        // perlu dua jenis formulir.
        remarks_5: x.picName || null,
        remarks_6: x.picPhone || null,
        // Moda tetap terbaca dari fleet_id, sehingga kolom unit bisa dipakai
        // sebagai satuan sungguhan (Ls, kg, rit, trip).
        quantity: String(x.unit || '').toUpperCase() === 'LS' ? 1 : Number(x.quantity) || 1,
        // Berasal dari kolom bertopeng, jadi berupa teks ("6 540 000").
        price: Number(String(x.amount ?? '').replace(/[^\d.-]/g, '')) || 0,
        unit: x.unit,
        task: x.deliveryDate
          ? tanggalLokal(x.deliveryDate)
          : null,
      })),
      // Penanggung jawab kini melekat pada tiap baris pengiriman, sehingga
      // tidak lagi disimpan di tingkat PO.
      //
      // Yang disimpan di sini hanya data sumber, bukan teks klausul: poin
      // perjanjian dirakit ulang dari templateVersion + data ini saat
      // dicetak. Tanpa ini, cetak ulang dari daftar akan memakai nilai
      // bawaan dan menghasilkan dokumen yang berbeda isi dari yang pernah
      // ditandatangani.
      customData: {
        paymentTerm: this.formGroup.get('paymentTerm')?.value,
        creditTerm: this.formGroup.get('creditTerm')?.value,
        prepaidTerm: this.formGroup.get('prepaidTerm')?.value,
        ...this.clauseSourceData(),
      },
    };
  }

  /**
   * Sewa alat angkut tidak lagi dibuat lewat formulir ini — pakai PO-B dan
   * pilih tipe dokumen A di sana. Getter dipertahankan agar PO lama yang
   * masih berjenis 'sewa-alat' tetap tampil benar saat dibuka kembali.
   */
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
      .open(PphSelectorComponent, {
        // Jenis PO menentukan kode yang diusulkan lebih dulu.
        data: { purchaseType: 'A' },})
      .afterClosed()
      .subscribe((data: any) => {
        /*
         * "Tanpa PPh" MENGHAPUS pilihan, berbeda dari membatalkan.
         *
         * Keduanya sempat sama-sama menutup tanpa nilai, sehingga baris di
         * bawah memperlakukan keduanya sebagai batal — dan PPh yang sudah
         * terlanjur dipilih tidak pernah hilang.
         */
        if (data?.hapus) {
          this.clearPph();
          return;
        }
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

  /**
   * Data sumber klausul yang ikut disimpan ke `customData`.
   *
   * Bentuknya mentah (tanggal ISO, angka apa adanya) — bukan teks yang sudah
   * diformat — agar saat dicetak ulang bisa dirakit dengan aturan yang
   * berlaku waktu itu. Jadwal pengiriman ikut disimpan di sini karena tabel
   * `purchase_order_items` hanya punya satu kolom tanggal (`task`), sehingga
   * jadwal bongkar dan jadwal kapal (closing/ETD/ETA) tidak punya tempat.
   */
  private clauseSourceData() {
    const v = this.formGroup.getRawValue();
    const iso = (d: any) =>
      d ? tanggalLokal(d) : null;

    return {
      workKind: v.workKind,
      insuranceDays: v.insuranceDays,
      consignmentDays: v.consignmentDays,
      cargoListDays: v.cargoListDays,
      requireInsuranceDoc: v.requireInsuranceDoc,
      insuranceValue:
        Number(String(v.insuranceValue ?? '').replace(/[^\d.-]/g, '')) || null,
      airService: v.airService,
      containerInsuranceValue:
        Number(
          String(v.containerInsuranceValue ?? '').replace(/[^\d.-]/g, ''),
        ) || 0,
      deliveryRisk: v.deliveryRisk,
      unloadingRisk: v.unloadingRisk,
      paymentTermText: v.paymentTermText,
      pphCode: v.pphCode,
      pphTaxObject: v.pphTaxObject,
      pphPercentage: v.pphPercentage,
      // Tarif tersimpan terpisah dari kolom `ppn`: kolom itu ikut menjadi 0
      // saat PPN dimatikan, sehingga tarif yang dipilih tidak lagi terbaca.
      ppnRate: this.ppnRate,
      additionalClauses: this.additionalClauseValues,
      shipmentSchedules: this.barisPengiriman.map((x: any) => ({
        mode: x.mode,
        from: x.from,
        to: x.to,
        deliveryDate: iso(x.deliveryDate),
        unloadingDate: iso(x.unloadingDate),
        closingDate: iso(x.closingDate),
        etd: iso(x.etd),
        eta: iso(x.eta),
      })),
    };
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
      // Tidak dikirim bila belum ada baris pengiriman: moda ditentukan oleh
      // baris, dan tanpa itu klausul moda sebaiknya belum tampil sama sekali.
      transportMode: this.barisPengiriman.length ? v.transportMode : undefined,
      // Diambil dari baris yang benar-benar diisi, sehingga SPK campuran
      // memuat klausul kedua modanya.
      transportModes: this.barisPengiriman
        .map((x: any) => x.mode)
        .filter((m: string) => !!m),
      insuranceDays: v.insuranceDays,
      consignmentDays: v.consignmentDays,
      cargoListDays: v.cargoListDays,
      requireInsuranceDoc: v.requireInsuranceDoc,
      insuranceValue: v.insuranceValue || undefined,
      airService: v.airService,
      // Satu blok jadwal untuk tiap pengiriman, apa pun modanya. Klausul
      // menyaringnya sendiri sesuai bagian moda yang sedang dicetak.
      shipmentSchedules: this.barisPengiriman.map((x: any) => ({
        mode: x.mode,
        from: x.from,
        to: x.to,
        deliveryDateText: tgl(x.deliveryDate),
        unloadingDateText: tgl(x.unloadingDate),
        closingDateText: tgl(x.closingDate),
        etdText: tgl(x.etd),
        etaText: tgl(x.eta),
      })),
      containerInsuranceValue: v.containerInsuranceValue,
      deliveryRisk: v.deliveryRisk,
      unloadingRisk: v.unloadingRisk,
      shiftHours: v.shiftHours,
      overtimeRate:
        Number(String(v.overtimeRate ?? '').replace(/[^\d.-]/g, '')) || 0,
      includeTransportCoordination: true,
      // Titik kirim diambil dari baris pengiriman pertama.
      deliveryDateText: tgl(s.deliveryDate),
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
              string | string[]
            )[],
          },
        ]
      : buildTransportClauses(ctx as any, extra);

    // Sewa alat memakai tata letak PO-B, yang menggabungkan poin tambahan
    // dengan caranya sendiri.
    if (!extra.length || !sections.length) return sections;
    if (!transportUsesRentalLayout(ctx.workKind)) return sections;

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

  /**
   * Susun data cetak SPK dari isian form.
   *
   * Seksi klausul memakai `previewSections` — yang sama persis dengan yang
   * tampil di pratinjau — sehingga dokumen yang keluar tidak bisa berbeda
   * dari yang sudah dibaca sebelum disimpan.
   */
  private buildPrintData(purchaseOrderName: string): IPurchaseOrderA {
    const v = this.formGroup.getRawValue();
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
      purchaseOrderName,
      date: v.date,
      projectName: v.projectName,
      supplierName: v.supplierName,
      supplierAddress: v.supplierAddress,
      supplierNpwp: v.supplierNpwp,
      shipments: this.barisPengiriman.map((x: any) => ({
        mode: x.mode,
        from: x.from,
        to: x.to,
        fleetName: this.fleets.find((f) => f.id === Number(x.fleet_id))?.name,
        nopol: x.nopol,
        driver: x.driver,
        provider: x.provider,
        refNumber: x.refNumber,
        picName: x.picName,
        picPhone: x.picPhone,
        // Satuan Ls selalu berjumlah satu, mengikuti aturan penyimpanan.
        quantity: String(x.unit || '').toUpperCase() === 'LS' ? 1 : Number(x.quantity) || 1,
        unit: x.unit,
        // Berasal dari kolom bertopeng, jadi berupa teks ("6 540 000").
        price: Number(String(x.amount ?? '').replace(/[^\d.-]/g, '')) || 0,
        deliveryDateText: tgl(x.deliveryDate),
      })),
      includePpn: !!v.includePPN,
      ppnRate: this.ppnRate,
      sections: this.previewSections,
      billingTerms: buildTransportBillingTerms(),
    };
  }

  /**
   * Buka pratinjau dokumen tanpa menyimpan apa pun.
   *
   * Memakai penyusun data dan helper cetak YANG SAMA dengan penyimpanan,
   * sehingga yang dilihat di layar benar-benar dokumen yang nanti terbit —
   * bukan tiruan yang bisa menyimpang sendiri.
   *
   * Nomor PO belum ada karena diberikan server saat penyimpanan; sebagai
   * gantinya dokumen ditandai sebagai draf, supaya tidak ada yang menyimpan
   * berkas ini lalu mengiranya SPK yang sah.
   */
  /**
   * Susun data dokumen dalam bentuk yang sama dengan jawaban server.
   *
   * Pratinjau memakai komponen yang sama dengan halaman lihat PO, sehingga
   * yang dilihat sebelum menerbitkan persis seperti yang akan dilihat
   * sesudahnya. Untuk itu bentuknya harus mengikuti jawaban server, bukan
   * bentuk cetak.
   *
   * `id` sengaja tidak diisi: dokumennya belum ada di server, dan riwayat
   * aktivitas di halaman lihat memang hanya tampil bila id-nya ada.
   */
  private dataPratinjau(): any {
    const v = this.formGroup.getRawValue();
    const dasar = this.formatData();

    /*
     * Nama barang dilengkapi khusus untuk pratinjau.
     *
     * `formatData()` sengaja TIDAK menyalin nama barang: yang tersimpan
     * hanya `item_id`, dan namanya diambil dari master_item saat PO dibaca
     * kembali dari server. Pratinjau tidak lewat server, sehingga tanpa ini
     * seluruh baris barang tampil sebagai "—".
     *
     * Diambil dari formulir, bukan dikarang: nilainya berasal dari katalog
     * yang sama saat barangnya dipilih.
     */
    const baris = Array.isArray((dasar as any).items) ? (dasar as any).items : [];
    /*
     * Baris formulir diambil lewat `this.t`, bukan `v.items`.
     *
     * Nama FormArray-nya berbeda-beda antar varian — `purchase_order`,
     * `lines`, `shipments`, `rentals`, `workers`, `scopes`. Menebak satu
     * nama membuat lima belas varian lainnya diam-diam tidak mendapat nama
     * barang, dan tidak ada galat yang muncul.
     */
    const asal = this.t?.controls?.map((c: any) => c.getRawValue()) ?? [];
    const items = baris.map((it: any, i: number) => ({
      ...it,
      item_description:
        it.item_description ??
        asal[i]?.description ??
        asal[i]?.name ??
        it.task ??
        asal[i]?.sku ??
        null,
    }));

    return {
      ...dasar,
      items,
      // Penanda draf ikut bahasa aplikasi; nomor asli baru ada
      // setelah server menerbitkannya.
      name: this.translateSvc.instant('poForm.draftNotIssued'),
      supplierName: v.supplierName,
      supplierAddress: v.supplierAddress,
    };
  }

  /** Buka pratinjau tanpa menyimpan apa pun. */
  pratinjau(): void {
    this.dialog.open(PurchaseOrderViewComponent, {
      data: { data: this.dataPratinjau() },
      maxWidth: '96vw',
      autoFocus: false,
    });
  }

  /**
   * Tampilkan dokumennya lebih dulu, terbitkan setelah dinyatakan terbaca.
   *
   * SPK mengikat kedua pihak dan tidak dapat diubah setelah terbit —
   * nomornya sudah terpakai dan salinannya sudah beredar. Menampilkan
   * dokumen jadi pada langkah terakhir memindahkan koreksi ke saat masih
   * murah: sebelum dokumennya ada.
   *
   * Gagal menyusun dokumen TIDAK meloloskan penerbitan. Melewatinya berarti
   * PO terbit tanpa seorang pun pernah melihat isinya.
   */
  /**
   * Tampilkan dokumennya lebih dulu, terbitkan setelah dinyatakan terbaca.
   *
   * SPK mengikat kedua pihak dan tidak dapat diubah setelah terbit.
   */
  async onSubmit(): Promise<void> {
    const setuju = await firstValueFrom(
      this.dialog
        .open(PurchaseOrderViewComponent, {
          data: { data: this.dataPratinjau(), konfirmasi: true },
          maxWidth: '96vw',
          autoFocus: false,
          disableClose: true,
        })
        .afterClosed(),
    );
    if (setuju) this.terbitkan();
  }

  /** Kirim ke server; dipanggil setelah dokumennya dikonfirmasi. */
  private terbitkan() {
    this.isSubmitting = true;
    /*
     * Mode UBAH menimpa dokumennya, bukan menerbitkan yang baru.
     *
     * Server menolak bila dokumennya sudah disetujui, dan mengabaikan kolom
     * yang menentukan identitasnya — nomor, pemasok, proyek, jenis. Layar
     * ini tidak perlu menjaganya lagi; yang dijaga di sini hanya agar
     * permintaannya menuju jalur yang benar.
     */
    const ubahId = this.adendum.ubahId;
    this.apiService
      [ubahId ? 'put' : 'post'](
        ubahId ? `purchase-orders/${ubahId}` : 'purchase-orders',
        this.formatData(),
      )
      .subscribe({
        next: (res: any) => {
          this.snackBar.open(
            `Purchase order ${res?.purchase_order_name ?? ''} berhasil dibuat`,
            'Close',
            { duration: 3000 },
          );
          // Buka PDF-nya; gagal cetak tidak membatalkan SPK yang tersimpan.
          try {
            printPurchaseOrderA(
              this.buildPrintData(res?.purchase_order_name ?? ''),
            );
          } catch (e) {
            console.error('Gagal membuat PDF surat perintah kerja:', e);
          }

          /*
           * Adendum dicetak dari DAFTAR, bukan dari sini.
           *
           * Cetakan adendum wajib menyertakan induk dan adendum sebelumnya:
           * isinya selisih, sehingga dibaca sendirian ia tidak menyatakan
           * keadaan pekerjaannya. Yang menyusun rantai itu ada di halaman
           * daftar; mengulanginya di enam belas formulir berarti enam belas
           * salinan yang harus diperbaiki bersamaan.
           */
          this.router.navigate(['/Purchase-order'], {
            queryParams: this.adendum.isAdendum
              ? { cetak: res?.purchase_order_id ?? res?.id }
              : undefined,
          });
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

  /** True bila layar ini membuat ADENDUM, bukan dokumen baru. */
  get isAdendum(): boolean {
    return this.adendum.isAdendum;
  }

  /**
   * True bila layar ini MENGUBAH dokumen yang belum disetujui.
   *
   * Berbeda dari adendum walaupun keduanya memuat dokumen lama: adendum
   * menerbitkan dokumen baru berisi selisih, ubah menimpa dokumen yang
   * belum pernah terbit.
   */
  get isUbah(): boolean {
    return this.adendum.isUbah;
  }

  /**
   * Judul layar: membuat atau mengubah.
   *
   * Layar yang sama dipakai untuk keduanya — bentuk formulirnya identik, dan
   * layar kedua berarti setiap perubahan bentuk harus dikerjakan dua kali.
   * Yang membedakan hanya judulnya, banner di atas, dan tombolnya.
   */
  get judulLayar(): string {
    return this.translateSvc.instant(
      this.isUbah ? 'poForm.judulUbah' : 'poForm.titleA',
    );
  }

  /** Dokumen induk yang diadendum; null bila dokumen baru. */
  induk: any = null;

  /**
   * Isi formulir dari dokumen induk saat layar dibuka sebagai adendum.
   *
   * Volume dikosongkan: adendum berisi SELISIH, bukan pengganti. Menyalin
   * volume induk membuat yang mengisi tinggal menekan simpan dan
   * menggandakan seluruh pekerjaannya tanpa menyadarinya.
   */
  private muatAdendum(): void {
    this.adendum.muatInduk().subscribe({
      next: (induk: any) => {
        if (!induk) return;
        this.induk = induk;
        this.adendum.isiFormulir(this.formGroup, induk);
        this.adendum.kunciIsian(this.formGroup);
        this.adendum.isiLarik(
          this.formGroup,
          'shipments',
          this.adendum.barisInduk(induk),
          (x) => {
          const g = this.buildShipment();
          g.patchValue(BALIK_BARIS['a'](x, this.isUbah));
          return g;
        },
        );
        /*
         * Poin perjanjian tambahan ikut diwarisi.
         *
         * Hilang di SELURUH varian sebelumnya: `isiFormulir` melewati setiap
         * FormArray, dan tidak ada satu pun varian yang mengisinya sendiri.
         * Adendum karena itu terbit tanpa poin khusus yang sudah disepakati
         * pada dokumen induknya — dan yang membacanya menganggap poin itu
         * memang tidak pernah ada.
         */
        const klausulInduk = this.adendum.larikCustom(induk, 'additionalClauses');
        this.additionalClauses.clear();
        for (const teks of klausulInduk) {
          this.addClause();
          this.additionalClauses
            .at(this.additionalClauses.length - 1)
            .setValue(teks ?? '');
        }
      },
      error: () => {},
    });
  }

}
