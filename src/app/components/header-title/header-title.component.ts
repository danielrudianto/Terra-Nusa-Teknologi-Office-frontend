import { CommonModule, Location } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { PermissionService } from '../../services/permission.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-header-title',
  imports: [CommonModule, MatIconModule, MatTooltipModule, TranslatePipe],
  templateUrl: './header-title.component.html',
  styleUrl: './header-title.component.scss',
})
export class HeaderTitleComponent {
  constructor(
    private router: Router,
    private location: Location,
  ) {}

  @Input('title') title!: string;
  @Input('description') description!: string;
  @Input('actionButtonLabel') actionButtonLabel: string | null = null;

  /**
   * Izin yang dituntut tombol tindakan, mis. `'master_item:create'`.
   *
   * Bila diisi dan penggunanya tidak memilikinya, tombolnya digambar tetapi
   * DIMATIKAN, dengan keterangan sebabnya saat disentuh.
   *
   * Dimatikan, bukan disembunyikan. Keduanya sama-sama mencegah, tetapi
   * yang membacanya berbeda: tombol yang hilang tidak dapat dibedakan dari
   * fitur yang memang tidak ada, sehingga yang membutuhkannya bertanya ke
   * sana kemari atau menyimpulkan aplikasinya kurang lengkap. Tombol yang
   * mati beserta sebabnya mengatakan dua hal sekaligus — fiturnya ada, dan
   * yang perlu dilakukan adalah meminta aksesnya.
   *
   * Yang JAUH lebih buruk daripada keduanya adalah tombol yang hidup lalu
   * gagal saat disimpan: pengguna sudah mengisi seluruh formulir sebelum
   * diberi tahu ia tidak berwenang. Itu keadaan yang diperbaiki di sini.
   *
   * Penjaga sesungguhnya tetap di server; ini hanya agar penolakannya
   * terbaca sebelum pekerjaannya dimulai, bukan sesudah.
   */
  @Input('actionButtonPermission') actionButtonPermission: string | null = null;

  private readonly izin = inject(PermissionService);

  /**
   * Tombol tindakan sedang dimatikan karena izin.
   *
   * `permissions()` adalah sinyal dan izin dimuat SETELAH layar tampil,
   * jadi tombolnya menyala sendiri begitu petanya masuk — tanpa perlu
   * memuat ulang halaman.
   */
  get tindakanTerkunci(): boolean {
    if (!this.actionButtonPermission) return false;
    const [modul, aksi] = this.actionButtonPermission.split(':');
    if (!modul || !aksi) return false;
    return !this.izin.can(modul, aksi);
  }

  /**
   * Tautan kembali; ditampilkan sebagai panah di kiri judul.
   *
   * Halaman pembuatan PO sebelumnya tidak punya jalan kembali sama sekali,
   * sehingga satu-satunya cara keluar adalah lewat menu samping.
   */
  @Input('backLink') backLink: string | any[] | null = null;
  @Input('backLabel') backLabel: string | null = null;

  /**
   * Tampilkan tombol ganti jenis purchase order.
   *
   * Setelah masuk ke salah satu formulir, jenisnya tidak dapat diubah:
   * satu-satunya jalan keluar adalah tombol kembali peramban, dan itu
   * membuat pengguna merasa terjebak ketika salah pilih di awal.
   */
  @Input('showChangeType') showChangeType = false;
  /** Kode jenis PO, mis. "A" atau "6.3.1". */
  @Input('typeCode') typeCode: string = '';
  /** Nama jenisnya, mis. "Transportasi". */
  @Input('typeName') typeName: string = '';
  @Output('changeType') changeType = new EventEmitter<void>();

  @Output('back') back = new EventEmitter<void>();

  onBack() {
    this.back.emit();
    if (this.backLink) {
      this.router.navigate(
        Array.isArray(this.backLink) ? this.backLink : [this.backLink],
      );
    } else {
      this.location.back();
    }
  }

  @Output('onActionButtonClicked') onActionButtonClicked: EventEmitter<void> =
    new EventEmitter();

  actionButtonClicked() {
    // Penjagaan kedua, di samping atribut `disabled` pada tombolnya.
    // Peristiwa klik masih dapat sampai lewat papan ketik pada sebagian
    // peramban, dan memancarkannya berarti membuka formulir yang sudah
    // pasti ditolak server.
    if (this.tindakanTerkunci) return;
    this.onActionButtonClicked.emit();
  }
}
