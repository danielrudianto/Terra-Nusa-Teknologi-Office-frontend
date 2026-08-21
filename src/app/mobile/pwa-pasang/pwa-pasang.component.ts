import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

import { PwaPasangService } from '../../services/pwa-pasang.service';

/**
 * Kartu "Pasang aplikasi" — ditawarkan di layar masuk dan di Pengaturan.
 *
 * Menampilkan dirinya HANYA bila memang ada yang bisa dilakukan: promptnya
 * tersedia (Android), atau ini iOS yang bisa dipasang manual. Sudah terpasang
 * -> tidak muncul. Logikanya di `PwaPasangService`; di sini hanya tampilan.
 */
@Component({
  selector: 'app-pwa-pasang',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, TranslatePipe],
  templateUrl: './pwa-pasang.component.html',
  styleUrls: ['./pwa-pasang.component.scss'],
})
export class PwaPasangComponent {
  readonly pwa = inject(PwaPasangService);

  async pasang(): Promise<void> {
    await this.pwa.pasang();
  }
}
