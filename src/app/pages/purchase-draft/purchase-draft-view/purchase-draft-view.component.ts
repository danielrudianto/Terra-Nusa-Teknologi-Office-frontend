import { DatePipe } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Component, Inject, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatStepperModule } from '@angular/material/stepper';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-purchase-draft-view',
  standalone: true,
  templateUrl: './purchase-draft-view.component.html',
  styleUrl: './purchase-draft-view.component.scss',
  imports: [
    CommonModule,
    TranslatePipe,
    MatInputModule,
    MatSelectModule,
    MatListModule,
    MatButtonModule,
    MatStepperModule,
    MatIconModule,
    MatDialogModule,
    FormsModule,
    ReactiveFormsModule,
  ],
})
export class PurchaseDraftViewComponent {
  private readonly translate = inject(TranslateService);
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private dialog: MatDialogRef<PurchaseDraftViewComponent>,
    private snackBar: MatSnackBar,
    private apiService: ApiService,
    private datePipe: DatePipe,
    private router: Router,
  ) {}

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    createdAt: new FormControl(''),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierAddress: new FormControl('', Validators.required),
    dpp: new FormControl(0, Validators.required),
    ppn: new FormControl(0, Validators.required),
    pbbkb: new FormControl(0, Validators.required),
    total: new FormControl(0, Validators.required),
    purchaseOrderName: new FormControl('', Validators.required),
    purchaseType: new FormControl('', Validators.required),
    projectName: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
  });

  ngOnInit(): void {
    this.apiService.get(`purchase-draft/${this.data.id}`, {}).subscribe({
      next: (data: any) => {
        this.formGroup.patchValue({
          date: this.datePipe.transform(data.date, 'dd MMMM yyyy'),
          createdAt: this.datePipe.transform(data.createdAt, 'dd MMMM yyyy'),
          supplierName: data.supplier_name,
          supplierAddress: data.supplier_address,
          dpp: data.dpp,
          ppn: (data.ppn * data.dpp) / 100,
          pbbkb: data.pbbkb,
          total: data.dpp + (data.ppn * data.dpp) / 100 + data.pbbkb,
          purchaseOrderName: data.purchaseOrderName,
          purchaseType: data.purchaseType,
          projectName: data.projectName,
          description: data.description,
        });
      },
      error: (error) => {
        this.snackBar.open(error.error.detail, 'Close', {
          duration: 3000,
        });

        this.dialog.close();
      },
    });
  }

  deletePurchaseDraft() {
    this.apiService.delete(`purchase-draft/${this.data.id}`).subscribe({
      next: (data) => {
        this.snackBar.open(
      this.translate.instant('notify.createSuccess'), 'Close', {
          duration: 3000,
        });
        this.dialog.close(true);
      },
      error: (error) => {
        this.snackBar.open(error.error.detail, 'Close', {
          duration: 3000,
        });
      },
    });
  }
}
