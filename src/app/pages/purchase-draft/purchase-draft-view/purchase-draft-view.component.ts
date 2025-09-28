import { DatePipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-purchase-draft-view',
  standalone: false,
  templateUrl: './purchase-draft-view.component.html',
  styleUrl: './purchase-draft-view.component.scss',
})
export class PurchaseDraftViewComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private dialog: MatDialogRef<PurchaseDraftViewComponent>,
    private snackBar: MatSnackBar,
    private apiService: ApiService,
    private datePipe: DatePipe,
    private router: Router
  ) {}

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
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
          date: this.datePipe.transform(data.date, 'dd MMMM YYYY'),
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

  createPurchase() {
    this.router.navigate(['/Purchase-draft/Update', this.data.id]);
    this.dialog.close();
  }
}
