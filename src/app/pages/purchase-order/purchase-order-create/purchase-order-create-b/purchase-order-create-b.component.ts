import { Component, inject, OnInit } from '@angular/core';
import { ClauseLineComponent } from '../../../../components/clause-line/clause-line.component';
import { PurchaseOrderTypeSwitcher } from '../../../../services/purchase-order-type-switcher.service';
import { purchaseTypeLabel } from '../../../../constants/purchase-type-label.constant';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
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
import { EquipmentSelectorComponent } from '../../../../components/equipment-selector/equipment-selector.component';
import { MasterItemSelectorComponent } from '../../../../components/master-item-selector/master-item-selector.component';
import { HeaderTitleComponent } from '../../../../components/header-title/header-title.component';
import { WysiwygComponent } from '../../../../components/wysiwyg/wysiwyg.component';
import { ApiService } from '../../../../services/api.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  buildClauseHtml,
  buildClauseLines,
  buildEquipmentRentalBillingTerms,
  buildTransportRentalBillingTerms,
  latestClauseVersion,
} from '../../../../constants/clause-templates';
import {
  printPurchaseOrderB,
  perluasItemMobilisasi,
} from '../../../../helpers/purchase-order-b.helper';
import { isTempoTerm } from '../../../../helpers/purchase-order-shared.helper';
import { ProjectSelectorComponent } from '../../../../components/project-selector/project-selector.component';
import { tanggalLokal } from '../../../../utils/tanggal';
import { firstValueFrom } from 'rxjs';
import { PurchaseOrderViewComponent } from '../../../../pages/purchase-order/purchase-order-view/purchase-order-view.component';
import { AdendumService } from '../../../../services/adendum.service';
import { PphSelectorComponent } from '../../../../components/pph-selector/pph-selector.component';
import { SupplierTerkunciComponent } from '../../../../components/supplier-terkunci/supplier-terkunci.component';


/**
 * Satu baris sewa harus punya SUMBER: alat sewa atau barang katalog.
 *
 * Ditulis sebagai validator kelompok, bukan `required` pada masing-masing:
 * keduanya memang boleh kosong sendiri-sendiri, yang tidak boleh adalah
 * kosong berdua. Tanpa ini, baris tanpa sumber lolos dan tersimpan sebagai
 * sewa yang tidak merujuk apa pun.
 */
function validatorSumberSewa(g: AbstractControl): ValidationErrors | null {
  const alat = g.get('equipment_id')?.value;
  const barang = g.get('item_id')?.value;
  return alat || barang ? null : { sumberSewaKosong: true };
}


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
    TextFieldModule,
    NgxMaskDirective,
    HeaderTitleComponent,
    SupplierTerkunciComponent,
  ],
  templateUrl: './purchase-order-create-b.component.html',
  styleUrl: './purchase-order-create-b.component.scss',
})
export class PurchaseOrderCreateBComponent implements OnInit {
  private readonly translateSvc = inject(TranslateService);

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
    return 'B';
  }

  /** Nama jenis PO, dipakai pada pill di kepala halaman. */
  get typeLabel(): string {
    return purchaseTypeLabel(this.translateSvc, 'B');
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

  isSubmitting = false;
  /*
   * `shift` berdiri sendiri, bukan disamakan dengan `hari`.
   *
   * Satu hari kerja dapat berisi lebih dari satu shift, dan panjang shiftnya
   * disepakati per dokumen — bukan angka baku. Menyamakannya dengan hari
   * membuat kuota jam yang disepakati tidak punya tempat untuk dicatat.
   */
  units: string[] = ['jam', 'shift', 'hari', 'bulan', 'LS'];

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

    /*
     * PPh atas sewa alat.
     *
     * Sewa alat berat termasuk jasa, sehingga dipotong PPh — berbeda dari
     * pembelian barang seperti beton dan besi, yang tidak.
     *
     * Tidak wajib diisi: sebagian vendor berstatus yang membuat pemotongan
     * tidak berlaku, dan memaksakannya membuat dokumen yang benar tidak
     * dapat diterbitkan.
     */
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0),
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
    /*
     * Sewa berdurasi singkat — biasanya satu shift.
     *
     * Menyesuaikan lima ketentuan yang hanya berlaku pada penyewaan
     * berhari-hari: pelaporan BBM, mekanik yang didatangkan, tenggat
     * perbaikan dua hari, berita acara serah terima, dan koordinasi
     * bongkar-muat.
     */
    shortTermRental: new FormControl(false),
    // Hasil negosiasi per vendor; bawaannya penyedia alat.
    equipmentRiskBearer: new FormControl('kedua', Validators.required),
    // Hanya dipakai bila ada baris sewa bersatuan jam.
    quotaPeriodDays: new FormControl(30, [Validators.min(1)]),
    excessHourRate: new FormControl(0),
    /*
     * Panjang satu shift, dalam jam. Hanya dipakai bila ada baris bersatuan
     * shift.
     *
     * Ditanyakan karena tidak ada angka bakunya: delapan jam lazim, tetapi
     * pekerjaan boredpile kerap memakai sepuluh atau dua belas. Tanpa
     * disepakati tertulis, kelebihan pemakaian tidak dapat dihitung.
     */
    jamPerShift: new FormControl(8, [Validators.min(1)]),
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

  /**
   * Satu baris sewa, dari alat MAUPUN barang katalog.
   *
   * Yang disewa tidak selalu alat berat: kadang genset kecil, scaffolding,
   * atau perlengkapan yang memang terdaftar sebagai barang. Karena itu
   * `equipment_id` dan `item_id` sama-sama boleh kosong — yang wajib adalah
   * SALAH SATUNYA terisi, dan itu dijaga `validatorSumber` di bawah.
   *
   * Keduanya disimpan pada kolomnya masing-masing, bukan digabung menjadi
   * satu kolom bertipe: laporan yang menelusuri pemakaian alat membaca
   * `equipment_id`, dan menaruh id barang di sana membuat alat yang tidak
   * pernah ada muncul di laporannya.
   */
  private buildRental(sumber: any, dariKatalog = false): FormGroup {
    return this.formBuilder.group(
      {
      equipment_id: [dariKatalog ? null : sumber.id],
      item_id: [dariKatalog ? sumber.id : null],
      name: [dariKatalog ? sumber.description : sumber.name],
      category: [dariKatalog ? sumber.brand || '' : sumber.category],
      capacity: [dariKatalog ? sumber.type || '' : sumber.capacity],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unit: [sumber.unit || 'hari', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      fromDate: ['', Validators.required],
      toDate: ['', Validators.required],
      location: ['', Validators.required],
      /*
       * Mobilisasi dan demobilisasi, melekat pada ALATNYA.
       *
       * Bukan baris tersendiri: tiap baris sewa mewajibkan tanggal mulai,
       * tanggal selesai, dan lokasi — sedangkan mobilisasi bukan periode
       * sewa dan tidak punya ketiganya. Sebagai baris, yang mengisi
       * terpaksa mengarang tanggal supaya formulirnya sah.
       *
       * Melekat pada barisnya juga membuat jelas mobilisasi mana milik alat
       * mana saat menyewa beberapa alat sekaligus.
       *
       * Bawaannya nol: bila biayanya sekali untuk seluruh pengiriman, cukup
       * diisi pada satu baris dan sisanya dibiarkan.
       */
      mobilisasi: [0, Validators.min(0)],
      demobilisasi: [0, Validators.min(0)],
      },
      { validators: validatorSumberSewa },
    );
  }

  /**
   * Tambah baris sewa dari KATALOG BARANG.
   *
   * Pemilihnya terpisah dari pemilih alat, bukan satu dialog bergabung:
   * keduanya menyaring dari daftar yang berbeda, dan menggabungkannya
   * membuat pencarian menampilkan alat berat berdampingan dengan sekrup.
   */
  openItemSelector() {
    this.dialog
      .open(MasterItemSelectorComponent, {
        data: { purchaseType: 'B' },
        width: '560px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((item) => {
        if (!item) return;
        const ada = this.t.value.some((x: any) => x.item_id === item.id);
        if (ada) {
          this.snackBar.open(
            this.translateSvc.instant('notify.alreadyInList'),
            'Close',
            { duration: 2500 },
          );
          return;
        }
        this.t.push(this.buildRental(item, true));
      });
  }

  /**
   * Satu baris sewa yang berasal dari DOKUMEN, bukan dari katalog.
   *
   * `buildRental` menerima objek katalog — alat atau barang — dan mengisi
   * sisanya dengan nilai bawaan. Memakainya untuk memuat dokumen lama
   * membuat harga, tanggal, lokasi, dan mobilisasi tetap nol: bidang itu
   * memang tidak ada pada katalog, sehingga tidak pernah terbaca.
   *
   * Nilainya diambil dari kolom penyimpanannya masing-masing — periode dan
   * lokasi menumpang pada `remarks_1..3`, mobilisasi pada `remarks_4` dan
   * `remarks_5`.
   */
  private barisDariDokumen(x: any): FormGroup {
    const g = this.buildRental(
      {
        id: x?.equipment_id ?? x?.item_id ?? null,
        name: x?.equipment_name ?? x?.item_description ?? x?.task ?? '',
        description: x?.item_description ?? x?.task ?? '',
        unit: x?.unit ?? 'hari',
      },
      !x?.equipment_id && !!x?.item_id,
    );

    g.patchValue({
      equipment_id: x?.equipment_id ?? null,
      item_id: x?.item_id ?? null,
      name: x?.equipment_name ?? x?.item_description ?? x?.task ?? '',
      // Volume dikosongkan pada ADENDUM, disalin pada koreksi.
      //
      // Adendum berisi selisih; menyalin volume induk membuat yang mengisi
      // tinggal menekan simpan dan menggandakan seluruh sewanya.
      quantity: this.isUbah ? Number(x?.quantity) || 0 : null,
      unit: x?.unit ?? 'hari',
      price: Number(x?.price) || 0,
      fromDate: x?.remarks_1 ?? '',
      toDate: x?.remarks_2 ?? '',
      location: x?.remarks_3 ?? '',
      mobilisasi: Number(x?.remarks_4) || 0,
      demobilisasi: Number(x?.remarks_5) || 0,
    });
    return g;
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
    // Mobilisasi dan demobilisasi ikut nilai barisnya, dan karena itu ikut
    // DPP — sehingga ikut kena PPN seperti nilai sewa lainnya.
    return (
      (Number(g.price) || 0) * (Number(g.quantity) || 0) +
      (Number(g.mobilisasi) || 0) +
      (Number(g.demobilisasi) || 0)
    );
  }

  /** Nilai sewa saja, tanpa mobilisasi; dipakai rincian di layar. */
  lineSewa(i: number): number {
    const g = this.getFormGroupAt(i).getRawValue();
    return (Number(g.price) || 0) * (Number(g.quantity) || 0);
  }

  /** Total mobilisasi ditambah demobilisasi pada satu baris. */
  lineMobilisasi(i: number): number {
    const g = this.getFormGroupAt(i).getRawValue();
    return (Number(g.mobilisasi) || 0) + (Number(g.demobilisasi) || 0);
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
  /*
   * Label memakai kunci i18n; yang disimpan tetap `value`.
   *
   * Pemisahan itu penting: klausul dokumen membaca `value` ('alat-berat'),
   * bukan labelnya. Jadi menerjemahkan label TIDAK mengubah isi SPK — yang
   * berubah hanya yang terbaca di layar.
   *
   * Berbeda dari nilai mat-option pada slip gaji, yang justru menyimpan
   * teksnya sendiri dan karena itu tidak boleh diterjemahkan.
   */
  private readonly SEMUA_KATEGORI = [
    { value: 'alat-berat', key: 'poB.catHeavy' },
    { value: 'kendaraan', key: 'poB.catVehicle' },
    { value: 'umum', key: 'poB.catOther' },
  ];

  /**
   * Jenis barang yang boleh dipilih.
   *
   * Ketika SPK ini terbit sebagai tipe A, yang disewa adalah alat yang
   * mengangkat atau memindahkan — forklift, crane, excavator. Scaffolding
   * dan genset tidak pernah disewa lewat jalur itu, dan menampilkannya
   * hanya membuka kemungkinan dokumen terbit dengan jenis yang keliru.
   */
  /**
   * Jenis barang yang boleh dipilih.
   *
   * Pada SPK tipe A yang disewa adalah yang mengangkat atau mengangkut —
   * alat berat dan kendaraan. Scaffolding, genset, dan perlengkapan lain
   * tidak pernah terbit lewat jalur itu.
   */
  get rentalCategories() {
    return this.isTipeA
      ? this.SEMUA_KATEGORI.filter((c) =>
          ['alat-berat', 'kendaraan'].includes(c.value),
        )
      : this.SEMUA_KATEGORI;
  }

  /*
   * Sama seperti kategori: klausul menyusun sendiri kalimat "PIHAK
   * PERTAMA"/"PIHAK KEDUA" dari `value`, sehingga label di sini hanya
   * dibaca pengguna dan aman mengikuti bahasa aplikasi.
   */
  riskBearers = [
    { value: 'kedua', key: 'poB.riskSecond' },
    { value: 'pertama', key: 'poB.riskFirst' },
  ];

  get rentalByHour(): boolean {
    return this.t.controls.some(
      (c) => String(c.getRawValue().unit || '').toLowerCase() === 'jam',
    );
  }

  /**
   * Ada baris sewa yang dihitung per shift.
   *
   * Disimpulkan dari satuan yang benar-benar dipakai, bukan pilihan
   * terpisah — sama seperti `rentalByHour`, agar klausul yang tercetak tidak
   * mungkin berbeda dari dasar perhitungan yang ditagihkan.
   */
  get rentalByShift(): boolean {
    return this.t.controls.some(
      (c) => String(c.getRawValue().unit || '').toLowerCase() === 'shift',
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
    const tipeA = this.formGroup.get('purchaseType')?.value === 'A';
    this.formGroup.get('includeTransportCoverage')?.setValue(tipeA);

    if (!tipeA) return;

    /*
     * Jenis barang dibetulkan bila tidak lagi tersedia.
     *
     * Berpindah ke tipe A setelah memilih scaffolding menyisakan nilai yang
     * tidak ada pada daftarnya — kolomnya tampak kosong, tetapi yang
     * tersimpan masih pilihan lama dan klausulnya ikut yang lama.
     */
    const kategori = this.formGroup.get('rentalCategory');
    if (!['alat-berat', 'kendaraan'].includes(kategori?.value)) {
      kategori?.setValue('alat-berat');
    }

    /*
     * Operator dari vendor dinyalakan sendiri.
     *
     * Forklift atau crane yang disewa untuk memuat barang selalu datang
     * bersama operatornya — AKN tidak menyediakan operator alat berat.
     * Tetap dapat dimatikan bila memang alatnya saja yang disewa.
     */
    this.formGroup.get('operatorByVendor')?.setValue(true);
  }

  /**
   * Sebutan barang sewaan, mengikuti kategorinya.
   *
   * Dipakai pada judul lembar tata cara penagihan. Judul yang dipatok
   * "ALAT KERJA" membuat dokumen sewa truk berjudul salah — dan judul itu
   * yang dibaca lebih dulu oleh vendor maupun bagian keuangan.
   *
   * Sejalan dengan istilah yang dipakai klausulnya, sehingga judul dan isi
   * dokumen tidak menyebut hal yang sama dengan dua nama berbeda.
   */
  get istilahBarang(): string {
    switch (this.formGroup.get('rentalCategory')?.value) {
      case 'kendaraan':
        return 'kendaraan';
      case 'umum':
        return 'perlengkapan';
      default:
        return 'alat kerja';
    }
  }

  get isTipeA(): boolean {
    return this.formGroup.get('purchaseType')?.value === 'A';
  }

  private clauseContext() {
    const v = this.formGroup.getRawValue();
    return {
      // Sewa kendaraan pada SPK tipe A: sebagian ketentuan alat berat
      // tidak berlaku, dan istilahnya berbeda.
      sewaKendaraan: v.purchaseType === 'A' && v.rentalCategory === 'kendaraan',
      // Hanya berarti saat terbit sebagai tipe A.
      shortTermRental: v.purchaseType === 'A' && !!v.shortTermRental,
      paymentTerm: v.paymentTerm,
      creditTerm: v.creditTerm,
      prepaidTerm: v.prepaidTerm,
      operatorByVendor: !!v.operatorByVendor,
      rentalCategory: v.rentalCategory,
      includeTransportCoverage: !!v.includeTransportCoverage,
      equipmentRiskBearer: v.equipmentRiskBearer,
      rentalByHour: this.rentalByHour,
      /*
       * `undefined`, bukan `null` — sama seperti `shiftHours` di bawah.
       *
       * Keduanya sama-sama dianggap kosong oleh klausulnya, sehingga
       * perilakunya tidak berubah. Yang berubah: bidang ini tidak lagi
       * bergantung pada nilainya kebetulan bertipe `any` untuk lolos
       * pemeriksaan tipe.
       */
      quotaPeriodDays: this.rentalByHour ? v.quotaPeriodDays : undefined,
      excessHourRate: this.rentalByHour
        ? Number(String(v.excessHourRate ?? '').replace(/[^\d.-]/g, '')) || 0
        : 0,
      /*
       * Klausul shift memakai bidang yang SUDAH ADA pada template.
       *
       * `shiftHours` dan `overtimeRate` sebelumnya hanya diisi PO-D dan
       * PO-A; redaksionalnya sudah tersedia dan tidak perlu ditulis ulang.
       * Menulis klausul kedua yang berbunyi sama berarti dua kalimat yang
       * harus diperbaiki bersamaan bila kelak diubah.
       *
       * Dikirim `undefined` saat tidak ada baris bersatuan shift, sehingga
       * dokumen sewa harian tidak ikut memuat ketentuan yang tidak berlaku.
       *
       * `undefined`, bukan `null`: `ClauseContext` menyatakan bidang ini
       * opsional (`number | undefined`), dan `null` bukan nilai yang sah
       * baginya.
       */
      shiftHours: this.rentalByShift
        ? Number(v.jamPerShift) || 0
        : undefined,
      overtimeRate: this.rentalByShift
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
    return d ? tanggalLokal(d) : null;
  }

  /**
   * Pilih kode objek pajak PPh untuk sewa ini.
   *
   * Tarifnya tidak diketik: ia mengikuti kode objek pajak yang dipilih,
   * sehingga angka pada dokumen selalu sejalan dengan kodenya.
   */
  openPphSelector() {
    this.dialog
      .open(PphSelectorComponent, {
        // Jenis PO menentukan kode yang diusulkan lebih dulu.
        data: { purchaseType: 'B' },})
      .afterClosed()
      .subscribe((data: any) => {
        /*
         * "Tanpa PPh" MENGHAPUS pilihan, berbeda dari membatalkan.
         *
         * Keduanya menutup dialog tanpa nilai; tanpa penanda `hapus`,
         * keduanya diperlakukan sebagai batal dan PPh yang terlanjur dipilih
         * tidak pernah bisa dikosongkan lagi.
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
      // Penanda induk bila dokumen ini ADENDUM; server yang
      // menghitung nomor adendumnya.
      parentPurchaseOrderID: this.adendum.indukId ?? undefined,
      name: '',
      dpp: dpp,
      ppn: ppn,
      payment_term: this.formGroup.get('paymentTerm')?.value,
      // PPh dikirim sebagai kolom dokumen, bukan di dalam customData:
      // ketiganya kolom `purchase_orders` yang dibaca laporan pajak.
      pphCode: this.formGroup.get('pphCode')?.value || null,
      pphTaxObject: this.formGroup.get('pphTaxObject')?.value || null,
      pphPercentage: Number(this.formGroup.get('pphPercentage')?.value) || 0,

      templateVersion: this.templateVersion,
      billing_requirements: {},
      // equipment rentals -> purchase_order_items (equipment_id -> master_equipment)
      items: this.t.controls.map((c) => {
        const x = c.getRawValue();
        return {
          equipment_id: x.equipment_id,
          item_id: x.item_id ?? null,
          quantity: x.unit === 'LS' ? 1 : x.quantity,
          price: x.price,
          unit: x.unit,
          remarks_1: this.toISO(x.fromDate), // dari tanggal
          remarks_2: this.toISO(x.toDate), // sampai tanggal
          remarks_3: x.location, // lokasi kerja
          /*
           * Mobilisasi dan demobilisasi ditumpangkan pada kolom `remarks`
           * yang masih kosong, bukan dengan menambah kolom baru.
           *
           * `purchase_order_items` sudah menyediakan enam kolom keterangan
           * dan tiga di antaranya belum terpakai; menambah kolom berarti
           * migrasi basis data untuk dua angka yang hanya dipakai satu
           * varian.
           *
           * Disimpan sebagai TEKS karena kolomnya memang teks — dibaca
           * kembali dengan `Number()` saat mencetak.
           */
          remarks_4: String(Number(x.mobilisasi) || 0), // mobilisasi
          remarks_5: String(Number(x.demobilisasi) || 0), // demobilisasi
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
      // `perluasItemMobilisasi` menyisipkan mobilisasi dan demobilisasi
      // sebagai baris pekerjaan tersendiri, bernomor sendiri.
      items: perluasItemMobilisasi(
        this.t.controls.map((c) => {
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
            remarks_4: String(Number(x.mobilisasi) || 0),
            remarks_5: String(Number(x.demobilisasi) || 0),
          };
        }),
      ),
      includePpn: !!v.includePPN,
      /*
       * Jenis dokumen diteruskan agar kalimat pengantarnya benar.
       *
       * Tanpa ini `workIntroSentence` jatuh ke kalimat umum "untuk melakukan
       * pekerjaan" — padahal PO-B menyewa alat, bukan memesan pekerjaan.
       * Cetak ulang dari daftar sudah mengirimkannya, sehingga dokumen yang
       * sama berbunyi berbeda tergantung dari mana ia dicetak.
       */
      poType: 'B',
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
      billingTitle: `TATA CARA PENAGIHAN DAN PEMBAYARAN\nPENYEWAAN ${this.istilahBarang.toUpperCase()}`,
      clauseContext: this.clauseContext(),
      additionalClauses: this.additionalClauseValues,
    };
  }

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
    /*
     * Mobilisasi dan demobilisasi DIPECAH menjadi baris tersendiri, sama
     * seperti saat dicetak.
     *
     * `formatData()` mengembalikan baris apa adanya, dengan mobilisasi masih
     * menumpang di `remarks_4` dan `remarks_5`. Yang menjumlah — baik
     * pratinjau maupun dokumen — menghitung `quantity * price` per baris,
     * sehingga keduanya tidak pernah ikut selama masih menumpang.
     *
     * Akibatnya pratinjau menampilkan subtotal yang lebih kecil daripada
     * dokumen yang terbit sesudahnya, dan itu justru pada lembar yang
     * dipakai memeriksa sebelum menandatangani.
     */
    const items = perluasItemMobilisasi(
      baris.map((it: any, i: number) => ({
        ...it,
        item_description:
          it.item_description ??
          asal[i]?.description ??
          asal[i]?.name ??
          it.task ??
          asal[i]?.sku ??
          null,
      })),
    );

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
   * SPK mengikat kedua pihak dan tidak dapat diubah setelah terbit. Gagal
   * menyusun dokumen TIDAK meloloskan penerbitan.
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
            printPurchaseOrderB(
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
        error: (error) =>
          this.snackBar.open(
            error?.error?.detail ?? 'Gagal membuat purchase order',
            'Close',
            { duration: 3000 },
          ),
      })
      .add(() => (this.isSubmitting = false));
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
      this.isUbah ? 'poForm.judulUbah' : 'poB.pageTitle',
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
          'rentals',
          this.adendum.barisInduk(induk),
          (x) => this.barisDariDokumen(x),
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
