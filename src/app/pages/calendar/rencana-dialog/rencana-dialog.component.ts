import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
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
import { TranslateModule } from '@ngx-translate/core';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

import { ProjectSelectorComponent } from 'src/app/components/project-selector/project-selector.component';
import { DialogGeserDirective } from 'src/app/directives/dialog-geser.directive';
import { ApiService } from 'src/app/services/api.service';
import { KATEGORI_RENCANA } from 'src/app/services/payment-plan.service';

@Component({
  selector: 'app-rencana-dialog',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    NgxMaskDirective,
    TranslateModule,
    DialogGeserDirective,
    ProjectSelectorComponent,
  ],
  templateUrl: './rencana-dialog.component.html',
  styleUrl: './rencana-dialog.component.scss',
})
export class RencanaDialogComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly api = inject(ApiService);

  readonly kategori = KATEGORI_RENCANA;
  rekening: any[] = [];

  formGroup: FormGroup = this.formBuilder.group({
    date: [new Date(), Validators.required],
    amount: [null, [Validators.required, Validators.min(1)]],
    description: ['', [Validators.required, Validators.maxLength(255)]],
    category: ['material'],
    projectName: [''],
    /*
     * Rekening boleh KOSONG.
     *
     * Rencana kerap dibuat sebelum diputuskan dari rekening mana dibayar —
     * dan memaksa memilihnya membuat orang menebak, lalu angka per rekening
     * pada layar posisi kas menjadi keliru tanpa ada yang menyadarinya.
     */
    bankAccountID: [null],
    notes: [''],
  });

  constructor(
    private dialogRef: MatDialogRef<RencanaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public input: any,
  ) {}

  get isUbah(): boolean {
    return !!this.input?.rencana?.id;
  }

  /**
   * Rencana yang sudah TERPAKAI hanya dapat dibaca.
   *
   * Ia sudah dipakai membandingkan rencana dengan kenyataan; mengubahnya
   * membuat selisihnya menyusut sendiri. Servernya juga menolak — yang
   * dijaga di sini hanya agar orang tidak mengisi seluruh formulir lalu
   * ditolak di akhir.
   */
  get terkunci(): boolean {
    return this.input?.rencana?.status === 'terpakai';
  }

  ngOnInit(): void {
    this.muatRekening();

    const r = this.input?.rencana;
    if (r) {
      this.formGroup.patchValue({
        date: r.date ? new Date(r.date) : new Date(),
        amount: r.amount ?? null,
        description: r.description ?? '',
        category: r.category ?? 'material',
        projectName: r.projectName ?? '',
        bankAccountID: r.bankAccountID ?? null,
        notes: r.notes ?? '',
      });
    } else if (this.input?.tanggal) {
      // Tanggal yang diklik di kalender ikut terbawa: yang menekan sel
      // tanggal 20 bermaksud membuat rencana pada tanggal itu.
      this.formGroup.patchValue({ date: new Date(this.input.tanggal) });
    }

    if (this.terkunci) this.formGroup.disable();
  }

  private muatRekening(): void {
    this.api.get('bank-accounts', { page: 1, pageSize: 200 }).subscribe({
      next: (res: any) => (this.rekening = res?.data ?? res ?? []),
      // Gagal memuat tidak menghalangi pengisian: rekeningnya memang boleh
      // dikosongkan.
      error: () => (this.rekening = []),
    });
  }

  private tanggalIso(v: any): string | null {
    if (!v) return null;
    const t = v instanceof Date ? v : new Date(v);
    if (isNaN(t.getTime())) return null;
    // Disusun dari bagian waktu SETEMPAT; `toISOString()` mengubahnya ke UTC
    // lebih dulu, dan bagi WIB itu memundurkan tanggalnya sehari.
    const dd = (n: number) => String(n).padStart(2, '0');
    return `${t.getFullYear()}-${dd(t.getMonth() + 1)}-${dd(t.getDate())}`;
  }

  simpan(): void {
    if (this.formGroup.invalid) {
      this.formGroup.markAllAsTouched();
      return;
    }
    const v = this.formGroup.getRawValue();
    this.dialogRef.close({
      date: this.tanggalIso(v.date),
      amount: Number(v.amount),
      description: v.description,
      category: v.category || null,
      projectName: v.projectName || null,
      bankAccountID: v.bankAccountID || null,
      notes: v.notes || null,
    });
  }

  batal(): void {
    this.dialogRef.close();
  }
}
