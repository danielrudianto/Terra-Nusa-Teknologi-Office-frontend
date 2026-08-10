import { CommonModule, Location } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header-title',
  imports: [CommonModule, MatIconModule],
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
