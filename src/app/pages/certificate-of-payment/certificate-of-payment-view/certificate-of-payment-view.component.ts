import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import {
  CertificateOfPayment,
  CertificateOfPaymentService,
  SyaratSpk,
} from 'src/app/services/certificate-of-payment.service';
import { PermissionService } from 'src/app/services/permission.service';
import { ServerMessageService } from 'src/app/services/server-message.service';

/**
 * Layar baca Certificate of Payment — sekaligus tempat memeriksa & menyetujui.
 *
 * Yang memeriksa perlu MEMBACA isinya lebih dulu, bukan menekan tombol dari
 * daftar tanpa membuka apa pun. Karena itu kedua tombol itu ada di sini,
 * bukan hanya di daftar.
 */
@Component({
  selector: 'app-certificate-of-payment-view',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    TranslateModule,
    HeaderTitleComponent,
  ],
  templateUrl: './certificate-of-payment-view.component.html',
  styleUrl: './certificate-of-payment-view.component.scss',
})
export class CertificateOfPaymentViewComponent implements OnInit {
  private readonly service = inject(CertificateOfPaymentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);
  readonly izin = inject(PermissionService);

  readonly cop = signal<CertificateOfPayment | null>(null);
  readonly memuat = signal(false);
  readonly bekerja = signal(false);

 readonly menyuntingPenyesuaian = signal(false);
  readonly menyimpanPenyesuaian = signal(false);


  readonly bolehLihatNilai = computed(() => this.izin.level() >= 2);
  readonly bolehPeriksa = computed(() => this.izin.level() >= 2);
  readonly bolehSetujui = computed(() => this.izin.level() >= 3);

  get kolom(): string[] {
    const dasar = ['pekerjaan', 'satuan', 'volume'];
    return this.bolehLihatNilai()
      ? [...dasar, 'harga', 'jumlah', 'catatan']
      : [...dasar, 'catatan'];
  }

  ngOnInit(): void {
    void this.muat();
  }

  private pesan(e: any): void {
    this.snackBar.open(
      this.pesanServer.terjemahkan(e),
      this.translate.instant('common.close'),
      { duration: 6000 },
    );
  }

  async muat(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) return;
    this.memuat.set(true);
    try {
      const hasil = (await firstValueFrom(
        this.service.detail(id),
      )) as CertificateOfPayment;
      this.cop.set(hasil);
    } catch (e) {
      this.pesan(e);
    } finally {
      this.memuat.set(false);
    }
  }

  get total(): number | null {
    const c = this.cop();
    if (!this.bolehLihatNilai() || !c?.items) return null;
    return c.items.reduce((t, i) => t + Number(i.amount || 0), 0);
  }

  async periksa(checked: boolean): Promise<void> {
    const c = this.cop();
    if (!c) return;
    this.bekerja.set(true);
    try {
      await firstValueFrom(this.service.periksa(c.id, checked));
      await this.muat();
    } catch (e) {
      this.pesan(e);
    } finally {
      this.bekerja.set(false);
    }
  }

  async setujui(): Promise<void> {
    const c = this.cop();
    if (!c) return;
    this.bekerja.set(true);
    try {
      await firstValueFrom(this.service.setujui(c.id));
      await this.muat();
    } catch (e) {
      this.pesan(e);
    } finally {
      this.bekerja.set(false);
    }
  }

  ubah(): void {
    const c = this.cop();
    if (c) this.router.navigate(['/Certificate-of-payment/Edit', c.id]);
  }

  /**
   * Buka lembar periksa.
   *
   * Tandanya dibubuhkan DI SANA, sebagai akibat menyimpan — bukan di sini
   * sebagai tindakan tersendiri. Lihat catatan pada rute `Periksa/:id`.
   */
  bukaPeriksa(): void {
    const c = this.cop();
    if (c) this.router.navigate(['/Certificate-of-payment/Periksa', c.id]);
  }

  // ---- unduh ----------------------------------------------------------

  readonly mengunduh = signal(false);

  async unduh(hanyaBap = false): Promise<void> {
    const c = this.cop();
    if (!c) return;
    this.mengunduh.set(true);
    try {
      const berkas = (await firstValueFrom(
        hanyaBap ? this.service.unduhBap(c.id) : this.service.unduhPdf(c.id),
      )) as Blob;
      const aman = (c.name || 'CoP').replace(/\//g, '-');
      this.simpanBerkas(berkas, `${aman}${hanyaBap ? '-BAP' : ''}.pdf`);
    } catch (e) {
      this.pesan(e);
    } finally {
      this.mengunduh.set(false);
    }
  }

  /** URL sementaranya dicabut setelah dipakai supaya tidak menahan memori. */
  private simpanBerkas(blob: Blob, nama: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nama;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---- potongan & tambahan -------------------------------------------

  /**
   * Syarat pembayaran menurut SPK.
   *
   * Yang tersisa di layar ini dari seluruh urusan potongan: panel sisa uang
   * muka & retensi, yang sifatnya KETERANGAN. Penyuntingannya sendiri sudah
   * pindah ke lembar periksa — dua tempat mengerjakan satu pekerjaan yang
   * sama membuat urutannya tidak pernah jelas, dan yang membukanya harus
   * menebak apakah menyimpan potongan sudah berarti memeriksa.
   */
  get syarat(): SyaratSpk | null {
    return this.cop()?.spkSyarat || null;
  }
}
