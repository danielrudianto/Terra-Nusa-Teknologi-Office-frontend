import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Bentuk yang bukan badan usaha — tidak ditampilkan sebagai akhiran. */
const BUKAN_BADAN = ['pribadi', 'lainnya', 'perorangan'];

/**
 * Nama badan usaha -> { nama, bentuk } untuk tampilan daftar.
 *
 * Bentuknya (PT., CV., UD., Yayasan) diambil dari kolom `prefix`. Nama yang
 * terlanjur tersimpan dengan bentuknya di depan ("PT. Aldmic Indonesia")
 * atau di belakang ("Aldmic Indonesia, PT.") dibersihkan, supaya bentuknya
 * tidak tertulis dua kali.
 */
export function pisahNamaBadan(
  nama?: string | null,
  bentuk?: string | null,
): { nama: string; bentuk: string } {
  let n = String(nama ?? '').trim();
  let b = String(bentuk ?? '').trim();
  if (BUKAN_BADAN.includes(b.toLowerCase())) b = '';

  // ", PT." di belakang (sisa pemilih lama) — dipakai sebagai bentuk bila
  // kolom prefiksnya kosong.
  const belakang = n.match(/,\s*(pt\.?|cv\.?|ud\.?|yayasan|pribadi|lainnya|perorangan)\s*$/i);
  if (belakang) {
    n = n.slice(0, belakang.index).trim();
    if (!b && !BUKAN_BADAN.includes(belakang[1].toLowerCase())) b = belakang[1];
  }

  // Bentuk di depan nama: "PT. Aldmic" / "PT Aldmic".
  const inti = b.replace(/\.$/, '');
  if (inti) {
    const depan = new RegExp(`^${inti.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.?\\s+`, 'i');
    n = n.replace(depan, '').trim();
  }
  return { nama: n, bentuk: b };
}

/**
 * Nama pemasok/klien untuk TABEL, seperti daftar klien:
 * **Aldmic Indonesia**<span redup>, PT.</span>
 *
 *   <app-nama-badan [nama]="s.name" [bentuk]="s.prefix" />
 *
 * Tebal namanya mengikuti induknya (sel `*-primary`); akhirannya selalu
 * redup dan tidak tebal. Gayanya global (`.nb__bentuk` di styles.scss).
 */
@Component({
  selector: 'app-nama-badan',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ bagian.nama || '—' }}@if (bagian.bentuk && bagian.nama) {<span class="nb__bentuk">, {{ bagian.bentuk }}</span>}`,
})
export class NamaBadanComponent {
  @Input() nama: string | null | undefined;
  @Input() bentuk: string | null | undefined;

  get bagian() {
    return pisahNamaBadan(this.nama, this.bentuk);
  }
}

/** Huruf pertama NAMA (bukan bentuknya) — untuk lencana bundar. */
export function inisialBadan(nama?: string | null, bentuk?: string | null): string {
  const n = pisahNamaBadan(nama, bentuk).nama;
  return n ? n.charAt(0).toUpperCase() : '?';
}
