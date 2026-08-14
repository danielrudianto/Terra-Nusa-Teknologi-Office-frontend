import { Component } from '@angular/core';
import { CanDirective } from '../../../directives/can.directive';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from 'src/app/services/api.service';
import { EmployeeUpdateComponent } from '../employee-update/employee-update.component';
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
import { EmployeeStatusComponent } from '../employee-status/employee-status.component';
import { EmployeeProfileComponent } from '../employee-profile/employee-profile.component';
import { EmployeeFormComponent } from '../employee-form/employee-form.component';
import { EmployeeFormPeriodComponent } from '../employee-form-period/employee-form-period.component';

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
    'status',
    'endDate',
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

  /**
   * Buka profil pribadi karyawan.
   *
   * Dibuka dari daftar yang sudah ada, bukan halaman tersendiri: membuat
   * layar baru berarti daftar karyawan kedua untuk hal yang sama, dan
   * penggunanya harus mencari orang yang sama dua kali.
   */
  openProfile(row: any) {
    this.dialog.open(EmployeeProfileComponent, {
      data: { id: row.id, name: row.name },
      maxWidth: '96vw',
      width: 'min(900px, 96vw)',
      autoFocus: false,
    });
  }

  /** Buka formulir keadaan berkala untuk periode yang sedang berlaku. */
  openForm(row: any) {
    this.dialog.open(EmployeeFormComponent, {
      data: { id: row.id, name: row.name, nik: row.nik },
      maxWidth: '96vw',
      width: 'min(900px, 96vw)',
      autoFocus: false,
    });
  }

  /**
   * Kelola periode pengisian formulir keadaan.
   *
   * Ditaruh di daftar karyawan, bukan halaman tersendiri: yang membukanya
   * HRD, dan ia sudah berada di sini saat menagih pengisian.
   */
  openPeriode() {
    this.dialog.open(EmployeeFormPeriodComponent, {
      maxWidth: '96vw',
      width: 'min(560px, 96vw)',
      autoFocus: false,
    });
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

  /**
   * Buka dialog status kepegawaian.
   *
   * Seluruh baris dikirim, bukan hanya id: endpoint pembaruan menerima objek
   * karyawan utuh dan menimpa semua kolomnya, jadi dialognya perlu data yang
   * lengkap untuk dikirim kembali.
   */
  openStatus(element: any) {
    this.dialog
      .open(EmployeeStatusComponent, { data: element, autoFocus: false })
      .afterClosed()
      .subscribe((berubah) => {
        // `page` di komponen ini sudah 1-based; jangan ditambah lagi.
        if (berubah) this.fetchEmployees(this.page);
      });
  }

  createNewEmployee() {
    this.dialog.open(EmployeeCreateComponent, {});
  }
}
