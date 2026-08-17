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
import { ClientAutocompleteComponent } from '../../../components/client-autocomplete/client-autocomplete.component';

@Component({
  selector: 'app-project-update',
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
    ClientAutocompleteComponent,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './project-update.component.html',
  styleUrl: './project-update.component.scss',
})
export class ProjectUpdateComponent {
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private dialogRef: MatDialogRef<ProjectUpdateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.formGroup.patchValue({
      name: data?.name ?? '',
      // Tanpa ini alamat yang sudah tersimpan tidak muncul saat menyunting,
      // dan penyimpanan berikutnya menimpanya dengan kosong.
      address: data?.address ?? '',
      clientID: data?.clientID ?? null,
      startDate: data?.startDate ? new Date(data.startDate) : null,
      endDate: data?.endDate ? new Date(data.endDate) : null,
      isActive: !!data?.isActive,
      isCancelled: !!data?.isCancelled,
    });
  }

  isSubmitting = false;
  clients: any[] = [];

  /*
   * `code` sengaja tidak ada di sini.
   *
   * Kode adalah satu-satunya penghubung ke seluruh dokumen yang menunjuk
   * proyek ini; menggantinya memutus semua pembelian, PO, reimbursement, dan
   * faktur yang merujuknya — tanpa galat apa pun. Server pun menolaknya.
   */
  formGroup = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(255)]),
    // Alamat lokasi proyek; dipakai mengisi alamat pengiriman
    // purchase order Franco. Boleh kosong — proyek lama belum
    // punya alamat, dan mewajibkannya membuat seluruhnya tidak
    // dapat disunting sampai satu per satu diisi.
    address: new FormControl(''),
    clientID: new FormControl<number | null>(null),
    startDate: new FormControl<Date | null>(null),
    endDate: new FormControl<Date | null>(null),
    isActive: new FormControl(true),
    isCancelled: new FormControl(false),
  });

  /**
   * Tiga keadaan, dua penanda. Layar memakai satu pilihan agar kombinasi
   * yang tidak punya arti (aktif sekaligus batal) tidak mungkin dipilih.
   */
  get keadaan(): 'berjalan' | 'selesai' | 'batal' {
    if (this.formGroup.value.isCancelled) return 'batal';
    return this.formGroup.value.isActive ? 'berjalan' : 'selesai';
  }

  setKeadaan(k: 'berjalan' | 'selesai' | 'batal'): void {
    this.formGroup.patchValue({
      isActive: k === 'berjalan',
      isCancelled: k === 'batal',
    });
  }

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
      .put(`projects/${this.data.id}`, {
        name: v.name,
        // Alamat lokasi proyek; dipakai mengisi pengiriman PO Franco.
        //
        // Muatan ini menyebut kolomnya satu per satu, sehingga isian baru
        // TIDAK ikut dengan sendirinya — yang lupa ditambahkan di sini
        // tersimpan sebagai NULL tanpa galat apa pun.
        address: v.address ?? null,
        clientID: v.clientID,
        startDate: v.startDate ? moment(v.startDate).format('YYYY-MM-DD') : null,
        endDate: v.endDate ? moment(v.endDate).format('YYYY-MM-DD') : null,
        isActive: v.isActive,
        isCancelled: v.isCancelled,
      })
      .subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant('project.updated'), 'Close', {
            duration: 3000,
          });
          this.dialogRef.close(true);
        },
        error: (err) => {
          /*
           * Kode galat dipetakan di sini, bukan menampilkan `detail` mentah:
           * server sengaja mengirim kode tetap agar bisa diterjemahkan.
           */
          this.snackBar.open(this.translate.instant('notify.saveFailed'), 'Close', {
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
