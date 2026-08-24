import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
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
    TranslateModule,
    HeaderTitleComponent,
  ],
  templateUrl: './certificate-of-payment-create.component.html',
  styleUrl: './certificate-of-payment-create.component.scss',
})
export class CertificateOfPaymentCreateComponent implements OnInit {
  private readonly service = inject(CertificateOfPaymentService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);
  private readonly izin = inject(PermissionService);

  /** Id CoP bila sedang MENYUNTING; kosong bila membuat baru. */
  copId: number | null = null;

  readonly memuat = signal(false);
  readonly menyimpan = signal(false);

  readonly spkList = signal<SpkKandidat[]>([]);
  readonly spkTerpilih = signal<SpkKandidat | null>(null);
  readonly baris = signal<BarisPagu[]>([]);

  /** Volume yang diketik, per `purchaseOrderItemID`. */
  readonly isian = signal<Record<number, number | null>>({});
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
  readonly periodeAwal = new FormControl<Date | null>(null);
  readonly periodeAkhir = new FormControl<Date | null>(null);
  readonly catatan = new FormControl<string>('');
  readonly cariSpk = new FormControl<string>('');

  /**
   * Boleh melihat nilai rupiah?
   *
   * Cerminan `LEVEL_COP_LIHAT_NILAI` di server. Dipakai HANYA untuk memutuskan
   * kolomnya digambar atau tidak — bukan sebagai pengamanan. Yang mengamankan
   * adalah server yang tidak mengirimkan angkanya.
   */
  readonly bolehLihatNilai = computed(() => this.izin.level() >= 2);

  get kolom(): string[] {
    const dasar = ['pekerjaan', 'satuan', 'pagu', 'terpakai', 'sisa', 'volume'];
    return this.bolehLihatNilai()
      ? [...dasar, 'harga', 'jumlah', 'catatan']
      : [...dasar, 'catatan'];
  }

  /** Sampaikan pesan server APA ADANYA — di situlah sisa pagu tertulis. */
  private pesan(e: any): void {
    this.snackBar.open(
      this.pesanServer.terjemahkan(e),
      this.translate.instant('common.close'),
      { duration: 6000 },
    );
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    this.copId = id ? Number(id) : null;

    await this.muatSpk();

    if (this.copId) {
      await this.muatUntukSunting(this.copId);
      return;
    }

    // Datang dari layar SPK dengan `?spk=<id>`: langsung pilihkan.
    const dariSpk = this.route.snapshot.queryParamMap.get('spk');
    if (dariSpk) {
      const ada = this.spkList().find((s) => s.id === Number(dariSpk));
      if (ada) await this.pilihSpk(ada);
    }
  }

  async muatSpk(): Promise<void> {
    this.memuat.set(true);
    try {
      const hasil = (await firstValueFrom(
        this.service.daftarSpk(undefined, this.cariSpk.value || undefined),
      )) as SpkKandidat[];
      this.spkList.set(hasil || []);
    } catch (e) {
      this.pesan(e);
    } finally {
      this.memuat.set(false);
    }
  }

  async pilihSpkById(id: number | null): Promise<void> {
    const spk = this.spkList().find((s) => s.id === id);
    if (spk) await this.pilihSpk(spk);
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
      this.memuat.set(false);
    }
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
      await this.muatPagu(cop.purchaseOrderID);

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

  setNilai(barisId: number, nilai: string): void {
    const angka = nilai === '' ? null : Number(nilai);
    this.isian.update((s) => ({ ...s, [barisId]: angka }));
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

  get adaIsian(): boolean {
    return Object.values(this.isian()).some((v) => v !== null && v > 0);
  }

  jumlahBaris(b: BarisPagu): number | null {
    if (!this.bolehLihatNilai() || b.price === undefined) return null;
    const v = this.nilai(b.purchaseOrderItemID);
    return v === null ? null : v * b.price;
  }

  get totalNilai(): number | null {
    if (!this.bolehLihatNilai()) return null;
    return this.baris().reduce((t, b) => t + (this.jumlahBaris(b) || 0), 0);
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

    const items = this.susunItems();
    if (!items.length) {
      this.snackBar.open(
        this.translate.instant('cop.isiMinimalSatu'),
        this.translate.instant('common.close'),
        { duration: 4000 },
      );
      return;
    }

    this.menyimpan.set(true);
    try {
      if (this.copId) {
        await firstValueFrom(
          this.service.ubah(this.copId, {
            date: this.tanggalTeks(this.tanggal.value) || undefined,
            periodStart: this.tanggalTeks(this.periodeAwal.value),
            periodEnd: this.tanggalTeks(this.periodeAkhir.value),
            note: this.catatan.value || null,
            items,
          }),
        );
      } else {
        await firstValueFrom(
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
