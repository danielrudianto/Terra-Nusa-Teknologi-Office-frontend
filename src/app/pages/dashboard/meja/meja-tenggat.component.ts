import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { RupiahComponent } from 'src/app/components/rupiah/rupiah.component';
import { RUTE_TENGGAT } from './meja';

export interface ItemTenggat {
  jenis: string;
  tanggal: string;
  lewat: boolean;
  jumlah?: number;
  nilai?: number;
  judul?: string;
  kode?: string;
  masa?: string;
  id?: number;
}

/** Ikon tiap jenis tenggat. */
const IKON: Record<string, string> = {
  rencanaKeluar: 'event_upcoming',
  pembayaranTerjadwal: 'payments',
  hutangJatuhTempo: 'receipt_long',
  tenderTutup: 'gavel',
  pajak: 'account_balance',
};

/**
 * Tenggat tujuh hari ke depan, ditambah yang sudah terlewat dan masih
 * menggantung. Dikelompokkan per tanggal; yang terlewat di paling atas.
 * Sumber yang tidak boleh dilihat tidak dikirim server sama sekali.
 */
@Component({
  selector: 'app-meja-tenggat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, RouterModule, TranslatePipe, RupiahComponent],
  templateUrl: './meja-tenggat.component.html',
  styleUrl: './meja.shared.scss',
})
export class MejaTenggatComponent {
  private readonly api = inject(ApiService);

  readonly ringkasan = output<{ jumlah: number; lewat: number }>();

  readonly memuat = signal(true);
  readonly gagalMuat = signal(false);
  readonly item = signal<ItemTenggat[]>([]);
  readonly sumberGagal = signal<string[]>([]);
  readonly hariIni = signal('');

  readonly lewat = computed(() => this.item().filter((x) => x.lewat));

  /** Yang belum lewat, dikelompokkan per tanggal. */
  readonly perTanggal = computed(() => {
    const peta = new Map<string, ItemTenggat[]>();
    for (const x of this.item()) {
      if (x.lewat) continue;
      (peta.get(x.tanggal) ?? peta.set(x.tanggal, []).get(x.tanggal)!).push(x);
    }
    return [...peta.entries()].map(([tanggal, isi]) => ({ tanggal, isi }));
  });

  /** Ringkasan yang terlewat per jenis: satu baris, bukan satu per tanggal. */
  readonly lewatPerJenis = computed(() => {
    const peta = new Map<string, { jenis: string; jumlah: number; nilai: number; tertua: string }>();
    for (const x of this.lewat()) {
      const e = peta.get(x.jenis) ?? { jenis: x.jenis, jumlah: 0, nilai: 0, tertua: x.tanggal };
      e.jumlah += Number(x.jumlah) || 1;
      e.nilai += Number(x.nilai) || 0;
      if (x.tanggal < e.tertua) e.tertua = x.tanggal;
      peta.set(x.jenis, e);
    }
    return [...peta.values()];
  });

  readonly ikon = IKON;
  readonly rute = RUTE_TENGGAT;

  constructor() {
    void this.muat();
  }

  async muat(): Promise<void> {
    this.memuat.set(true);
    this.gagalMuat.set(false);
    try {
      const res: any = await firstValueFrom(this.api.get('dashboard/tenggat', { hari: 7 }));
      this.item.set(Array.isArray(res?.item) ? res.item : []);
      this.sumberGagal.set(Array.isArray(res?.gagal) ? res.gagal : []);
      this.hariIni.set(String(res?.hariIni ?? ''));
    } catch {
      this.item.set([]);
      this.gagalMuat.set(true);
    } finally {
      this.memuat.set(false);
      const semua = this.item();
      this.ringkasan.emit({
        jumlah: semua.filter((x) => !x.lewat).length,
        lewat: semua.filter((x) => x.lewat).length,
      });
    }
  }

  /** "Hari ini", "Besok", atau tanggalnya. */
  labelTanggal(tgl: string): string {
    const hari = this.hariIni();
    if (tgl === hari) return 'meja.hariIni';
    const d = new Date(`${hari}T00:00:00`);
    d.setDate(d.getDate() + 1);
    const besok = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return tgl === besok ? 'meja.besok' : '';
  }

  /** Kunci terjemahan uraian satu item. */
  uraian(x: ItemTenggat): string {
    return x.jenis === 'pajak' ? `meja.pajak.${x.kode}` : `meja.tenggat.${x.jenis}`;
  }
}
