import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

/**
 * Unduh PDF laba rugi.
 *
 * Diambil lewat HttpClient dengan `responseType: 'blob'`, bukan `ApiService`
 * — pembungkus itu selalu menguraikan jawaban sebagai JSON, dan berkas PDF
 * yang diurai begitu rusak sebelum sempat disimpan. Pola yang sama dengan
 * `CertificateOfPaymentService.unduhPdf`.
 */
export async function unduhPdfLabaRugi(
  http: HttpClient,
  bulan: number,
  tahun: number,
): Promise<void> {
  const akses = localStorage.getItem('access_token') ?? '';
  try {
    const berkas = await firstValueFrom(
      http.get(`${environment.url}reports/laba-rugi/pdf`, {
        params: { month: String(bulan), year: String(tahun) },
        headers: akses ? { Authorization: `Bearer ${akses}` } : {},
        responseType: 'blob',
      }),
    );
    simpanBerkas(berkas, namaBerkasLabaRugi(bulan, tahun));
  } catch (e) {
    throw await galatDariBlob(e);
  }
}

/** Nama berkas yang SAMA dengan yang dikirim server. */
export function namaBerkasLabaRugi(bulan: number, tahun: number): string {
  return `Laba-Rugi-${tahun}-${String(bulan).padStart(2, '0')}.pdf`;
}

/**
 * Galat berbentuk Blob diuraikan kembali menjadi JSON.
 *
 * Dengan `responseType: 'blob'`, jawaban 403 atau 500 dari server ikut
 * datang sebagai Blob. `ServerMessageService` mencari `error.detail` dan
 * tidak menemukannya di dalam Blob, sehingga "laporan ini hanya untuk
 * pemilik usaha" berubah menjadi "aksi gagal" — kalimat yang tidak memberi
 * tahu apa pun tentang apa yang harus dilakukan.
 *
 * Bila isinya bukan JSON, galat aslinya dikembalikan apa adanya.
 */
export async function galatDariBlob(e: any): Promise<any> {
  const isi = e?.error;
  if (!(isi instanceof Blob)) return e;
  try {
    const teks = await isi.text();
    return { ...e, error: JSON.parse(teks) };
  } catch {
    return e;
  }
}

/** URL sementaranya dicabut setelah dipakai supaya tidak menahan memori. */
function simpanBerkas(blob: Blob, nama: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nama;
  a.click();
  URL.revokeObjectURL(url);
}
