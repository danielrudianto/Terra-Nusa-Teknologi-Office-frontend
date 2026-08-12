import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Satu poin klausul pada pratinjau.
 *
 * Poin yang dinonaktifkan dibungkus `<s>…</s>` oleh perakit klausul, sehingga
 * pada dokumen tercetak tercoret. Di layar, interpolasi biasa menampilkan
 * tag itu apa adanya — pembaca melihat tulisan "<s></s>", bukan coretan.
 *
 * Dibuat sebagai komponen tersendiri, bukan `innerHTML` di tiap formulir:
 * menyisipkan HTML mentah dari enam belas tempat berarti enam belas peluang
 * memasukkan tag lain tanpa disadari. Di sini hanya dua keadaan yang
 * mungkin — tercoret atau tidak — dan teksnya selalu diperlakukan sebagai
 * teks biasa.
 */
@Component({
  selector: 'app-clause-line',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (dicoret) {
      <s class="cl-off">{{ teks }}</s>
    } @else {
      {{ teks }}
    }
  `,
  styles: [
    `
      .cl-off {
        color: var(--faint, #9aa0ab);
      }
    `,
  ],
})
export class ClauseLineComponent {
  /** Teks poin, boleh mengandung pembungkus <s>…</s>. */
  @Input('value') value: string | string[] = '';

  private get raw(): string {
    return Array.isArray(this.value) ? '' : String(this.value ?? '');
  }

  get dicoret(): boolean {
    return /^\s*<s>[\s\S]*<\/s>\s*$/i.test(this.raw);
  }

  /** Teks tanpa pembungkusnya; sisa tag lain ikut dibuang. */
  get teks(): string {
    return this.raw
      .replace(/^\s*<s>/i, '')
      .replace(/<\/s>\s*$/i, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .trim();
  }
}
