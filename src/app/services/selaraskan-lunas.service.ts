import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of, switchMap } from 'rxjs';

import { ApiService } from './api.service';
import { SelisihLunasDialogComponent } from '../components/selisih-lunas-dialog/selisih-lunas-dialog.component';

/** Jenis dokumen yang status lunasnya dapat diselaraskan. */
export type JenisDokumen =
  | 'purchase'
  | 'expense'
  | 'reimbursement'
  | 'salary_slip'
  | 'loan';

export type HasilSelaras =
  /** Statusnya ditulis — entah menjadi lunas atau kembali belum lunas. */
  | { keadaan: 'selesai'; lunas: boolean }
  /** Ada selisih kecil, dan orangnya memilih tidak menandainya lunas. */
  | { keadaan: 'ditunda'; selisih: number };

/**
 * Selaraskan status lunas sebuah dokumen, lengkap dengan pertanyaannya.
 *
 * Ditaruh di satu layanan, bukan disalin ke tiap daftar.
 *
 * Alurnya dua langkah — kirim, lalu bila selisihnya kecil tanyakan dan kirim
 * ulang dengan konfirmasi — dan alur dua langkah yang disalin ke lima layar
 * adalah lima kesempatan untuk lupa langkah keduanya. Yang lupa tidak akan
 * terlihat sebagai galat: tombolnya menjawab "berhasil" dan dokumennya tidak
 * berubah, yang justru lebih sulit ditelusuri daripada kegagalan.
 *
 * Layar pemanggil cukup memuat ulang daftarnya sesudah `selesai`.
 */
@Injectable({ providedIn: 'root' })
export class SelaraskanLunasService {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);

  jalankan(jenis: JenisDokumen, id: number): Observable<HasilSelaras> {
    return this.kirim(jenis, id, false).pipe(
      switchMap((jawab: any) => {
        if (!jawab?.butuh_konfirmasi) {
          return of({
            keadaan: 'selesai',
            lunas: !!jawab?.lunas,
          } as HasilSelaras);
        }

        /*
         * Angkanya diteruskan APA ADANYA dari server.
         *
         * Nilai dokumen dihitung dari DPP, PPN, PPh, dan biaya lain dengan
         * rumus yang tinggal di satu tempat di backend. Menghitungnya ulang
         * di sini berarti dua salinan yang akan berselisih — dan yang membaca
         * dialognya memutuskan berdasarkan angka yang berbeda dari yang
         * dipakai menandai lunas.
         */
        return this.dialog
          .open(SelisihLunasDialogComponent, {
            data: {
              nilai: Number(jawab.nilai) || 0,
              dibayar: Number(jawab.dibayar) || 0,
              selisih: Number(jawab.selisih) || 0,
            },
            width: '440px',
            maxWidth: '94vw',
            autoFocus: false,
          })
          .afterClosed()
          .pipe(
            switchMap((setuju: boolean | undefined) => {
              if (!setuju) {
                return of({
                  keadaan: 'ditunda',
                  selisih: Number(jawab.selisih) || 0,
                } as HasilSelaras);
              }
              return this.kirim(jenis, id, true).pipe(
                switchMap((akhir: any) =>
                  of({
                    keadaan: 'selesai',
                    lunas: !!akhir?.lunas,
                  } as HasilSelaras),
                ),
              );
            }),
          );
      }),
    );
  }

  private kirim(jenis: JenisDokumen, id: number, konfirmasi: boolean) {
    // `konfirmasi` parameter KUERI, bukan isi body: rutenya menerimanya
    // begitu, dan FastAPI membuang nama yang tidak dikenal tanpa galat —
    // yang salah tempat akan diam-diam jatuh ke `false`, dan dialognya
    // muncul berulang tanpa pernah menandai apa pun.
    const jalur = `outgoing-payments/selaraskan/${jenis}/${id}?konfirmasi=${konfirmasi}`;
    return this.api.post(jalur, {});
  }
}
