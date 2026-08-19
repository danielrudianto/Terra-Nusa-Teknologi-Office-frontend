import { CommonModule } from '@angular/common';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

import { MasterItemSelectorComponent } from 'src/app/components/master-item-selector/master-item-selector.component';
import { ProjectSelectorComponent } from 'src/app/components/project-selector/project-selector.component';
import { TenderService } from 'src/app/services/tender.service';

@Component({
  selector: 'app-tender-create',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    NgxMaskDirective,
    TranslateModule,
    ProjectSelectorComponent,
  ],
  templateUrl: './tender-create.component.html',
  styleUrl: './tender-create.component.scss',
})
export class TenderCreateComponent implements OnInit {
  private readonly serverMessage = inject(ServerMessageService);

  private readonly formBuilder = inject(FormBuilder);
  private readonly service = inject(TenderService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  /** Id tender yang sedang disunting; kosong berarti membuat baru. */
  tenderId: number | null = null;
  isSubmitting = false;

  formGroup: FormGroup = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    date: [new Date(), Validators.required],
    /*
     * Jenis menentukan BENTUK barisnya.
     *
     * Barang diambil dari katalog dengan satuan dan volume; jasa ditulis
     * bebas sebagai uraian pekerjaan. Mengubahnya setelah ada baris akan
     * meninggalkan baris berbentuk lama — karena itu barisnya dikosongkan.
     */
    tenderType: ['barang', Validators.required],
    projectName: ['', Validators.required],
    description: [''],
    // Garansi, masa berlaku penawaran, syarat pengiriman.
    requirements: [''],
    dueDate: [null],
    items: this.formBuilder.array([]),
  });

  get t(): FormArray {
    return this.formGroup.get('items') as FormArray;
  }

  barisAt(i: number): FormGroup {
    return this.t.at(i) as FormGroup;
  }

  get isJasa(): boolean {
    return this.formGroup.get('tenderType')?.value === 'jasa';
  }


  readonly satuan = [
    'pcs', 'set', 'unit', 'lot', 'Kg', 'ton', 'liter',
    'm', 'm2', 'm3', 'batang', 'lembar', 'roll', 'sak', 'hari', 'bulan', 'LS',
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.tenderId = Number(id);
      this.muat(this.tenderId);
    } else {
      // Satu baris kosong disiapkan.
      //
      // Tender tanpa baris tidak dapat disimpan; memulai dari formulir yang
      // benar-benar kosong membuat yang mengisinya harus menekan tambah
      // sebelum dapat mengetik apa pun.
      this.tambahBaris();
    }
  }

  private muat(id: number): void {
    this.service.ambil(id).subscribe({
      next: (d: any) => {
        if (!d) return;
        this.formGroup.patchValue({
          name: d.name,
          date: d.date ? new Date(d.date) : new Date(),
          tenderType: d.tenderType,
          projectName: d.projectName,
          description: d.description ?? '',
          paymentTerm: d.paymentTerm ?? '',
          creditTerm: d.creditTerm ?? null,
          requirements: d.requirements ?? '',
          dueDate: d.dueDate ? new Date(d.dueDate) : null,
        });
        this.t.clear();
        for (const b of d.items ?? []) {
          this.t.push(this.buatBaris(b));
        }
        if (!this.t.length) this.tambahBaris();
      },
      error: () => {
        this.snackBar.open(
          this.translate.instant('notify.loadFailed'),
          'Close',
          { duration: 3000 },
        );
      },
    });
  }

  private buatBaris(v: any = {}): FormGroup {
    return this.formBuilder.group({
      itemID: [v.itemID ?? null],
      name: [v.name ?? '', [Validators.required, Validators.maxLength(255)]],
      specification: [v.specification ?? ''],
      /*
       * Volume dan satuan TIDAK wajib.
       *
       * Sebagian permintaan memang belum pasti volumenya — "sesuai kebutuhan
       * lapangan" — dan memaksa mengisinya membuat orang mengarang angka
       * yang kemudian dikira sudah pasti.
       */
      quantity: [v.quantity ?? null],
      unit: [v.unit ?? ''],
    });
  }

  tambahBaris(): void {
    this.t.push(this.buatBaris());
  }

  hapusBaris(i: number): void {
    this.t.removeAt(i);
    // Baris terakhir tidak dihapus habis: tender tanpa baris tidak dapat
    // disimpan, dan formulir kosong tanpa tombol terlihat rusak.
    if (!this.t.length) this.tambahBaris();
  }

  /**
   * Ganti jenis tender.
   *
   * Barisnya dikosongkan: baris barang membawa `itemID` dan satuan dari
   * katalog, sedangkan baris jasa uraian bebas. Membiarkannya menghasilkan
   * permintaan bercampur yang tidak dapat dibandingkan.
   */
  onJenisBerubah(): void {
    this.t.clear();
    this.tambahBaris();
  }

  pilihBarang(i: number): void {
    this.dialog
      .open(MasterItemSelectorComponent, {
        data: {},
        width: '560px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((item: any) => {
        if (!item) return;
        this.barisAt(i).patchValue({
          itemID: item.id,
          name: item.description || item.sku || '',
          specification: item.brand ? `${item.brand} ${item.type ?? ''}`.trim() : '',
          unit: item.unit ?? '',
        });
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
      this.snackBar.open(
        this.translate.instant('notify.formInvalid'),
        'Close',
        { duration: 3000 },
      );
      return;
    }

    const v = this.formGroup.getRawValue();
    const muatan = {
      name: v.name,
      date: this.tanggalIso(v.date),
      tenderType: v.tenderType,
      projectName: v.projectName,
      description: v.description || null,
      requirements: v.requirements || null,
      dueDate: this.tanggalIso(v.dueDate),
      items: (v.items || []).map((x: any, i: number) => ({
        itemID: x.itemID ?? null,
        name: x.name,
        specification: x.specification || null,
        quantity: x.quantity ? Number(x.quantity) : null,
        unit: x.unit || null,
        sortOrder: i,
      })),
    };

    this.isSubmitting = true;
    const permintaan = this.tenderId
      ? this.service.ubah(this.tenderId, muatan as any)
      : this.service.buat(muatan as any);

    permintaan.subscribe({
      next: (res: any) => {
        this.snackBar.open(
          this.translate.instant('tender.tersimpan'),
          'Close',
          { duration: 3000 },
        );
        this.router.navigate(['/Tender', this.tenderId ?? res?.id]);
      },
      error: (e: any) => {
        this.snackBar.open(
          this.serverMessage.terjemahkan(e, 'notify.saveFailed'),
          'Close',
          { duration: 4000 },
        );
      },
    }).add(() => (this.isSubmitting = false));
  }

  batal(): void {
    this.router.navigate(['/Tender']);
  }
}
