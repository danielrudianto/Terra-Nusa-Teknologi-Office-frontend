import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/**
 * Menerjemahkan pesan galat yang datang dari server.
 *
 * Server menjawab dalam bahasa Inggris — sebagian sebagai kalimat utuh,
 * sebagian sebagai kode seperti `CURRENT_PASSWORD_INVALID`. Menampilkannya
 * apa adanya membuat sebagian layar tiba-tiba berbahasa lain, tepat pada
 * saat penggunanya sedang menghadapi persoalan.
 *
 * Urutan pencariannya:
 *
 *   1. kode yang dikenali  ->  terjemahan dari berkas i18n
 *   2. kalimat yang dikenali  ->  terjemahan dari berkas i18n
 *   3. tidak dikenali  ->  pesan cadangan yang diberikan pemanggil
 *
 * Langkah ketiga penting: pesan server yang belum diterjemahkan tidak
 * ditampilkan mentah, melainkan diganti kalimat umum. Pesan asli tetap
 * masuk konsol agar dapat ditelusuri.
 */
@Injectable({ providedIn: 'root' })
export class ServerMessageService {
  private readonly translate = inject(TranslateService);

  /**
   * Kalimat server yang sudah punya terjemahannya.
   *
   * Kuncinya ditulis huruf kecil tanpa tanda baca agar perbedaan titik atau
   * kapitalisasi tidak membuatnya luput.
   */
  private static readonly PETA: Record<string, string> = {
    'salary slip already exists for this user month and year':
      'serverError.salarySlipExists',
    'bank account with the same number already exists':
      'serverError.bankAccountExists',
    'blacklist reason is required': 'serverError.blacklistReasonRequired',
    'cannot move a payment that is approved or deleted':
      'serverError.paymentLocked',
    'cannot update a deleted employee': 'serverError.employeeDeleted',
    'contract not found': 'serverError.contractNotFound',
    'payment not found': 'serverError.paymentNotFound',
    'project not found': 'serverError.projectNotFound',
    'reminder not found': 'serverError.reminderNotFound',
    'payment is already approved or deleted': 'serverError.paymentLocked',
    'invalid refresh token': 'serverError.sessionExpired',
    'refresh token not provided': 'serverError.sessionExpired',
    'internal server error': 'serverError.internal',
  };

  /** Kode yang dikirim server sebagai pengganti kalimat. */
  private static readonly KODE: Record<string, string> = {
    CURRENT_PASSWORD_INVALID: 'serverError.currentPasswordInvalid',
    PASSWORD_UNSET: 'serverError.passwordUnset',
    SAME_PASSWORD: 'serverError.samePassword',
    DRAFT_ALREADY_CONVERTED: 'serverError.draftAlreadyConverted',
  };

  /**
   * @param e         galat dari HttpClient
   * @param cadangan  kunci i18n yang dipakai bila pesannya tidak dikenali
   */
  terjemahkan(e: any, cadangan = 'notify.actionFailed'): string {
    const detail = e?.error?.detail;

    /*
     * Bentuk yang dituju: detail berupa objek berkode.
     *
     *   { code: "SALARY_SLIP_EXISTS", message: "...", context: {...} }
     *
     * Kodenya yang menentukan kalimat, dan `context` diteruskan sebagai
     * parameter terjemahan — sehingga pesan seperti "dipakai pada
     * {{count}} dokumen" dapat menyebut angkanya.
     */
    if (detail && typeof detail === 'object' && detail.code) {
      const kunci = `serverError.${detail.code}`;
      const hasil = this.translate.instant(kunci, detail.context ?? {});

      // ngx-translate mengembalikan kuncinya sendiri bila tidak ketemu.
      if (hasil !== kunci) return hasil;

      console.warn('[ServerMessage] kode belum diterjemahkan:', detail.code);
      return this.translate.instant(cadangan);
    }

    const asli = String(
      detail ?? e?.error?.message ?? e?.error ?? '',
    ).trim();

    if (!asli) return this.translate.instant(cadangan);

    const kunciKode = ServerMessageService.KODE[asli];
    if (kunciKode) return this.translate.instant(kunciKode);

    const rata = asli
      .toLowerCase()
      .replace(/[.,!?]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const kunci = ServerMessageService.PETA[rata];
    if (kunci) return this.translate.instant(kunci);

    /*
     * Pesan berbahasa Indonesia dari server diteruskan apa adanya.
     *
     * Sebagian pemeriksaan di server memang sudah menjawab dalam bahasa
     * Indonesia — pesan-pesan itu justru yang paling menjelaskan keadaan,
     * dan menggantinya dengan kalimat umum akan menghilangkan keterangannya.
     */
    if (/[a-z]/i.test(asli) && this.tampakIndonesia(asli)) return asli;

    console.warn('[ServerMessage] belum diterjemahkan:', asli);
    return this.translate.instant(cadangan);
  }

  /** Dikenali dari kata-kata yang hanya lazim pada kalimat Indonesia. */
  private tampakIndonesia(teks: string): boolean {
    return /\b(tidak|belum|sudah|harus|dapat|oleh|yang|untuk|pada|dengan|bukan)\b/i.test(
      teks,
    );
  }
}
