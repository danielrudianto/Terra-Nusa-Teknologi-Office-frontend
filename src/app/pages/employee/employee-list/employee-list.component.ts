import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from 'src/app/services/api.service';
import { EmployeeUpdateComponent } from '../employee-update/employee-update.component';

@Component({
  selector: 'app-employee-list',
  templateUrl: './employee-list.component.html',
  styleUrl: './employee-list.component.scss',
  standalone: false,
})
export class EmployeeListComponent {
  constructor(private apiService: ApiService, private dialog: MatDialog) {}

  formControl: FormControl = new FormControl('');
  page: number = 1;
  isLoading: boolean = false;
  employees: any[] = [];
  count: number = 0;

  displayedColumns: string[] = [
    'name',
    'nik',
    'taxCategory',
    'position',
    'action',
  ];

  ngOnInit(): void {
    this.fetchEmployees();
  }

  changePage(event: any) {
    const targetPage = event.pageIndex + 1;
    this.fetchEmployees(targetPage);
  }

  openUpdateEmployee(id: number) {
    this.dialog
      .open(EmployeeUpdateComponent, {
        data: {
          id: id,
        },
      })
      .afterClosed()
      .subscribe((result) => {});
  }

  fetchEmployees(targetPage: number = 1) {
    this.isLoading = true;

    this.page = targetPage;
    this.apiService
      .get('employees', {
        page: this.page,
        keyword: this.formControl.value,
      })
      .subscribe({
        next: (res: any) => {
          this.employees = res.data;
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
