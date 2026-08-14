import { Component, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
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
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ApiService } from '../../../../services/api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import {
  buildClauseHtml,
  buildClauseLines,
  latestClauseVersion,
} from '../../../../constants/clause-templates';
import { printPurchaseOrderG } from '../../../../helpers/purchase-order-g.helper';
import { printPurchaseOrderB } from '../../../../helpers/purchase-order-b.helper';
import { MatRadioModule } from '@angular/material/radio';
import { ProjectSelectorComponent } from '../../../../components/project-selector/project-selector.component';
import { tanggalLokal } from '../../../../utils/tanggal';
import { firstValueFrom } from 'rxjs';
import { PurchaseOrderViewComponent } from '../../../../pages/purchase-order/purchase-order-view/purchase-order-view.component';

@Component({
  selector: 'app-purchase-order-create-f',
  providers: [provideNgxMask()],
  imports: [
    ProjectSelectorComponent,
    ClauseLineComponent,
    MatRadioModule,
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
    MatSlideToggleModule,
    MatCheckboxModule,
    NgxMaskDirective,
  ],
  templateUrl: './purchase-order-create-f.component.html',
  styleUrl: './purchase-order-create-f.component.scss',
})
export class PurchaseOrderCreateFComponent {
  private readonly translate = inject(TranslateService);

  /**
   * Satuan berubah pada satu baris.
   *
   * Untuk satuan borongan (LS), volumenya dikunci pada 1. Nilainya memang
   * selalu dihitung satu saat menjumlahkan, sehingga membiarkan kolomnya
   * dapat diisi berarti menawarkan angka yang diabaikan diam-diam — dan yang
   * mengisinya baru sadar setelah totalnya tidak sesuai harapan.
   */
  onUnitChange(i: number): void {
    const g = this.getFormGroupAt(i);
    const qty = g.get('quantity');
    if (String(g.get('unit')?.value || '').toUpperCase() === 'LS') {
      qty?.setValue(1);
      qty?.disable();
    } else {
      qty?.enable();
    }
  }

  // ---- termin pembayaran ----
  //
  // Kolom kredit dan uang muka dikunci bila terminnya tidak memakainya:
  // angka yang tertinggal di sana ikut tersimpan dan tercetak, padahal
  // ketentuannya tidak menyebut tempo sama sekali.
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

    if (this.creditEnabled) credit?.enable();
    else {
      credit?.setValue(0);
      credit?.disable();
    }

    if (this.prepaidEnabled) prepaid?.enable();
    else {
      prepaid?.setValue(0);
      prepaid?.disable();
    }
  }
  /** Kode jenis PO, dipakai pada pill di kepala halaman. */
  get typeCode(): string {
    return 'F';
  }

  /** Nama jenis PO, dipakai pada pill di kepala halaman. */
  get typeLabel(): string {
    return purchaseTypeLabel(this.translate, 'F');
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
  ) {
    /*
     * Kewajiban `deliveryMethod` mengikuti jenis materialnya.
     *
     * Pada jasa pengujian, bagian pengiriman diganti bagian benda uji dan
     * kolom moda pengiriman TIDAK ditampilkan — sementara validatornya tetap
     * berlaku. Akibatnya formulir selamanya tidak sah: tombol Buat mati,
     * tanpa satu pun kolom merah yang bisa dilihat penggunanya.
     *
     * Kolomnya tidak sekadar dilepas dari `required`, karena pada pengadaan
     * beton dan besi moda pengiriman memang wajib. Yang berubah adalah
     * kewajibannya, bukan kolomnya.
     */
    this.formGroup
      .get('materialType')
      ?.valueChanges.subscribe(() => this.selaraskanValidasi());
    this.selaraskanValidasi();
  }

  /** Sesuaikan validator yang bergantung pada jenis material. */
  private selaraskanValidasi(): void {
    const moda = this.formGroup.get('deliveryMethod');
    if (!moda) return;

    if (this.isTestService) {
      moda.clearValidators();
      // Dikosongkan agar tidak terbawa ke dokumen sebagai moda yang tidak
      // pernah dipilih penggunanya.
      moda.setValue('', { emitEvent: false });
    } else {
      moda.setValidators(Validators.required);
    }
    moda.updateValueAndValidity({ emitEvent: false });
  }

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
    purchaseType: new FormControl('F'),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierPrefix: new FormControl(''),

    supplierNpwp: new FormControl(''),
    supplierCity: new FormControl(''),
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
    // auto-surfaced clause when a steel ("besi") item is in the order
    // Beton dan material lain memakai rangkaian klausul yang berbeda
    materialType: new FormControl('beton', Validators.required),
    // opsional: hanya dicetak bila diisi
    deliveryDate: new FormControl(''),
    paymentDueDate: new FormControl(''),
    // khusus jasa uji tekan silinder
    sampleCount: new FormControl(0, [Validators.min(0)]),
    testUnitPrice: new FormControl(0, [Validators.min(0)]),
    testReportDays: new FormControl(0, [Validators.min(0)]),
    sampleHandover: new FormControl(''),
    additionalClauses: new FormArray([]),
    steelTestRequired: new FormControl(true),
    // Ketentuan uji kuat tekan beton. Bila dimatikan, poinnya tetap tercetak
    // dalam keadaan tercoret agar terlihat sengaja tidak dipakai.
    concreteTestRequired: new FormControl(true),
    concreteTestCostBearer: new FormControl('pembeli'),
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

  /** True when any line item looks like steel ("besi") — drives the mill-test clause. */
  get hasSteelItem(): boolean {
    return (this.t.value || []).some((x: any) =>
      `${x?.description ?? ''} ${x?.sku ?? ''}`.toLowerCase().includes('besi'),
    );
  }

  get steelTestClause(): string {
    return 'Supplier wajib menyediakan hasil uji material (mill certificate / uji tarik) untuk seluruh material besi yang dikirim.';
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
        data: { purchaseType: 'F' },
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
          this.snackBar.open(
      this.translate.instant('notify.alreadyInList'), 'Close', {
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
            supplierPrefix: data.prefix,
            // Diambil hanya bila terisi; vendor perorangan kerap
            // belum ber-NPWP, dan baris kosong pada dokumen resmi
            // lebih mengganggu daripada tidak ada barisnya.
            supplierNpwp: data.npwp || '',
            supplierCity: [data.city, data.province]
              .filter((x: string) => !!x)
              .join(', '),
            supplierAddress: data.address,
          });
        }
      });
  }

  templateVersion = latestClauseVersion('F');

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

  /** Data sumber klausul — kalimatnya dirakit dari template. */
  private clauseContext() {
    const v = this.formGroup.getRawValue();
    return {
      materialType: v.materialType,
      deliveryDate: v.deliveryDate,
      paymentDueDate: v.paymentDueDate,
      sampleCount: v.sampleCount,
      testReportDays: v.testReportDays,
      sampleHandover: v.sampleHandover,
      // Hanya relevan untuk besi; bila tidak dicentang, poin ujinya tetap
      // dicetak namun dicoret (bukan dihilangkan).
      materialTestRequired: !!v.steelTestRequired,
      concreteTestRequired: !!v.concreteTestRequired,
      concreteTestCostBearer: v.concreteTestCostBearer,
      paymentTerm: v.paymentTerm,
      creditTerm: v.creditTerm,
      prepaidTerm: v.prepaidTerm,
      deliveryMethod: v.deliveryMethod,
      deliveryAddress: v.deliveryAddress,
      supplierPICName: v.supplierPICName,
      supplierPICPhoneNumber: v.supplierPICPhoneNumber,
      officePICName: v.officePICName,
      officePICPhoneNumber: v.officePICPhoneNumber,
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
      'F',
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

  /**
   * Jasa uji tekan silinder bukan pembelian barang, sehingga dokumennya
   * dicetak sebagai Surat Perintah Kerja, bukan Purchase Order.
   */
  get isTestService(): boolean {
    const v = this.formGroup.get('materialType')?.value;
    return v === 'ujitekan' || v === 'ujibesi';
  }

  /** Judul pekerjaan pada rincian SPK, mengikuti jenis pengujian. */
  get testItemName(): string {
    return this.formGroup.get('materialType')?.value === 'ujibesi'
      ? 'Pengujian tarik dan tekuk besi tulangan'
      : 'Pengujian kuat tekan silinder beton';
  }

  /** Susun data cetak dari isian form. */
  private buildPrintData(purchaseOrderName: string) {
    const v = this.formGroup.getRawValue();
    return {
      poType: 'F',
      purchaseOrderName,
      date: v.date,
      projectName: v.projectName,
      supplierName: v.supplierName,
      supplierPrefix: v.supplierPrefix,
      supplierAddress: v.supplierAddress,
      supplierNpwp: v.supplierNpwp,
      supplierCity: v.supplierCity,
      // Jasa uji tidak memakai katalog barang: satu baris dibentuk dari
      // jumlah benda uji dan harga per benda uji.
      items: this.isTestService
        ? [
            {
              name: this.testItemName,
              quantity: Number(v.sampleCount) || 0,
              unit: 'benda uji',
              price: Number(v.testUnitPrice) || 0,
            },
          ]
        : this.t.controls.map((c) => {
            const x = c.getRawValue();
            return {
              name: x.description || x.sku || '',
              quantity: Number(x.quantity) || 0,
              unit: x.unit,
              price: Number(x.price) || 0,
              // Catatan per baris ikut dicetak di bawah nama barang.
              remarks: x.remarks,
            };
          }),
      includePpn: !!v.includePPN,
      templateVersion: this.templateVersion,
      clauseContext: this.clauseContext(),
      additionalClauses: this.additionalClauseValues,
    };
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
      date: tanggalLokal(this.formGroup.get('date')?.value),
      supplierID: this.formGroup.get('supplierID')?.value,
      purchaseType: this.formGroup.get('purchaseType')?.value,
      projectName: projectCode,
      projectCode: projectCode,
      name: '',
      dpp: dpp,
      ppn: ppn,
      payment_term: this.formGroup.get('paymentTerm')?.value,
      templateVersion: this.templateVersion,
      billing_requirements: {},
      // Baris item PO. Tanpa ini `purchase_order_items` tidak pernah terisi,
      // sehingga dokumen yang dicetak ulang kehilangan seluruh daftar barang.
      // Jasa uji tidak memakai katalog barang: satu baris dibentuk dari
      // jumlah benda uji dan harga per benda uji.
      items: this.isTestService
        ? [
            {
              // Jasa uji: satu baris dari jumlah benda uji × harga per uji.
              task: this.testItemName,
              quantity: Number(this.formGroup.get('sampleCount')?.value) || 0,
              unit: 'benda uji',
              price: Number(this.formGroup.get('testUnitPrice')?.value) || 0,
            },
          ]
        : this.t.controls.map((c) => {
            const x = c.getRawValue();
            return {
              item_id: x.item_id,
              // Nama barang tidak disalin: sudah tersimpan di
              // master_item dan diambil lewat item_id saat dibaca.
              // Menyalinnya berarti dokumen menyimpan nama yang bisa
              // berbeda dari katalognya, dan nama panjang melampaui
              // batas kolomnya.
              task: null,
              quantity: x.unit === 'LS' ? 1 : x.quantity,
              price: x.price,
              unit: x.unit,
              remarks_1: x.remarks,
              remarks_2: x.sku,
            };
          }),
      customData: {
        materialType: this.formGroup.get('materialType')?.value,
        deliveryDate: this.formGroup.get('deliveryDate')?.value,
        sampleCount: Number(this.formGroup.get('sampleCount')?.value) || 0,
        testUnitPrice: Number(this.formGroup.get('testUnitPrice')?.value) || 0,
        testReportDays:
          Number(this.formGroup.get('testReportDays')?.value) || 0,
        sampleHandover: this.formGroup.get('sampleHandover')?.value,
        paymentDueDate: this.formGroup.get('paymentDueDate')?.value,
        materialTestRequired: !!this.formGroup.get('steelTestRequired')?.value,
        concreteTestRequired: !!this.formGroup.get('concreteTestRequired')
          ?.value,
        concreteTestCostBearer: this.formGroup.get('concreteTestCostBearer')
          ?.value,
        additionalClauses: this.additionalClauseValues,
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
        // steel (besi) mill-test clause — only meaningful when a steel item exists
        steelTestRequired: this.hasSteelItem
          ? !!this.formGroup.get('steelTestRequired')?.value
          : false,
        steelTestClause: this.hasSteelItem ? this.steelTestClause : null,
      },
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
      name: this.translate.instant('poForm.draftNotIssued'),
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
    this.apiService
      .post('purchase-orders', this.formatData())
      .subscribe({
        next: (res: any) => {
          this.snackBar.open(
            `Purchase order ${res?.purchase_order_name ?? ''} berhasil dibuat`,
            'Close',
            { duration: 3000 },
          );
          try {
            const printData = this.buildPrintData(
              res?.purchase_order_name ?? '',
            );
            if (this.isTestService) {
              printPurchaseOrderB(printData);
            } else {
              printPurchaseOrderG(printData);
            }
          } catch (e) {
            console.error('Gagal membuat PDF purchase order:', e);
          }

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
