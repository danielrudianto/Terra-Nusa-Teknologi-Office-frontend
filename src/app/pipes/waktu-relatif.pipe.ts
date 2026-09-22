import { formatDate } from '@angular/common';
import { Inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';

/**
 * "5 menit lalu", "kemarin", "3 hari lalu" — untuk KAPAN sesuatu terjadi,
 * bukan untuk tanggal dokumen.
 *
 *   <span [title]="e.createdAt | date: 'dd MMM yyyy HH:mm'">
 *     {{ e.createdAt | waktuRelatif }}
 *   </span>
 *
 * Lebih dari TUJUH hari kembali ke tanggal biasa: "5 bulan lalu" di jejak
 * audit memaksa pembacanya menghitung mundur, sedangkan yang dicari di sana
 * justru tanggalnya. Tanggal lengkapnya tetap disediakan lewat `title`.
 *
 * Murni (pure): diperbarui saat halamannya berubah, bukan tiap detik. Daftar
 * yang dibuka setengah jam boleh menulis "5 menit lalu" untuk yang kini 35
 * menit — layar lain di aplikasi ini juga tidak memperbarui dirinya sendiri.
 */
@Pipe({ name: 'waktuRelatif', standalone: true })
export class WaktuRelatifPipe implements PipeTransform {
  constructor(@Inject(LOCALE_ID) private locale: string) {}

  transform(nilai: string | number | Date | null | undefined, kini: number = Date.now()): string {
    if (nilai === null || nilai === undefined || nilai === '') return '—';
    const t = new Date(nilai).getTime();
    if (!Number.isFinite(t)) return '—';
    return waktuRelatif(t, kini, this.locale);
  }
}

export function waktuRelatif(t: number, kini: number, locale: string): string {
  const detik = Math.round((t - kini) / 1000);
  const abs = Math.abs(detik);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (abs < 45) return rtf.format(0, 'second');
  if (abs < 3600) return rtf.format(Math.round(detik / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(detik / 3600), 'hour');
  if (abs < 7 * 86400) return rtf.format(Math.round(detik / 86400), 'day');
  return formatDate(t, 'dd MMM yyyy HH:mm', locale);
}
