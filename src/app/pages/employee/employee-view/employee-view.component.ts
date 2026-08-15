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
}

interface Bagian {
  judul: string;
  baris: Baris[];
}

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
    return String(v);
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
          { label: 'employeeView.sim', nilai: this.teks(d.drivingLicenses) },
        ],
      },
    ];

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
  private ratakanJawaban(a: any): Baris[] {
    if (!a || typeof a !== 'object') return [];
    const out: Baris[] = [];
    for (const [k, v] of Object.entries(a)) {
      if (v === null || v === undefined || v === '') continue;
      if (Array.isArray(v) && !v.length) continue;
      out.push({
        label: this.labelBidang[k] ?? this.labelCadangan[k] ?? k,
        nilai: this.nilaiTerbaca(v),
      });
    }
    return out;
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
