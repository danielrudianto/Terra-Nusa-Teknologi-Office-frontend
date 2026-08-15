import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Component, Inject, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';
import { AuditTrailComponent } from '../../../components/audit-trail/audit-trail.component';

@Component({
  selector: 'app-supplier-update',
  imports: [
    TranslatePipe,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatChipsModule,
    MatDividerModule,
    MatIconModule,
    MatButtonModule,
    DialogGeserDirective,
    AuditTrailComponent,
  ],
  templateUrl: './supplier-update.component.html',
  styleUrl: './supplier-update.component.scss',
  standalone: true,
})
export class SupplierUpdateComponent {
  private readonly translate = inject(TranslateService);
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    public route: ActivatedRoute,
    private dialog: MatDialogRef<SupplierUpdateComponent>,
    private clipboard: Clipboard,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      id: number;
      readOnly: boolean;
    },
  ) {}

  supplierFormGroup: FormGroup = new FormGroup({
    id: new FormControl(this.data.id, Validators.required),
    prefix: new FormControl('', Validators.required),
    name: new FormControl('', [Validators.required, Validators.maxLength(255)]),
    address: new FormControl('', [Validators.required, Validators.maxLength(255)]),
    city: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    province: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    npwp: new FormControl('', [
      Validators.maxLength(16),
      Validators.pattern(/^$|^\d{16}$/),
    ]),
    phoneNumber: new FormControl('', [
      Validators.required,
      Validators.pattern(/^\d{10,20}$/),
      Validators.maxLength(20),
    ]),
    email: new FormControl('', [Validators.email, Validators.maxLength(255)]),
    soldItems: new FormControl(''),
    serviceAreas: new FormControl(''),
  });

  isSubmitting: boolean = false;
  items: string[] = [];
  areas: string[] = [];

  ngOnInit(): void {
    this.supplierFormGroup.controls['soldItems'].valueChanges.subscribe(
      (value) => {
        // if there is a comma, split the string into an array
        if (value.includes(',') && value.length > 1) {
          const item = value.slice(0, -1);
          if (!this.items.includes(item)) {
            this.items.push(item);
            this.supplierFormGroup.patchValue({
              soldItems: '',
            });
          }
        }
      },
    );

    this.supplierFormGroup.controls['serviceAreas'].valueChanges.subscribe(
      (value) => {
        // if there is a comma, split the string into an array
        if (value.includes(',') && value.length > 1) {
          const item = value.slice(0, -1);
          if (!this.areas.includes(item)) {
            this.areas.push(item);
            this.supplierFormGroup.patchValue({
              serviceAreas: '',
            });
          }
        }
      },
    );

    this.fetchData();
  }

  remove(item: string) {
    const index = this.items.indexOf(item);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  removeArea(area: string) {
    const index = this.areas.indexOf(area);
    if (index >= 0) {
      this.areas.splice(index, 1);
    }
  }

  onSubmit() {
    if (this.data.readOnly) return;
    this.isSubmitting = true;
    this.apiService
      .put('suppliers', {
        ...this.supplierFormGroup.value,
        email: this.supplierFormGroup.value.email || null,
        npwp:
          this.supplierFormGroup.value.npwp.length < 16
            ? null
            : this.supplierFormGroup.value.npwp,
        itemsSold: this.items.map((item) => item.trim()).join(','),
        serviceArea: this.areas.map((item) => item.trim()).join(','),
      })
      .subscribe({
        next: (data) => {
          console.log('Success:', data);
          this.snackBar.open(
      this.translate.instant('notify.createSuccess'), 'Close', {
            duration: 3000,
          });

          this.dialog.close(data);
        },
        error: (error) => {
          console.error(`Error: ${error.error.detail}`);
          this.snackBar.open('Error: ' + error.error.detail, 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

  isBlacklist: boolean = false;
  blacklistReason: string = '';

  fetchData() {
    this.apiService.get('suppliers/' + this.data.id, {}).subscribe({
      next: (data: any) => {
        this.supplierFormGroup.patchValue({
          prefix: data.prefix,
          name: data.name,
          address: data.address,
          city: data.city,
          province: data.province,
          npwp: data.npwp || '',
          phoneNumber: data.phoneNumber,
          email: data.email || '',
        });

        this.isBlacklist = !!data.isBlacklist;
        this.blacklistReason = data.blacklistReason || '';

        // Guard against null / empty so .split() can't blow up on older rows
        this.items = (data.itemsSold || '')
          .split(',')
          .map((item: string) => item.trim())
          .filter((item: string) => !!item);

        this.areas = (data.serviceArea || '')
          .split(',')
          .map((item: string) => item.trim())
          .filter((item: string) => !!item);
      },
      error: (error) => {
        console.error(error);
      },
    });
  }

  // ---- view-mode helpers ----
  get fullName(): string {
    const f = this.supplierFormGroup.value;
    return [f.prefix, f.name].filter(Boolean).join(' ').trim();
  }

  get fullAddress(): string {
    const f = this.supplierFormGroup.value;
    return [f.address, f.city, f.province].filter(Boolean).join(', ');
  }

  copyDocument(): void {
    const f = this.supplierFormGroup.value;
    const lines = [
      '*DATA SUPPLIER*',
      this.fullName || '-',
      '',
      `*Alamat:* ${this.fullAddress || '-'}`,
      `*Telepon:* ${f.phoneNumber || '-'}`,
      `*Email:* ${f.email || '-'}`,
      `*NPWP:* ${f.npwp || '-'}`,
      '',
      `*Items sold:* ${this.items.length ? this.items.join(', ') : '-'}`,
      `*Service areas:* ${this.areas.length ? this.areas.join(', ') : '-'}`,
    ];
    this.clipboard.copy(lines.join('\n'));
    this.snackBar.open(
      this.translate.instant('notify.copied'), 'Close', { duration: 3000 });
  }

  copyPhone(): void {
    this.clipboard.copy(this.supplierFormGroup.get('phoneNumber')!.value || '');
    this.snackBar.open(
      this.translate.instant('notify.copied'), 'Close', { duration: 3000 });
  }

  close() {
    this.dialog.close();
  }
}
