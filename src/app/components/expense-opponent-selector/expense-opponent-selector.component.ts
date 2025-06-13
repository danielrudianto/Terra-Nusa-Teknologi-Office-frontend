import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { debounceTime } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-expense-opponent-selector',
  templateUrl: './expense-opponent-selector.component.html',
  styleUrl: './expense-opponent-selector.component.scss',
  standalone: false,
})
export class ExpenseOpponentSelectorComponent {
  constructor(
    private apiService: ApiService,
    private dialog: MatDialogRef<ExpenseOpponentSelectorComponent>
  ) {}

  opponents: any[] = [];
  count: number = 0;
  page: number = 1;
  sortBy: string = 'name';
  sortOrder: string = 'asc';

  displayedColumns: string[] = ['name', 'description'];

  ngOnInit(): void {
    this.searchFormGroup.valueChanges.pipe(debounceTime(500)).subscribe(() => {
      if (this.searchFormGroup.valid) {
        this.fetchOpponents(1);
      }
    });
  }

  searchFormGroup: FormGroup = new FormGroup({
    search: new FormControl(''),
  });

  selectOpponent(data: any) {
    this.dialog.close(data);
  }

  fetchOpponents(pageNumber: number = 1) {
    this.page = pageNumber;
    this.opponents = [];
    this.count = 0;

    this.apiService
      .get('expense-opponents', {
        page: this.page,
        sortBy: this.sortBy,
        sortByDirection: this.sortOrder,
        pageSize: 10,
        keyword: this.searchFormGroup.controls['search'].value,
      })
      .subscribe({
        next: (data: any) => {
          this.opponents = data.data.map((x: any) => {
            return {
              id: x.id,
              name: x.name,
              description: x.description,
              paymentNumber: x.paymentNumber,
            };
          });
          this.count = data.count;
        },
        error: (error) => {
          console.error('Error fetching opponents:', error);
        },
      });
  }

  onPageChange(event: any) {
    this.page = event.pageIndex + 1;
    this.fetchOpponents(this.page);
  }
}
