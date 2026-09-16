import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

/**
 * Kotak pilihan dan penggeser pada kartu Transisi memenuhi lebar kartunya.
 *
 * KELUHANNYA: "select nya jadi full width, sama slide jadi full width aja".
 *
 * Sebabnya dua, dan keduanya tidak menghasilkan galat apa pun — kartunya
 * tergambar rapi, hanya isinya berhenti di sepertiga lebar:
 *
 *   1. `.st-transisi` punya `max-width: 420px`. Batas itu masuk akal untuk
 *      kotak isian teks, yang memang sulit dibaca bila terlalu panjang;
 *      untuk penggeser justru sebaliknya — makin panjang relnya, makin halus
 *      nilai yang dapat dipilih.
 *   2. `mat-slider` TIDAK melebar sendiri. Bawaannya menyesuaikan isi, bukan
 *      induknya, jadi ia tetap seruas pendek betapa pun lebar kartunya.
 *
 * DIUKUR DI PERAMBAN, BUKAN DIBACA DARI BERKAS GAYA.
 *
 * Membaca `width: 100%` dari SCSS tidak membuktikan apa-apa: nilai itu dapat
 * ditimpa aturan lain, kalah spesifisitas, atau tidak berlaku karena
 * induknya bukan elemen blok. Yang menentukan lebar akhirnya hanya peramban,
 * jadi yang ditanyakan di sini kotaknya — bukan gayanya.
 *
 * Gaya yang dipakai adalah BERKAS SUNGGUHAN milik halaman Pengaturan
 * (`styleUrl` di bawah), supaya uji ini ikut merah bila `max-width` itu
 * kembali.
 */

@Component({
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule, MatSliderModule],
  styleUrl: './settings.component.scss',
  template: `
    <div id="kartu" style="width: 800px">
      <div class="st-row st-row--kolom">
        <div class="st-transisi">
          <mat-form-field appearance="outline" class="st-transisi__jenis">
            <mat-label>Jenis gerakan</mat-label>
            <mat-select value="morph">
              <mat-option value="morph">Morph</mat-option>
            </mat-select>
          </mat-form-field>

          <div class="st-transisi__durasi">
            <mat-slider
              [min]="100"
              [max]="1500"
              [step]="50"
            >
              <input matSliderThumb [value]="500" />
            </mat-slider>
          </div>
        </div>
      </div>
    </div>
  `,
})
class TuanRumah {}

describe('Lebar isian pada kartu Transisi', () => {
  let f: ComponentFixture<TuanRumah>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TuanRumah, NoopAnimationsModule],
    });
    f = TestBed.createComponent(TuanRumah);
    document.body.appendChild(f.nativeElement);
    f.detectChanges();
  });

  afterEach(() => {
    f.nativeElement.remove();
  });

  function lebar(sel: string): number {
    const el = f.nativeElement.querySelector(sel) as HTMLElement;
    expect(el).withContext(`${sel} tidak ada di DOM`).toBeTruthy();
    return el.getBoundingClientRect().width;
  }

  /**
   * Ambang 0,95 — bukan kesamaan persis.
   *
   * `mat-form-field` menyisakan beberapa piksel untuk garis tepinya, dan
   * menuntut kesamaan piksel-demi-piksel akan membuat uji ini merah pada
   * pembaruan Material yang tidak mengubah apa pun yang penting di sini.
   * Yang dijaga adalah "memenuhi lebarnya", bukan "tepat sama".
   */
  const AMBANG = 0.95;

  it('pembungkusnya tidak dibatasi `max-width`', () => {
    const kartu = lebar('#kartu');
    expect(lebar('.st-transisi'))
      .withContext(
        'pembungkusnya berhenti sebelum tepi kartu — `max-width` kembali, ' +
          'dan seluruh isinya ikut mengkerut',
      )
      .toBeGreaterThanOrEqual(kartu * AMBANG);
  });

  it('KOTAK PILIHAN memenuhi lebar kartunya', () => {
    const kartu = lebar('#kartu');
    expect(lebar('.st-transisi__jenis'))
      .withContext('kotak pilihan berhenti di tengah, sisanya kosong')
      .toBeGreaterThanOrEqual(kartu * AMBANG);
  });

  it('PENGGESER memenuhi lebar kartunya', () => {
    /*
     * Inti keluhannya, dan yang paling terbaca sebagai salah: relnya
     * mengkerut jadi seruas kecil di pojok kiri.
     *
     * Bukan cuma soal rupa. Rel 130px untuk rentang 0,1–1,5 detik berarti
     * tiap piksel meloncat sekitar 11ms — nilai yang dituju praktis tidak
     * dapat dikenai.
     */
    const kartu = lebar('#kartu');
    expect(lebar('.st-transisi__durasi mat-slider'))
      .withContext(
        'penggesernya tidak melebar — `mat-slider` menyesuaikan ISI, bukan ' +
          'induknya, jadi tanpa `width: 100%` ia tetap pendek betapa pun ' +
          'lebar kartunya',
      )
      .toBeGreaterThanOrEqual(kartu * AMBANG);
  });
});
