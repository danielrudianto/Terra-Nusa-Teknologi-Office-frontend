import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
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
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { CanDirective } from '../../../directives/can.directive';
import { DeleteConfirmationComponent } from '../../../components/delete-confirmation/delete-confirmation.component';
import { Project, ProjectContract, keadaanProyek } from '../project.model';

@Component({
  selector: 'app-project-view',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatSnackBarModule,
    TranslatePipe,
    HeaderTitleComponent,
    CanDirective,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './project-view.component.html',
  styleUrl: './project-view.component.scss',
})
export class ProjectViewComponent implements OnInit {
  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
  ) {}

  isLoading = true;
  isSubmitting = false;
  project: Project | null = null;
  contracts: ProjectContract[] = [];
  sedangTambah = false;

  formGroup = new FormGroup({
    documentNumber: new FormControl('', [
      Validators.required,
      Validators.maxLength(100),
    ]),
    documentType: new FormControl<'spk' | 'adendum'>('spk', Validators.required),
    value: new FormControl<number | null>(null, Validators.required),
    date: new FormControl<Date | null>(null, Validators.required),
    description: new FormControl('', Validators.maxLength(500)),
  });

  ngOnInit(): void {
    this.route.params.subscribe((p) => this.fetch(Number(p['id'])));
  }

  fetch(id: number): void {
    this.isLoading = true;
    this.apiService
      .get(`projects/${id}`, {})
      .subscribe({
        next: (res: any) => {
          this.project = res?.project ?? null;
          this.contracts = res?.contracts ?? [];
        },
        error: () => {
          this.snackBar.open(
            this.translate.instant('notify.loadFailed'),
            'Close',
            { duration: 3000 },
          );
          this.router.navigate(['/Project']);
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  get keadaan(): string {
    return this.project ? keadaanProyek(this.project) : 'berjalan';
  }

  /**
   * Nilai kontrak berjalan dihitung ulang di layar dari baris yang tampil.
   *
   * Angka dari server tetap benar, tetapi setelah menambah atau menghapus
   * adendum, layar harus segera menunjukkan hasilnya tanpa menunggu
   * pengambilan ulang — dan keduanya harus selalu sama.
   */
  get totalKontrak(): number {
    return this.contracts.reduce((a, b) => a + Number(b.value ?? 0), 0);
  }

  get adaAdendum(): boolean {
    return this.contracts.some((c) => c.documentType === 'adendum');
  }

  bukaTambah(): void {
    this.sedangTambah = true;
    this.formGroup.reset({
      documentType: this.contracts.length === 0 ? 'spk' : 'adendum',
      date: new Date(),
    });
  }

  batalTambah(): void {
    this.sedangTambah = false;
  }

  simpanKontrak(): void {
    if (!this.project || this.formGroup.invalid || this.isSubmitting) return;

    const v = this.formGroup.value;
    if (!v.value || Number(v.value) === 0) {
      this.snackBar.open(
        this.translate.instant('project.contractZero'),
        'Close',
        { duration: 4000 },
      );
      return;
    }

    this.isSubmitting = true;
    this.apiService
      .post(`projects/${this.project.id}/contracts`, {
        documentNumber: v.documentNumber,
        documentType: v.documentType,
        value: Number(v.value),
        date: moment(v.date).format('YYYY-MM-DD'),
        description: v.description || null,
      })
      .subscribe({
        next: () => {
          this.snackBar.open(
            this.translate.instant('project.contractAdded'),
            'Close',
            { duration: 3000 },
          );
          this.sedangTambah = false;
          this.fetch(this.project!.id);
        },
        error: () => {
          this.snackBar.open(
            this.translate.instant('notify.saveFailed'),
            'Close',
            { duration: 4000 },
          );
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

  hapusKontrak(k: ProjectContract): void {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: this.translate.instant('confirm.deleteTitle'),
          prompt: this.translate.instant('confirm.deletePrompt'),
        },
      })
      .afterClosed()
      .subscribe((setuju) => {
        if (!setuju) return;
        this.apiService.delete(`projects/contracts/${k.id}`).subscribe({
          next: () => {
            this.snackBar.open(
              this.translate.instant('project.contractDeleted'),
              'Close',
              { duration: 3000 },
            );
            this.fetch(this.project!.id);
          },
          error: () => {
            this.snackBar.open(
              this.translate.instant('notify.deleteFailed'),
              'Close',
              { duration: 4000 },
            );
          },
        });
      });
  }

  kembali(): void {
    this.router.navigate(['/Project']);
  }
}
