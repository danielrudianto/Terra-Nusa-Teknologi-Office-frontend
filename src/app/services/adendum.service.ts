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
   * Isian yang TIDAK BOLEH diubah pada adendum.
   *
   * Ketiganya mengikat adendum pada perjanjian induknya:
   *
   * - pemasok: mengganti berarti menagih pihak lain atas dokumen bernomor
   *   sama, sedangkan lembar induknya sudah ditandatangani vendor tertentu;
   * - proyek: mengganti memindahkan biayanya ke pembukuan proyek berbeda
   *   tanpa jejak, dan laporan margin kedua proyek ikut salah;
   * - jenis material: menentukan JUDUL dokumennya — beton dan besi terbit
   *   sebagai PURCHASE ORDER, uji tekan dan uji besi sebagai SURAT PERINTAH
   *   KERJA. Mengubahnya membuat nomor ber-"PO" terbit di atas lembar
   *   berjudul SPK.
   *
   * Dikunci di layar SEBAGAI PELENGKAP, bukan pengganti: servernya menolak
   * juga. Yang di sini hanya agar orang tidak mencoba lalu ditolak setelah
   * mengisi seluruh formulirnya.
   */
  readonly ISIAN_TERKUNCI = [
    'supplierID',
    'supplier',
    'supplierName',
    'projectName',
    'projectCode',
    'purchaseType',
    'materialType',
    'maintenanceMode',
    'marketingMode',
    'recruitmentMode',
  ];

  /**
   * Matikan isian yang tidak boleh diubah pada adendum.
   *
   * Dimatikan, bukan disembunyikan: yang mengisi tetap perlu MELIHAT
   * pemasok dan proyeknya untuk memastikan sedang mengadendum dokumen yang
   * benar.
   */
  kunciIsian(formGroup: FormGroup): void {
    this.ISIAN_TERKUNCI.forEach((k) => {
      const c = formGroup.get(k);
      if (c) c.disable({ emitEvent: false });
    });
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
