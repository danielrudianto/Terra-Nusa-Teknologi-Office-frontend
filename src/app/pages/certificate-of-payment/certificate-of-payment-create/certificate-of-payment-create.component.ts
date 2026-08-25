import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TextFieldModule } from '@angular/cdk/text-field';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import { SupplierTerkunciComponent } from 'src/app/components/supplier-terkunci/supplier-terkunci.component';
import { CertificateOfPaymentPratinjauComponent } from '../certificate-of-payment-pratinjau/certificate-of-payment-pratinjau.component';
import {
  BarisCoPInput,
  BarisPagu,
  CertificateOfPaymentService,
  SpkKandidat,
} from 'src/app/services/certificate-of-payment.service';
import { PermissionService } from 'src/app/services/permission.service';
import { ServerMessageService } from 'src/app/services/server-message.service';

/**
 * Pengisian Certificate of Payment.
 *
 * DUA HAL YANG MEMBEDAKANNYA DARI FORMULIR LAIN
 *
 * 1. Kolom harga tidak sekadar disembunyikan — server memang tidak
 *    mengirimkannya kepada level 1. `bolehLihatNilai` di bawah hanya
 *    menentukan apakah kolomnya DIGAMBAR; datanya sendiri tidak ada.
 *
 * 2. Sisa pagu ditampilkan pada setiap baris, dan yang melebihi ditandai
 *    SEBELUM dikirim. Penjagaan sebenarnya tetap di server; yang di sini
 *    hanya menghindarkan orang mengetik panjang lalu ditolak di akhir.
 */
@Component({
  selector: 'app-certificate-of-payment-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    TextFieldModule,
    NgxMaskDirective,
    TranslateModule,
    HeaderTitleComponent,
    SupplierTerkunciComponent,
  ],
  providers: [provideNgxMask()],
  templateUrl: './certificate-of-payment-create.component.html',
  styleUrl: './certificate-of-payment-create.component.scss',
})
export class CertificateOfPaymentCreateComponent implements OnInit {
  private readonly service = inject(CertificateOfPaymentService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);
  private readonly izin = inject(PermissionService);

  /** Id CoP bila sedang MENYUNTING; kosong bila membuat baru. */
  copId: number | null = null;

  readonly memuat = signal(false);
  readonly menyimpan = signal(false);

  readonly spkList = signal<SpkKandidat[]>([]);
  readonly mencariSpk = signal(false);
  readonly sudahMencari = signal(false);
  readonly spkTerpilih = signal<SpkKandidat | null>(null);
  readonly baris = signal<BarisPagu[]>([]);

  /** Volume yang diketik, per `purchaseOrderItemID`. */
  readonly isian = signal<Record<number, number | null>>({});
  /**
   * Satu FormControl per baris — BUKAN `[value]` + `(input)`.
   *
   * ngx-mask memformat lewat ControlValueAccessor. Tanpa kontrol, `[value]`
   * menuliskan ulang angka mentah ke kotaknya pada tiap putaran deteksi
   * perubahan, tepat setelah mask selesai memformat — sehingga yang mengetik
   * "25000" melihat "25000", bukan "25.000", dan pemisah ribuan yang justru
   * menjadi alasan mask dipasang tidak pernah muncul.
   *
   * Nilai yang tersimpan di kontrol sudah bersih (tanpa pemisah, titik
   * sebagai koma desimal), jadi `Number()` cukup — tidak perlu lagi
   * membongkar teks berformat sendiri.
   */
  private kontrol = new Map<number, FormControl<string | null>>();
  /**
   * Volume yang SUDAH tersimpan pada CoP ini (mode sunting).
   *
   * Dikembalikan ke sisa pagu saat menghitung batas: volume milik CoP ini
   * sendiri bukan pemakaian orang lain. Tanpa ini, membuka lalu menyimpan
   * tanpa mengubah apa pun tampak melebihi pagunya — dan server pun
   * memperlakukannya begitu (lihat `abaikan_cop_id` di controller).
   */
  readonly volumeAwal = signal<Record<number, number>>({});
  readonly catatanBaris = signal<Record<number, string>>({});

  readonly tanggal = new FormControl<Date | null>(new Date());
  /*
   * Periode WAJIB — cerminan aturan server.
   *
   * Sebuah berita acara progres tanpa rentang tanggal tidak dapat dibaca:
   * ia menyatakan "sekian volume terlaksana" tanpa menyebut kapan. Ia juga
   * yang tercetak pada lembar BAP.
   */
  readonly periodeAwal = new FormControl<Date | null>(null, Validators.required);
  readonly periodeAkhir = new FormControl<Date | null>(null, Validators.required);
  readonly catatan = new FormControl<string>('');
  readonly cariSpk = new FormControl<string>('');

  /*
   * TIDAK ADA `bolehLihatNilai` di layar ini — dan itu disengaja.
   *
   * Lembar ini TAHAP PENCATATAN VOLUME. Ia tetap tahap volume siapa pun
   * yang mengerjakannya: orang lapangan, manajer, maupun pemilik. Uang
   * ditangani di tahap berikutnya, pada layar rincian.
   *
   * Sebelumnya layar ini menggambar harga bila levelnya mencukupi, dan
   * akibatnya batas tahapnya kabur — pemilik yang membuat CoP melihat
   * lembar yang berbeda dari yang dilihat orang lapangan untuk pekerjaan
   * yang sama, lalu keduanya membicarakan dua hal berlainan.
   */

  /** Sampaikan pesan server APA ADANYA — di situlah sisa pagu tertulis. */
  private pesan(e: any): void {
    this.snackBar.open(
      this.pesanServer.terjemahkan(e),
      this.translate.instant('common.close'),
      { duration: 6000 },
    );
  }

  /** Huruf paling sedikit sebelum server ditanya. */
  static readonly MINIMAL_HURUF = 3;

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    this.copId = id ? Number(id) : null;

    /*
     * TIDAK memuat seluruh SPK di awal.
     *
     * Jumlahnya bertambah tiap bulan dan tidak pernah berkurang; memuatnya
     * lebih dulu membuat layar makin lama makin lambat dibuka hanya untuk
     * memilih satu baris. Server ditanya setelah tiga huruf diketik.
     */
    this.cariSpk.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((v) => {
        // Yang terpilih dikembalikan sebagai objek oleh `displayWith`;
        // itu bukan pengetikan baru dan tidak perlu memanggil server.
        if (typeof v !== 'string') return;
        void this.cariSpkKeServer(v || '');
      });

    if (this.copId) {
      await this.muatUntukSunting(this.copId);
      return;
    }

    // Datang dari layar SPK dengan `?spk=<id>`: dicari sekali lalu dipilih.
    const dariSpk = this.route.snapshot.queryParamMap.get('spk');
    if (dariSpk) await this.pilihSpkDariId(Number(dariSpk));
  }

  kurangKarakter(): boolean {
    const v = this.cariSpk.value;
    const teks = typeof v === 'string' ? v : '';
    return (
      !this.spkTerpilih() &&
      teks.trim().length < CertificateOfPaymentCreateComponent.MINIMAL_HURUF
    );
  }

  private async cariSpkKeServer(kata: string): Promise<void> {
    const bersih = (kata || '').trim();
    if (bersih.length < CertificateOfPaymentCreateComponent.MINIMAL_HURUF) {
      this.spkList.set([]);
      this.sudahMencari.set(false);
      return;
    }
    this.mencariSpk.set(true);
    try {
      const hasil = (await firstValueFrom(
        this.service.daftarSpk(undefined, bersih),
      )) as SpkKandidat[];
      this.spkList.set(hasil || []);
      this.sudahMencari.set(true);
    } catch (e) {
      this.pesan(e);
      this.spkList.set([]);
    } finally {
      this.mencariSpk.set(false);
    }
  }

  /** Yang ditampilkan pada kotak setelah satu SPK dipilih. */
  tampilSpk(s: SpkKandidat | string | null): string {
    if (!s || typeof s === 'string') return (s as string) || '';
    return s.name;
  }

  private async pilihSpkDariId(id: number): Promise<void> {
    if (!id) return;
    try {
      const hasil = (await firstValueFrom(
        this.service.daftarSpk(undefined, undefined),
      )) as SpkKandidat[];
      const ada = (hasil || []).find((s) => s.id === id);
      if (ada) await this.pilihSpk(ada);
    } catch (e) {
      this.pesan(e);
    }
  }

  /** Lepas pilihan supaya SPK lain dapat dicari. */
  lepasSpk(): void {
    this.spkTerpilih.set(null);
    this.baris.set([]);
    this.kontrol.clear();
    this.isian.set({});
    this.catatanBaris.set({});
    this.volumeAwal.set({});
    this.spkList.set([]);
    this.sudahMencari.set(false);
    this.cariSpk.setValue('');
  }

  async pilihSpk(spk: SpkKandidat): Promise<void> {
    this.spkTerpilih.set(spk);
    this.isian.set({});
    this.catatanBaris.set({});
    this.volumeAwal.set({});
    await this.muatPagu(spk.id);
  }

  private async muatPagu(spkId: number): Promise<void> {
    this.memuat.set(true);
    try {
      const hasil = (await firstValueFrom(
        this.service.pagu(spkId),
      )) as BarisPagu[];
      this.baris.set(hasil || []);
    } catch (e) {
      this.pesan(e);
      this.baris.set([]);
    } finally {
      // Dibangun SEGERA setelah barisnya ada, di dalam `finally`, supaya
      // templat tidak pernah sempat menggambar kotak yang kontrolnya belum
      // dibuat — `[formControl]` dengan nilai kosong melempar galat.
      this.bangunKontrol();
      this.memuat.set(false);
    }
  }

  /**
   * Siapkan satu kontrol per baris pekerjaan.
   *
   * Nilai awalnya diambil dari `isian()`, sehingga mode sunting cukup mengisi
   * `isian` lebih dulu lalu memuat pagunya — tidak ada langkah ketiga yang
   * dapat terlupa.
   */
  private bangunKontrol(): void {
    const isi = this.isian();
    this.kontrol = new Map();
    this.baris().forEach((b) => {
      const id = b.purchaseOrderItemID;
      const awal = isi[id];
      const c = new FormControl<string | null>(
        awal === null || awal === undefined ? '' : String(awal),
      );
      if (this.sisaBoleh(b) <= 0) c.disable({ emitEvent: false });
      c.valueChanges.subscribe((v) => this.terimaVolume(id, v));
      this.kontrol.set(id, c);
    });
  }

  /** Kontrol baris; dibuat kosong bila diminta sebelum pagunya termuat. */
  kontrolVol(barisId: number): FormControl<string | null> {
    let c = this.kontrol.get(barisId);
    if (!c) {
      c = new FormControl<string | null>('');
      c.valueChanges.subscribe((v) => this.terimaVolume(barisId, v));
      this.kontrol.set(barisId, c);
    }
    return c;
  }

  private async muatUntukSunting(id: number): Promise<void> {
    this.memuat.set(true);
    try {
      const cop: any = await firstValueFrom(this.service.detail(id));
      this.tanggal.setValue(cop.date ? new Date(cop.date) : null);
      this.periodeAwal.setValue(
        cop.periodStart ? new Date(cop.periodStart) : null,
      );
      this.periodeAkhir.setValue(
        cop.periodEnd ? new Date(cop.periodEnd) : null,
      );
      this.catatan.setValue(cop.note || '');

      const spk = this.spkList().find((s) => s.id === cop.purchaseOrderID) || {
        id: cop.purchaseOrderID,
        name: cop.purchaseOrderName || '',
        projectName: cop.projectName,
        purchaseType: '',
        supplierName: null,
        date: null,
      };
      this.spkTerpilih.set(spk as SpkKandidat);

      /*
       * Isian dipasang SEBELUM pagunya dimuat.
       *
       * `muatPagu` yang membangun kontrol tiap baris, dan kontrol itu
       * mengambil nilai awalnya dari `isian`. Urutan terbalik membuat
       * kotaknya tergambar kosong pada dokumen yang sebenarnya sudah berisi
       * — lalu menyimpannya menghapus volume yang sudah tercatat.
       */
      const isi: Record<number, number | null> = {};
      const cat: Record<number, string> = {};
      (cop.items || []).forEach((i: any) => {
        isi[i.purchaseOrderItemID] = Number(i.quantity);
        if (i.remarks) cat[i.purchaseOrderItemID] = i.remarks;
      });
      this.isian.set(isi);
      this.catatanBaris.set(cat);
      this.volumeAwal.set(
        Object.fromEntries(
          Object.entries(isi).map(([k, v]) => [Number(k), Number(v) || 0]),
        ),
      );

      await this.muatPagu(cop.purchaseOrderID);
    } catch (e) {
      this.pesan(e);
    } finally {
      this.memuat.set(false);
    }
  }

  // ---- isian per baris -------------------------------------------------

  nilai(barisId: number): number | null {
    return this.isian()[barisId] ?? null;
  }

  /**
   * Nilai yang datang dari kontrol bermask.
   *
   * ngx-mask menyimpan angka BERSIH pada kontrolnya — pemisah ribuan sudah
   * dilepas dan koma desimal sudah menjadi titik ("1.234,56" tersimpan
   * sebagai "1234.56"). Karena itu `Number()` sudah cukup; membongkar teks
   * berformat sendiri di sini justru akan salah membaca titiknya.
   */
  private terimaVolume(barisId: number, teks: string | null): void {
    const bersih = (teks ?? '').toString().trim();
    const angka = bersih === '' ? null : Number(bersih);
    this.isian.update((s) => ({
      ...s,
      [barisId]: angka !== null && Number.isFinite(angka) ? angka : null,
    }));
  }

  setCatatan(barisId: number, teks: string): void {
    this.catatanBaris.update((s) => ({ ...s, [barisId]: teks }));
  }

  /**
   * Sisa yang BOLEH diisi baris ini.
   *
   * Saat menyunting, volume CoP ini sendiri dikembalikan ke sisanya — ia
   * bukan pemakaian orang lain. Tanpa itu, membuka lalu menyimpan tanpa
   * mengubah apa pun tampak melebihi pagu.
   */
  sisaBoleh(b: BarisPagu): number {
    return b.sisa + (this.volumeAwal()[b.purchaseOrderItemID] || 0);
  }

  melebihi(b: BarisPagu): boolean {
    const v = this.nilai(b.purchaseOrderItemID);
    return v !== null && v > this.sisaBoleh(b);
  }

  get adaYangMelebihi(): boolean {
    return this.baris().some((b) => this.melebihi(b));
  }

  /** Periode terisi DAN urutannya masuk akal. */
  get periodeSah(): boolean {
    const a = this.periodeAwal.value;
    const b = this.periodeAkhir.value;
    if (!a || !b) return false;
    return b.getTime() >= a.getTime();
  }

  get periodeTerbalik(): boolean {
    const a = this.periodeAwal.value;
    const b = this.periodeAkhir.value;
    return !!a && !!b && b.getTime() < a.getTime();
  }

  get adaIsian(): boolean {
    return Object.values(this.isian()).some((v) => v !== null && v > 0);
  }

  // ---- simpan ----------------------------------------------------------

  private tanggalTeks(d: Date | null): string | null {
    if (!d) return null;
    // Disusun dari bagian LOKAL, bukan `toISOString()`: yang terakhir
    // mengubahnya ke UTC lebih dulu, dan di WIB tanggal 1 pukul 00:00
    // tersimpan sebagai tanggal 30 bulan sebelumnya.
    const bulan = `${d.getMonth() + 1}`.padStart(2, '0');
    const hari = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${bulan}-${hari}`;
  }

  private susunItems(): BarisCoPInput[] {
    const isi = this.isian();
    const cat = this.catatanBaris();
    return this.baris()
      .filter((b) => {
        const v = isi[b.purchaseOrderItemID];
        return v !== null && v !== undefined && v > 0;
      })
      .map((b) => ({
        purchaseOrderItemID: b.purchaseOrderItemID,
        quantity: Number(isi[b.purchaseOrderItemID]),
        remarks: cat[b.purchaseOrderItemID] || null,
      }));
  }

  async simpan(): Promise<void> {
    const spk = this.spkTerpilih();
    if (!spk) return;

    if (!this.periodeSah) {
      this.snackBar.open(
        this.translate.instant('cop.periodeWajib'),
        this.translate.instant('common.close'),
        { duration: 4000 },
      );
      return;
    }

    const items = this.susunItems();
    if (!items.length) {
      this.snackBar.open(
        this.translate.instant('cop.isiMinimalSatu'),
        this.translate.instant('common.close'),
        { duration: 4000 },
      );
      return;
    }

    /*
     * PRATINJAU LEBIH DAHULU, simpan setelah dinyatakan terbaca.
     *
     * Yang tersimpan di sini menjadi dasar penagihan, dan volume yang
     * keliru satu digit baru ketahuan setelah pemeriksa membandingkannya
     * dengan lapangan — kalau ketahuan. Sampai saat itu ia sudah memakan
     * pagu baris yang seharusnya tersedia untuk periode berikutnya.
     *
     * Bentuknya sama dengan pratinjau purchase order karena maksudnya
     * memang sama: memindahkan koreksi ke saat masih murah.
     */
    const setuju = await firstValueFrom(
      this.dialog
        .open(CertificateOfPaymentPratinjauComponent, {
          data: CertificateOfPaymentPratinjauComponent.dari(
            spk,
            this.baris(),
            this.isian(),
            this.catatanBaris(),
            this.volumeAwal(),
            {
              tanggal: this.tanggal.value,
              periodeAwal: this.periodeAwal.value,
              periodeAkhir: this.periodeAkhir.value,
              catatan: this.catatan.value || null,
              menyunting: !!this.copId,
            },
          ),
          width: '860px',
          maxWidth: '96vw',
          autoFocus: false,
          disableClose: true,
        })
        .afterClosed(),
    );
    if (!setuju) return;

    this.menyimpan.set(true);
    try {
      let hasil: any = null;
      if (this.copId) {
        hasil = await firstValueFrom(
          this.service.ubah(this.copId, {
            date: this.tanggalTeks(this.tanggal.value) || undefined,
            periodStart: this.tanggalTeks(this.periodeAwal.value),
            periodEnd: this.tanggalTeks(this.periodeAkhir.value),
            note: this.catatan.value || null,
            items,
          }),
        );
      } else {
        hasil = await firstValueFrom(
          this.service.buat({
            purchaseOrderID: spk.id,
            date: this.tanggalTeks(this.tanggal.value) as string,
            periodStart: this.tanggalTeks(this.periodeAwal.value),
            periodEnd: this.tanggalTeks(this.periodeAkhir.value),
            projectName: spk.projectName,
            note: this.catatan.value || null,
            items,
          }),
        );
      }
      this.snackBar.open(
        this.translate.instant('cop.tersimpan'),
        this.translate.instant('common.close'),
        { duration: 3000 },
      );
      // Kembali ke DAFTAR.
      //
      // Sebelumnya menuju layar rincian, dengan alasan potongan diisi di
      // sana. Alasan itu sudah tidak berlaku sejak potongan pindah ke
      // lembar periksa — yang baru selesai mencatat volume tidak punya
      // urusan lagi dengan dokumen ini, dan yang berikutnya dikerjakannya
      // hampir selalu CoP lain.
      this.router.navigate(['/Certificate-of-payment']);
    } catch (e) {
      // Pesan server disampaikan APA ADANYA — di situlah tertulis berapa
      // sisa pagunya dan bahwa SPK perlu diadendum.
      this.pesan(e);
    } finally {
      this.menyimpan.set(false);
    }
  }

  batal(): void {
    this.router.navigate(['/Certificate-of-payment']);
  }
}
