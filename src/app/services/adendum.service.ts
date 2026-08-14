import { Injectable } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from './api.service';

/**
 * Pengisian awal formulir dari dokumen yang diadendum.
 *
 * Dibuat sebagai layanan bersama karena enam belas varian formulir
 * memerlukan hal yang sama. Menulis logikanya di masing-masing berarti enam
 * belas salinan yang harus diperbaiki bersamaan setiap kali ada perubahan —
 * dan satu yang terlupa tidak menimbulkan galat, hanya formulir yang diam-
 * diam tidak terisi.
 *
 * Yang diisi hanya isian yang NAMANYA COCOK. Sisanya dibiarkan kosong:
 * mengisi paksa bidang yang tidak dikenali lebih berbahaya daripada
 * membiarkannya, karena yang salah isi tidak terlihat sedangkan yang kosong
 * terlihat.
 */
@Injectable({ providedIn: 'root' })
export class AdendumService {
  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
  ) {}

  /** Id dokumen induk dari alamat, bila layar ini dibuka sebagai adendum. */
  get indukId(): number | null {
    const v = this.route.snapshot.queryParamMap.get('adendumDari');
    const n = Number(v);
    return v && !isNaN(n) ? n : null;
  }

  get isAdendum(): boolean {
    return this.indukId !== null;
  }

  /** Ambil dokumen induk; null bila layar ini bukan adendum. */
  muatInduk(): Observable<any | null> {
    const id = this.indukId;
    if (!id) return of(null);
    return this.apiService
      .get(`purchase-orders/${id}`, {})
      .pipe(map((x: any) => x ?? null));
  }

  /**
   * Isi formulir dari dokumen induk.
   *
   * `customData` didahulukan karena di situlah bentuk formulirnya disimpan;
   * kolom utama dipakai untuk yang tidak ada di sana.
   *
   * `abaikan` untuk isian yang TIDAK boleh diwarisi — tanggal, nomor, dan
   * apa pun yang harus ditentukan ulang pada dokumen barunya.
   */
  isiFormulir(
    formGroup: FormGroup,
    induk: any,
    abaikan: string[] = [],
  ): void {
    if (!induk) return;

    const custom =
      typeof induk.customData === 'string'
        ? JSON.parse(induk.customData || '{}')
        : induk.customData || {};

    /*
     * Tanggal dan nomor TIDAK diwarisi.
     *
     * Adendum terbit pada tanggalnya sendiri, dan nomornya dibentuk server
     * dari induknya. Mewarisi keduanya menghasilkan dokumen bertanggal lama
     * yang tampak sah — dan itu tidak akan terlihat sampai ada yang
     * membandingkannya dengan lembar aslinya.
     */
    const TIDAK_DIWARISI = ['date', 'purchase_order', 'name', ...abaikan];

    const sumber: any = { ...induk, ...custom };
    const nilai: any = {};

    Object.keys(formGroup.controls).forEach((k) => {
      if (TIDAK_DIWARISI.includes(k)) return;
      // FormArray diisi terpisah oleh layarnya: bentuk barisnya berbeda-beda
      // antar varian, dan hanya layarnya yang tahu cara membangunnya.
      if (formGroup.get(k) instanceof FormArray) return;
      if (sumber[k] === undefined || sumber[k] === null) return;
      nilai[k] = sumber[k];
    });

    formGroup.patchValue(nilai);
  }

  /**
   * Baris pekerjaan dari dokumen induk, untuk mengisi FormArray-nya.
   *
   * Volumenya dikosongkan, bukan disalin.
   *
   * Adendum berisi SELISIH: pada `013-PO-BPBP-F` yang aslinya 100 m3,
   * adendumnya memuat 5 — bukan 105. Menyalin volume induk membuat yang
   * mengisi tinggal menekan simpan dan menggandakan seluruh pekerjaannya
   * tanpa menyadarinya.
   */
  barisInduk(induk: any): any[] {
    const items = induk?.items || [];
    return items.map((x: any) => ({ ...x, quantity: null }));
  }
}
