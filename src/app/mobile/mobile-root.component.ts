import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Akar aplikasi mobile.
 *
 * Namanya `app-mobile-root`, BUKAN `app-root`. Keduanya hidup di satu
 * kumpulan sumber; selector yang sama membuat berkas index yang keliru
 * memuat aplikasi yang keliru — dan gejalanya halaman putih tanpa galat.
 */
@Component({
  selector: 'app-mobile-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class MobileRootComponent {}
