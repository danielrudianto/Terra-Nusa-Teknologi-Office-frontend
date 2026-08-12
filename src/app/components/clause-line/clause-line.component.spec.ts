import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClauseLineComponent } from './clause-line.component';

/**
 * Pengujian penampil poin klausul.
 *
 * Poin yang dinonaktifkan dibungkus `<s>…</s>` oleh perakit klausul. Di layar,
 * interpolasi biasa menampilkan tag itu apa adanya — pembaca melihat tulisan
 * "<s></s>", bukan coretan.
 *
 * Yang dijaga di sini bukan hanya tampilannya, melainkan juga bahwa isi poin
 * selalu diperlakukan sebagai teks: bila suatu saat komponen ini diganti
 * dengan `innerHTML`, tag lain dalam data ikut dirender.
 */
describe('ClauseLineComponent', () => {
  let fixture: ComponentFixture<ClauseLineComponent>;
  let c: ClauseLineComponent;

  const isi = (nilai: string | string[]) => {
    c.value = nilai;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClauseLineComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ClauseLineComponent);
    c = fixture.componentInstance;
  });

  it('mengenali poin yang dicoret', () => {
    isi('<s>Poin ini tidak berlaku.</s>');

    expect(c.dicoret).toBeTrue();
    expect(c.teks).toBe('Poin ini tidak berlaku.');
  });

  it('membiarkan poin biasa apa adanya', () => {
    isi('Termin pembayaran adalah tunai.');

    expect(c.dicoret).toBeFalse();
    expect(c.teks).toBe('Termin pembayaran adalah tunai.');
  });

  it('merender coretan sebagai elemen, bukan tulisan', () => {
    isi('<s>Poin ini tidak berlaku.</s>');

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('s')).not.toBeNull();
    expect(el.textContent).not.toContain('<s>');
  });

  it('tidak menandai coretan bila tagnya hanya di tengah', () => {
    // Perakit klausul membungkus seluruh poin; tag di tengah berarti data
    // yang tidak dikenali, dan menganggapnya coretan akan menyesatkan.
    isi('Sebagian <s>tidak</s> berlaku.');

    expect(c.dicoret).toBeFalse();
  });

  it('membersihkan sisa tag dan entitas', () => {
    isi('Harga sudah termasuk PPN &amp; PBBKB.');

    expect(c.teks).toBe('Harga sudah termasuk PPN & PBBKB.');
  });

  it('menangani nilai kosong tanpa galat', () => {
    isi('');
    expect(c.teks).toBe('');

    isi([]);
    expect(c.teks).toBe('');
  });
});
