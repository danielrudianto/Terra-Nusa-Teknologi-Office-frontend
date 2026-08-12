import { Component } from '@angular/core';
import { CanDirective } from '../../../directives/can.directive';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from 'src/app/services/api.service';
import { EmployeeUpdateComponent } from '../employee-update/employee-update.component';
import { EmployeeSalarySlipSelectorCreateComponent } from './employee-salary-slip-selector-create/employee-salary-slip-selector-create.component';
import { debounceTime } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { EmployeeCreateComponent } from '../employee-create/employee-create.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-employee-list',
  imports: [
    CanDirective,
    MatChipsModule,
    TranslatePipe,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatPaginatorModule,
    HeaderTitleComponent,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
  ],
  templateUrl: './employee-list.component.html',
  styleUrl: './employee-list.component.scss',
  standalone: true,
})
export class EmployeeListComponent {
  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
  ) {}

  formControl: FormControl = new FormControl('');
  page: number = 1;
  isLoading: boolean = false;
  employees: any[] = [];
  /** Filter status: 'all' | 'active' | 'inactive' (inactive = punya endDate) */
  activeFilter: 'all' | 'active' | 'inactive' = 'all';
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

  setFilter(filter: 'all' | 'active' | 'inactive') {
    if (this.activeFilter === filter) return;
    this.activeFilter = filter;
    this.fetchEmployees(1);
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
        ...(this.activeFilter !== 'all' ? { status: this.activeFilter } : {}),
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

  createNewEmployee() {
    this.dialog.open(EmployeeCreateComponent, {});
  }
}
