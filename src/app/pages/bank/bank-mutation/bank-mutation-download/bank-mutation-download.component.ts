import { Component, Inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-bank-mutation-download',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatButtonModule,
  ],
  templateUrl: './bank-mutation-download.component.html',
  styleUrl: './bank-mutation-download.component.scss',
})
export class BankMutationDownloadComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private apiService: ApiService
  ) {}

  isLoading: boolean = false;
  formGroup: FormGroup = new FormGroup({
    month: new FormControl(new Date().getMonth() + 1, Validators.required),
    year: new FormControl(new Date().getFullYear(), [
      Validators.required,
      Validators.min(2023),
      Validators.max(new Date().getFullYear()),
    ]),
  });

  download() {
    this.isLoading = true;
    this.apiService
      .post(`banks/mutation/download`, {
        bankAccountID: this.data.id,
        month: this.formGroup.value.month,
        year: this.formGroup.value.year,
      })
      .subscribe({
        next: (data) => {},
        error: (error) => {},
      });
  }
}
