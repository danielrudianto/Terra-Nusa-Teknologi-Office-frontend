import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AccountService } from '../../../services/account.service';
import {
  AgendaService,
  Birthday,
  Reminder,
} from '../../../services/agenda.service';
import { ReminderCreateComponent } from '../reminder-create/reminder-create.component';

/** Satu baris agenda, entah ulang tahun atau pengingat. */
interface BarisAgenda {
  jenis: 'birthday' | 'reminder';
  daysUntil: number;
  judul: string;
  keterangan: string;
  kategori?: string;
  reminder?: Reminder;
}

/**
 * Agenda: ulang tahun rekan dan pengingat, tujuh hari ke depan.
 *
 * Keduanya ditampilkan dalam satu daftar dan diurutkan bersama, bukan
 * dipisah menjadi dua bagian — yang ditanyakan orang adalah "apa saja yang
 * dekat", bukan "ulang tahun siapa" dan "pengingat apa" secara terpisah.
 */
@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDialogModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.scss',
})
export class AgendaComponent {
  private readonly agenda = inject(AgendaService);
  private readonly dialog = inject(MatDialog);
  private readonly account = inject(AccountService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  isLoading = true;
  baris: BarisAgenda[] = [];

  private readonly BULAN = [
    '',
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  ngOnInit(): void {
    this.muat();
  }

  muat(): void {
    this.isLoading = true;
    this.agenda
      .load(7)
      .subscribe({
        next: (r) => {
          const ultah: BarisAgenda[] = (r?.birthdays ?? []).map((b) => ({
            jenis: 'birthday' as const,
            daysUntil: b.daysUntil,
            judul: b.name,
            keterangan: this.tanggalUltah(b),
          }));

          const pengingat: BarisAgenda[] = (r?.reminders ?? []).map((p) => ({
            jenis: 'reminder' as const,
            daysUntil: p.daysUntil,
            judul: p.title,
            keterangan: this.keteranganPengingat(p),
            kategori: p.category,
            reminder: p,
          }));

          // Diurutkan bersama: yang paling dekat lebih dulu, dan pada hari
          // yang sama ulang tahun didahulukan karena tidak bisa ditunda.
          this.baris = [...ultah, ...pengingat].sort(
            (a, b) =>
              a.daysUntil - b.daysUntil ||
              (a.jenis === 'birthday' ? -1 : 1) -
                (b.jenis === 'birthday' ? -1 : 1),
          );
        },
        error: () => {
          this.baris = [];
          this.snackBar.open(
            this.translate.instant('notify.loadFailed'),
            'Close',
            { duration: 3000 },
          );
        },
      })
      .add(() => (this.isLoading = false));
  }

  private tanggalUltah(b: Birthday): string {
    return `${b.day} ${this.BULAN[b.month] ?? ''}`;
  }

  private keteranganPengingat(p: Reminder): string {
    if (p.isShared) return 'Untuk semua';
    const nama = (p.targets ?? []).map((t) => t.name);
    if (nama.length === 0) return p.note || '';
    if (nama.length <= 2) return nama.join(', ');
    return `${nama.slice(0, 2).join(', ')} +${nama.length - 2}`;
  }

  /** "Hari ini", "Besok", atau "n hari lagi". */
  jarak(n: number): string {
    if (n <= 0) return 'Hari ini';
    if (n === 1) return 'Besok';
    return `${n} hari lagi`;
  }

  /** Hanya pembuatnya yang boleh mengubah dan menghapus. */
  milikSaya(b: BarisAgenda): boolean {
    const saya = this.account.userId;
    // Tanpa id, jangan menawarkan tindakan yang pasti ditolak server.
    if (saya === null) return false;
    return b.jenis === 'reminder' && b.reminder?.createdBy === saya;
  }

  tambah(): void {
    this.dialog
      .open(ReminderCreateComponent, {
        width: '560px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((berubah) => berubah && this.muat());
  }

  ubah(b: BarisAgenda): void {
    if (!b.reminder) return;
    this.dialog
      .open(ReminderCreateComponent, {
        data: { reminder: b.reminder },
        width: '560px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((berubah) => berubah && this.muat());
  }

  hapus(b: BarisAgenda): void {
    if (!b.reminder) return;
    this.agenda.remove(b.reminder.id).subscribe({
      next: () => {
        this.snackBar.open(
          this.translate.instant('notify.deleteSuccess'),
          'Close',
          { duration: 3000 },
        );
        this.muat();
      },
      error: (e) =>
        this.snackBar.open(
          e?.error?.detail || this.translate.instant('notify.deleteFailed'),
          'Close',
          { duration: 4000 },
        ),
    });
  }
}
