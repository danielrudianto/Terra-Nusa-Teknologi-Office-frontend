import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { debounceTime } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { BankUpdateComponent } from '../bank-update/bank-update.component';

@Component({
  selector: 'app-bank-list',
  templateUrl: './bank-list.component.html',
  styleUrl: './bank-list.component.scss',
  standalone: false,
})
export class BankListComponent {
  constructor(private apiService: ApiService, private dialog: MatDialog) {}

  isLoading: boolean = false;

  formControl: FormControl = new FormControl('');

  banks: any[] = [];
  page: number = 1;
  count: number = 0;

  ngOnInit(): void {
    this.fetchBankAccounts();

    this.formControl.valueChanges.pipe(debounceTime(500)).subscribe((_) => {
      this.fetchBankAccounts(1);
    });
  }

  fetchBankAccounts(targetPage: number = 1) {
    this.isLoading = true;

    this.page = targetPage;
    this.apiService
      .get('banks', {
        page: this.page,
        keyword: this.formControl.value,
      })
      .subscribe({
        next: (res: any) => {
          this.banks = res.data;
          this.count = res.count;
        },
        error: (err) => {
          console.error(err);
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  changePage(event: any) {
    const targetPage = event.pageIndex + 1;
    this.fetchBankAccounts(targetPage);
  }

  onEdit(id: number) {
    this.dialog.open(BankUpdateComponent, {
      data: {
        id: id,
      },
    });
  }

  onViewDetail(id: number) {}
}
