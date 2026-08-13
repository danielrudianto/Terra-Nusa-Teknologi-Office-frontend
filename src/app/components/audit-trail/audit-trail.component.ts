import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../services/api.service';
import { AvatarComponent } from '../avatar/avatar.component';

interface AuditEntry {
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
 * Riwayat perubahan satu dokumen.
 *
 * Dipasang di dalam tampilan detail mana pun; cukup menyebut entitas dan
 * id-nya, sehingga tidak perlu komponen terpisah per modul.
 */
@Component({
  selector: 'app-audit-trail',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    AvatarComponent,
  ],
  templateUrl: './audit-trail.component.html',
  styleUrl: './audit-trail.component.scss',
})
export class AuditTrailComponent implements OnChanges {
  /** Nama tabel, mis. 'purchase_orders'. */
  @Input() entity!: string;
  @Input() entityId!: number;
  @Input() limit = 20;

  entries: AuditEntry[] = [];
  isLoading = false;
  hasError = false;

  constructor(private apiService: ApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['entity'] || changes['entityId']) this.fetch();
  }

  private fetch(): void {
    if (!this.entity || !this.entityId) return;
    this.isLoading = true;
    this.hasError = false;

    this.apiService
      .get(`audit-logs/${this.entity}/${this.entityId}`, {
        limit: this.limit,
      })
      .subscribe({
        next: (res: any) => {
          this.entries = res?.data ?? [];
          this.isLoading = false;
        },
        error: () => {
          // Riwayat adalah pelengkap; kegagalan memuatnya tidak boleh
          // membuat tampilan detail ikut gagal.
          this.hasError = true;
          this.isLoading = false;
        },
      });
  }

  /** Ikon dan warna dipilih dari jenis aksinya. */
  icon(action: string): string {
    switch (action) {
      case 'create':
        return 'add_circle_outline';
      case 'approve':
        return 'check_circle_outline';
      case 'reject':
        return 'cancel';
      case 'delete':
      case 'contract_delete':
        return 'delete_outline';
      case 'contract_create':
        return 'note_add';
      case 'contract_update':
        return 'edit_note';
      case 'move_date':
        return 'event_repeat';
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

  /** Daftar kolom yang berubah, siap ditampilkan. */
  changeList(entry: AuditEntry): { field: string; from: string; to: string }[] {
    if (!entry.changes) return [];
    return Object.entries(entry.changes)
      // Penanda bukan perubahan nilai; ditampilkan tersendiri, bukan sebagai
      // baris "dari — ke —" yang tidak berarti apa pun.
      .filter(([field]) => field !== 'selfApproved')
      .map(([field, v]) => ({
        field,
        from: this.asText(v?.from),
        to: this.asText(v?.to),
      }));
  }

  /**
   * Dokumen ini disetujui oleh orang yang membuatnya.
   *
   * Hanya mungkin dilakukan pemilik usaha dan memang diizinkan, tetapi harus
   * terbaca sebagai keadaan yang berbeda saat riwayat ditelusuri — bukan
   * tenggelam di antara persetujuan biasa.
   */
  disetujuiSendiri(entry: AuditEntry): boolean {
    return (entry.changes as any)?.selfApproved === true;
  }

  private asText(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}
