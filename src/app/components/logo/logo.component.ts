import { Component, Input } from '@angular/core';

/**
 * Logo TERRABOT dalam bentuk SVG.
 *
 * Sebelumnya PNG, sehingga warnanya tidak bisa mengikuti aksen yang dipilih
 * pengguna. Bidang utamanya kini memakai `var(--brand)` — variabel yang sama
 * dengan yang diubah saat aksen diganti — jadi warnanya menyesuaikan seketika.
 *
 * Lencana bintang sengaja tetap hijau: perannya sebagai warna penegas, bukan
 * bagian dari palet aksen.
 */
@Component({
  selector: 'app-logo',
  standalone: true,
  templateUrl: './logo.component.html',
  styleUrl: './logo.component.scss',
})
export class LogoComponent {
  /** Sisi logo dalam piksel; lebar dan tinggi selalu sama. */
  @Input() size = 38;
}
