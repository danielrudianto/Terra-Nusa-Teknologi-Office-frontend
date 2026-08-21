import { Injectable } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import moment from 'moment';

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

  /**
   * Id dokumen yang sedang DIUBAH, bila layar ini dibuka untuk koreksi.
   *
   * Dibedakan dari adendum walaupun keduanya memuat dokumen lama ke formulir
   * yang sama. Adendum menerbitkan dokumen BARU yang memuat selisih; ubah
   * menimpa dokumen yang belum pernah terbit.
   *
   * Menyatukannya akan membuat satu penanda menentukan dua perilaku yang
   * berlawanan — dan yang keliru membaca penanda itu akan menerbitkan
   * dokumen ketika seharusnya membetulkan.
   */
  get ubahId(): number | null {
    const v = this.route.snapshot.queryParamMap.get('ubah');
    const n = Number(v);
    return v && !isNaN(n) ? n : null;
  }

  /**
   * Nomor urut yang DIPAKSA, dibawa lewat alamat `?nomorPaksa=45`.
   *
   * Dipakai untuk koreksi dokumen HISTORIS oleh level 5: dokumen salah
   * dibatalkan, lalu penggantinya diterbitkan di nomor yang sama supaya
   * urutan arsipnya tetap cocok dengan berkas kertasnya. Server tetap
   * memeriksa levelnya dan menolak nomor yang masih dipakai PO aktif.
   *
   * Dibaca dari alamat — bukan disimpan di layanan — mengikuti pola
   * `indukId`/`ubahId`: satu-satunya sumber kebenaran adalah URL, sehingga
   * menyegarkan halaman tidak menghilangkan konteksnya.
   */
  get nomorPaksa(): number | null {
    const v = this.route.snapshot.queryParamMap.get('nomorPaksa');
    const n = Number(v);
    return v && !isNaN(n) && n > 0 ? n : null;
  }

  get isAdendum(): boolean {
    return this.indukId !== null;
  }

  get isUbah(): boolean {
    return this.ubahId !== null;
  }

  /**
   * Dokumen lama sedang dimuat ke formulir — apa pun modenya.
   *
   * Dipakai varian formulir untuk memutuskan apakah perlu memanggil
   * `muatInduk()`; keputusan tentang APA yang dilakukan sesudahnya berbeda
   * per mode, dan itu ditentukan `isAdendum` atau `isUbah`.
   */
  get memuatDokumenLama(): boolean {
    return this.isAdendum || this.isUbah;
  }

  /**
   * Dokumen lama yang sedang disunting atau diadendum.
   *
   * Disimpan di sini, bukan di tiap varian formulir: enam belas layar
   * memuatnya dengan cara yang sama, dan yang menampilkannya cukup membaca
   * dari satu tempat.
   */
  dokumenLama: any = null;

  /** Nomor dokumen lama; kosong bila layar ini pembuatan biasa. */
  get nomorLama(): string {
    return this.dokumenLama?.name ?? '';
  }

  /** Tanggal dokumen lama, apa adanya dari server (YYYY-MM-DD). */
  get tanggalLama(): string {
    return this.dokumenLama?.date ?? '';
  }

  /** Ambil dokumen lama; null bila layar ini pembuatan biasa. */
  muatInduk(): Observable<any | null> {
    const id = this.indukId ?? this.ubahId;
    if (!id) {
      this.dokumenLama = null;
      return of(null);
    }
    return this.apiService.get(`purchase-orders/${id}`, {}).pipe(
      map((x: any) => {
        this.dokumenLama = x ?? null;
        return this.dokumenLama;
      }),
    );
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
     * Tanggal DIWARISI pada KEDUA mode — sunting maupun adendum.
     *
     * Keputusan dari lapangan: 95% penyuntingan hanya menyentuh barang dan
     * harga, hampir tidak pernah tanggalnya, dan yang mengerjakannya langsung
     * masuk ke daftar barang tanpa melirik tanggal. Kolom tanggal yang kosong
     * karena itu tertinggal kosong sampai server menolaknya — atau lebih
     * buruk, terisi hari ini diam-diam dan dokumennya berpindah hari.
     *
     * Maka tanggalnya diisikan lebih dulu dari dokumen sebelumnya. Pada
     * SUNTING ia memang tanggal dokumen itu; pada ADENDUM ia menjadi nilai
     * awal yang masuk akal dan tetap dapat diganti bila adendumnya memang
     * terbit di hari lain. Keduanya lebih baik daripada kolom kosong yang
     * menghentikan orang di tengah pekerjaan yang tak menyangkut tanggal.
     *
     * Nomor tetap tidak diwarisi ke isian: ia tidak diketik, melainkan
     * dipegang dokumennya sendiri.
     */
    const TIDAK_DIWARISI = ['purchase_order', 'name', ...abaikan];

    const sumber: any = { ...induk, ...custom };
    const nilai: any = {};

    Object.keys(formGroup.controls).forEach((k) => {
      if (TIDAK_DIWARISI.includes(k)) return;
      // FormArray diisi terpisah oleh layarnya: bentuk barisnya berbeda-beda
      // antar varian, dan hanya layarnya yang tahu cara membangunnya.
      if (formGroup.get(k) instanceof FormArray) return;
      if (sumber[k] === undefined || sumber[k] === null) return;
      /*
       * Tanggal DIUBAH menjadi moment lebih dulu.
       *
       * Pemilih tanggal memakai adapter moment (`provideMomentDateAdapter`),
       * dan modelnya harus berupa objek moment. Menaruh untai mentah
       * "2026-04-04" ke sana tidak dikenali adapternya: kolomnya kosong,
       * lalu terisi hari ini saat disentuh — sehingga dokumen yang disunting
       * seolah bertanggal hari ini, bukan tanggal aslinya.
       *
       * `moment(untai)` menerima ISO maupun "YYYY-MM-DD"; yang tidak dapat
       * diurai dibiarkan apa adanya agar tidak menukar tanggal sah dengan
       * "Invalid date".
       */
      if (k === 'date') {
        const m = moment(sumber[k]);
        nilai[k] = m.isValid() ? m : sumber[k];
        return;
      }
      nilai[k] = sumber[k];
    });

    /*
     * Sakelar PPN DIPETAKAN, tidak disalin.
     *
     * Pemetaan di atas mencocokkan nama ISIAN dengan nama kolom, dan dua hal
     * ini memang tidak pernah sama namanya: layar menyimpannya sebagai
     * `includePPN` (benar/salah), dokumen menyimpannya sebagai `ppn` (tarif,
     * 0 atau 11). Karena `sumber['includePPN']` selalu `undefined`, kuncinya
     * dilewati — dan sakelarnya bertahan pada nilai BAWAANNYA.
     *
     * Bawaannya menyala. Akibatnya setiap dokumen NON-PPN yang dibuka untuk
     * disunting muncul dengan sakelar PPN hidup; yang menyimpannya tanpa
     * memperhatikan menerbitkan ulang dokumen itu dengan PPN sebelas persen
     * yang tidak pernah disepakati.
     *
     * Diperiksa `!== undefined`, bukan kebenaran nilainya: `ppn = 0` adalah
     * keterangan yang sah — justru keterangan yang paling penting di sini.
     */
    if (formGroup.get('includePPN') && sumber['ppn'] !== undefined) {
      nilai['includePPN'] = Number(sumber['ppn']) > 0;
    }

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
    /*
     * Lingkup pekerjaan PO-H.
     *
     * Menentukan bentuk seluruh dokumennya — borongan, borongan bor, buang
     * lumpur, dan grouting masing-masing punya pasal yang berbeda. Adendum
     * yang lingkupnya berbeda dari induknya bukan lagi adendum; ia perjanjian
     * lain yang kebetulan bernomor turunan.
     */
    'workScope',
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
   * Timpa satu baris formulir dengan nilai dari baris DOKUMEN.
   *
   * Pembangun baris tiap varian menerima objek KATALOG — barang atau alat —
   * dan mengisi sisanya dengan nilai bawaan: volume 1, harga 0, tanggal
   * kosong. Bidang itu memang tidak ada pada katalog.
   *
   * Memakainya untuk memuat dokumen lama membuat seluruh angkanya hilang,
   * dan yang membetulkan satu kesalahan harus mengetik ulang semuanya.
   *
   * Yang ditimpa hanya kunci yang BENAR-BENAR ADA pada formulirnya; varian
   * yang tidak punya `price` atau `remarks_4` tidak terpengaruh.
   */
  terapkanNilaiBaris(g: FormGroup, x: any): FormGroup {
    if (!x) return g;

    const peta: Record<string, unknown> = {
      quantity: Number(x.quantity) || 0,
      price: Number(x.price) || 0,
      unit: x.unit ?? undefined,
      remarks: x.remarks_1 ?? undefined,
      fromDate: x.remarks_1 ?? undefined,
      toDate: x.remarks_2 ?? undefined,
      location: x.remarks_3 ?? undefined,
      mobilisasi: Number(x.remarks_4) || 0,
      demobilisasi: Number(x.remarks_5) || 0,
      task: x.task ?? undefined,
      item_id: x.item_id ?? undefined,
      equipment_id: x.equipment_id ?? undefined,
    };

    const isi: Record<string, unknown> = {};
    Object.keys(peta).forEach((k) => {
      if (peta[k] === undefined) return;
      if (!g.get(k)) return;
      isi[k] = peta[k];
    });
    g.patchValue(isi, { emitEvent: false });
    return g;
  }

  /**
   * Isi satu FormArray dari daftar pada dokumen induk.
   *
   * Bentuk barisnya berbeda-beda antar varian, sehingga PEMBANGUNNYA
   * diserahkan pemanggil — hanya layarnya yang tahu cara menyusun satu baris
   * miliknya sendiri.
   *
   * Larik dikosongkan lebih dulu: sebagian varian sudah menambahkan satu
   * baris kosong saat dibuat, dan tanpa dikosongkan baris itu tertinggal di
   * atas isian yang diwarisi.
   */
  isiLarik(
    formGroup: FormGroup,
    nama: string,
    sumber: readonly any[] | null | undefined,
    pembangun: (baris: any) => any,
  ): void {
    const arr = formGroup.get(nama) as FormArray | null;
    if (!arr) return;
    arr.clear();
    (sumber || []).forEach((x) => arr.push(pembangun(x)));
  }

  /**
   * Daftar di dalam `customData` dokumen induk.
   *
   * Sebagian varian menyimpan isinya di sana, bukan sebagai baris barang —
   * PO-D menyimpan uraian pekerjaan, PO-H menyimpan lingkup dan kewajiban.
   */
  larikCustom(induk: any, kunci: string): any[] {
    if (!induk) return [];
    const custom =
      typeof induk.customData === 'string'
        ? JSON.parse(induk.customData || '{}')
        : induk.customData || {};
    const v = custom?.[kunci];
    return Array.isArray(v) ? v : [];
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

    /*
     * Pada mode UBAH, volumenya disalin APA ADANYA.
     *
     * Yang dikoreksi adalah dokumen itu sendiri, bukan selisihnya —
     * mengosongkan volume memaksa yang membetulkan satu kesalahan mengetik
     * ulang seluruh barisnya, dan itu justru mengundang kesalahan baru.
     */
    if (this.isUbah) return items.map((x: any) => ({ ...x }));

    return items.map((x: any) => ({ ...x, quantity: null }));
  }
}
