import { CommonModule } from '@angular/common';
import { ClauseLineComponent } from '../../../components/clause-line/clause-line.component';
import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../services/api.service';
import { purchaseTypeKey, purchaseTypeLabel } from '../../../constants/purchase-type-label.constant';
import {
  ClauseSection,
  buildClauseLines,
  buildLegalServiceClauses,
  buildManpowerClauses,
  buildTransportClauses,
} from '../../../constants/clause-templates';
import { AuditTrailComponent } from '../../../components/audit-trail/audit-trail.component';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-purchase-order-view',
  standalone: true,
  imports: [
    FormsModule,
    ClauseLineComponent,
    AuditTrailComponent,
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './purchase-order-view.component.html',
  styleUrl: './purchase-order-view.component.scss',
})
export class PurchaseOrderViewComponent {
  isLoading = true;
  /*
   * `clauseSections` disusun sekali saat data tiba, bukan lewat getter.
   *
   * Penyusunannya menjalankan `buildXClauses(...)` yang merangkai puluhan
   * kalimat perjanjian; sebagai getter itu berulang setiap kali templat
   * membacanya, dua kali per putaran change detection.
   *
   * Dipasang lewat setter supaya penugasan `data` di mana pun tidak mungkin
   * lupa memperbarui klausulnya.
   */
  private _data: any = null;

  get data(): any {
    return this._data;
  }

  set data(nilai: any) {
    this._data = nilai;
    this.clauseSections = this.susunKlausul();
  }

  clauseSections: ClauseSection[] = [];

  /**
   * Menyatakan sudah membaca; hanya berarti pada mode pratinjau.
   */
  dibaca = false;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public input: {
      /** Membuka PO tersimpan; datanya diambil dari server. */
      id?: number;
      /**
       * Menampilkan data yang BELUM tersimpan — dipakai sebagai pratinjau
       * pada layar pembuatan PO. Bentuknya sama dengan jawaban server.
       */
      data?: any;
      /**
       * Menampilkan pernyataan "sudah membaca" dan tombol terbitkan.
       * Dialog menutup dengan `true` bila pembuatnya melanjutkan.
       */
      konfirmasi?: boolean;
    },
    private dialogRef: MatDialogRef<PurchaseOrderViewComponent>,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
  ) {
    /*
     * Lebar dialog disetel dari sini, bukan dari pemanggilnya.
     *
     * Tiga puluh tiga tempat membukanya dengan `maxWidth: '96vw'`, sementara
     * isinya sendiri dibatasi 620px. Di layar 1920px dialognya melebar
     * 1843px dengan isi tetap 620px — sisanya ruang kosong, dan kepala
     * dialog terlihat menggantung jauh dari isinya.
     *
     * Ditetapkan di komponen karena yang tahu selebar apa isinya adalah
     * komponen ini, bukan layar yang memanggilnya. Memperbaikinya di tiap
     * pemanggil berarti tiga puluh tiga tempat yang harus diingat setiap
     * kali lebar isinya berubah.
     *
     * `min()` dipakai agar pada layar sempit ia tetap mengikuti lebar
     * layar, bukan memaksa 660px lalu terpotong.
     */
    this.dialogRef.updateSize('min(660px, 96vw)');

    /*
     * Data yang diberikan langsung tidak diambil ulang dari server.
     *
     * Pada pratinjau, PO-nya memang belum ada di server — mengambilnya
     * hanya menghasilkan 404, dan dialognya tertutup sendiri sebelum
     * sempat terbaca.
     */
    if (this.input?.data) {
      this.data = this.input.data;
      this.isLoading = false;
    } else {
      this.fetch();
    }
  }

  /** Mode pratinjau: dokumen belum terbit. */
  get isPratinjau(): boolean {
    return !!this.input?.data;
  }

  tutup(): void {
    this.dialogRef.close(false);
  }

  lanjut(): void {
    // Penjaga kedua: tombolnya memang sudah dinonaktifkan, tetapi keadaan
    // tombol bukan tempat menaruh aturan.
    if (!this.dibaca) return;
    this.dialogRef.close(true);
  }

  private fetch() {
    this.isLoading = true;
    this.apiService
      .get(`purchase-orders/${this.input.id}`, {})
      .subscribe({
        next: (res: any) => {
          this.data = res;
        },
        error: (error: any) => {
          this.snackBar.open(
            error?.error?.detail ??
              this.translate.instant('purchaseOrder.viewFailed'),
            'Close',
            { duration: 3000 },
          );
          this.dialogRef.close();
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  /**
   * Nama jenis PO, mengikuti bahasa aplikasi.
   *
   * `PURCHASE_TYPE_LABELS` berisi teks Inggris dan dipakai di tempat yang
   * memang berbahasa Inggris. Di layar ini ia membuat SPK berbahasa
   * Indonesia menampilkan "Project supporting equipment and supplies".
   *
   * Kunci i18n dipakai lebih dulu; konstanta hanya menjadi cadangan bila
   * kode jenisnya belum punya terjemahan.
   */
  typeLabel(code: string): string {
    if (!code) return '—';
    const kunci = purchaseTypeKey(code);
    const teks = this.translate.instant(kunci);
    // `instant` mengembalikan kuncinya sendiri bila tidak ditemukan.
    if (teks && teks !== kunci) return teks;
    return purchaseTypeLabel(this.translate, code);
  }

  get items(): any[] {
    return this.data?.items || [];
  }

  /** Nama barang bisa datang dari katalog barang, alat sewa, atau diketik. */
  itemName(item: any): string {
    return (
      item?.item_description ||
      item?.equipment_name ||
      item?.task ||
      item?.sku ||
      '—'
    );
  }

  lineTotal(item: any): number {
    return (Number(item?.quantity) || 0) * (Number(item?.price) || 0);
  }

  get subTotal(): number {
    return this.items.reduce((acc, x) => acc + this.lineTotal(x), 0);
  }

  /**
   * Poin perjanjian dirakit ulang dari template + data PO, bukan diambil
   * dari teks tersimpan — sama seperti saat dokumen dicetak.
   */
  /**
   * Poin perjanjian, terbagi seksi.
   *
   * Sebagian jenis PO merakit klausulnya lewat pembangun tersendiri yang
   * mengembalikan seksi, bukan lewat CLAUSE_TEMPLATES — PO-A, PO-D, dan
   * 6.4.1. Ketiganya tidak terdaftar di CLAUSE_TEMPLATES, sehingga
   * buildClauseLines mengembalikan daftar kosong dan poinnya tidak pernah
   * tampil di halaman ini.
   */
  /**
   * Jenis yang menentukan bentuk ketentuannya.
   *
   * Tidak selalu sama dengan kolom `purchaseType`: PO-B dapat diterbitkan
   * sebagai tipe A ketika alatnya dipakai mengangkut, dan yang tersimpan
   * adalah 'A'. Membaca kolom itu apa adanya membuat dokumen sewa alat
   * ditampilkan dengan ketentuan jasa transportasi — isian, tabel, dan
   * ketentuannya jadi tidak saling cocok.
   *
   * PO lama yang belum menyimpan penanda dikenali dari kolom yang hanya ada
   * pada formulir sewa.
   */
  get jenisEfektif(): string {
    const custom = this.data?.customData || {};
    if (custom.formOrigin) return custom.formOrigin;
    if (
      this.data?.purchaseType === 'A' &&
      (custom.equipmentRiskBearer !== undefined ||
        custom.operatorByVendor !== undefined ||
        custom.quotaPeriodDays !== undefined)
    ) {
      return 'B';
    }
    return this.data?.purchaseType;
  }

  private susunKlausul(): ClauseSection[] {
    if (!this.data) return [];
    const custom = this.data.customData || {};
    const tambahan: string[] = custom.additionalClauses || [];

    switch (this.jenisEfektif) {
      case 'A':
        return buildTransportClauses(
          {
            ...custom,
            paymentTerm: custom.paymentTerm ?? this.data.payment_term,
          },
          tambahan,
        );
      case 'D':
        return buildManpowerClauses(
          {
            ...custom,
            paymentTerm: custom.paymentTerm ?? this.data.payment_term,
          },
          tambahan,
        );
      case '6.4.1':
        return buildLegalServiceClauses(
          {
            ...custom,
            paymentTerm: custom.paymentTerm ?? this.data.payment_term,
            hasOfficialFee: (custom.officialFees || []).length > 0,
          },
          tambahan,
        );
      default: {
        const lines = this.clauses;
        return lines.length ? [{ items: lines }] : [];
      }
    }
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

  get clauses(): (string | string[])[] {
    if (!this.data) return [];
    const custom = this.data.customData || {};
    return buildClauseLines(
      // Bukan kolom `purchaseType`: lihat keterangan pada `jenisEfektif`.
      this.jenisEfektif,
      {
        /*
         * Seluruh `customData` diteruskan, bukan daftar bidang pilihan.
         *
         * Sebelumnya hanya empat belas bidang yang disebut satu per satu,
         * sementara penyusun klausul membaca lebih dari seratus. Akibatnya
         * pratinjau menampilkan klausul yang berbeda dari dokumen yang
         * dicetak — pada PO-F, `materialType` tidak ikut, sehingga jasa
         * pengujian tampil sebagai pengadaan barang biasa.
         *
         * Daftar pilihan seperti itu harus diperbarui setiap kali ada varian
         * baru, dan bila terlupa tidak ada galat yang muncul: klausulnya
         * hanya diam-diam berbeda.
         */
        ...custom,
        // Beberapa nilai punya cadangan di kolom utama bila `customData`
        // belum memuatnya — dokumen lama tidak selalu menyimpan keduanya.
        paymentTerm: custom.paymentTerm ?? this.data.payment_term,
        paymentTermText: custom.paymentTerm ?? this.data.payment_term,
        projectName: custom.projectName ?? this.data.projectName,
      },
      this.data.templateVersion,
      custom.additionalClauses || [],
    );
  }

}
