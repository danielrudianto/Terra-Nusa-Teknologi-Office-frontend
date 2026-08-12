import { Component } from '@angular/core';
import { CanDirective } from '../../../directives/can.directive';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from 'src/app/services/api.service';
import { debounceTime } from 'rxjs';
import { DeleteConfirmationComponent } from 'src/app/components/delete-confirmation/delete-confirmation.component';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { UserCreateComponent } from '../user-create/user-create.component';
import { UserUpdateComponent } from '../user-update/user-update.component';
import { UserViewComponent } from '../user-view/user-view.component';
import { SettingsService } from '../../../services/setting.service';

@Component({
  selector: 'app-user-list',
  imports: [
    CanDirective,
    CommonModule,
    MatTableModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    HeaderTitleComponent,
    MatIconModule,
    MatPaginatorModule,
    MatButtonModule,
    MatMenuModule,
    RouterModule,
    TranslatePipe,
  ],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  standalone: true,
})
export class UserListComponent {
  constructor(
    public settings: SettingsService,
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
  ) {}

  formControl: FormControl = new FormControl('');
  page: number = 1;
  /** Nilai awal dari pengaturan pengguna; tetap bisa diubah per halaman. */
  pageSize: number = this.settings.pageSize;
  isLoading: boolean = false;
  users: any[] = [];
  count: number = 0;

  displayedColumns: string[] = [
    'name',
    'email',
    'authLevel',
    'status',
    'action',
  ];

  ngOnInit(): void {
    this.fetchUsers();

    this.formControl.valueChanges.pipe(debounceTime(500)).subscribe(() => {
      this.fetchUsers(1);
    });
  }

  changePage(event: any) {
    this.fetchUsers(event.pageIndex + 1);
  }

  /** Kolom & arah pengurutan; dikirim ke server agar mencakup seluruh data. */
  sortBy: string = 'name';
  sortByDirection: 'asc' | 'desc' = 'asc';

  /** Mengklik kolom yang sama membalik arahnya. */
  changeSortBy(sortBy: string) {
    if (this.sortBy === sortBy) {
      this.sortByDirection = this.sortByDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortByDirection = 'asc';
    }

    this.fetchUsers();
  }

  fetchUsers(targetPage: number = 1) {
    this.isLoading = true;
    this.page = targetPage;
    this.apiService
      .get('users', {
        sortBy: this.sortBy,
        sortByDirection: this.sortByDirection,
        page: this.page,
        pageSize: this.pageSize,
        keyword: this.formControl.value,
      })
      .subscribe({
        next: (res: any) => {
          this.users = res.data;
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

  createNewUser() {
    this.dialog
      .open(UserCreateComponent, { width: '480px' })
      .afterClosed()
      .subscribe((result) => {
        if (result) this.fetchUsers(this.page);
      });
  }

  onViewUser(id: number) {
    this.dialog.open(UserViewComponent, { data: { id } });
  }

  onEditUser(id: number) {
    this.dialog
      .open(UserUpdateComponent, { data: { id }, width: '480px' })
      .afterClosed()
      .subscribe((result) => {
        if (result) this.fetchUsers(this.page);
      });
  }

  onDeleteUser(user: any) {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: this.translate.instant('user.deleteTitle'),
          prompt: this.translate.instant('user.deletePrompt'),
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.apiService.delete('users/' + user.id).subscribe({
          next: () => {
            this.snackBar.open(
              this.translate.instant('user.deleted'),
              this.translate.instant('user.close'),
              { duration: 3000 },
            );
            this.fetchUsers(this.page);
          },
          error: () => {
            this.snackBar.open(
              this.translate.instant('user.deleteFailed'),
              this.translate.instant('user.close'),
              { duration: 3000 },
            );
          },
        });
      });
  }

  authLevelLabel(level: number): string {
    return this.translate.instant('user.level' + (level || 1));
  }
}
