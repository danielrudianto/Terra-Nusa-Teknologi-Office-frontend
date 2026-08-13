import { Component, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import moment from 'moment';

import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-project-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatSnackBarModule,
    TranslatePipe,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './project-create.component.html',
  styleUrl: './project-create.component.scss',
})
export class ProjectCreateComponent {
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private dialogRef: MatDialogRef<ProjectCreateComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: { code?: string } | null,
  ) {
    // Dipanggil dari daftar kode yatim: kodenya sudah diketahui, tinggal
    // dilengkapi. Menyalinnya lebih dulu menghindari salah ketik ulang.
    if (data?.code) this.formGroup.get('code')?.setValue(data.code);
  }

  isSubmitting = false;
  clients: any[] = [];

  formGroup = new FormGroup({
    code: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(20),
    ]),
    name: new FormControl('', [Validators.required, Validators.maxLength(255)]),
    clientID: new FormControl<number | null>(null),
    startDate: new FormControl<Date | null>(null),
    endDate: new FormControl<Date | null>(null),
  });

  ngOnInit(): void {
    this.apiService.get('clients', { page: 1, pageSize: 200 }).subscribe({
      next: (res: any) => {
        this.clients = res?.data ?? res ?? [];
      },
      error: () => {
        // Klien bersifat pelengkap; gagal memuatnya tidak boleh menghalangi
        // pembuatan proyek. Isiannya cukup dibiarkan kosong.
        this.clients = [];
      },
    });
  }

  /**
   * Kode diseragamkan huruf besar sejak diketik.
   *
   * Server tetap menyeragamkannya juga — ini agar yang terlihat sama dengan
   * yang tersimpan, sehingga pengguna tidak mengira kodenya berbeda.
   */
  onCodeInput(): void {
    const c = this.formGroup.get('code');
    const v = (c?.value ?? '').toUpperCase().replace(/\s+/g, '');
    if (v !== c?.value) c?.setValue(v, { emitEvent: false });
  }

  /** Tanggal selesai tidak boleh mendahului tanggal mulai. */
  get tanggalTerbalik(): boolean {
    const a = this.formGroup.value.startDate;
    const b = this.formGroup.value.endDate;
    return !!a && !!b && moment(b).isBefore(moment(a), 'day');
  }

  onSubmit(): void {
    if (this.formGroup.invalid || this.tanggalTerbalik || this.isSubmitting)
      return;

    this.isSubmitting = true;
    const v = this.formGroup.value;

    this.apiService
      .post('projects', {
        code: v.code,
        name: v.name,
        clientID: v.clientID,
        startDate: v.startDate ? moment(v.startDate).format('YYYY-MM-DD') : null,
        endDate: v.endDate ? moment(v.endDate).format('YYYY-MM-DD') : null,
      })
      .subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant('project.created'), 'Close', {
            duration: 3000,
          });
          this.dialogRef.close(true);
        },
        error: (err) => {
          /*
           * Kode galat dipetakan di sini, bukan menampilkan `detail` mentah:
           * server sengaja mengirim kode tetap agar bisa diterjemahkan.
           */
          const kunci =
            err?.error?.detail === 'PROJECT_CODE_EXISTS'
              ? 'project.codeExists'
              : 'notify.saveFailed';
          this.snackBar.open(this.translate.instant(kunci), 'Close', {
            duration: 5000,
          });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
