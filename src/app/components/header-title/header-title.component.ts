import { CommonModule, Location } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-header-title',
  imports: [CommonModule, MatIconModule, TranslatePipe],
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
    this.onActionButtonClicked.emit();
  }
}
