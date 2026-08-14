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
      'serverError.SALARY_SLIP_EXISTS',
    'bank account with the same number already exists':
      'serverError.BANK_ACCOUNT_EXISTS',
    'blacklist reason is required': 'serverError.BLACKLIST_REASON_REQUIRED',
    'cannot move a payment that is approved or deleted':
      'serverError.PAYMENT_LOCKED',
    'cannot update a deleted employee': 'serverError.EMPLOYEE_DELETED',
    'contract not found': 'serverError.CONTRACT_NOT_FOUND',
    'payment not found': 'serverError.PAYMENT_NOT_FOUND',
    'project not found': 'serverError.PROJECT_NOT_FOUND',
    'reminder not found': 'serverError.REMINDER_NOT_FOUND',
    'payment is already approved or deleted': 'serverError.PAYMENT_LOCKED',
    'invalid refresh token': 'serverError.SESSION_EXPIRED',
    'refresh token not provided': 'serverError.SESSION_EXPIRED',
    'internal server error': 'serverError.INTERNAL',
  };

  /**
   * Kode yang dikirim server sebagai pengganti kalimat.
   *
   * Kunci terjemahannya memakai NAMA KODENYA apa adanya, bukan camelCase.
   *
   * Sebelumnya keduanya bercampur: jalur kode membentuk kunci sebagai
   * `serverError.${code}` — yang menghasilkan `serverError.SALARY_SLIP_EXISTS`
   * — sementara peta ini menunjuk `serverError.salarySlipExists`. Berkas
   * terjemahan hanya memuat bentuk pertama, sehingga jalur peta selalu
   * menampilkan kuncinya mentah di layar.
   *
   * Satu bentuk saja, supaya tidak ada yang perlu diingat.
   */
  private static readonly KODE: Record<string, string> = {
    CURRENT_PASSWORD_INVALID: 'serverError.CURRENT_PASSWORD_INVALID',
    PASSWORD_UNSET: 'serverError.PASSWORD_UNSET',
    SAME_PASSWORD: 'serverError.SAME_PASSWORD',
    DRAFT_ALREADY_CONVERTED: 'serverError.DRAFT_ALREADY_CONVERTED',
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
