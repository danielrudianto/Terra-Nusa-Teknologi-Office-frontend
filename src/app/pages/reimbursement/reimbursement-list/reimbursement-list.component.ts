import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-reimbursement-list',
  templateUrl: './reimbursement-list.component.html',
  styleUrls: ['./reimbursement-list.component.scss'],
  standalone: false,
})
export class ReimbursementListComponent {
  constructor(private apiService: ApiService, private dialog: MatDialog) {}

  page: number = 1;
  reimbursements: any[] = [];
  count: number = 0;
  isLoading: boolean = false;

  ngOnInit(): void {
    this.fetchData();
  }

  openPaymentDetail(id: number) {}

  changePage(event: any) {
    this.page = event.pageIndex + 1;
    this.fetchData(this.page);
  }

  fetchData(targetPage: number = 1) {
    this.isLoading = true;

    this.page = targetPage;
    this.apiService
      .get('reimbursements', {
        page: this.page,
      })
      .subscribe({
        next: (res: any) => {
          this.reimbursements = res.data;
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
}
