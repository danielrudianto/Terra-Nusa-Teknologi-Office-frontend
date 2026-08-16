import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';

import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';
import { ApiService } from '../../../services/api.service';
import { AuditTrailComponent } from '../../../components/audit-trail/audit-trail.component';

interface Baris {
  label: string;
  nilai: string;

  /** Keterangan tambahan pada label, mis. golongan SIM. */
  labelSufiks?: string;

  /**
   * Nilai yang berupa DAFTAR, bukan satu kalimat.
   *
   * Riwayat penyakit dan kontak darurat berisi beberapa butir yang
   * masing-masing berdiri sendiri. Dirangkai jadi satu baris —
   * "Aritmia · 2024 Lambung / Maag · 2020" — titik tengahnya tidak
   * lagi jelas memisahkan apa dari apa, dan yang membacanya harus
   * menebak di mana satu butir berakhir.
   */
  daftar?: string[];
}

interface Bagian {
  judul: string;
  baris: Baris[];
}

/**
 * Ikon per label.
 *
 * Deretan `label — nilai` yang seragam sulit dipindai: mata tidak punya
 * pegangan, sehingga mencari satu nomor telepon berarti membaca seluruhnya.
 * Ikon memberi bentuk yang berbeda pada tiap baris, dan itu yang membuat
 * baris yang dicari ditemukan tanpa dibaca.
 *
 * Hanya untuk label yang benar-benar punya padanan lazim; yang tidak ada di
 * sini tampil tanpa ikon, bukan dengan ikon yang dipaksakan.
 */
const IKON: Record<string, string> = {
  'employeeView.alamatKtp': 'contact_mail',
  'employeeView.golonganDarah': 'bloodtype',
  'employeeView.kewarganegaraan': 'flag',
  'employeeView.suku': 'diversity_3',
  'employeeView.statusNikah': 'favorite',
  'employeeView.namaIbu': 'woman',
  'employeeView.namaAyah': 'man',
  'employeeView.namaBank': 'account_balance',
  'employeeView.atasNama': 'person',
  'employeeView.nomorRekening': 'account_balance_wallet',
  'employeeView.sim': 'directions_car',
  'employeeView.riwayatKerja': 'business_center',
  'employeeView.bahasa': 'translate',

  /*
   * Kunci bidang FORMULIR pembaruan.
   *
   * Bagian riwayat memakai kunci ini, bukan kunci i18n — labelnya diambil
   * dari definisi formulir yang berlaku di server, sehingga pertanyaan yang
   * berubah kata tetap menampilkan sebutan yang benar.
   *
   * Keduanya dijadikan satu peta agar `ikon()` cukup satu, dan tidak ada
   * bagian dialog yang punya perilaku ikon berbeda dari yang lain.
   */
  maritalStatus: 'favorite',
  dependents: 'family_restroom',
  family: 'groups',
  currentAddress: 'home',
  mobilePhone: 'smartphone',
  personalEmail: 'alternate_email',
  emergencyContacts: 'emergency',
  conditions: 'medical_information',
  accident: 'personal_injury',
  accidentNote: 'description',
  smoking: 'smoking_rooms',
  lastCheckup: 'monitor_heart',
  trainings: 'school',
  relocate: 'moving',
  overtime: 'more_time',
  shift: 'schedule',
  availabilityNote: 'sticky_note_2',
  'employeeView.nama': 'person',
  'employeeView.nik': 'badge',
  'employeeView.jabatan': 'work',
  'employeeView.departemen': 'apartment',
  'employeeView.kategoriPajak': 'receipt_long',
  'employeeView.mulai': 'event_available',
  'employeeView.selesai': 'event_busy',
  'employeeView.email': 'mail',
  'employeeView.telepon': 'call',
  'employeeView.alamat': 'home',
  'employeeView.tempatLahir': 'location_city',
  'employeeView.jenisKelamin': 'wc',
  'employeeView.agama': 'volunteer_activism',
  'employeeView.pendidikan': 'school',
  'employeeView.bpjsKesehatan': 'health_and_safety',
  'employeeView.bpjsKetenagakerjaan': 'shield',
  'employeeView.bank': 'account_balance',
};

/**
 * Lihat data karyawan secara lengkap, hanya untuk dibaca.
 *
 * Menyatukan tiga sumber yang selama ini hanya dapat dibuka satu per satu:
 * data pokok, profil pribadi, dan riwayat pembaruan. Yang mencari satu nomor
 * rekening atau satu kontak darurat sebelumnya harus membuka formulir
 * penyuntingan — dan formulir yang dibuka untuk dibaca kerap tersimpan
 * tanpa sengaja.
 */
@Component({
  selector: 'app-employee-view',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    DialogGeserDirective,
    TranslatePipe,
    AuditTrailComponent,
  ],
  templateUrl: './employee-view.component.html',
  styleUrls: ['./employee-view.component.scss'],
})
export class EmployeeViewComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly dialogRef = inject(MatDialogRef<EmployeeViewComponent>);

  isLoading = true;
  profilAda = false;

  pokok: Bagian[] = [];
  profil: Bagian[] = [];
  riwayat: {
    tanggal: string;
    oleh: string;
    isi: Baris[];
    jumlah: number;
    buka: boolean;
  }[] = [];

  /**
   * Label pertanyaan, diambil dari definisi formulir yang berlaku.
   *
   * Tidak disalin ke sini sebagai daftar tetap: pertanyaannya dapat berubah,
   * dan salinan yang tertinggal membuat riwayat lama menampilkan label yang
   * tidak pernah ditanyakan.
   */
  private labelBidang: Record<string, string> = {};

  /**
   * Label cadangan, dipakai bila definisi formulir gagal dimuat.
   *
   * Bukan pengganti definisi di server — pertanyaannya dapat berubah, dan
   * daftar ini akan tertinggal. Gunanya hanya agar layar tetap terbaca
   * ketika satu permintaan gagal: menampilkan `maritalStatus` kepada yang
   * mencari status pernikahan sama saja dengan tidak menampilkan apa pun.
   */
  private readonly labelCadangan: Record<string, string> = {
    maritalStatus: 'Status pernikahan',
    dependents: 'Jumlah tanggungan',
    family: 'Pasangan dan anak',
    currentAddress: 'Alamat tinggal saat ini',
    mobilePhone: 'Nomor HP',
    personalEmail: 'Email pribadi',
    emergencyContacts: 'Yang dapat dihubungi',
    conditions: 'Riwayat penyakit',
    accident: 'Pernah mengalami kecelakaan kerja',
    accidentNote: 'Keterangan kecelakaan kerja',
    smoking: 'Merokok',
    lastCheckup: 'Pemeriksaan kesehatan terakhir',
    trainings: 'Kursus, pelatihan, sertifikasi',
    relocate: 'Bersedia ditempatkan di kota lain',
    overtime: 'Bersedia lembur',
    shift: 'Bersedia kerja shift',
    availabilityNote: 'Catatan kesediaan',
  };

  /**
   * Kontak darurat dari pembaruan TERAKHIR.
   *
   * Ditampilkan sebagai banner di atas seluruh tab, bukan sebagai satu baris
   * di antara puluhan baris lain: ini satu-satunya data di layar ini yang
   * dicari saat terjadi sesuatu di lapangan — dan saat itu tidak ada yang
   * sempat menggulir.
   */
  darurat: { nama: string; hubungan: string; telepon: string }[] = [];

  /**
   * Kapan data itu terakhir diperbarui.
   *
   * Ikut ditampilkan karena nomor darurat yang sudah dua tahun tidak
   * dikonfirmasi belum tentu masih aktif — dan yang menelepon berhak tahu
   * seberapa besar kemungkinan itu sebelum mengandalkannya.
   */
  daruratTanggal = '';

  constructor(@Inject(MAT_DIALOG_DATA) public input: any) {}

  ngOnInit(): void {
    this.susunPokok();
    this.muatProfil();
    this.muatRiwayat();
  }

  private teks(v: unknown): string {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') {
      return this.translate.instant(v ? 'common.yes' : 'common.no');
    }

    /*
     * Objek dan larik TIDAK diserahkan ke `String()`.
     *
     * `String({})` menghasilkan "[object Object]" — tampil di layar sebagai
     * kalimat yang tidak berarti apa pun, dan yang membacanya menyimpulkan
     * datanya rusak.
     *
     * Yang benar adalah menyusun bidang bersarang menjadi baris tersendiri,
     * seperti yang dilakukan pada SIM dan anggota keluarga. Cabang ini
     * jaring pengaman untuk bidang yang belum sempat ditangani: nilainya
     * dirangkai apa adanya, dan itu masih jauh lebih berguna daripada
     * "[object Object]".
     */
    if (Array.isArray(v)) {
      const isi = v.map((x) => this.teks(x)).filter((x) => x !== '—');
      return isi.length ? isi.join(', ') : '—';
    }
    if (typeof v === 'object') {
      const isi = Object.values(v as Record<string, unknown>)
        .filter((x) => x !== null && x !== undefined && x !== '')
        .map((x) => String(x));
      return isi.length ? isi.join(' · ') : '—';
    }

    return String(v);
  }

  /** Ikon untuk sebuah label; kosong bila tidak ada padanannya. */
  ikon(label: string): string {
    return IKON[label] || '';
  }

  private susunPokok(): void {
    const e = this.input?.employee ?? {};
    this.pokok = [
      {
        judul: 'employeeView.dataPokok',
        baris: [
          { label: 'employeeView.nama', nilai: this.teks(e.name) },
          { label: 'employeeView.nik', nilai: this.teks(e.nik) },
          { label: 'employeeView.jabatan', nilai: this.teks(e.position) },
          { label: 'employeeView.departemen', nilai: this.teks(e.department) },
          { label: 'employeeView.kategoriPajak', nilai: this.teks(e.taxCategory) },
          { label: 'employeeView.mulai', nilai: this.teks(e.startDate) },
          { label: 'employeeView.selesai', nilai: this.teks(e.endDate) },
          { label: 'employeeView.email', nilai: this.teks(e.email) },
          { label: 'employeeView.telepon', nilai: this.teks(e.phoneNumber) },
          { label: 'employeeView.alamat', nilai: this.teks(e.address) },
        ],
      },
    ];
  }

  private muatProfil(): void {
    this.api.get(`employee-profiles/${this.input?.employee?.id}`, {}).subscribe({
      next: (d: any) => {
        this.profilAda = !!d;
        if (d) this.profil = this.susunProfil(d);
      },
      error: () => {
        this.profilAda = false;
      },
    }).add(() => {
      this.isLoading = false;
    });
  }

  private susunProfil(d: any): Bagian[] {
    const bagian: Bagian[] = [
      {
        judul: 'employeeView.identitas',
        baris: [
          { label: 'employeeView.tempatLahir', nilai: this.teks(d.birthPlace) },
          { label: 'employeeView.jenisKelamin', nilai: this.teks(d.gender) },
          { label: 'employeeView.golonganDarah', nilai: this.teks(d.bloodType) },
          { label: 'employeeView.agama', nilai: this.teks(d.religion) },
          { label: 'employeeView.statusNikah', nilai: this.teks(d.maritalStatus) },
          { label: 'employeeView.kewarganegaraan', nilai: this.teks(d.citizenship) },
          { label: 'employeeView.suku', nilai: this.teks(d.ethnicity) },
          { label: 'employeeView.alamatKtp', nilai: this.teks(d.ktpAddress) },
        ],
      },
      {
        judul: 'employeeView.keluarga',
        baris: [
          { label: 'employeeView.namaIbu', nilai: this.teks(d.motherName) },
          { label: 'employeeView.namaAyah', nilai: this.teks(d.fatherName) },
        ],
      },
      {
        judul: 'employeeView.bank',
        baris: [
          { label: 'employeeView.namaBank', nilai: this.teks(d.bankName) },
          { label: 'employeeView.atasNama', nilai: this.teks(d.bankAccountName) },
          { label: 'employeeView.nomorRekening', nilai: this.teks(d.bankAccountNumber) },
        ],
      },
      {
        judul: 'employeeView.jaminan',
        baris: [
          { label: 'employeeView.bpjsKesehatan', nilai: this.teks(d.bpjsKesehatan) },
          { label: 'employeeView.bpjsKetenagakerjaan', nilai: this.teks(d.bpjsKetenagakerjaan) },
        ],
      },
    ];

    /*
     * SIM: satu baris per golongan, dengan NOMORNYA.
     *
     * `drivingLicenses` berupa daftar objek `{golongan, nomor}` — sebelumnya
     * diserahkan apa adanya ke `teks()`, yang memanggil `String()` dan
     * menghasilkan "[object Object]".
     *
     * Dipisah per golongan, bukan dirangkai jadi satu baris: yang mencari
     * nomor SIM B2 tidak perlu memilahnya dari untaian panjang, dan tombol
     * salin per baris menyalin nomor yang benar saja.
     */
    const sim = Array.isArray(d.drivingLicenses) ? d.drivingLicenses : [];
    const barisSim = sim
      .filter((x: any) => x?.golongan || x?.nomor)
      .map((x: any) => ({
        label: 'employeeView.sim',
        labelSufiks: this.teks(x.golongan),
        nilai: this.teks(x.nomor),
      }));

    if (barisSim.length) {
      bagian[bagian.length - 1].baris.push(...barisSim);
    }

    // Anggota keluarga dan pendidikan berupa daftar; dirangkai jadi satu
    // baris per orang agar tetap terbaca tanpa tabel bersarang.
    const keluarga = Array.isArray(d.familyMembers) ? d.familyMembers : [];
    if (keluarga.length) {
      bagian.push({
        judul: 'employeeView.anggotaKeluarga',
        baris: keluarga.map((k: any) => ({
          label: this.teks(k.relation),
          nilai: [this.teks(k.name), k.birthday || '', k.job || '']
            .filter((x) => x && x !== '—')
            .join(' · '),
        })),
      });
    }

    const pendidikan = Array.isArray(d.formalEducation) ? d.formalEducation : [];
    if (pendidikan.length) {
      bagian.push({
        judul: 'employeeView.pendidikan',
        baris: pendidikan.map((p: any) => ({
          label: this.teks(p.level),
          nilai: [p.school, p.major, [p.fromYear, p.toYear].filter(Boolean).join('–')]
            .filter(Boolean)
            .join(' · '),
        })),
      });
    }

    /*
     * Riwayat kerja dan bahasa: ADA di server, tetapi tidak pernah
     * ditampilkan.
     *
     * Keduanya sudah diisi lewat formulir profil dan tersimpan sebagai
     * daftar, hanya tidak pernah disusun ke layar — sehingga yang mengisinya
     * tidak punya cara memastikan isiannya benar-benar tersimpan.
     */
    const kerja = Array.isArray(d.workExperience) ? d.workExperience : [];
    if (kerja.length) {
      bagian.push({
        judul: 'employeeView.riwayatKerja',
        baris: kerja.map((k: any) => ({
          label: this.teks(k.company),
          nilai: [
            k.position,
            k.field,
            [k.fromDate, k.toDate].filter(Boolean).join(' – '),
          ]
            .filter(Boolean)
            .join(' · '),
        })),
      });
    }

    const bahasa = Array.isArray(d.languages) ? d.languages : [];
    if (bahasa.length) {
      bagian.push({
        judul: 'employeeView.bahasa',
        baris: bahasa.map((b: any) => ({
          label: this.teks(b.language),
          // Lisan dan tulisan disebut terpisah; keduanya kerap berbeda, dan
          // menggabungkannya menjadi satu tingkat menghilangkan perbedaan
          // yang justru menentukan saat menugaskan pekerjaan.
          nilai: [
            b.speaking ? `${this.translate.instant('employeeView.lisan')}: ${b.speaking}` : '',
            b.writing ? `${this.translate.instant('employeeView.tulisan')}: ${b.writing}` : '',
          ]
            .filter(Boolean)
            .join(' · '),
        })),
      });
    }

    return bagian;
  }

  /**
   * Muat definisi formulir lebih dulu, lalu riwayatnya.
   *
   * Urutannya penting: tanpa definisinya, label tiap jawaban jatuh ke kunci
   * teknisnya — `maritalStatus`, `currentAddress` — dan yang membaca riwayat
   * harus menebak artinya.
   */
  private muatRiwayat(): void {
    this.api.get('employee-forms/versions/active', {}).subscribe({
      next: (v: any) => {
        const bagian = v?.fields?.sections ?? v?.sections ?? [];
        for (const sec of bagian) {
          for (const f of sec?.fields ?? []) {
            if (f?.key) this.labelBidang[f.key] = f.label ?? f.key;
          }
        }
      },
      error: () => {},
      complete: () => this.muatRiwayatData(),
    });
  }

  private muatRiwayatData(): void {
    this.api
      .get(`employee-forms/${this.input?.employee?.id}/riwayat`, {})
      .subscribe({
        next: (res: any) => {
          const data = Array.isArray(res) ? res : (res?.data ?? []);
          this.riwayat = data.map((r: any, i: number) => {
            const isi = this.ratakanJawaban(r.answers);
            return {
              tanggal: this.tanggalLokal(r.submittedAt),
              oleh: this.teks(r.submittedByName ?? r.submittedBy),
              isi,
              jumlah: isi.length,
              // Yang TERBARU terbuka sendiri; sisanya menunggu diklik.
              //
              // Membuka semuanya membuat daftar ini panjang sekali dan
              // menyembunyikan justru yang paling sering dicari — keadaan
              // yang berlaku sekarang.
              buka: i === 0,
            };
          });
          this.ambilDarurat(data);
        },
        error: () => {
          this.riwayat = [];
        },
      });
  }

  /**
   * Ratakan jawaban formulir menjadi daftar label–nilai.
   *
   * Bentuk jawabannya berupa objek bersarang yang berbeda-beda antar versi
   * formulir; meratakannya membuat layar ini tetap terbaca walau susunan
   * pertanyaannya kelak berubah.
   */
  /**
   * Tanggal dan jam dalam penulisan setempat.
   *
   * `2026-08-15T14:20:03` adalah bentuk penyimpanan, bukan bentuk baca.
   * Menampilkannya apa adanya memaksa yang membaca menerjemahkan sendiri —
   * dan pada layar yang justru dibuka untuk menelusuri kapan sesuatu
   * berubah, itu hal pertama yang dicari.
   */
  private tanggalLokal(v: unknown): string {
    if (!v) return '—';
    const d = new Date(String(v));
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Ubah satu jawaban menjadi teks yang terbaca.
   *
   * Daftar — anggota keluarga, kontak darurat, pelatihan — dirangkai per
   * baris, bukan dicetak sebagai JSON. Yang membaca riwayat mencari nama dan
   * nomor, bukan tanda kurung kurawal.
   */
  private nilaiTerbaca(v: unknown): string {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') {
      return this.translate.instant(v ? 'common.yes' : 'common.no');
    }
    if (Array.isArray(v)) {
      return v
        .map((x) =>
          x && typeof x === 'object'
            ? Object.values(x)
                .filter((y) => y !== null && y !== undefined && y !== '')
                .join(' · ')
            : String(x),
        )
        .filter((x) => x)
        .join('\n');
    }
    if (typeof v === 'object') {
      return Object.values(v as Record<string, unknown>)
        .filter((x) => x !== null && x !== undefined && x !== '')
        .join(' · ');
    }
    return String(v);
  }

  /**
   * Ratakan jawaban formulir menjadi daftar label–nilai.
   *
   * Labelnya diambil dari definisi formulir yang berlaku; yang tidak
   * ditemukan jatuh ke kuncinya sendiri, bukan disembunyikan — jawaban yang
   * ada tetap perlu terlihat walau pertanyaannya sudah tidak dipakai lagi.
   */
  /**
   * Pecah nilai menjadi butir-butir yang berdiri sendiri.
   *
   * Hanya larik yang dipecah. Objek tunggal — misalnya satu alamat — tetap
   * satu butir: memecahnya per bidang menghasilkan daftar potongan yang
   * kehilangan artinya bila dibaca terpisah.
   */
  private butirTerbaca(v: unknown): string[] {
    if (!Array.isArray(v)) return [];
    return v
      .map((x) =>
        x && typeof x === 'object'
          ? Object.values(x)
              .filter((y) => y !== null && y !== undefined && y !== '')
              .join(' · ')
          : String(x ?? ''),
      )
      .filter((x) => x.trim() !== '');
  }

  private ratakanJawaban(a: any): Baris[] {
    if (!a || typeof a !== 'object') return [];
    const out: Baris[] = [];
    for (const [k, v] of Object.entries(a)) {
      if (v === null || v === undefined || v === '') continue;
      if (Array.isArray(v) && !v.length) continue;
      // Larik berisi lebih dari satu butir ditampilkan sebagai DAFTAR.
      //
      // Satu butir tetap sebagai kalimat biasa: memberi penanda daftar pada
      // satu baris justru menambah bentuk tanpa menambah kejelasan.
      const butir = this.butirTerbaca(v);
      out.push({
        label: this.labelBidang[k] ?? this.labelCadangan[k] ?? k,
        nilai: butir.length > 1 ? '' : this.nilaiTerbaca(v),
        daftar: butir.length > 1 ? butir : undefined,
      });
    }
    return out;
  }

  /**
   * Teks yang disalin untuk sebuah baris.
   *
   * Baris berbentuk daftar tidak punya `nilai` — menyalinnya begitu saja
   * menghasilkan teks kosong, dan yang menekan tombolnya baru menyadarinya
   * setelah menempel di tempat lain.
   *
   * Butirnya dipisah baris baru, bukan koma: keduanya sudah memuat titik
   * tengah di dalamnya, dan menambah koma membuat pemisahnya tidak lagi
   * terbaca.
   */
  teksSalin(b: Baris): string {
    return b.daftar?.length ? b.daftar.join('\n') : b.nilai;
  }

  /** Buka atau tutup satu catatan riwayat. */
  alihkanRiwayat(i: number): void {
    const r = this.riwayat[i];
    if (r) r.buka = !r.buka;
  }

  /**
   * Ambil kontak darurat dari catatan pembaruan paling baru yang memuatnya.
   *
   * Bukan sekadar catatan terakhir: pembaruan yang menyentuh alamat saja
   * tidak memuat kontak darurat, dan membacanya dari situ akan menyimpulkan
   * bahwa karyawan ini tidak punya kontak darurat sama sekali.
   */
  private ambilDarurat(data: any[]): void {
    for (const r of data) {
      const daftar = r?.answers?.emergencyContacts;
      if (!Array.isArray(daftar) || !daftar.length) continue;

      const bersih = daftar
        .filter((k: any) => (k?.name || '').trim() || (k?.phone || '').trim())
        .map((k: any) => ({
          nama: this.teks(k?.name),
          hubungan: this.teks(k?.relation),
          telepon: this.teks(k?.phone),
        }));
      if (!bersih.length) continue;

      this.darurat = bersih;
      // Tanggal setempat, bukan bentuk penyimpanan.
      //
      // `2026-08-15T14:18:49` adalah bentuk simpan; yang membaca banner ini
      // sedang menilai apakah nomornya masih dapat diandalkan, dan untuk itu
      // ia perlu membaca tanggalnya, bukan menerjemahkannya.
      this.daruratTanggal = this.tanggalLokal(r?.submittedAt);
      return;
    }
  }

  /**
   * Salin ringkasan untuk dikirim lewat pesan.
   *
   * Bentuknya sengaja polos — tanpa tabel, tanpa penjajaran kolom. Aplikasi
   * pesan tidak mempertahankan spasi berturut, dan teks yang dirapikan
   * dengan spasi justru berantakan begitu terkirim.
   */
  salinRingkas(): void {
    const e = this.input?.employee ?? {};
    const baris: string[] = [
      `*${this.teks(e.name)}*`,
      `NIK: ${this.teks(e.nik)}`,
      `Jabatan: ${this.teks(e.position)} — ${this.teks(e.department)}`,
      `Telepon: ${this.teks(e.phoneNumber)}`,
      `Email: ${this.teks(e.email)}`,
      `Alamat: ${this.teks(e.address)}`,
    ];

    if (this.darurat.length) {
      baris.push('', '*Kontak darurat*');
      for (const k of this.darurat) {
        baris.push(`${k.nama} (${k.hubungan}) — ${k.telepon}`);
      }
      if (this.daruratTanggal !== '—') {
        baris.push(`Diperbarui: ${this.daruratTanggal}`);
      }
    }

    navigator.clipboard?.writeText(baris.join('\n')).then(() => {
      this.snackBar.open(
        this.translate.instant('employeeView.ringkasTersalin'),
        this.translate.instant('common.close'),
        { duration: 2200 },
      );
    });
  }

  /** Salin satu nilai. */
  salin(nilai: string): void {
    if (!nilai || nilai === '—') return;
    navigator.clipboard?.writeText(nilai).then(() => {
      this.snackBar.open(
        this.translate.instant('employeeView.tersalin'),
        this.translate.instant('common.close'),
        { duration: 1800 },
      );
    });
  }

  /**
   * Salin seluruh isi satu bagian sebagai teks berbaris.
   *
   * Bentuknya `label: nilai` per baris — siap ditempel ke surel atau pesan
   * tanpa perlu dirapikan lagi.
   */
  salinBagian(b: Bagian): void {
    const isi = b.baris
      .filter((x) => x.nilai && x.nilai !== '—')
      .map((x) => `${this.translate.instant(x.label)}: ${x.nilai}`)
      .join('\n');
    if (!isi) return;
    navigator.clipboard?.writeText(isi).then(() => {
      this.snackBar.open(
        this.translate.instant('employeeView.bagianTersalin'),
        this.translate.instant('common.close'),
        { duration: 1800 },
      );
    });
  }

  tutup(): void {
    this.dialogRef.close();
  }
}
