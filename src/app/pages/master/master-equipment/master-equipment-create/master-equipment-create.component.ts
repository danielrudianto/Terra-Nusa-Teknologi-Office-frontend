import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { Component, Inject, OnInit, Optional, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogGeserDirective } from '../../../../directives/dialog-geser.directive';

@Component({
  selector: 'app-master-equipment-create',
  standalone: true,
  imports: [
    TranslatePipe,
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    DialogGeserDirective,
  ],
  templateUrl: './master-equipment-create.component.html',
  styleUrl: './master-equipment-create.component.scss',
})
export class MasterEquipmentCreateComponent implements OnInit {
  private readonly serverMessage = inject(ServerMessageService);

  private readonly translate = inject(TranslateService);
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialogRef<MasterEquipmentCreateComponent>,
    /*
     * Dialog ini dipakai untuk MEMBUAT dan MENGUBAH.
     *
     * Satu komponen, bukan dua: bentuk isiannya sama persis, dan layar kedua
     * berarti setiap penambahan bidang harus dikerjakan dua kali — lalu
     * salah satunya tertinggal.
     *
     * `@Optional()` karena dialog pembuatan dibuka tanpa data sama sekali.
     */
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any = null,
  ) {}

  /** Mode ubah bila dialog dibuka dengan membawa alat yang sudah ada. */
  get isUbah(): boolean {
    return !!this.data?.id;
  }

  ngOnInit(): void {
    if (this.isUbah) {
      this.formGroup.patchValue({
        name: this.data.name ?? '',
        category: this.data.category ?? '',
        capacity: this.data.capacity ?? '',
        brand: this.data.brand ?? '',
          unit: this.data.unit ?? '',
      });
    }
  }

  isSubmitting = false;

  categories: string[] = [
    'Forklift',
    'Excavator',
    'Crane',
    'Generator Set',
    'Lainnya',
  ];
  units: string[] = ['hari', 'minggu', 'bulan', 'jam', 'trip'];

  formGroup: FormGroup = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    category: new FormControl('', Validators.required),
    capacity: new FormControl(''),
    brand: new FormControl(''),
    unit: new FormControl('hari', Validators.required),
  });

  onCancel() {
    this.dialog.close();
  }

  onSubmit() {
    this.isSubmitting = true;

    const muatan = {
      name: this.formGroup.value.name,
      category: this.formGroup.value.category,
      capacity: this.formGroup.value.capacity || null,
      brand: this.formGroup.value.brand || null,
      unit: this.formGroup.value.unit,
    };

    /*
     * Mengubah memakai PUT ke alat yang bersangkutan.
     *
     * Nama dan kapasitas yang berubah TIDAK menyentuh dokumen yang sudah
     * terbit: purchase order menyalin sebutan alatnya saat disimpan. Itu
     * memang yang diinginkan — lembar yang dipegang vendor tidak boleh
     * berubah isinya karena katalog diperbaiki belakangan.
     */
    const kirim = this.isUbah
      ? this.apiService.put(`master-equipment/${this.data.id}`, muatan)
      : this.apiService.post('master-equipment', muatan);

    kirim
      .subscribe({
        next: () => {
          this.snackBar.open(
            this.translate.instant(
              this.isUbah ? 'notify.updateSuccess' : 'notify.createSuccess',
            ),
            'Close',
            { duration: 3000 },
          );
          this.dialog.close(true);
        },
        error: (err) =>
          this.snackBar.open(
            this.serverMessage.terjemahkan(
              err,
              this.isUbah ? 'notify.updateFailed' : 'notify.createFailed',
            ),
            'Close',
            { duration: 3000 },
          ),
      })
      .add(() => (this.isSubmitting = false));
  }
}
