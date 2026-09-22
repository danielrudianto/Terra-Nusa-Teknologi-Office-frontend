import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Garis tren mini (sparkline) — SVG murni, tanpa Chart.js.
 *
 *   <app-garis-mini [nilai]="[10, 12, 9, 15]" />
 *
 * Sengaja tanpa sumbu, label, dan tooltip: gunanya menjawab "naik atau
 * turun, dan seberapa bergejolak" dalam satu lirikan, di sebelah angka
 * yang sudah tertulis besar. Angka persisnya tetap di kartu itu sendiri.
 *
 * Warnanya mengikuti ARAH ujung ke ujung: hijau bila titik terakhir di atas
 * titik pertama, merah bila di bawah, netral bila sama. Nilai null
 * dilewati (bulan tanpa data) — garisnya tidak jatuh ke nol di sana.
 */
@Component({
  selector: 'app-garis-mini',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (jalur) {
      <svg
        class="gm"
        [class.gm--naik]="arah === 'naik'"
        [class.gm--turun]="arah === 'turun'"
        [attr.viewBox]="'0 0 ' + lebar + ' ' + tinggi"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path class="gm__isi" [attr.d]="jalurIsi" />
        <path class="gm__garis" [attr.d]="jalur" vector-effect="non-scaling-stroke" />
        <circle class="gm__titik" [attr.cx]="ujung[0]" [attr.cy]="ujung[1]" r="2.6" />
      </svg>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 36px;
      }
      .gm {
        width: 100%;
        height: 100%;
        overflow: visible;
        color: var(--faint);
      }
      .gm--naik {
        color: var(--ok-fg);
      }
      .gm--turun {
        color: var(--bad-fg);
      }
      .gm__garis {
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linejoin: round;
        stroke-linecap: round;
      }
      .gm__isi {
        fill: currentColor;
        opacity: 0.1;
      }
      .gm__titik {
        fill: currentColor;
      }
    `,
  ],
})
export class GarisMiniComponent {
  readonly lebar = 120;
  readonly tinggi = 36;

  jalur = '';
  jalurIsi = '';
  ujung: [number, number] = [0, 0];
  arah: 'naik' | 'turun' | 'datar' = 'datar';

  @Input() set nilai(v: (number | null | undefined)[] | null | undefined) {
    const t = susunTitik(v ?? [], this.lebar, this.tinggi);
    if (t.length < 2) {
      this.jalur = '';
      return;
    }
    this.jalur = t.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    this.jalurIsi = `${this.jalur} L${t[t.length - 1][0].toFixed(1)},${this.tinggi} L${t[0][0].toFixed(1)},${this.tinggi} Z`;
    this.ujung = t[t.length - 1];
    const a = t[0][1];
    const b = t[t.length - 1][1];
    // y SVG terbalik: makin kecil makin tinggi.
    this.arah = Math.abs(a - b) < 0.01 ? 'datar' : b < a ? 'naik' : 'turun';
  }
}

/** Titik (x, y) dalam kotak lebar×tinggi; null dilewati. Diekspor untuk uji. */
export function susunTitik(
  v: (number | null | undefined)[],
  lebar: number,
  tinggi: number,
): [number, number][] {
  const n = v.length;
  const ada = v
    .map((x, i) => ({ x: Number(x), i }))
    .filter((p) => v[p.i] !== null && v[p.i] !== undefined && Number.isFinite(p.x));
  if (ada.length < 2) return [];
  const min = Math.min(...ada.map((p) => p.x));
  const max = Math.max(...ada.map((p) => p.x));
  const rentang = max - min || 1;
  const pad = 3;
  return ada.map((p) => [
    n === 1 ? 0 : (p.i / (n - 1)) * lebar,
    max === min ? tinggi / 2 : pad + (1 - (p.x - min) / rentang) * (tinggi - pad * 2),
  ]);
}
