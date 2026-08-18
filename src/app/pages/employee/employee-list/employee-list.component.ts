import { Component, inject } from '@angular/core';
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
import { RefreshButtonComponent } from '../../../components/refresh-button/refresh-button.component';
import { EmployeeViewComponent } from '../employee-view/employee-view.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

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
    RefreshButtonComponent,
    MatTooltipModule,
  ],
  templateUrl: './employee-list.component.html',
  styleUrl: './employee-list.component.scss',
  standalone: true,
})
export class EmployeeListComponent {
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
  ) {}

  formControl: FormControl = new FormControl('');
  page: number = 1;
  isLoading: boolean = false;
  employees: any[] = [];
  /** Filter status: 'all' | 'active' | 'inactive' (inactive = punya endDate) */
  /*
   * Bawaannya AKTIF, bukan semua.
   *
   * Karyawan yang sudah keluar tidak pernah dihapus — jejaknya diperlukan
   * slip gaji dan dokumen lama. Akibatnya daftarnya terus memanjang, dan
   * yang mencari orang yang masih bekerja harus memilahnya sendiri setiap
   * kali membuka layar ini.
   *
   * Yang sudah keluar tetap satu ketukan jauhnya lewat saringan di atas.
   */
  activeFilter: 'all' | 'active' | 'inactive' = 'active';
  count: number = 0;

  displayedColumns: string[] = [
    'name',
    'nik',
    'taxCategory',
    'position',
    'status',
    'endDate',
    'lastDataUpdate',
    'action',
  ];

  /**
   * Tanggal pembaruan dalam penulisan setempat.
   *
   * Tanpa jam: pada kolom daftar yang dipindai sekilas, jam hanya menambah
   * lebar tanpa menjawab pertanyaan yang diajukan — yang dicari adalah
   * "sudah berapa lama", bukan "pukul berapa".
   */
  tanggalPembaruan(v: unknown): string {
    if (!v) return '—';
    const d = new Date(String(v));
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  /**
   * Sudah lebih dari dua belas bulan sejak terakhir diperbarui.
   *
   * Ambang yang sama dengan pengingat di Agenda; memakai angka berbeda
   * membuat daftar ini dan pengingatnya menunjuk orang yang tidak sama.
   */
  sudahSetahun(v: unknown): boolean {
    if (!v) return false;
    const d = new Date(String(v));
    if (isNaN(d.getTime())) return false;
    const batas = new Date();
    batas.setFullYear(batas.getFullYear() - 1);
    return d < batas;
  }

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
   * Lihat data lengkap karyawan, hanya untuk dibaca.
   *
   * Menyatukan data pokok, profil pribadi, dan riwayat pembaruan dalam satu
   * dialog bertab — sebelumnya ketiganya hanya dapat dibuka satu per satu,
   * dan dua di antaranya lewat formulir penyuntingan.
   */
  /**
   * Terbitkan tautan pengisian dan tampilkan hasilnya.
   *
   * Tautannya ditampilkan untuk disalin, bukan hanya dikirim diam-diam:
   * surel dapat masuk folder sampah, dan yang mengirim perlu punya cara
   * menyampaikannya lewat jalan lain tanpa menerbitkan tautan kedua.
   */
  kirimUndangan(employee: any): void {
    this.apiService
      .post(`employee-forms/${employee.id}/undang`, {})
      .subscribe({
        next: (res: any) => {
          const tautan = `${window.location.origin}/isi/${res.token}`;
          navigator.clipboard?.writeText(tautan).catch(() => {});

          /*
           * Kegagalan pengiriman surel DIBERITAHUKAN.
           *
           * Tautannya tetap dibuat dan sah — server sengaja tidak
           * menggagalkan penerbitan karena surelnya tidak terkirim. Tetapi
           * tanpa pemberitahuan, yang menerbitkannya melihat "berhasil" lalu
           * menunggu surel yang tidak akan pernah datang.
           *
           * Sudah terjadi: token O365 kedaluwarsa, pengiriman gagal diam-diam,
           * dan baru ketahuan setelah membuka log server.
           */
          const kunci = res?.emailTerkirim
            ? 'employeeForm.undanganTerkirim'
            : 'employeeForm.undanganTautanSaja';

          this.snackBar.open(
            this.translate.instant(kunci, { nama: employee.name }),
            this.translate.instant('common.close'),
            { duration: res?.emailTerkirim ? 6000 : 10000 },
          );
        },
        error: (err) =>
          this.snackBar.open(
            err?.error?.detail ||
              this.translate.instant('employeeForm.undanganGagal'),
            'Tutup',
            { duration: 4000 },
          ),
      });
  }

  openView(row: any) {
    this.dialog.open(EmployeeViewComponent, {
      data: { employee: row },
      // Lebar DITETAPKAN di sini juga.
      //
      // Panel luar dialog diatur Material, bukan oleh gaya komponennya;
      // tanpa `width`, panel itu menyusut dan melebar mengikuti isi tab yang
      // sedang terbuka meskipun isinya sendiri sudah berlebar tetap.
      width: 'min(680px, 96vw)',
      maxWidth: '96vw',
      autoFocus: false,
    });
  }

  openProfile(row: any) {
    const ref = this.dialog.open(EmployeeProfileComponent, {
      data: { id: row.id, name: row.name },
      maxWidth: '96vw',
      width: 'min(900px, 96vw)',
      autoFocus: false,
    });

    /*
     * Pengisian PERTAMA berlanjut ke formulir keadaan.
     *
     * Profil hanya memuat data yang tidak berubah. Riwayat kesehatan, kontak
     * darurat, jumlah tanggungan, dan kesediaan ditempatkan ada di formulir
     * keadaan — dan tanpa sambungan ini, hal-hal itu tidak pernah ditanyakan
     * sampai pengingat setahun berbunyi.
     *
     * Kontak darurat terutama: itu justru diperlukan pada hari pertama
     * orangnya turun ke lapangan, bukan setahun kemudian.
     */
    ref.afterClosed().subscribe((hasil: any) => {
      if (!hasil?.tersimpan) return;
      this.fetchEmployees();
      if (hasil.baru) this.openForm(row);
    });
  }

  /** Buka formulir pembaruan data karyawan. Dapat diisi kapan saja. */
  openForm(row: any) {
    this.dialog.open(EmployeeFormComponent, {
      data: { id: row.id, name: row.name, nik: row.nik },
      maxWidth: '96vw',
      width: 'min(900px, 96vw)',
      autoFocus: false,
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
