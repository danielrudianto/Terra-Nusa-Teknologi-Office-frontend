import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/**
 * Label aksi/entitas jejak audit — TIDAK PERNAH menampilkan kunci mentah.
 *
 * Server menulis nama aksi & tabel apa adanya (`hapus_pelamar`,
 * `hr_candidates`). Bila terjemahannya belum ada, pipa `translate` biasa
 * menampilkan "audit.hapus_pelamar" — terlihat rusak. Di sini jatuhnya ke
 * teks yang dirapikan ("Hapus pelamar"), jadi aksi baru di server tetap
 * terbaca walau kamus belum menyusul.
 *
 *   {{ e.action | auditLabel: 'audit' }}
 *   {{ e.entity | auditLabel: 'auditEntity' }}
 */
@Pipe({ name: 'auditLabel', standalone: true, pure: false })
export class AuditLabelPipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(nilai: string | null | undefined, awalan: 'audit' | 'auditEntity'): string {
    const mentah = String(nilai ?? '');
    if (!mentah) return '';
    const kunci = `${awalan}.${mentah}`;
    const hasil = this.translate.instant(kunci);
    return hasil && hasil !== kunci ? hasil : rapikan(mentah);
  }
}

/** `hapus_pelamar` → "Hapus pelamar"; `laporan:laba_rugi` → "Laporan laba rugi". */
export function rapikan(mentah: string): string {
  const t = mentah.replace(/[_:.-]+/g, ' ').trim().toLowerCase();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}
