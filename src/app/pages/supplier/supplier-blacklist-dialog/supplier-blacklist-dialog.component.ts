import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Toggle a supplier's blacklist flag. Blacklisting requires a reason;
 * removing it just clears the flag. This never blocks the supplier — it only
 * drives a warning shown wherever the supplier is used.
 *
 * Dialog data: { id, name, isBlacklist, blacklistReason }
 * Closes with `true` when a change was saved.
 */
@Component({
  selector: 'app-supplier-blacklist-dialog',
  standalone: true,
  imports: [
    TranslatePipe,
    MatProgressSpinnerModule,
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatProgressBarModule,
    MatSnackBarModule,
  ],
  templateUrl: './supplier-blacklist-dialog.component.html',
  styleUrl: './supplier-blacklist-dialog.component.scss',
})
export class SupplierBlacklistDialogComponent {
  isSubmitting = false;

  /** true = currently blacklisted, so this dialog will REMOVE it */
  get isCurrentlyBlacklisted(): boolean {
    return !!this.data?.isBlacklist;
  }

  formGroup = new FormGroup({
    blacklistReason: new FormControl('', [Validators.maxLength(500)]),
  });

  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<SupplierBlacklistDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    if (this.isCurrentlyBlacklisted) {
      this.formGroup.patchValue({ blacklistReason: data?.blacklistReason || '' });
    } else {
      this.formGroup
        .get('blacklistReason')
        ?.setValidators([Validators.required, Validators.maxLength(500)]);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSubmit() {
    // removing the flag needs no reason; adding it does
    if (!this.isCurrentlyBlacklisted && this.formGroup.invalid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const body = this.isCurrentlyBlacklisted
      ? { isBlacklist: false }
      : { isBlacklist: true, blacklistReason: this.formGroup.value.blacklistReason };

    this.apiService
      .patch(`suppliers/${this.data.id}/blacklist`, body)
      .subscribe({
        next: () => {
          this.snackBar.open(
            this.isCurrentlyBlacklisted
              ? 'Blacklist supplier dicabut'
              : 'Supplier ditandai blacklist',
            'Close',
            { duration: 3000 },
          );
          this.dialogRef.close(true);
        },
        error: (err) =>
          this.snackBar.open(
            err?.error?.detail || 'Gagal memperbarui status blacklist',
            'Close',
            { duration: 3500 },
          ),
      })
      .add(() => (this.isSubmitting = false));
  }
}