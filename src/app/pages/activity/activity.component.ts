import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { AuditTrailEntities } from '../../constants/audit-entity.constant';
import { AvatarComponent } from '../../components/avatar/avatar.component';
import { HeaderTitleComponent } from '../../components/header-title/header-title.component';
import { ApiService } from '../../services/api.service';
import { SettingsService } from '../../services/setting.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { ActivityDetailComponent } from './activity-detail/activity-detail.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { tanggalLokal } from '../../utils/tanggal';
import { PermissionService } from '../../services/permission.service';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

interface ActivityEntry {
  id: number;
  entity: string;
  entityID: number;
  action: string;
  userID: number | null;
  userName: string | null;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  note: string | null;
  createdAt: string;
}

/**
 * Aktivitas seluruh sistem.
 *
 * Melengkapi riwayat per dokumen: menjawab "apa saja yang terjadi hari ini"
 * dan "apa saja yang diubah orang tertentu", yang tidak bisa dijawab dengan
 * membuka dokumen satu per satu.
 */
@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [
    MatAutocompleteModule,
    MatInputModule,
    MatNativeDateModule,
    MatDatepickerModule,
    MatTableModule,
    MatDialogModule,
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatButtonModule,
    MatTooltipModule,
    TranslatePipe,
    AvatarComponent,
    HeaderTitleComponent,
  ],
  templateUrl: './activity.component.html',
  styleUrl: './activity.component.scss',
})
export class ActivityComponent implements OnInit {
  readonly entities = AuditTrailEntities;

  readonly columns = ['when', 'who', 'what', 'where', 'detail'];

  entityControl = new FormControl<string>('');

  /*
   * Penyaring pengguna — hanya untuk level 5.
   *
   * Autocomplete, bukan daftar pilih: jumlah pengguna bertambah terus, dan
   * daftar yang memuat semuanya menjadi tidak terpakai justru saat paling
   * dibutuhkan.
   *
   * Penyaringnya disembunyikan di bawah level 5, tetapi itu hanya soal
   * tampilan — pembatasan sesungguhnya ada di server, yang memaksa penyaring
   * ke pengguna sendiri berapa pun nilai yang dikirim.
   */
  readonly MAKS_PENGGUNA = 5;

  penggunaCari = new FormControl<string>('');
  penggunaTerpilih: { id: number; name: string }[] = [];
  private semuaPengguna: { id: number; name: string }[] = [];

  get bolehSaringPengguna(): boolean {
    return this.permission.level() >= 5;
  }

  get penggunaPenuh(): boolean {
    return this.penggunaTerpilih.length >= this.MAKS_PENGGUNA;
  }

  /** Saran yang belum terpilih, disaring menurut yang diketik. */
  saranPengguna(): { id: number; name: string }[] {
    const q = (this.penggunaCari.value ?? '').trim().toLowerCase();
    const dipilih = new Set(this.penggunaTerpilih.map((u) => u.id));
    return this.semuaPengguna
      .filter((u) => !dipilih.has(u.id))
      .filter((u) => !q || u.name.toLowerCase().includes(q))
      .slice(0, 8);
  }

  pilihPengguna(u: { id: number; name: string }): void {
    if (this.penggunaPenuh) return;
    this.penggunaTerpilih = [...this.penggunaTerpilih, u];
    this.penggunaCari.setValue('', { emitEvent: false });
    this.fetch(1);
  }

  lepasPengguna(id: number): void {
    this.penggunaTerpilih = this.penggunaTerpilih.filter((u) => u.id !== id);
    this.fetch(1);
  }

  private muatPengguna(): void {
    if (!this.bolehSaringPengguna) return;
    this.apiService.get('users', { page: 1, pageSize: 500 }).subscribe({
      next: (r: any) => {
        const daftar = Array.isArray(r) ? r : (r?.data ?? r?.users ?? []);
        this.semuaPengguna = daftar
          .map((u: any) => ({ id: u.id, name: u.name }))
          .filter((u: any) => u.id && u.name);
      },
      // Gagal memuat hanya mengosongkan sarannya; penyaring lain tetap jalan.
      error: () => (this.semuaPengguna = []),
    });
  }
  dateFromControl = new FormControl<Date | null>(null);
  dateToControl = new FormControl<Date | null>(null);
  entries: ActivityEntry[] = [];
  isLoading = false;
  hasError = false;

  page = 1;
  pageSize: number = this.settings.pageSize;
  total = 0;

  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    public settings: SettingsService,
    public permission: PermissionService,
  ) {}

  ngOnInit(): void {
    this.fetch();
    this.muatPengguna();
    this.entityControl.valueChanges.subscribe(() => this.fetch(1));
    this.dateFromControl.valueChanges.subscribe(() => this.fetch(1));
    this.dateToControl.valueChanges.subscribe(() => this.fetch(1));
  }

  fetch(page: number = this.page): void {
    this.page = page;
    this.isLoading = true;
    this.hasError = false;

    const params: Record<string, string | number> = {
      page: this.page,
      page_size: this.pageSize,
    };
    const entity = this.entityControl.value;
    if (entity) params['entity'] = entity;

    // Tanggal dikirim tanpa zona waktu: server membandingkannya sebagai
    // tanggal lokal, dan toISOString() akan menggesernya ke UTC.
    const dari = this.asDateParam(this.dateFromControl.value);
    if (dari) params['dateFrom'] = dari;
    const sampai = this.asDateParam(this.dateToControl.value);
    if (sampai) params['dateTo'] = sampai;

    // Beberapa userID dikirim sebagai array; ApiService merangkainya menjadi
    // parameter berulang, yang memang diharapkan server.
    if (this.penggunaTerpilih.length) {
      params['userID'] = this.penggunaTerpilih.map((u) => u.id) as any;
    }

    // ApiService.get menerima query params langsung, bukan { params }.
    // Membungkusnya dua kali membuat parameter tidak terkirim, sehingga
    // server memakai nilai bawaannya (25 baris).
    this.apiService.get('audit-logs', params).subscribe({
      next: (res: any) => {
        this.entries = res?.data ?? [];
        this.total = res?.total ?? 0;
        this.isLoading = false;
      },
      error: () => {
        this.hasError = true;
        this.isLoading = false;
      },
    });
  }

  /** Diteruskan ke fungsi bersama; logikanya sama dan tidak perlu dua salinan. */
  private asDateParam(value: Date | null): string | null {
    return tanggalLokal(value);
  }

  /** Kosongkan seluruh penyaring sekaligus. */
  resetFilters(): void {
    this.entityControl.setValue('', { emitEvent: false });
    this.dateFromControl.setValue(null, { emitEvent: false });
    this.dateToControl.setValue(null, { emitEvent: false });
    this.penggunaTerpilih = [];
    this.penggunaCari.setValue('', { emitEvent: false });
    this.fetch(1);
  }

  get hasFilter(): boolean {
    return !!(
      this.entityControl.value ||
      this.dateFromControl.value ||
      this.dateToControl.value ||
      this.penggunaTerpilih.length
    );
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.fetch(event.pageIndex + 1);
  }

  /** Rincian perubahan dibuka di dialog agar tabelnya tetap ringkas. */
  openDetail(entry: ActivityEntry): void {
    this.dialog.open(ActivityDetailComponent, {
      data: { entry },
      maxWidth: '94vw',
      autoFocus: false,
    });
  }

  icon(action: string): string {
    switch (action) {
      case 'create':
        return 'add_circle_outline';
      case 'approve':
        return 'check_circle_outline';
      case 'reject':
        return 'cancel';
      case 'delete':
        return 'delete_outline';
      case 'update_status':
      case 'update_payment_status':
        return 'sync_alt';
      default:
        return 'edit';
    }
  }

  actionKey(action: string): string {
    return `audit.${action}`;
  }

  entityKey(entity: string): string {
    return `auditEntity.${entity}`;
  }

  changeList(
    entry: ActivityEntry,
  ): { field: string; from: string; to: string }[] {
    if (!entry.changes) return [];
    return Object.entries(entry.changes).map(([field, v]) => ({
      field,
      from: this.asText(v?.from),
      to: this.asText(v?.to),
    }));
  }

  private asText(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}
