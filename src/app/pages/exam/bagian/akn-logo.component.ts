import { Component, Input } from '@angular/core';

/**
 * Logo PT Alpha Konstruksi Nusantara: tanda segitiga + tulisan.
 *
 * Digambar ulang sebagai SVG dari kop surat resmi
 * (`templates/pdf/assets/kop.png`) — berkas PNG yang ada hanya 95 px dan
 * pecah di layar retina. Warnanya TETAP oranye AKN, tidak ikut palet
 * pilihan pelamar: logo adalah identitas, bukan hiasan.
 */
@Component({
  selector: 'app-akn-logo',
  standalone: true,
  template: `
    <span class="akl" [class.akl--terang]="terang">
      <svg class="akl-tanda" viewBox="0 0 52 38" aria-hidden="true">
        <polygon points="26,1 22,6 30,6" />
        <polygon points="17.5,11 23.5,11 23.5,28 0.5,36" />
        <polygon points="28.5,11 34.5,11 51.5,36 28.5,28" />
      </svg>
      <span class="akl-teks">
        <span class="akl-atas">Alpha Konstruksi</span>
        <span class="akl-bawah">Nusantara</span>
      </span>
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }
      .akl {
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        color: var(--ink, #16181d);
      }
      .akl--terang {
        color: #fff;
      }
      .akl-tanda {
        flex: 0 0 auto;
        width: 2.4em;
        height: auto;
        fill: #dd8840;
      }
      .akl-teks {
        display: flex;
        flex-direction: column;
        font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
        text-transform: uppercase;
        line-height: 1;
      }
      .akl-atas {
        font-size: 0.72em;
        font-weight: 600;
        letter-spacing: 0.08em;
      }
      .akl-bawah {
        font-size: 1.15em;
        font-weight: 700;
        letter-spacing: 0.06em;
      }
    `,
  ],
})
export class AknLogoComponent {
  /** Tulisan putih — untuk latar gelap. */
  @Input() terang = false;
}
