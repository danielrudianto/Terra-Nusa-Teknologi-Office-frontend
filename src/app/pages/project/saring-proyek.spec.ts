/**
 * Penyaring keadaan pada daftar proyek.
 *
 * Kerusakan yang mendorongnya: sejak saringan bawaannya menjadi "Berjalan",
 * daftarnya berkedip tanpa henti dan menembak server beratus kali — "Gagal
 * memuat data" beruntun.
 *
 * Sebabnya sepasang ikatan yang saling menyalakan. Tiap keping memasangkan
 * `[selected]="saring === 'x'"` dengan `(selectionChange)="pilihSaring('x')"`.
 * Selama tidak ada keping yang terpilih sejak awal, itu tidak pernah
 * bermasalah. Begitu ada, kepingnya terpilih saat layar dibuka,
 * `selectionChange` menyala TANPA ada yang menekannya, penanganya
 * menganggapnya penekanan kedua lalu membatalkan pilihan — `[selected]`
 * berubah, peristiwanya menyala lagi, dan seterusnya.
 *
 * Yang diuji di sini penanganya: nilai yang sama tidak boleh membatalkan
 * apa pun, dan tidak boleh memuat ulang.
 */

import { ProjectListComponent } from './project-list/project-list.component';

function komponen(saringAwal: any = 'berjalan'): any {
  const c: any = Object.create(ProjectListComponent.prototype);
  c.saring = saringAwal;
  c.dimuat = 0;
  c.fetch = () => (c.dimuat += 1);
  return c;
}

describe('memilih saringan', () => {
  it('nilai yang SAMA tidak memuat ulang apa pun', () => {
    /*
     * Inilah penjaganya. Peristiwa yang menyala sendiri saat layar dibuka
     * membawa nilai yang sama dengan saringan bawaannya; menanggapinya
     * dengan pembatalan adalah awal dari kedipan tanpa henti.
     */
    const c = komponen('berjalan');
    c.pilihSaring('berjalan');
    expect(c.saring).toBe('berjalan');
    expect(c.dimuat).toBe(0);
  });

  it('nilai lain menggantinya dan memuat sekali', () => {
    const c = komponen('berjalan');
    c.pilihSaring('retensi');
    expect(c.saring).toBe('retensi');
    expect(c.dimuat).toBe(1);
  });

  it('nilai kosong berarti semua', () => {
    // Menekan keping yang sedang terpilih membuat daftarnya mengirim nilai
    // kosong; itulah cara membatalkan pilihan.
    const c = komponen('berjalan');
    c.pilihSaring(undefined);
    expect(c.saring).toBeNull();
    expect(c.dimuat).toBe(1);
  });

  it('nilai yang tidak dikenal jatuh ke semua, bukan diteruskan', () => {
    const c = komponen('berjalan');
    c.pilihSaring('ngawur');
    expect(c.saring).toBeNull();
  });

  it('membatalkan dua kali tidak memuat dua kali', () => {
    const c = komponen(null);
    c.pilihSaring(null);
    c.pilihSaring(undefined);
    expect(c.dimuat).toBe(0);
  });

  it('keempat keadaan diterima', () => {
    for (const k of ['berjalan', 'retensi', 'selesai', 'batal']) {
      const c = komponen(null);
      c.pilihSaring(k);
      expect(c.saring).withContext(k).toBe(k);
    }
  });
});
