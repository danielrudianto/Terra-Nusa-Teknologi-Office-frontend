import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ApiService } from '../../../services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-salary-slip-view',
  standalone: false,
  templateUrl: './salary-slip-view.component.html',
  styleUrl: './salary-slip-view.component.scss',
})
export class SalarySlipViewComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialogRef<SalarySlipViewComponent>
  ) {}

  ngOnInit(): void {
    this.apiService.get(`salary_slips/${this.data.id}`, {}).subscribe({
      next: (data) => {},
      error: (err) => {
        this.snackBar.open(err.error.detail, 'Close', {
          duration: 3000,
        });
        this.dialog.close();
      },
    });
  }
}
