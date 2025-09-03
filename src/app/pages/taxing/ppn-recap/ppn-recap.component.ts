import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
// import * as xlsx from 'xlsx';

@Component({
  selector: 'app-ppn-recap',
  standalone: false,
  templateUrl: './ppn-recap.component.html',
  styleUrl: './ppn-recap.component.scss',
})
export class PpnRecapComponent {
  constructor(private apiService: ApiService, private snackBar: MatSnackBar) {}

  isLoading: boolean = false;

  formGroup: FormGroup = new FormGroup({
    month: new FormControl('', Validators.required),
    year: new FormControl('', Validators.required),
  });

  onSubmit() {
    this.isLoading = true;
    this.apiService.get('taxes/ppn', this.formGroup.value).subscribe({
      next: (data) => {},
      error: (error) => {
        this.snackBar.open(error.error.detail, 'Close', {
          duration: 3000,
        });
      },
    });
  }
}
