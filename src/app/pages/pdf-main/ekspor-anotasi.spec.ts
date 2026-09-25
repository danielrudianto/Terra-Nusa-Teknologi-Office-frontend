/*
 * HALAMAN PDF — CORETAN DAN ROTASI HARUS IKUT PADA SETIAP TOMBOL UNDUH.
 *
 * Cacat aslinya, dan ia tidak menghasilkan galat apa pun: tiap tombol
 * menyalin halamannya sendiri-sendiri, dan hanya "Simpan halaman terpilih"
 * yang ikut menggambar coretan serta menerapkan rotasi. Tombol "Gabungkan"
 * tidak. Jadi catatan yang baru saja diketik HILANG pada berkas terunduh —
 * tanpa peringatan, dan hanya lewat sebagian tombol. Yang mengalaminya
 * menyimpulkan catatannya memang tidak pernah tersimpan.
 *
 * Yang diuji di sini BERKASNYA, bukan bentuk kodenya:
 *
 *   * rotasi dibaca kembali dari PDF hasilnya (`getRotation()`), jadi
 *     pernyataannya tepat, bukan "kira-kira berubah";
 *   * coretan dibuktikan lewat perbedaan isi berkas — halaman bercoretan
 *     tidak mungkin menghasilkan bita yang sama persis dengan yang polos.
 *
 * Keduanya dijalankan untuk KEDUA tombol. Menambahkan tombol ketiga kelak
 * tanpa melewati `salinHalaman` akan menjatuhkan uji ini.
 */

import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

import { PdfMainComponent } from './pdf-main.component';

/** Satu halaman PDF sungguhan, dalam base64 — bentuk yang dipakai `PageData`. */
async function halamanBase64(): Promise<string> {
  const doc = await PDFDocument.create();
  const halaman = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  halaman.drawText('Dokumen uji', { x: 40, y: 780, size: 12, font, color: rgb(0, 0, 0) });
  return doc.saveAsBase64({ dataUri: false });
}

function komponen(): any {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TranslateModule.forRoot()],
    providers: [
      provideNoopAnimations(),
      { provide: MatSnackBar, useValue: { open: () => {} } },
      { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => ({ subscribe: () => {} }) }) } },
    ],
  });
  return TestBed.createComponent(PdfMainComponent).componentInstance as any;
}

/** Jalankan satu tombol unduh, kembalikan bita PDF yang dihasilkannya. */
async function unduh(c: any, jalankan: () => Promise<void>): Promise<Uint8Array> {
  const asliBuat = URL.createObjectURL;
  const asliLepas = URL.revokeObjectURL;
  let blob: Blob | null = null;
  (URL as any).createObjectURL = (b: Blob) => {
    blob = b;
    return 'blob:uji';
  };
  (URL as any).revokeObjectURL = () => {};
  try {
    await jalankan();
  } finally {
    (URL as any).createObjectURL = asliBuat;
    (URL as any).revokeObjectURL = asliLepas;
  }
  expect(blob).withContext('tidak ada berkas yang dihasilkan').toBeTruthy();
  return new Uint8Array(await (blob as unknown as Blob).arrayBuffer());
}

describe('Halaman PDF — ekspor membawa coretan & rotasi', () => {
  let pdf: string;

  beforeAll(async () => {
    pdf = await halamanBase64();
  });

  function isi(c: any, opsi: { anotasi?: any[]; rotation?: number } = {}) {
    c.processedDocuments = [
      { pdf, thumbnail: '', pageNumber: 1, fileName: 'a.pdf', selected: true, ...opsi },
      { pdf, thumbnail: '', pageNumber: 2, fileName: 'b.pdf', selected: true },
    ];
    c.updateSelectionState();
  }

  it('GABUNGKAN: rotasi ikut terpakai', async () => {
    const c = komponen();
    isi(c, { rotation: 90 });
    const bita = await unduh(c, () => c.mergePdfs());
    const hasil = await PDFDocument.load(bita);
    // Inilah yang dulu hilang diam-diam: tombol gabung tidak pernah
    // menerapkan rotasi sama sekali.
    expect(hasil.getPage(0).getRotation().angle).toBe(90);
    expect(hasil.getPage(1).getRotation().angle).toBe(0);
  });

  it('GABUNGKAN: catatan ikut tergambar', async () => {
    const polos = komponen();
    isi(polos);
    const bitaPolos = await unduh(polos, () => polos.mergePdfs());

    const berisi = komponen();
    isi(berisi, {
      anotasi: [{ jenis: 'catatan', x: 0.3, y: 0.2, teks: 'Daniel Tri' }],
    });
    const bitaBerisi = await unduh(berisi, () => berisi.mergePdfs());

    // Halaman bercatatan tidak mungkin sama persis dengan yang polos.
    // Dulu keduanya identik — itulah bentuk hilangnya.
    expect(bitaBerisi.length).not.toBe(bitaPolos.length);
  });

  it('SIMPAN TERPILIH: rotasi dan catatan ikut', async () => {
    const c = komponen();
    isi(c, {
      rotation: 180,
      anotasi: [{ jenis: 'catatan', x: 0.3, y: 0.2, teks: 'Daniel Tri' }],
    });
    const bita = await unduh(c, () => c.saveSelectedPages());
    const hasil = await PDFDocument.load(bita);
    expect(hasil.getPage(0).getRotation().angle).toBe(180);

    const polos = komponen();
    isi(polos, { rotation: 180 });
    const bitaPolos = await unduh(polos, () => polos.saveSelectedPages());
    expect(bita.length).not.toBe(bitaPolos.length);
  });

  it('kotak penutup juga ikut, bukan hanya catatan', async () => {
    const polos = komponen();
    isi(polos);
    const bitaPolos = await unduh(polos, () => polos.mergePdfs());

    const c = komponen();
    isi(c, {
      anotasi: [
        { jenis: 'tutup', x: 0.1, y: 0.1, lebar: 0.3, tinggi: 0.03, teks: '' },
      ],
    });
    const bita = await unduh(c, () => c.mergePdfs());
    expect(bita.length).not.toBe(bitaPolos.length);
  });

  it('rotasi DITAMBAHKAN pada sudut asli, bukan menggantikannya', async () => {
    // Halaman scan kerap sudah membawa sudut putarnya sendiri; menimpanya
    // membuat yang tadinya benar jadi ikut miring.
    const doc = await PDFDocument.create();
    const hal = doc.addPage([595, 842]);
    hal.setRotation({ type: 'degrees', angle: 90 } as any);
    const dasar = await doc.saveAsBase64({ dataUri: false });

    const c = komponen();
    c.processedDocuments = [
      { pdf: dasar, thumbnail: '', pageNumber: 1, fileName: 'a.pdf', selected: true, rotation: 90 },
      { pdf: dasar, thumbnail: '', pageNumber: 2, fileName: 'b.pdf', selected: true },
    ];
    c.updateSelectionState();

    const hasil = await PDFDocument.load(await unduh(c, () => c.mergePdfs()));
    expect(hasil.getPage(0).getRotation().angle).toBe(180);
  });
});
