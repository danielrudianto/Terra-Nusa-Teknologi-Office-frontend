import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuditLabelPipe, rapikan } from './audit-label.pipe';

describe('AuditLabelPipe — tidak pernah menampilkan kunci mentah', () => {
  let pipa: AuditLabelPipe;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TranslateModule.forRoot()] });
    const t = TestBed.inject(TranslateService);
    t.setTranslation('id', { audit: { create: 'Dibuat' } });
    t.use('id');
    pipa = TestBed.runInInjectionContext(() => new AuditLabelPipe());
  });

  it('memakai terjemahan bila ada', () => {
    expect(pipa.transform('create', 'audit')).toBe('Dibuat');
  });

  it('aksi baru tanpa terjemahan jatuh ke teks yang dirapikan', () => {
    expect(pipa.transform('hapus_pelamar', 'audit')).toBe('Hapus pelamar');
    expect(pipa.transform('hr_candidates', 'auditEntity')).toBe('Hr candidates');
  });

  it('merapikan pemisah', () => {
    expect(rapikan('laporan:laba_rugi')).toBe('Laporan laba rugi');
  });
});
