import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ApiService } from '../../../services/api.service';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { ProjectSelectorComponent } from '../../../components/project-selector/project-selector.component';
import { ProjectLookupService } from '../../../services/project-lookup.service';
import { PURCHASE_TYPE_LABELS } from '../../../constants/purchase-type-label.constant';

interface BarisPemasok {
  nama: string;
  nilai: number;
}

interface Kategori {
  kode: string;
  nama: string;
  nilai: number;
  pemasok: BarisPemasok[];
}

@Component({
  selector: 'app-project-report',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    TranslatePipe,
    HeaderTitleComponent,
    ProjectSelectorComponent,
  ],
  templateUrl: './project-report.component.html',
  styleUrl: './project-report.component.scss',
})
export class ProjectReportComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  readonly lookup = inject(ProjectLookupService);

  /**
   * Pemilih memakai daftar penuh, termasuk proyek selesai dan batal.
   *
   * Laporan justru paling sering dibuka untuk proyek yang sudah tutup —
   * di situlah margin akhirnya diketahui. Menyaring hanya yang berjalan
   * membuat laporan tidak bisa dibuat justru saat paling dibutuhkan.
   */
  readonly kodeControl = new FormControl('');

  readonly memuat = signal(false);
  readonly galat = signal<string | null>(null);
  readonly kode = signal('');
  readonly tampilan = signal<'ikhtisar' | 'tabel'>('ikhtisar');
  readonly kategoriTerbuka = signal<string | null>(null);
  readonly barisTerbuka = signal<Set<string>>(new Set());

  private readonly _data = signal<any>(null);

  ngOnInit(): void {
    void this.lookup.muat();

    const dariRute = this.route.snapshot.params['code'];
    if (dariRute) {
      this.kodeControl.setValue(dariRute);
      this.muat(dariRute);
    }

    this.kodeControl.valueChanges.subscribe((v) => {
      const k = (v ?? '').trim().toUpperCase();
      // Hanya memuat bila kodenya benar-benar terdaftar. Mengetik sebagian
      // kode tidak boleh memicu permintaan yang pasti kosong hasilnya.
      if (k && this.lookup.cari(k)) this.muat(k);
    });
  }

  muat(kode: string): void {
    this.memuat.set(true);
    this.galat.set(null);
    this.kode.set(kode);
    this.kategoriTerbuka.set(null);
    this.barisTerbuka.set(new Set());

    this.api
      .get(`purchases/report/project/${kode}`, {})
      .subscribe({
        next: (res: any) => {
          this._data.set({
            purchases: res?.purchases ?? [],
            reimbursements: res?.reimbursements ?? [],
            purchase_drafts: res?.purchase_drafts ?? [],
            sales_invoices: res?.sales_invoices ?? [],
          });
        },
        error: (err) => {
          this._data.set(null);
          const pesan =
            err?.error?.detail ?? this.translate.instant('notify.loadFailed');
          this.galat.set(pesan);
          this.snackBar.open(pesan, 'Close', { duration: 4000 });
        },
      })
      .add(() => this.memuat.set(false));
  }

  readonly proyek = computed(() => this.lookup.cari(this.kode()));

  /**
   * Nilai kontrak untuk perhitungan margin memakai DPP, bukan nominal kotor.
   *
   * PPN adalah titipan negara, bukan pendapatan. Memakai nominal dokumen
   * yang sudah termasuk PPN membuat margin setiap proyek tampak lebih besar
   * sekitar sebelas persen dari kenyataannya — cukup untuk membuat proyek
   * yang sebenarnya rugi tipis terlihat untung.
   */
  readonly nilaiKontrak = computed(() =>
    Number((this.proyek() as any)?.contractDpp ?? 0),
  );

  /** Nominal dokumen apa adanya, hanya untuk ditampilkan. */
  readonly nominalKontrak = computed(() =>
    Number((this.proyek() as any)?.contractValue ?? 0),
  );

  /**
   * Biaya dikelompokkan menurut kode tipe biaya, lalu per pemasok.
   *
   * Ketiga sumber dijumlahkan dengan rumusnya masing-masing: pembelian dan
   * draft memakai DPP ditambah PPN, PBBKB, dan nilai lain; reimbursement
   * memakai nominal pengajuannya. Menyamakan rumusnya akan membuat PPN
   * terhitung dua kali pada sebagian baris dan hilang pada sebagian lain.
   */
  readonly kategori = computed<Kategori[]>(() => {
    const d = this._data();
    if (!d) return [];

    const peta = new Map<string, Map<string, number>>();

    const catat = (kode: string, pemasok: string, nilai: number) => {
      const k = (kode || '?').toString();
      if (!peta.has(k)) peta.set(k, new Map());
      const m = peta.get(k)!;
      m.set(pemasok, (m.get(pemasok) ?? 0) + (Number(nilai) || 0));
    };

    for (const p of d.purchases) {
      const n =
        Number(p.dpp || 0) +
        (Number(p.ppn || 0) * Number(p.dpp || 0)) / 100 +
        Number(p.pbbkb || 0) +
        Number(p.otherValue || 0);
      catat(p.purchaseType, p.supplierName || '—', n);
    }
    for (const p of d.purchase_drafts) {
      const n =
        Number(p.dpp || 0) +
        (Number(p.ppn || 0) * Number(p.dpp || 0)) / 100 +
        Number(p.pbbkb || 0);
      catat(p.purchaseType, p.supplierName || '—', n);
    }
    for (const r of d.reimbursements) {
      catat(r.purchaseType, r.name || r.supplierName || '—', Number(r.amount || 0));
    }

    const hasil: Kategori[] = [];
    for (const [kode, pemasokMap] of peta) {
      const pemasok = [...pemasokMap.entries()]
        .map(([nama, nilai]) => ({ nama, nilai }))
        .sort((a, b) => b.nilai - a.nilai);
      hasil.push({
        kode,
        nama: PURCHASE_TYPE_LABELS[kode] ?? kode,
        nilai: pemasok.reduce((a, b) => a + b.nilai, 0),
        pemasok,
      });
    }
    return hasil.sort((a, b) => b.nilai - a.nilai);
  });

  readonly totalBiaya = computed(() =>
    this.kategori().reduce((a, b) => a + b.nilai, 0),
  );

  readonly margin = computed(() => this.nilaiKontrak() - this.totalBiaya());

  readonly tertagih = computed(() => {
    const d = this._data();
    if (!d) return 0;
    return d.sales_invoices.reduce(
      (a: number, b: any) =>
        a +
        Number(b.dpp || 0) +
        (Number(b.ppn || 0) * Number(b.dpp || 0)) / 100,
      0,
    );
  });

  /** Persentase terhadap total biaya; nol bila belum ada biaya sama sekali. */
  persen(nilai: number): number {
    const t = this.totalBiaya();
    return t === 0 ? 0 : (nilai / t) * 100;
  }

  persenKontrak(nilai: number): number {
    const k = this.nilaiKontrak();
    return k === 0 ? 0 : (nilai / k) * 100;
  }

  get maksKategori(): number {
    return this.kategori()[0]?.nilai ?? 0;
  }

  /** Kontrak belum diisi: angka margin tidak punya arti dan harus dijelaskan. */
  readonly kontrakKosong = computed(
    () => !!this.kode() && !this.memuat() && this.nilaiKontrak() === 0,
  );

  readonly adaData = computed(() => this._data() !== null);

  toggleKategori(kode: string): void {
    this.kategoriTerbuka.set(this.kategoriTerbuka() === kode ? null : kode);
  }

  toggleBaris(kode: string): void {
    const s = new Set(this.barisTerbuka());
    s.has(kode) ? s.delete(kode) : s.add(kode);
    this.barisTerbuka.set(s);
  }

  pilihTampilan(t: 'ikhtisar' | 'tabel'): void {
    if (t === this.tampilan()) return;
    this.tampilan.set(t);
    this.kategoriTerbuka.set(null);
  }

  bukaProyek(): void {
    const p = this.proyek();
    if (p) this.router.navigate(['/Project', p.id]);
  }
}
