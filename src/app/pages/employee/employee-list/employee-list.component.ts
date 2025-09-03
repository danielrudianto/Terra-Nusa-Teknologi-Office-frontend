import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from 'src/app/services/api.service';
import { EmployeeUpdateComponent } from '../employee-update/employee-update.component';
import { EmployeeSalarySlipSelectorCreateComponent } from './employee-salary-slip-selector-create/employee-salary-slip-selector-create.component';
import { debounceTime } from 'rxjs';

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

    this.formControl.valueChanges.pipe(debounceTime(500)).subscribe(() => {
      this.fetchEmployees(1);
    });
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

  openSalaryCreate(id: number) {
    this.dialog.open(EmployeeSalarySlipSelectorCreateComponent, {
      data: {
        id: id,
      },
    });
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
