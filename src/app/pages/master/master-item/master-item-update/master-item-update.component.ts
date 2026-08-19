import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { Component, Inject, inject } from '@angular/core';
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
import { MASTER_ITEM_PURCHASE_TYPES, purchaseTypeLabel } from 'src/app/constants/purchase-type-label.constant';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogGeserDirective } from '../../../../directives/dialog-geser.directive';
import { PermissionService } from 'src/app/services/permission.service';

@Component({
  selector: 'app-master-item-update',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    TranslatePipe,
    DialogGeserDirective,
  ],
  templateUrl: './master-item-update.component.html',
  styleUrl: './master-item-update.component.scss',
})
export class MasterItemUpdateComponent {
  private readonly serverMessage = inject(ServerMessageService);

  private readonly translate = inject(TranslateService);
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialogRef<MasterItemUpdateComponent>,
    private izin: PermissionService,
  ) {}

  /**
   * Hanya level 5 yang boleh mengubah SKU.
   *
   * Tanpa pengecualian — bukan lewat izin per modul, melainkan level itu
   * sendiri. Izin `master_item:update` terbuka sampai level 3, dan itu
   * memang tepat untuk deskripsi dan merek; SKU berbeda karena ia penyebut
   * yang dipegang seluruh dokumen.
   */
  get bolehUbahSku(): boolean {
    return this.izin.level() >= 5;
  }

  isSubmitting: boolean = false;

  units: string[] = [
    'pcs',
    'set',
    'Kg',
    'gram',
    'ton',
    'm',
    'm2',
    'm3',
    'batang',
    'lembar',
    'roll',
    'dus',
    'sak',
    'pasang',
    'lusin',
    'unit',
    'liter',
    'box',
    'kaleng',
  ];

  purchaseTypes: { code: string; label: string }[] =
    MASTER_ITEM_PURCHASE_TYPES.map((code) => ({
      code,
      label: purchaseTypeLabel(this.translate, code),
    }));
  selectedTypes: string[] = [];

  formGroup: FormGroup = new FormGroup({
    /*
     * SKU dapat diubah, tetapi HANYA oleh level 5.
     *
     * Kode ini dipakai untuk mencocokkan barang lintas dokumen — purchase
     * order, pembelian, dan rekap semuanya menyebutnya. Mengubahnya berarti
     * mengubah penyebut yang dipegang bersama, dan itu bukan pembetulan
     * salah ketik biasa.
     *
     * Dibiarkan dapat diubah karena kesalahan pengetikan saat memasukkan
     * barang baru memang terjadi, dan tanpa jalur ini satu-satunya cara
     * membetulkannya adalah menghapus barangnya — yang memutus kaitan
     * dokumen lama yang sudah menyebutnya.
     */
    sku: new FormControl(
      { value: '', disabled: true },
      [Validators.required, Validators.maxLength(45)],
    ),
    description: new FormControl('', Validators.required),
    brand: new FormControl('', [Validators.required, Validators.maxLength(45)]),
    type: new FormControl('', [Validators.required, Validators.maxLength(45)]),
    unit: new FormControl('', Validators.required),
  });

  ngOnInit(): void {
    const item = this.data?.item ?? this.data ?? {};
    this.formGroup.patchValue({
      sku: item.sku || '',
      description: item.description || '',
      brand: item.brand || '',
      type: item.type || '',
      unit: item.unit || '',
    });

    /*
     * Kuncinya dibuka HANYA untuk level 5.
     *
     * Isian yang dikunci tetap menampilkan nilainya, sehingga yang tidak
     * berhak tetap dapat membaca SKU-nya — yang tidak bisa hanya
     * mengubahnya. Menyembunyikannya justru membingungkan: orang mencari
     * kode yang ia tahu ada.
     */
    if (this.bolehUbahSku) {
      this.formGroup.get('sku')?.enable();
    }
    this.selectedTypes = this.normalizeTypes(item.availablePurchaseType);
  }

  get item(): any {
    return this.data?.item ?? this.data ?? {};
  }

  normalizeTypes(v: any): string[] {
    if (!v) return [];
    if (Array.isArray(v)) return [...v];
    return String(v)
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }

  isTypeSelected(code: string): boolean {
    return this.selectedTypes.includes(code);
  }

  toggleType(code: string) {
    if (this.isTypeSelected(code)) {
      this.selectedTypes = this.selectedTypes.filter((c) => c !== code);
    } else {
      this.selectedTypes = [...this.selectedTypes, code];
    }
  }

  get canSubmit(): boolean {
    return this.formGroup.valid && this.selectedTypes.length > 0;
  }

  onCancel() {
    this.dialog.close();
  }

  onSubmit() {
    this.isSubmitting = true;
    const id = this.item.id;
    this.apiService
      .put('master-items/' + id, {
        id: id,

        /*
         * SKU hanya IKUT bila isiannya terbuka.
         *
         * `formGroup.value` tidak memuat kontrol yang dikunci, sehingga
         * pengguna di bawah level 5 tidak pernah mengirimnya sama sekali —
         * bukan mengirim nilai lama yang kebetulan sama. Bedanya penting:
         * yang tidak dikirim tidak tersentuh, sedangkan nilai yang dikirim
         * ulang tetap tercatat sebagai perubahan pada jejak audit.
         */
        ...(this.bolehUbahSku && this.formGroup.value.sku
          ? { sku: this.formGroup.value.sku }
          : {}),

        description: this.formGroup.value.description,
        brand: this.formGroup.value.brand,
        type: this.formGroup.value.type,
        unit: this.formGroup.value.unit,
        availablePurchaseType: this.selectedTypes.join(',') || null,
      })
      .subscribe({
        next: () => {
          this.snackBar.open(
      this.translate.instant('notify.updateSuccess'), 'Close', {
            duration: 3000,
          });
          this.dialog.close(true);
        },
        error: (err) => {
          this.snackBar.open(
            this.serverMessage.terjemahkan(err, 'notify.updateFailed'),
            'Close',
            { duration: 3000 },
          );
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
