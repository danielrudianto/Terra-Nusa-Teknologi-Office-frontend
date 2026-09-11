import { AuditTrailEntities } from './audit-entity.constant';

import id from '../../assets/i18n/id.json';
import en from '../../assets/i18n/en.json';
import zh from '../../assets/i18n/zh.json';

/*
 * Entitas jejak audit: terdaftar DAN bernama.
 *
 * Dua kegagalan yang berbeda, keduanya tidak bersuara:
 *
 *   * Entitas yang dicatat server tetapi tidak ada di `AuditTrailEntities`
 *     tetap tersimpan — yang hilang hanya cara MENCARINYA di halaman
 *     Aktivitas. Tender, penawaran tender, kemajuan proyek, dan rencana kas
 *     semuanya pernah demikian selama berbulan-bulan.
 *
 *   * Entitas yang terdaftar tetapi tanpa terjemahan menampilkan nama
 *     kuncinya sendiri kepada pemakai: penyaringnya berbunyi
 *     "auditEntity.payment_plans", bukan "Rencana kas". Terlihat seperti
 *     layar yang rusak, dan tidak ada satu pun galat yang menyebutnya.
 *
 * Berkas terjemahan diimpor langsung — `readFileSync` tidak ada di peramban,
 * dan tanpa impor ini kelengkapan kuncinya tidak dapat diperiksa sama sekali
 * dari sisi frontend.
 */

const BERKAS: Array<[string, Record<string, unknown>]> = [
  ['id', (id as any).auditEntity],
  ['en', (en as any).auditEntity],
  ['zh', (zh as any).auditEntity],
];

describe('entitas jejak audit', () => {
  it('memuat tender dan penawaran tender', () => {
    // Keduanya dicatat `TenderRepository` sejak awal, tetapi tidak pernah
    // dapat disaring di halaman Aktivitas.
    expect(AuditTrailEntities).toContain('tenders');
    expect(AuditTrailEntities).toContain('tender_quotes');
  });

  it('tidak ada nama ganda', () => {
    const unik = new Set(AuditTrailEntities);
    expect(unik.size)
      .withContext('entitas ganda memunculkan pilihan yang sama dua kali')
      .toBe(AuditTrailEntities.length);
  });

  for (const [kode, kamus] of BERKAS) {
    it(`seluruhnya punya terjemahan pada ${kode}.json`, () => {
      const kurang = AuditTrailEntities.filter((e) => !(e in (kamus ?? {})));
      expect(kurang)
        .withContext(
          `tanpa terjemahan, penyaringnya menampilkan "auditEntity.<nama>"`,
        )
        .toEqual([]);
    });
  }
});
