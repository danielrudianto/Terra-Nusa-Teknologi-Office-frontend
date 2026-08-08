import { Component } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupplierSelectorComponent } from '../../../../components/supplier-selector/supplier-selector.component';
import { HeaderTitleComponent } from '../../../../components/header-title/header-title.component';
import { WysiwygComponent } from '../../../../components/wysiwyg/wysiwyg.component';
import { ApiService } from '../../../../services/api.service';
import { TranslatePipe } from '@ngx-translate/core';
import {
  buildClauseHtml,
  latestClauseVersion,
} from '../../../../constants/clause-templates';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-purchase-order-create-d',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [
    MatTooltipModule,
    TranslatePipe,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    NgxMaskDirective,
    HeaderTitleComponent,
    WysiwygComponent,
  ],
  templateUrl: './purchase-order-create-d.component.html',
  styleUrl: './purchase-order-create-d.component.scss',
})
export class PurchaseOrderCreateDComponent {
  constructor(
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.ensureWorker();
  }

  isSubmitting = false;

  /** satuan upah — bebas dipilih per baris pekerjaan */
  units: string[] = [
    'hari',
    'kegiatan',
    'minggu',
    'bulan',
    'jam',
    'orang',
    'titik',
    'kg',
    'm2',
    'm3',
    'LS',
  ];

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    purchaseType: new FormControl('D'),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierAddress: new FormControl('', Validators.required),
    projectName: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[A-Z0-9]{4,5}$/),
    ]),
    overtimeRate: new FormControl(0, [Validators.min(0)]),
    // Shift maksimal 24 jam — lebih dari itu tidak masuk akal untuk 1 hari.
    shiftHours: new FormControl(8, [
      Validators.required,
      Validators.min(1),
      Validators.max(24),
    ]),
    includeSundayPolicy: new FormControl(false),
    additionalClauses: new FormArray([]),
    notes: new FormControl(''),
    // Satu SPK = satu pekerja, jadi array ini selalu berisi tepat 1 entri.
    workers: new FormArray([]),
  });

  get f() {
    return this.formGroup.controls;
  }
  get t() {
    return this.formGroup.get('workers') as FormArray;
  }
  getFormGroupAt(i: number) {
    return this.t.at(i) as FormGroup;
  }
  removeAt(i: number) {
    this.t.removeAt(i);
  }

  /** Satu komponen upah: nominal + satuan + jadwal pembayarannya sendiri. */
  private buildWage(): FormGroup {
    return this.formBuilder.group({
      label: ['Upah harian', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
      unit: ['hari', Validators.required],
      // weekly    = tiap pekan pada hari X
      // sameMonth = tiap bulan pada tanggal X di bulan yang sama
      // nextMonth = tiap bulan pada tanggal X di bulan berikutnya
      scheduleType: ['weekly', Validators.required],
      payDay: ['Sabtu'], // weekly
      payDate: [10], // sameMonth / nextMonth
      cutoffDay: ['Rabu'], // weekly — periode mulai otomatis hari berikutnya
      cutoffDate: [15], // sameMonth — periode mulai otomatis tanggal berikutnya
    });
  }

  wagesAt(i: number): FormArray {
    return this.getFormGroupAt(i).get('wages') as FormArray;
  }

  wageGroupAt(i: number, j: number): FormGroup {
    return this.wagesAt(i).at(j) as FormGroup;
  }

  addWage(i: number) {
    this.wagesAt(i).push(this.buildWage());
  }

  removeWage(i: number, j: number) {
    if (this.wagesAt(i).length > 1) this.wagesAt(i).removeAt(j);
  }

  readonly wageUnits = ['hari', 'bulan', 'jam', "m'", 'titik', 'lot'];
  /** Tanggal 1–28 saja: 29–31 tidak ada di semua bulan. */
  readonly payDates = Array.from({ length: 28 }, (_, i) => i + 1);
  /**
   * value = yang disimpan & masuk kalimat klausul (SPK berbahasa Indonesia),
   * key   = label yang ditampilkan, ikut bahasa aplikasi.
   */
  readonly weekDays: { value: string; key: string }[] = [
    { value: 'Senin', key: 'common.monday' },
    { value: 'Selasa', key: 'common.tuesday' },
    { value: 'Rabu', key: 'common.wednesday' },
    { value: 'Kamis', key: 'common.thursday' },
    { value: 'Jumat', key: 'common.friday' },
    { value: 'Sabtu', key: 'common.saturday' },
    { value: 'Minggu', key: 'common.sunday' },
  ];

  /** Hari sesudah hari yang dipilih (periode mulai = sehari setelah cut-off). */
  private dayAfter(day: string): string {
    const i = this.weekDays.findIndex((d) => d.value === day);
    return i < 0 ? day : this.weekDays[(i + 1) % this.weekDays.length].value;
  }

  /**
   * Dua kalimat per komponen upah: jadwal pembayaran + periode perhitungannya.
   * Nomor rincian mengacu ke urutan komponen upah pada PO ini.
   */
  wageSentences(w: any, index: number): string[] {
    const label = (w.label || 'Upah').trim();
    const ref = `${label}, sebagaimana disebutkan pada rincian pekerjaan ${
      index + 1
    },`;

    switch (w.scheduleType) {
      case 'sameMonth': {
        const cut = Number(w.cutoffDate) || 15;
        const start = cut >= 28 ? 1 : cut + 1;
        return [
          `${ref} akan dibayarkan setiap bulan pada tanggal ${
            w.payDate || 10
          } pada bulan yang sama.`,
          `Periode perhitungan ${label.toLowerCase()} dimulai tanggal ${start} dan berakhir (cut-off) pada tanggal ${cut}.`,
        ];
      }
      case 'nextMonth':
        return [
          `${ref} akan dibayarkan setiap bulan pada tanggal ${
            w.payDate || 10
          } di bulan berikutnya.`,
          `Periode perhitungan ${label.toLowerCase()} dimulai pada awal bulan dan berakhir (cut-off) pada akhir bulan.`,
        ];
      default: {
        const cutoff = w.cutoffDay || 'Rabu';
        return [
          `${ref} akan dibayarkan setiap minggu pada hari ${
            w.payDay || 'Sabtu'
          }.`,
          `Periode perhitungan ${label.toLowerCase()} dimulai hari ${this.dayAfter(
            cutoff,
          )} dan berakhir (cut-off) pada hari ${cutoff}.`,
        ];
      }
    }
  }

  /** Jadwal upah dari pekerja pertama — dipakai untuk preview poin perjanjian. */
  private get wageSchedules(): string[] {
    const first = this.t.at(0);
    if (!first) return [];
    const wages = (first.get('wages')?.value as any[]) || [];
    return wages.flatMap((w, idx) => this.wageSentences(w, idx));
  }

  private buildWorker(): FormGroup {
    return this.formBuilder.group({
      task: ['', [Validators.required, Validators.maxLength(100)]], // nama pekerjaan
      // Upah bisa terdiri dari beberapa komponen dengan satuan & jadwal bayar
      // berbeda (mis. gaji pokok bulanan + uang makan harian + insentif per m').
      wages: this.formBuilder.array([this.buildWage()]),
    });
  }

  /** Satu SPK = satu pekerja: pastikan selalu ada tepat satu baris. */
  private ensureWorker() {
    if (this.t.length === 0) this.t.push(this.buildWorker());
    while (this.t.length > 1) this.t.removeAt(this.t.length - 1);
  }

  get worker(): FormGroup {
    return this.getFormGroupAt(0);
  }

  /** Total nominal seluruh komponen upah milik satu pekerja. */
  lineTotal(i: number): number {
    const wages = (this.wagesAt(i)?.getRawValue() as any[]) || [];
    return wages.reduce((acc, w) => acc + (Number(w.amount) || 0), 0);
  }

  get rawTotal(): number {
    return this.t.controls.reduce((acc, _c, i) => acc + this.lineTotal(i), 0);
  }

  get grandTotal(): number {
    return this.rawTotal;
  }

  openSupplierSelector() {
    this.dialog
      .open(SupplierSelectorComponent, {})
      .afterClosed()
      .subscribe((data) => {
        if (data) {
          this.formGroup.patchValue({
            supplierID: data.id,
            supplierName: data.name,
            supplierAddress: data.address,
          });
        }
      });
  }

  toUpperCase() {
    const v = this.formGroup.get('projectName')?.value;
    if (v && v.toUpperCase() !== v) {
      this.formGroup.patchValue({ projectName: v.toUpperCase() });
    }
  }

  private toISO(d: any): string | null {
    return d ? new Date(d).toISOString().split('T')[0] : null;
  }

  formatData() {
    // PO-D adalah SPK untuk pekerja perorangan — bukan PKP, jadi tidak
    // pernah ada PPN. DPP = total upah apa adanya.
    const dpp = this.rawTotal;
    const ppn = 0;
    const projectCode = this.formGroup.get('projectName')?.value;
    return {
      date: this.toISO(this.formGroup.get('date')?.value),
      supplierID: this.formGroup.get('supplierID')?.value,
      purchaseType: 'D',
      projectName: projectCode,
      projectCode: projectCode,
      name: '',
      dpp: dpp,
      ppn: ppn,
      // SPK pekerja tidak memakai termin vendor; jadwalnya ada di
      // tiap komponen upah.
      payment_term: '',
      templateVersion: this.templateVersion,
      billing_requirements: {},
      // manpower lines -> purchase_order_items
      // Satu baris item per komponen upah, supaya bentuk payload lama
      // (task/quantity/price/unit) tetap terpakai apa adanya.
      items: this.t.controls.flatMap((c) => {
        const x = c.getRawValue();
        const wages = (x.wages as any[]) || [];
        return wages.map((w) => ({
          task: x.task, // nama pekerjaan (tukang cor, mandor cor, dll)
          quantity: 1,
          price: Number(w.amount) || 0,
          unit: w.unit,
          // Pekerja = supplier yang dipilih, jadi identitasnya tidak
          // diketik ulang di sini; backend punya datanya lewat supplierID.
          remarks_1: this.formGroup.get('supplierName')?.value,
          remarks_2: '',
          remarks_3: w.label, // komponen upah (gaji pokok, uang makan, dll)
          // Jadwal disimpan sebagai DATA, bukan kalimat jadi. Kalimat
          // klausul dirakit ulang saat render/edit dari template + data ini,
          // sehingga mengedit PO tidak perlu mengubah teks yang tersimpan.
          schedule: {
            type: w.scheduleType, // weekly | sameMonth | nextMonth
            payDay: w.scheduleType === 'weekly' ? w.payDay : null,
            payDate:
              w.scheduleType === 'weekly' ? null : Number(w.payDate) || null,
            cutoffDay: w.scheduleType === 'weekly' ? w.cutoffDay : null,
            cutoffDate:
              w.scheduleType === 'sameMonth'
                ? Number(w.cutoffDate) || null
                : null,
          },
        }));
      }),
      customData: {
        // Hanya data sumber — poin perjanjian TIDAK disimpan sebagai teks.
        // Renderer merakitnya dari templateVersion + data di bawah ini.
        overtimeRate: Number(this.formGroup.get('overtimeRate')?.value) || 0,
        shiftHours: Math.min(
          24,
          Math.max(1, Number(this.formGroup.get('shiftHours')?.value) || 8),
        ),
        includeSundayPolicy: !!this.formGroup.get('includeSundayPolicy')?.value,
        // poin custom yang memang diketik sendiri oleh user
        additionalClauses: (this.additionalClauses.value as string[])
          .map((c) => (c || '').trim())
          .filter((c) => c.length > 0),
        // rich-text agreement points / notes (HTML string)
        notes: this.formGroup.get('notes')?.value,
      },
    };
  }

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .post('purchase-orders', this.formatData())
      .subscribe({
        next: (res: any) => {
          this.snackBar.open(
            `Purchase order ${res?.purchase_order_name ?? ''} berhasil dibuat`,
            'Close',
            { duration: 3000 },
          );
          this.router.navigate(['/Purchase-order']);
        },
        error: (error) =>
          this.snackBar.open(
            error?.error?.detail ?? 'Gagal membuat purchase order',
            'Close',
            { duration: 3000 },
          ),
      })
      .add(() => (this.isSubmitting = false));
  }

  templateVersion = latestClauseVersion('D');

  get additionalClauses(): FormArray {
    return this.formGroup.get('additionalClauses') as FormArray;
  }

  addClause() {
    this.additionalClauses.push(new FormControl(''));
  }

  removeClause(i: number) {
    this.additionalClauses.removeAt(i);
  }

  private get additionalClauseValues(): string[] {
    return (this.additionalClauses.value as string[]) || [];
  }

  private clauseContext() {
    const v = this.formGroup.getRawValue();
    return {
      overtimeRate: v.overtimeRate,
      shiftHours: v.shiftHours,
      includeSundayPolicy: v.includeSundayPolicy,
      wageSchedules: this.wageSchedules,
    };
  }

  get clausePreview(): string {
    return buildClauseHtml(
      'D',
      this.clauseContext(),
      this.templateVersion,
      this.additionalClauseValues,
    );
  }
}
