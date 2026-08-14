import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

import { documentFonts } from '../constants/document-font.constant';

import { PdfOutput } from './purchase-order-shared.helper';

/**
 * Gabungkan beberapa dokumen purchase order menjadi SATU berkas PDF.
 *
 * Mencetak adendum wajib menyertakan induk dan adendum sebelumnya: adendum
 * berisi SELISIH, sehingga dibaca sendirian ia tidak menyatakan keadaan
 * pekerjaannya. Vendor yang menerima `ADD2` saja tidak dapat mengetahui
 * volume yang berlaku.
 *
 * Digabung menjadi satu berkas, bukan beberapa berkas terpisah — vendor
 * menerima satu lampiran, bukan tiga yang harus disatukan sendiri.
 *
 * Tiap dokumen dimulai pada halaman baru. Yang PERTAMA tidak diberi pemisah,
 * karena pemisah di awal menghasilkan satu halaman kosong di depan.
 */
export function cetakRantaiPurchaseOrder(
  dokumen: readonly any[],
  namaBerkas: string,
  output: PdfOutput = 'open',
): any {
  const sah = (dokumen || []).filter((d) => d && Array.isArray(d.content));
  if (!sah.length) return undefined;

  // Satu dokumen saja: tidak perlu digabung.
  if (sah.length === 1) return keluarkan(sah[0], namaBerkas, output);

  const gabungan: any = { ...sah[0] };
  gabungan.content = [];

  sah.forEach((d, i) => {
    const isi = Array.isArray(d.content) ? d.content : [d.content];
    if (i > 0) gabungan.content.push({ text: '', pageBreak: 'before' });
    gabungan.content.push(...isi);
  });

  /*
   * Gaya dan bawaan diambil dari dokumen PERTAMA.
   *
   * Seluruh dokumen dalam satu rantai berasal dari varian yang sama —
   * adendum tidak boleh berganti jenis — sehingga gayanya pasti sama.
   * Menggabung gaya dari beberapa sumber justru berisiko: kunci yang sama
   * dengan nilai berbeda akan saling menimpa tanpa ketahuan.
   */
  return keluarkan(gabungan, namaBerkas, output);
}

function keluarkan(dd: any, namaBerkas: string, output: PdfOutput): any {
  const baseVfs = (pdfFonts as any).vfs ?? (pdfFonts as any);
  const { fonts, vfs } = documentFonts(baseVfs);
  const pdf = pdfMake.createPdf(dd, undefined, fonts as any, vfs as any);
  const berkas = `${namaBerkas}.pdf`;

  if (output === 'dataurl') {
    return new Promise<string>((selesai) => pdf.getDataUrl((u) => selesai(u)));
  }
  if (output === 'print') return pdf.print();
  if (output === 'download') return pdf.download(berkas);
  return pdf.open();
}
