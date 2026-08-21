import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SettingsService } from '../services/setting.service';
import { LanguageService } from '../services/language.service';
import { VersiService } from '../services/versi.service';

/**
 * Akar aplikasi mobile.
 *
 * Namanya `app-mobile-root`, BUKAN `app-root`. Keduanya hidup di satu
 * kumpulan sumber; selector yang sama membuat berkas index yang keliru
 * memuat aplikasi yang keliru — dan gejalanya halaman putih tanpa galat.
 *
 * MENERAPKAN SETELAN TERSIMPAN
 *
 * Tema dan bahasa disimpan di localStorage, tetapi hanya BERLAKU setelah
 * `init()` dipanggil. Di aplikasi desktop itu dilakukan `AppComponent`; di
 * mobile tidak ada yang memanggilnya — sehingga tiap muat ulang, tema kembali
 * ke terang walau pengguna sudah memilih gelap. Dipanggil di sini supaya
 * setelannya menempel.
 */
@Component({
  selector: 'app-mobile-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class MobileRootComponent implements OnInit {
  private readonly settings = inject(SettingsService);
  private readonly language = inject(LanguageService);
  private readonly versi = inject(VersiService);

  ngOnInit(): void {
    this.settings.init();
    this.language.init();
    /*
     * Pemantau versi DIMULAI di sini juga.
     *
     * Di desktop `AppComponent` yang memanggilnya; mobile tidak, sehingga
     * `adaPembaruan` tidak pernah menyala dan tombol "muat pembaruan" di
     * Pengaturan tidak pernah muncul — pengguna terjebak di build lama tanpa
     * tahu ada yang baru. Dipanggil di sini supaya perilakunya sama dengan
     * desktop.
     */
    this.versi.mulai();
  }
}
