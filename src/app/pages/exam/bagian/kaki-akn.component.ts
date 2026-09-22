import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { AknLogoComponent } from './akn-logo.component';

/**
 * Kaki halaman ujian — meniru kaki situs alphakonstruksi.id: pita gelap
 * berisi kontak kantor, lalu bilah hak cipta berhuruf kapital.
 *
 * Kontaknya DISALIN dari situs perusahaan; bila di sana berubah, ubah juga
 * di sini (satu tempat: `KONTAK` di bawah).
 */
export const KONTAK = {
  kantor: 'Ruko Asia Tropis blok AT12 no. 21, Kota Harapan Indah, Kab. Bekasi',
  surel: 'marketing@alphakonstruksi.id',
  telepon: '+62 811-902-590',
  wa: '62811902590',
  situs: 'https://www.alphakonstruksi.id',
};

@Component({
  selector: 'app-kaki-akn',
  standalone: true,
  imports: [TranslateModule, AknLogoComponent],
  template: `
    <footer class="kka">
      @if (kontak) {
        <div class="kka-pita" [class.kka-pita--sempit]="kontakSempitSaja">
          <div class="kka-kepala">
            <app-akn-logo [terang]="true" />
            <p class="kka-lini">Bored pile · Soldier pile · Secant pile</p>
          </div>
          <dl class="kka-info">
            <div class="kka-item">
              <dt>{{ 'exam.kaki.kantor' | translate }}</dt>
              <dd>{{ k.kantor }}</dd>
            </div>
            <div class="kka-item">
              <dt>{{ 'exam.kaki.jam' | translate }}</dt>
              <dd>{{ 'exam.kaki.jamIsi' | translate }}</dd>
            </div>
            <div class="kka-item">
              <dt>{{ 'exam.kaki.surel' | translate }}</dt>
              <dd><a [href]="'mailto:' + k.surel">{{ k.surel }}</a></dd>
            </div>
            <div class="kka-item">
              <dt>{{ 'exam.kaki.telepon' | translate }}</dt>
              <dd>
                <a [href]="'https://wa.me/' + k.wa" target="_blank" rel="noopener">{{
                  k.telepon
                }}</a>
              </dd>
            </div>
          </dl>
        </div>
      }
      <div class="kka-bar">
        <span>© {{ tahun }} PT Alpha Konstruksi Nusantara</span>
        <a [href]="k.situs" target="_blank" rel="noopener">alphakonstruksi.id</a>
      </div>
    </footer>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .kka {
        --kka-bg: color-mix(in srgb, var(--akn-dark, #5e4424) 30%, #111214);
        --kka-garis: color-mix(in srgb, var(--akn, #bd925b) 45%, transparent);
        --kka-label: color-mix(in srgb, var(--akn, #bd925b) 55%, #fff);
        font-family: 'Barlow', 'Montserrat', sans-serif;
        background: var(--kka-bg);
        color: #fff;
      }
      .kka-pita {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
        gap: 1.5rem clamp(20px, 3vw, 48px);
        padding: 2.25rem clamp(20px, 4vw, 48px);
      }
      .kka-kepala app-akn-logo {
        font-size: 1.05rem;
      }
      .kka-lini {
        margin: 0.85rem 0 0;
        font-size: 0.78rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--kka-label);
      }
      .kka-info {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
        gap: 0.9rem 1.5rem;
        margin: 0;
      }
      .kka-item {
        border-top: 1px solid var(--kka-garis);
        padding-top: 0.45rem;
      }
      .kka-item dt {
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--kka-label);
      }
      .kka-item dd {
        margin: 0.2rem 0 0;
        font-size: 0.88rem;
        line-height: 1.55;
        color: #fff;
        white-space: pre-line;
      }
      .kka a {
        color: inherit;
        text-decoration: none;
        border-bottom: 1px solid var(--kka-garis);
      }
      .kka a:hover {
        border-bottom-color: #fff;
      }
      .kka-bar {
        display: flex;
        justify-content: space-between;
        gap: 0.75rem;
        flex-wrap: wrap;
        padding: 0.8rem clamp(20px, 4vw, 48px);
        border-top: 1px solid var(--kka-garis);
        font-size: 0.72rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--kka-label);
      }
      .kka-bar a {
        border-bottom: 0;
      }
      /* Di layar lebar kontaknya sudah ada di panel kanan halaman depan. */
      @media (min-width: 901px) {
        .kka-pita--sempit {
          display: none;
        }
      }
    `,
  ],
})
export class KakiAknComponent {
  @Input() kontak = true;
  /** Pita kontak hanya di layar sempit (halaman depan). */
  @Input() kontakSempitSaja = false;
  readonly k = KONTAK;
  readonly tahun = new Date().getFullYear();
}
