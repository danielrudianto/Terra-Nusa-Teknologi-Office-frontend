import { CommonModule } from '@angular/common';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { Component, Inject, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import moment from 'moment';

import { AgendaService, Reminder } from '../../../services/agenda.service';
import { ApiService } from '../../../services/api.service';
import { PermissionService } from '../../../services/permission.service';

/**
 * Buat atau ubah pengingat.
 *
 * Dua hal yang menentukan bentuknya:
 *
 *   Kategori diambil dari server, bukan disalin ke sini — daftar yang
 *   dikunci hanya berguna bila kedua sisi memakai daftar yang sama.
 *
 *   Pilihan "untuk seluruh pengguna" hanya muncul bagi akses 4 ke atas.
 *   Menampilkannya kepada yang tidak berhak berarti menawarkan sesuatu
 *   yang pasti ditolak server, dan penolakan setelah ditekan terbaca
 *   sebagai kerusakan, bukan sebagai aturan.
 */
@Component({
  selector: 'app-reminder-create',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatCheckboxModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  templateUrl: './reminder-create.component.html',
  styleUrl: './reminder-create.component.scss',
})
export class ReminderCreateComponent {
  private readonly serverMessage = inject(ServerMessageService);
  private readonly fb = inject(FormBuilder);
  private readonly agenda = inject(AgendaService);
  private readonly api = inject(ApiService);
  private readonly permission = inject(PermissionService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  constructor(
    private dialogRef: MatDialogRef<ReminderCreateComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { reminder?: Reminder; tanggalAwal?: string } | null,
  ) {}

  isSubmitting = false;
  categories: string[] = [];
  users: { id: number; name: string }[] = [];

  formGroup: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    date: ['', Validators.required],
    category: ['Lainnya', Validators.required],
    note: ['', Validators.maxLength(500)],
    isShared: [false],
    targets: [[] as number[]],
  });

  /** Sedang mengubah pengingat yang sudah ada. */
  get isEdit(): boolean {
    return !!this.data?.reminder;
  }

  /**
   * Boleh membuat pengingat bagi seluruh pengguna.
   *
   * Dibaca dari peta izin, bukan dari level yang tersimpan di peramban:
   * izin sudah memperhitungkan pengecualian per pengguna, sedangkan level
   * tidak.
   */
  get bolehUntukSemua(): boolean {
    return this.permission.can('reminder', 'approve');
  }

  ngOnInit(): void {
    this.agenda.categories().subscribe({
      next: (r) => (this.categories = r?.categories ?? []),
      error: () => (this.categories = ['Lainnya']),
    });

    // Daftar orang untuk ditandai.
    //
    // Diambil dari endpoint agenda, bukan daftar pengguna: daftar itu
    // dijaga `user:read` yang berada di akses 5, sehingga staf tidak akan
    // melihat satu nama pun. Server juga sudah mengecualikan diri sendiri,
    // jadi tidak ada penyaringan di sini yang bisa meleset.
    //
    // Gagal memuatnya tidak menghalangi pembuatan pengingat — hanya
    // penandaannya yang tidak tersedia.
    this.agenda.taggableUsers().subscribe({
      next: (r) => (this.users = r?.users ?? []),
      error: () => (this.users = []),
    });

    const r = this.data?.reminder;
    if (r) {
      this.formGroup.patchValue({
        title: r.title,
        date: r.date,
        category: r.category,
        note: r.note ?? '',
        isShared: r.isShared,
        targets: (r.targets ?? []).map((t) => t.id),
      });
    } else if (this.data?.tanggalAwal) {
      // Dibuka dari sel tanggal di kalender: tanggalnya sudah diketahui,
      // dan meminta pengguna memilihnya lagi hanya menambah satu langkah
      // yang mudah salah.
      this.formGroup.patchValue({ date: this.data.tanggalAwal });
    }
  }

  onSubmit(): void {
    if (this.formGroup.invalid) return;
    this.isSubmitting = true;

    const v = this.formGroup.getRawValue();
    const body = {
      title: (v.title || '').trim(),
      note: (v.note || '').trim() || null,
      date: moment(v.date).format('YYYY-MM-DD'),
      category: v.category,
      // Tidak boleh dikirim true oleh yang tidak berhak; server menolaknya,
      // tetapi lebih baik tidak sampai ke sana.
      isShared: this.bolehUntukSemua ? !!v.isShared : false,
      targets: v.targets ?? [],
    };

    const permintaan = this.isEdit
      ? this.agenda.update(this.data!.reminder!.id, body)
      : this.agenda.create(body);

    permintaan
      .subscribe({
        next: () => {
          this.snackBar.open(
            this.translate.instant(
              this.isEdit ? 'notify.updateSuccess' : 'notify.createSuccess',
            ),
            'Close',
            { duration: 3000 },
          );
          this.dialogRef.close(true);
        },
        error: (e) => {
          this.snackBar.open(
            this.serverMessage.terjemahkan(e, 'notify.createFailed'),
            'Close',
            { duration: 4000 },
          );
        },
      })
      .add(() => (this.isSubmitting = false));
  }

  batal(): void {
    this.dialogRef.close();
  }
}
