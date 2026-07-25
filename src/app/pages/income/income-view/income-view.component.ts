import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-income-view',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './income-view.component.html',
  styleUrl: './income-view.component.scss',
  providers: [DatePipe, DecimalPipe],
})
export class IncomeViewComponent {
  constructor(
    private apiService: ApiService,
    private snackbar: MatSnackBar,
    private datePipe: DatePipe,
    private decimalPipe: DecimalPipe,
    @Inject(MAT_DIALOG_DATA) private data: { id: number },
  ) {}

  isLoading: boolean = false;

  formGroup: FormGroup = new FormGroup({
    date: new FormControl(''),
    description: new FormControl(''),
    opponent_name: new FormControl(''),
    opponent_description: new FormControl(''),
    incomeType: new FormControl(''),
    amount: new FormControl(0),
  });

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData() {
    this.isLoading = true;
    this.apiService
      .get(`income/${this.data.id}`, {})
      .subscribe({
        next: (data: any) => {
          this.formGroup.patchValue({
            date: this.datePipe.transform(data.income.date, 'dd MMMM yyyy'),
            description: data.income.description,
            opponent_name: data.income.opponent.name,
            opponent_description: data.income.opponent.description,
            incomeType: data.income.incomeType,
            amount: this.decimalPipe.transform(data.income.amount, '0.2-2'),
          });
          this.isLoading = false;
        },
        error: (error) => {
          this.snackbar.open(error.error.detail, 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }
}
