import {
  TOLERANSI_PEMBULATAN,
  jumlahBaris,
  nilaiBaris,
  nilaiHitung,
  pembulatanSah,
} from '../../../../helpers/nilai-baris.helper';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { volumeValidators } from '../../../../helpers/volume-adendum.helper';
import { Component, inject, OnInit } from '@angular/core';
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
import { ApiService } from '../../../../services/api.service';
import {
  buildClauseHtml,
  buildClauseLines,
  latestClauseVersion,
} from '../../../../constants/clause-templates';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { printPurchaseOrderG } from '../../../../helpers/purchase-order-g.helper';
import { ProjectSelectorComponent } from '../../../../components/project-selector/project-selector.component';
import { tanggalLokal } from '../../../../utils/tanggal';
import { firstValueFrom } from 'rxjs';
import { PurchaseOrderViewComponent } from '../../../../pages/purchase-order/purchase-order-view/purchase-order-view.component';
import { AdendumService } from '../../../../services/adendum.service';
import { BALIK_BARIS } from '../../../../constants/balik-baris-po';
import { SupplierTerkunciComponent } from '../../../../components/supplier-terkunci/supplier-terkunci.component';
import { ProjectLookupService } from '../../../../services/project-lookup.service';
import { PicAutocompleteComponent } from '../../../../components/pic-autocomplete/pic-autocomplete.component';

@Component({
  selector: 'app-purchase-order-create-g',
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
    HeaderTitleComponent,
    MatSlideToggleModule,
    NgxMaskDirective,
    SupplierTerkunciComponent,
    PicAutocompleteComponent,
  ],
  templateUrl: './purchase-order-create-g.component.html',
  styleUrl: './purchase-order-create-g.component.scss',
})
export class PurchaseOrderCreateGComponent implements OnInit {
  private readonly serverMessage = inject(ServerMessageService);

  private readonly projectLookup = inject(ProjectLookupService);
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
  /** Kode jenis PO, dipakai pada pill di kepala halaman. */
  ngOnInit(): void {
    // Bila dibuka sebagai adendum atau koreksi, isinya diambil dari
    // dokumen induknya. Dipanggil di `ngOnInit` — bukan di penangan
    // tombol — karena alamatnya sudah membawa `adendumDari` sejak
    // halaman dibuka, dan yang membukanya tidak menekan apa pun.
    /*
     * Dipanggil SEKALI, dan hanya bila memang ada dokumen lamanya.
     *
     * Sebelumnya ada dua panggilan berurutan di sini: satu tanpa syarat, satu
     * lagi di bawah dengan syarat. Dokumen induknya karena itu diambil DUA
     * KALI dari server pada setiap pembukaan layar sunting — terlihat sebagai
     * dua permintaan bernomor sama pada tab jaringan — dan formulirnya diisi
     * dua kali oleh dua jawaban yang datang tidak berurutan.
     *
     * Tidak ada galat. Yang terjadi hanya sebagian isian terisi dari jawaban
     * yang satu dan sebagian dari yang lain.
     */
    // Bila dibuka sebagai adendum ATAU koreksi, isinya diambil dari dokumen
    // lamanya.
    //
    // Sebelumnya baris ini berada SETELAH `return` pada sebuah getter,
    // sehingga tidak pernah berjalan sama sekali — adendum terbuka dengan
    // formulir kosong tanpa satu pun galat.
    if (this.adendum.memuatDokumenLama) this.muatAdendum();
  }

  get typeCode(): string {
    return 'G';
  }

  /** Nama jenis PO, dipakai pada pill di kepala halaman. */
  get typeLabel(): string {
    return purchaseTypeLabel(this.translate, 'G');
  }

  private readonly typeSwitcher = inject(PurchaseOrderTypeSwitcher);

  /** Buka pemilih jenis PO; isian yang sudah ada dikonfirmasi lebih dulu. */
  onChangeType() {
    this.typeSwitcher.open(this.formGroup?.dirty === true);
  }
  /**
   * Pengambilan sendiri (Loco), bukan dikirim ke lokasi (Franco).
   *
   * Nilai `'1'` berarti Loco — sama dengan yang dibaca klausul lewat
   * `isLoco()` pada template, sehingga pilihan di layar tidak mungkin
   * berbeda dari kalimat yang tercetak.
   */
  /**
   * Kosongkan termin yang tidak lagi berlaku setelah moda kirim berubah.
   *
   * Memilih COD lalu mengubah moda menjadi Loco meninggalkan nilai yang
   * pilihannya sudah tidak ada di layar — tersembunyi, tetapi tetap
   * tersimpan dan tetap tercetak pada dokumennya.
   *
   * Dikosongkan, bukan diganti diam-diam: termin menentukan kapan tagihan
   * jatuh tempo, dan menggantinya tanpa sepengetahuan yang mengisi lebih
   * buruk daripada memintanya memilih ulang.
   */
  /**
   * Alamat terakhir yang diisi SISTEM, bukan orang.
   *
   * Tanpa penanda ini, mengganti metode pengiriman tidak mengubah alamatnya:
   * bawaannya Franco, sehingga begitu pemasok dipilih alamat proyek sudah
   * terisi — dan penjagaan "jangan timpa yang sudah diisi" justru menahan
   * pengisian ulang saat berpindah ke Loco.
   *
   * Yang diketik sendiri tetap dijaga. Sebagian pengiriman menuju titik
   * tertentu di dalam proyek, dan sebagian pemasok punya gudang yang berbeda
   * dari alamat suratnya — keduanya keterangan yang tidak boleh hilang.
   */
  private alamatDariSistem = '';

  /**
   * Alamat boleh diisi ulang bila kosong, ATAU bila isinya persis yang
   * terakhir ditulis sistem sendiri.
   */
  private alamatBolehDiisiUlang(): boolean {
    const kini = String(
      this.formGroup.get('deliveryAddress')?.value || '',
    ).trim();
    return !kini || kini === this.alamatDariSistem.trim();
  }

  selaraskanTerminLoco(): void {

    /*
     * Loco: barang diambil DI TEMPAT PEMASOK.
     *
     * Alamat pengambilan dan penanggung jawabnya karena itu adalah alamat
     * dan kontak pemasok itu sendiri — mengetiknya ulang berarti menyalin
     * dari layar sebelah, dan yang disalin tangan cepat atau lambat berbeda
     * dari sumbernya.
     *
     * Isian yang SUDAH diisi sendiri tidak ditimpa: sebagian pemasok punya
     * gudang yang berbeda dari alamat suratnya, dan itu justru keterangan
     * yang tidak boleh hilang.
     */
    /*
     * Kontak pemasok diisi pada KEDUA metode.
     *
     * Siapa yang dihubungi di pihak pemasok tidak bergantung pada siapa yang
     * mengantar — pada Franco pun yang ditanya soal barangnya tetap orang
     * yang sama. Sebelumnya hanya terisi pada Loco, sehingga setiap PO Franco
     * menuntut mengetik ulang nama dan nomor yang sudah tersimpan di data
     * pemasok.
     */
    {
      const v = this.formGroup.getRawValue();
      const kontak: any = {};

      if (!String(v.supplierPICName || '').trim() && v.supplierName) {
        kontak.supplierPICName = v.supplierName;
      }
      if (!String(v.supplierPICPhoneNumber || '').trim() && v.supplierPhone) {
        kontak.supplierPICPhoneNumber = v.supplierPhone;
      }
      if (Object.keys(kontak).length) this.formGroup.patchValue(kontak);
    }

    /*
     * FRANCO: alamat pengiriman diisi dari LOKASI PROYEK.
     *
     * Barang dikirim ke proyeknya, dan alamatnya sudah tersimpan pada data
     * proyek — mengetiknya ulang pada setiap PO berarti menyalin dari catatan
     * lain yang cepat atau lambat berbeda dari sumbernya.
     *
     * Tidak menimpa yang sudah diisi: sebagian pengiriman menuju titik
     * tertentu di dalam proyek — gudang, area tertentu — dan itu justru
     * keterangan yang tidak boleh hilang.
     */
    if (!this.isLoco) {
      const v = this.formGroup.getRawValue();
      if (this.alamatBolehDiisiUlang()) {
        const proyek = this.projectLookup.cari(String(v.projectName || ''));
        const alamat = [proyek?.name, proyek?.address]
          .map((x: any) => String(x || '').trim())
          .filter((x: string) => !!x)
          .join('\n');
        if (alamat) {
          this.formGroup.patchValue({ deliveryAddress: alamat });
          this.alamatDariSistem = alamat;
        }
      }
    }

    if (this.isLoco) {
      const v = this.formGroup.getRawValue();
      const isi: any = {};

      if (this.alamatBolehDiisiUlang()) {
        const alamat = [v.supplierName, v.supplierAddress, v.supplierCity]
          .map((x: any) => String(x || '').trim())
          .filter((x: string) => !!x)
          .join('\n');
        if (alamat) {
          isi.deliveryAddress = alamat;
          this.alamatDariSistem = alamat;
        }
      }

      if (!String(v.supplierPICName || '').trim() && v.supplierName) {
        isi.supplierPICName = v.supplierName;
      }

      if (!String(v.supplierPICPhoneNumber || '').trim() && v.supplierPhone) {
        isi.supplierPICPhoneNumber = v.supplierPhone;
      }

      if (Object.keys(isi).length) this.formGroup.patchValue(isi);
    }
    if (!this.isLoco) return;
    const c = this.formGroup.get('paymentTerm');
    if (c && ['COD', 'CBD'].includes(String(c.value))) {
      c.setValue('');
    }
  }

  get isLoco(): boolean {
    return String(this.formGroup.get('deliveryMethod')?.value) === '1';
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
    purchaseType: new FormControl('G'),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierPrefix: new FormControl(''),

    supplierNpwp: new FormControl(''),
    supplierAddress: new FormControl('', Validators.required),

    /*
     * Nomor telepon pemasok, hanya untuk mengisikan kontak Loco.
     *
     * Tidak dikirim ke server dan tidak tercetak: yang tercetak
     * adalah `supplierPICPhoneNumber`, yang boleh disunting bila
     * penanggung jawabnya ternyata orang lain.
     */
    supplierPhone: new FormControl(''),
    // Kota + provinsi supplier: hanya untuk dicetak, tidak dikirim sebagai
    // kolom PO (backend mengambilnya lagi dari supplierID saat cetak ulang).
    supplierCity: new FormControl(''),
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
    additionalClauses: new FormArray([]),
    includePPN: new FormControl(true),
  });

  get f() {
    return this.formGroup.controls;
  }

  get t() {
    return this.formGroup.get('purchase_order') as FormArray;
  }

  templateVersion = latestClauseVersion('G');

  // --- poin perjanjian tambahan (custom, ditulis user) ---
  get additionalClauses(): FormArray {
    return this.formGroup.get('additionalClauses') as FormArray;
  }

  addClause() {
    this.additionalClauses.push(new FormControl(''));
  }

  removeClause(i: number) {
    this.additionalClauses.removeAt(i);
  }

  clauseCtrlAt(i: number): FormControl {
    return this.additionalClauses.at(i) as FormControl;
  }

  private get additionalClauseValues(): string[] {
    return (this.additionalClauses.value as string[]) || [];
  }

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

  onPaymentTermChange() {
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

  private clauseContext() {
    const v = this.formGroup.getRawValue();
    return {
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
      'G',
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
   * Satuan yang dipilih berbeda dari satuan master barangnya.
   *
   * Bukan larangan — sebagian pembelian memang memakai satuan berbeda.
   * Hanya peringatan, karena yang keliru di sini tidak terlihat sampai
   * barangnya datang.
   */
  satuanBerbeda(i: number): boolean {
    const g = this.getFormGroupAt(i);
    const master = String(g?.get('unitMaster')?.value || '').trim();
    const dipakai = String(g?.get('unit')?.value || '').trim();
    if (!master || !dipakai) return false;
    return master.toLowerCase() !== dipakai.toLowerCase();
  }

  /** Satuan menurut master barang; dipakai pada teks peringatan. */
  satuanMaster(i: number): string {
    return String(
      this.getFormGroupAt(i)?.get('unitMaster')?.value || '',
    ).trim();
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
      /*
       * Satuan menurut MASTER BARANG, disimpan terpisah.
       *
       * Isian satuannya sendiri boleh diubah — sebagian pembelian memang
       * memakai satuan berbeda dari yang tercatat. Tetapi satuan master
       * hilang begitu diubah, sehingga tidak ada lagi yang dapat
       * memperingatkan bahwa keduanya berbeda.
       *
       * "Bendrat kemasan 20 kg" berstuan `pcs`; mengisi 100 dengan satuan
       * `Kg` menghasilkan pesanan lima kali lipat dari yang dimaksud, dan
       * itu baru ketahuan saat barangnya datang.
       */
      unitMaster: [item.unit || ''],
      quantity: [1, volumeValidators(this.isAdendum)],
      price: [0, [Validators.required, Validators.min(0)]],
      /*
       * Jumlah baris yang DITULIS; kosong berarti dihitung biasa.
       *
       * Harga satuan tersimpan empat desimal, dan sebagian pekerjaan tidak
       * pernah bulat pada ketelitian itu: 7.000 liter seharga Rp 300.000
       * berarti Rp 42,857142… per liter, dan yang tersimpan 42,8571 —
       * dokumennya tercetak Rp 299.999,70.
       */
      amount: [null as number | null],
      remarks: [''],
    });
  }

  openItemSelector() {
    this.dialog
      .open(MasterItemSelectorComponent, {
        data: { purchaseType: 'G' },
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
  /**
   * Total dokumen — lewat `jumlahBaris()`, BUKAN perkalian sendiri.
   *
   * Sempat dihitung di sini sebagai `price * quantity`, dan itu membatalkan
   * seluruh gunanya jumlah tertulis: barisnya menampilkan Rp 300.000 sesuai
   * yang diketik, sementara totalnya menjumlahkan Rp 299.999,70 — dua angka
   * yang bertentangan pada satu lembar yang sama, dan yang tercetak
   * mengikuti helper cetaknya sehingga formulirnya sendiri yang berbeda.
   */
  get rawTotal(): number {
    return jumlahBaris(this.t.getRawValue());
  }

  /**
   * Harga satuan yang diisi user adalah DPP (belum termasuk PPN).
   * PPN 11% ditambahkan di atasnya bila togglenya aktif — sebelumnya harga
   * dianggap sudah termasuk PPN sehingga DPP harus dibagi 1,11 dan mudah
   * salah dibaca.
   */
  get subTotal(): number {
    return this.rawTotal;
  }

  get ppnAmount(): number {
    return this.formGroup.get('includePPN')?.value ? this.rawTotal * 0.11 : 0;
  }

  get grandTotal(): number {
    return this.subTotal + this.ppnAmount;
  }

  get lineTotal(): (i: number) => number {
    return (i: number) => nilaiBaris(this.getFormGroupAt(i).getRawValue());
  }

  readonly TOLERANSI = TOLERANSI_PEMBULATAN;

  /** Volume kali harga, tanpa pembetulan — dipakai sebagai pembanding. */
  hitungBaris(i: number): number {
    return nilaiHitung(this.getFormGroupAt(i).getRawValue());
  }

  /**
   * Jumlah yang ditulis menyimpang terlalu jauh.
   *
   * Di luar batas ini yang salah bukan pembulatannya melainkan harga
   * satuannya — dan membiarkannya membuat dokumen menyatakan nilai yang tidak
   * dapat dicocokkan dengan volume kali harganya.
   */
  jumlahMenyimpang(i: number): boolean {
    const v = this.getFormGroupAt(i).getRawValue();
    return !pembulatanSah(v.amount, v);
  }

  /** Ada baris yang jumlah tertulisnya menyimpang; dokumen belum boleh terbit. */
  get adaJumlahMenyimpang(): boolean {
    return this.t.controls.some((_c, i) => this.jumlahMenyimpang(i));
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
            supplierAddress: data.address,
            /*
             * Dua bentuk nama diterima.
             *
             * Kolomnya bernama `phoneNumber`, tetapi jawaban dari sebagian
             * jalur — dan dokumen lama — memakai `phone_number`. Membaca satu
             * bentuk saja membuat nomornya hilang tanpa galat: `undefined`
             * menjadi teks kosong, dan isian PIC tetap kosong walaupun
             * datanya jelas ada.
             */
            supplierPhone: data.phoneNumber || data.phone_number || '',
            supplierCity: [data.city, data.province]
              .filter((x: string) => !!x)
              .join(', '),
          });

          /*
           * Kontak PIC diisi SETELAH pemasoknya masuk.
           *
           * `selaraskanTerminLoco()` yang mengisinya, dan sebelumnya ia hanya
           * dipanggil ketika metode pengiriman diubah — sehingga yang memilih
           * pemasok lalu langsung mengisi baris barang tidak pernah melihat
           * nama dan nomornya terisi, walaupun keduanya sudah tersimpan di
           * data pemasok.
           */
          this.selaraskanTerminLoco();
        }
      });
  }

  formatData() {
    // Harga yang diisi = DPP; PPN disimpan sebagai persentase (11 atau 0).
    const dpp = this.rawTotal;
    const ppn = this.formGroup.get('includePPN')?.value ? 11 : 0;
    const projectCode = this.formGroup.get('projectName')?.value;
    return {
      date: tanggalLokal(this.formGroup.get('date')?.value),
      supplierID: this.formGroup.get('supplierID')?.value,
      purchaseType: this.formGroup.get('purchaseType')?.value,
      projectName: projectCode,
      projectCode: projectCode,
      // Penanda induk bila dokumen ini ADENDUM; server yang
      // menghitung nomor adendumnya.
      parentPurchaseOrderID: this.adendum.indukId ?? undefined,
      name: '',
      dpp: dpp,
      ppn: ppn,
      payment_term: this.formGroup.get('paymentTerm')?.value,
      templateVersion: this.templateVersion,
      billing_requirements: {},
      // Baris item PO. Tanpa ini `purchase_order_items` tidak pernah terisi,
      // sehingga dokumen yang dicetak ulang kehilangan seluruh daftar barang.
      items: this.t.controls.map((c) => {
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
          // Kosong berarti dihitung biasa; server menolak yang di luar batas.
          amount: x.amount ?? null,
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
        creditTerm: this.formGroup.getRawValue().creditTerm,
        prepaidTerm: this.formGroup.getRawValue().prepaidTerm,
        supplierPICName: this.formGroup.get('supplierPICName')?.value,
        supplierPICPhoneNumber: this.formGroup.get('supplierPICPhoneNumber')
          ?.value,
        officePICName: this.formGroup.get('officePICName')?.value,
        officePICPhoneNumber: this.formGroup.get('officePICPhoneNumber')?.value,
        // Poin perjanjian TIDAK disimpan sebagai teks. Renderer merakit
        // ulang dari templateVersion + data di bawah, supaya mengedit PO
        // tidak menyisakan kalimat lama yang tidak sinkron.
        // simpan poin tambahan mentah biar bisa di-render ulang persis
        additionalClauses: this.additionalClauseValues
          .map((x) => (x || '').trim())
          .filter((x) => x.length > 0),
      },
    };
  }

  /**
   * Susun data cetak dari isian form. Klausul TIDAK diambil dari sini —
   * helper merakitnya sendiri dari templateVersion + clauseContext.
   */
  private buildPrintData(purchaseOrderName: string) {
    const v = this.formGroup.getRawValue();
    return {
      purchaseOrderName,
      date: v.date,
      projectName: v.projectName,
      supplierName: v.supplierName,
      supplierPrefix: v.supplierPrefix,
      supplierAddress: v.supplierAddress,
      supplierNpwp: v.supplierNpwp,
      supplierCity: v.supplierCity,
      items: this.t.controls.map((c) => {
        const x = c.getRawValue();
        return {
          name: x.description || x.sku || '',
          quantity: Number(x.quantity) || 0,
          unit: x.unit,
          price: Number(x.price) || 0,
          amount: x.amount ?? null,
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
    /*
     * Jumlah yang menyimpang dihentikan DI SINI.
     *
     * Server membuang jumlah tertulis yang di luar batas tanpa menolak
     * dokumennya (`_clean_item`) — barisnya diam-diam kembali ke volume kali
     * harga. Tanpa penjagaan ini, yang mengetik Rp 350.000 pada baris
     * bernilai Rp 299.999,70 menyimpan dengan lega, tidak diberi tahu apa
     * pun, dan baru mengetahuinya dari lembar di tangan vendor.
     */
    if (this.adaJumlahMenyimpang) {
      this.snackBar.open(
        this.translate.instant('poForm.jumlahMenyimpangCegah', {
          batas: TOLERANSI_PEMBULATAN,
        }),
        'Close',
        { duration: 5000 },
      );
      return;
    }

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
          const poName = res?.purchase_order_name ?? '';
          this.snackBar.open(
            `Purchase order ${poName} berhasil dibuat`,
            'Close',
            { duration: 3000 },
          );

          // Langsung buka PDF-nya di tab baru supaya bisa dicek/dicetak.
          // Gagal cetak tidak boleh membatalkan PO yang sudah tersimpan.
          try {
            printPurchaseOrderG(this.buildPrintData(poName));
          } catch (e) {
            console.error('Gagal membuat PDF purchase order:', e);
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
            this.serverMessage.terjemahkan(error),
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
    return this.translate.instant(
      this.isUbah ? 'poForm.judulUbah' : 'poForm.headerTitleG',
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
        /*
         * Jangka kredit dan prepaid diselaraskan SESUDAH isinya termuat.
         *
         * Aturannya — tunai mematikan keduanya — sebelumnya hanya dijalankan
         * oleh penangan `(selectionChange)` pada pilihannya. Mengisi
         * formulirnya dari dokumen lama tidak menekan apa pun, sehingga
         * dokumen tunai terbuka dengan kedua isian itu tetap hidup; keduanya
         * baru mati setelah pilihannya diganti lalu dikembalikan.
         */
        this.onPaymentTermChange();
        this.adendum.kunciIsian(this.formGroup);
        this.adendum.isiLarik(
          this.formGroup,
          'purchase_order',
          this.adendum.barisInduk(induk),
          (x) => {
            const g = this.buildItemGroup(x);
            g.patchValue(BALIK_BARIS['g'](x, this.isUbah));
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
