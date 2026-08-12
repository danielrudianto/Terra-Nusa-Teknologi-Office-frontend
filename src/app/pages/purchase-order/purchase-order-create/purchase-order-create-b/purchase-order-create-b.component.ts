import { Component, inject } from '@angular/core';
import { ClauseLineComponent } from '../../../../components/clause-line/clause-line.component';
import { PurchaseOrderTypeSwitcher } from '../../../../services/purchase-order-type-switcher.service';
import { PURCHASE_TYPE_LABELS } from '../../../../constants/purchase-type-label.constant';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TextFieldModule } from '@angular/cdk/text-field';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupplierSelectorComponent } from '../../../../components/supplier-selector/supplier-selector.component';
import { EquipmentSelectorComponent } from '../../../../components/equipment-selector/equipment-selector.component';
import { HeaderTitleComponent } from '../../../../components/header-title/header-title.component';
import { WysiwygComponent } from '../../../../components/wysiwyg/wysiwyg.component';
import { ApiService } from '../../../../services/api.service';
import { TranslatePipe } from '@ngx-translate/core';
import {
  buildClauseHtml,
  buildClauseLines,
  buildEquipmentRentalBillingTerms,
  buildTransportRentalBillingTerms,
  latestClauseVersion,
} from '../../../../constants/clause-templates';
import { printPurchaseOrderB } from '../../../../helpers/purchase-order-b.helper';
import { isTempoTerm } from '../../../../helpers/purchase-order-shared.helper';
import { ProjectSelectorComponent } from '../../../../components/project-selector/project-selector.component';

@Component({
  selector: 'app-purchase-order-create-b',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [
    ProjectSelectorComponent,
    ClauseLineComponent,
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
    MatSlideToggleModule,
    MatCheckboxModule,
    TextFieldModule,
    NgxMaskDirective,
    HeaderTitleComponent,
  ],
  templateUrl: './purchase-order-create-b.component.html',
  styleUrl: './purchase-order-create-b.component.scss',
})
export class PurchaseOrderCreateBComponent {
  /** Kode jenis PO, dipakai pada pill di kepala halaman. */
  get typeCode(): string {
    return 'B';
  }

  /** Nama jenis PO, dipakai pada pill di kepala halaman. */
  get typeLabel(): string {
    return PURCHASE_TYPE_LABELS['B'] || '';
  }

  private readonly typeSwitcher = inject(PurchaseOrderTypeSwitcher);

  /** Buka pemilih jenis PO; isian yang sudah ada dikonfirmasi lebih dulu. */
  onChangeType() {
    this.typeSwitcher.open(this.formGroup?.dirty === true);
  }
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
    /*
     * Sewa alat angkut untuk transportasi diterbitkan sebagai dokumen tipe A,
     * sementara sewa alat kerja tetap tipe B. Isinya sama, yang berbeda hanya
     * penomoran dan judul dokumennya.
     */
    purchaseType: new FormControl('B'),
    /*
     * Jenis barang yang disewa.
     *
     * Menentukan istilah pada dokumen sekaligus ketentuan yang berlaku:
     * SILO dan SIO hanya mengikat pesawat angkat dan angkut, sehingga tidak
     * dicetak untuk kendaraan maupun perlengkapan biasa.
     */
    rentalCategory: new FormControl('alat-berat'),
    /*
     * Cakupan harga pengangkutan (upah operator, BBM, retribusi, dan akibat
     * kelalaian pengemudi).
     *
     * Mengikuti jenis dokumennya: menyala saat diterbitkan sebagai tipe A,
     * padam saat kembali ke B. Tetap dapat diubah tangan bila ada kesepakatan
     * lain — yang otomatis hanyalah nilai awalnya, bukan penguncian.
     */
    includeTransportCoverage: new FormControl(false),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierPrefix: new FormControl(''),
    supplierCity: new FormControl(''),
    supplierNpwp: new FormControl(''),
    supplierPIC: new FormControl(''),
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
    additionalClauses: new FormArray([]),
    notes: new FormControl(''),
    // Menentukan siapa menanggung risiko atas alat selama masa sewa.
    // Sewa tanpa operator adalah pola yang selama ini dipakai, jadi itu
    // yang menjadi bawaan.
    operatorByVendor: new FormControl(false),
    // Hasil negosiasi per vendor; bawaannya penyedia alat.
    equipmentRiskBearer: new FormControl('kedua', Validators.required),
    // Hanya dipakai bila ada baris sewa bersatuan jam.
    quotaPeriodDays: new FormControl(30, [Validators.min(1)]),
    excessHourRate: new FormControl(0),
    rentals: new FormArray([]),
    includePPN: new FormControl(true),
  });

  get f() {
    return this.formGroup.controls;
  }
  get t() {
    return this.formGroup.get('rentals') as FormArray;
  }
  getFormGroupAt(i: number) {
    return this.t.at(i) as FormGroup;
  }
  removeAt(i: number) {
    this.t.removeAt(i);
  }

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
      .open(EquipmentSelectorComponent, {
        width: '560px',
        maxWidth: '94vw',
        autoFocus: false,
      })
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

  templateVersion = latestClauseVersion('B');

  /*
   * Termin memakai kode baku, seragam dengan PO lain. Kalimat termin pada
   * klausul dipilih berdasarkan kode ini; teks bebas tidak cocok dengan satu
   * pun cabangnya.
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

  /**
   * Ada baris sewa yang dihitung per jam.
   *
   * Disimpulkan dari satuan yang benar-benar dipakai, bukan pilihan
   * terpisah, agar klausul hourmeter tidak mungkin berbeda dari dasar
   * perhitungan yang ditagihkan.
   */
  rentalCategories = [
    { value: 'alat-berat', label: 'Alat berat (excavator, crane, bor)' },
    { value: 'kendaraan', label: 'Kendaraan (mobil, motor, truk)' },
    { value: 'umum', label: 'Perlengkapan lain (scaffolding, genset, dll)' },
  ];

  riskBearers = [
    { value: 'kedua', label: 'PIHAK KEDUA (vendor pemilik alat)' },
    { value: 'pertama', label: 'PIHAK PERTAMA (AKN)' },
  ];

  get rentalByHour(): boolean {
    return this.t.controls.some(
      (c) => String(c.getRawValue().unit || '').toLowerCase() === 'jam',
    );
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
      .map((c) => (c || '').trim())
      .filter((c) => c.length > 0);
  }

  /**
   * Konteks klausul; dipakai bersama pratinjau dan pencetakan.
   *
   * Satu sumber untuk keduanya — sebelumnya pratinjau merakit konteksnya
   * sendiri dan ketinggalan saat field baru ditambahkan, sehingga tempo
   * kredit tercetak 0 padahal sudah diisi.
   */
  /** Keterangan periode dan lokasi untuk satu baris sewa. */
  private periodeLokasi(x: any): string {
    const bagian: string[] = [];
    const mulai = this.tanggalPanjang(x.fromDate);
    const selesai = this.tanggalPanjang(x.toDate);
    if (mulai && selesai) bagian.push(`${mulai} s/d ${selesai}`);
    else if (mulai) bagian.push(`Mulai ${mulai}`);
    if (x.location) bagian.push(String(x.location));
    return bagian.join(' · ');
  }

  /** Tanggal dalam penulisan panjang, mis. "1 September 2026". */
  private tanggalPanjang(nilai: any): string {
    if (!nilai) return '';
    const d = new Date(nilai);
    return isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
  }

  /**
   * Jenis dokumen berubah.
   *
   * Cakupan harga pengangkutan disetel mengikuti jenisnya, bukan dikunci:
   * yang lazim boleh berbeda dari yang disepakati, dan penggunanya tetap
   * dapat mengubahnya setelah itu.
   */
  onPurchaseTypeChange(): void {
    this.formGroup
      .get('includeTransportCoverage')
      ?.setValue(this.formGroup.get('purchaseType')?.value === 'A');
  }

  get isTipeA(): boolean {
    return this.formGroup.get('purchaseType')?.value === 'A';
  }

  private clauseContext() {
    const v = this.formGroup.getRawValue();
    return {
      paymentTerm: v.paymentTerm,
      creditTerm: v.creditTerm,
      prepaidTerm: v.prepaidTerm,
      operatorByVendor: !!v.operatorByVendor,
      rentalCategory: v.rentalCategory,
      includeTransportCoverage: !!v.includeTransportCoverage,
      equipmentRiskBearer: v.equipmentRiskBearer,
      rentalByHour: this.rentalByHour,
      quotaPeriodDays: this.rentalByHour ? v.quotaPeriodDays : null,
      excessHourRate: this.rentalByHour
        ? Number(String(v.excessHourRate ?? '').replace(/[^\d.-]/g, '')) || 0
        : 0,
    };
  }

  /**
   * Ketentuan baku yang akan tercetak, ditampilkan sejak awal.
   *
   * Dirakit dari template yang sama dengan pencetakan, sehingga yang terbaca
   * di layar tidak mungkin berbeda dari yang keluar di dokumen.
   */
  get clausePreview(): (string | string[])[] {
    return buildClauseLines(
      'B',
      this.clauseContext(),
      this.templateVersion,
      this.additionalClauseValues,
    );
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

  get rawTotal(): number {
    return this.t.controls.reduce((acc, _c, i) => acc + this.lineTotal(i), 0);
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
            // Diambil hanya bila terisi; vendor perorangan kerap
            // belum ber-NPWP, dan baris kosong pada dokumen resmi
            // lebih mengganggu daripada tidak ada barisnya.
            supplierNpwp: data.npwp || '',
          });
        }
      });
  }



  private toISO(d: any): string | null {
    return d ? new Date(d).toISOString().split('T')[0] : null;
  }

  formatData() {
    const includePPN = this.formGroup.get('includePPN')?.value;
    const dpp = this.rawTotal;
    const ppn = includePPN ? 11 : 0;
    const projectCode = this.formGroup.get('projectName')?.value;
    return {
      date: this.toISO(this.formGroup.get('date')?.value),
      supplierID: this.formGroup.get('supplierID')?.value,
      purchaseType: this.formGroup.get('purchaseType')?.value || 'B',
      projectName: projectCode,
      projectCode: projectCode,
      name: '',
      dpp: dpp,
      ppn: ppn,
      payment_term: this.formGroup.get('paymentTerm')?.value,
      templateVersion: this.templateVersion,
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
          remarks_2: this.toISO(x.toDate), // sampai tanggal
          remarks_3: x.location, // lokasi kerja
        };
      }),
      customData: {
        /*
         * Penanda bahwa dokumen ini berasal dari formulir sewa alat.
         *
         * PO-B dapat diterbitkan sebagai tipe A ketika alatnya dipakai untuk
         * mengangkut. Yang tersimpan pada kolom `purchaseType` adalah 'A',
         * sehingga saat dibuka kembali dokumennya dikira jasa transportasi
         * dan klausulnya berganti — padahal isian, tabel, dan ketentuannya
         * seluruhnya milik sewa alat.
         *
         * Penanda ini yang menentukan, bukan kode jenisnya.
         */
        formOrigin: 'B',
        rentalCategory: this.formGroup.get('rentalCategory')?.value,
        includeTransportCoverage:
          this.formGroup.get('includeTransportCoverage')?.value ?? false,
        // Hanya data sumber. Poin perjanjian dirakit ulang dari
        // templateVersion + data ini, tidak disimpan sebagai teks.
        paymentTerm: this.formGroup.get('paymentTerm')?.value,
        creditTerm: this.formGroup.get('creditTerm')?.value,
        prepaidTerm: this.formGroup.get('prepaidTerm')?.value,
        operatorByVendor: this.formGroup.get('operatorByVendor')?.value,
        equipmentRiskBearer: this.formGroup.get('equipmentRiskBearer')?.value,
        rentalByHour: this.rentalByHour,
        quotaPeriodDays: this.rentalByHour
          ? Number(this.formGroup.get('quotaPeriodDays')?.value) || 30
          : null,
        excessHourRate: this.rentalByHour
          ? Number(
              String(this.formGroup.get('excessHourRate')?.value ?? '').replace(
                /[^\d.-]/g,
                '',
              ),
            ) || 0
          : 0,
        additionalClauses: this.additionalClauseValues,
      },
    };
  }

  /** Susun data cetak SPK dari isian form (klausul dirakit di helper). */
  private buildPrintData(purchaseOrderName: string) {
    const v = this.formGroup.getRawValue();
    return {
      purchaseOrderName,
      date: v.date,
      projectName: v.projectName,
      supplierName: v.supplierName,
      supplierPrefix: v.supplierPrefix,
      supplierAddress: v.supplierAddress,
      supplierCity: v.supplierCity,
      supplierNpwp: v.supplierNpwp,
      supplierPIC: v.supplierPIC,
      items: this.t.controls.map((c) => {
        const x = c.getRawValue();
        return {
          name: x.name,
          // Periode dan lokasi dicetak di bawah nama alat.
          //
          // Sebelumnya keduanya tidak pernah sampai ke dokumen: klausul
          // memang menyebut kewajiban selama masa sewa, tetapi tidak satu
          // pun menyebut tanggalnya — sehingga dokumen yang terbit tidak
          // menyatakan sampai kapan alat itu disewa.
          remarks: this.periodeLokasi(x),
          quantity: x.unit === 'LS' ? 1 : Number(x.quantity) || 0,
          unit: x.unit,
          price: Number(x.price) || 0,
        };
      }),
      includePpn: !!v.includePPN,
      templateVersion: this.templateVersion,
      /*
       * Lembar penagihan mengikuti bentuk pekerjaannya.
       *
       * Pada pengangkutan tidak ada periode pekan, hour meter, maupun
       * Certificate of Payment — yang membuktikan pekerjaan adalah time sheet
       * yang ditandatangani di lapangan. Memakai lembar sewa alat di situ
       * membuat vendor diminta dokumen yang memang tidak pernah ada.
       */
      billingTerms: this.isTipeA
        ? buildTransportRentalBillingTerms()
        : buildEquipmentRentalBillingTerms(isTempoTerm(v.paymentTerm)),
      billingTitle: 'TATA CARA PENAGIHAN DAN PEMBAYARAN\nPENYEWAAN ALAT KERJA',
      clauseContext: this.clauseContext(),
      additionalClauses: this.additionalClauseValues,
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
          // Buka PDF-nya; gagal cetak tidak membatalkan SPK yang tersimpan.
          try {
            printPurchaseOrderB(
              this.buildPrintData(res?.purchase_order_name ?? ''),
            );
          } catch (e) {
            console.error('Gagal membuat PDF surat perintah kerja:', e);
          }

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
