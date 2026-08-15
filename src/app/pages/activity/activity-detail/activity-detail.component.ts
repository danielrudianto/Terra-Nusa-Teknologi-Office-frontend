import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { AvatarComponent } from '../../../components/avatar/avatar.component';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';

interface ActivityEntry {
  id: number;
  entity: string;
  entityID: number;
  action: string;
  userID: number | null;
  userName: string | null;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  note: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

/**
 * Rincian satu catatan aktivitas.
 *
 * Daftar utamanya sengaja ringkas agar banyak baris muat di layar; rincian
 * perubahan per kolom ditampilkan di sini supaya tidak memanjangkan tabel.
 */
@Component({
  selector: 'app-activity-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule,
    TranslatePipe,
    AvatarComponent,
    DialogGeserDirective,
  ],
  templateUrl: './activity-detail.component.html',
  styleUrl: './activity-detail.component.scss',
})
export class ActivityDetailComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { entry: ActivityEntry }) {}

  get entry(): ActivityEntry {
    return this.data.entry;
  }

  actionKey(action: string): string {
    return `audit.${action}`;
  }

  entityKey(entity: string): string {
    return `auditEntity.${entity}`;
  }

  get changes(): { field: string; from: string; to: string }[] {
    const c = this.entry?.changes;
    if (!c) return [];
    return Object.entries(c).map(([field, v]) => ({
      field,
      from: this.asText(v?.from),
      to: this.asText(v?.to),
    }));
  }

  private asText(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }
}
