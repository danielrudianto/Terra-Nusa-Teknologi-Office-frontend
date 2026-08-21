import { Component, OnInit, inject } from '@angular/core';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { PermissionService } from '../../services/permission.service';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { SettingsService } from '../../services/setting.service';
import {
  LanguageService,
  AppLang,
  LangOption,
} from 'src/app/services/language.service';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatMenuModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
})
export class LoginComponent implements OnInit {
  private readonly serverMessage = inject(ServerMessageService);
  constructor(
    private permissionService: PermissionService,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private router: Router,
    private settings: SettingsService,
    private language: LanguageService,
  ) {}

  ngOnInit(): void {
    this.arahkanKeMobileBilaPonsel();
  }

  /**
   * Dari PONSEL, arahkan ke aplikasi mobile SEBELUM masuk.
   *
   * MENGAPA SEBELUM MASUK
   *
   * Token disimpan per-asal (localStorage domain `terrabot...` dan
   * `m.terrabot...` TERPISAH). Mengalihkan SESUDAH login berarti tokennya
   * tertinggal di domain desktop dan yang di ponsel harus masuk dua kali.
   * Karena itu pengalihannya di halaman masuk, sebelum kredensialnya dikirim
   * — supaya tokennya langsung tersimpan di asal yang benar.
   *
   * HANYA PONSEL. Tablet dan desktop tetap memakai aplikasi biasa; layar
   * lebarnya memang untuk itu.
   *
   * Tidak berulang: di domain mobile (`m.`) fungsi ini langsung berhenti,
   * jadi tak ada lingkaran pengalihan. Dan `?desktop=1` memaksa tetap di
   * desktop bagi yang memang menginginkannya dari ponsel.
   */
  private arahkanKeMobileBilaPonsel(): void {
    try {
      const host = window.location.hostname;

      // Sudah di domain mobile, atau lingkungan pengembangan — jangan alihkan.
      if (
        host.startsWith('m.') ||
        host === 'localhost' ||
        /^\d+\.\d+\.\d+\.\d+$/.test(host)
      ) {
        return;
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get('desktop') === '1') {
        // Pilihan yang menempel selama sesi tab ini.
        sessionStorage.setItem('paksaDesktop', '1');
        return;
      }
      if (sessionStorage.getItem('paksaDesktop') === '1') return;

      if (!this.adalahPonsel()) return;

      window.location.href = `${window.location.protocol}//m.${host}/Login`;
    } catch {
      // Gagal membaca lingkungan bukan alasan menahan halaman masuk.
    }
  }

  /**
   * Perangkat ini PONSEL — bukan tablet, bukan desktop.
   *
   * Dibedakan dari lebar layar: yang menentukan bukan seberapa sempit
   * jendelanya (desktop dapat mengecilkan jendela), melainkan perangkatnya.
   * iPad dan tablet Android sengaja TIDAK termasuk — keduanya tidak membawa
   * penanda "Mobile" pada agennya, dan layar lebarnya memang untuk aplikasi
   * biasa.
   */
  private adalahPonsel(): boolean {
    const ua = navigator.userAgent || '';
    return /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|IEMobile|Opera Mini/i.test(
      ua,
    );
  }

  get isDark(): boolean {
    return this.settings.theme === 'dark';
  }

  toggleTheme(): void {
    this.settings.setTheme(this.isDark ? 'light' : 'dark');
  }

  get languages(): LangOption[] {
    return this.language.languages;
  }

  get currentLang(): LangOption {
    return this.language.currentOption;
  }

  setLang(code: AppLang): void {
    this.language.use(code);
  }

  isSubmitting: boolean = false;

  loginFormGroup: FormGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', Validators.required),
    remember: new FormControl(''),
  });

  onSubmit() {
    this.apiService.post('auth', this.loginFormGroup.value).subscribe({
      next: (data: any) => {
        const acessToken = data.access_token;
        const refreshToken = data.refresh_token;
        const user = data.user;

        localStorage.setItem('access_token', acessToken);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        // return to the page the user was on before the session expired
        const returnUrl = localStorage.getItem('returnUrl');
        localStorage.removeItem('returnUrl');

        // Izin dimuat sebelum berpindah agar menu tidak sempat tampil kosong
        // lalu terisi sesaat kemudian. Gagal memuat tidak menahan masuk:
        // layarnya menampilkan sesedikit mungkin, dan server tetap menolak
        // apa pun yang tidak berhak.
        this.permissionService.load(true).finally(() => {
          if (returnUrl && !returnUrl.startsWith('/Login')) {
            this.router.navigateByUrl(returnUrl);
          } else {
            this.router.navigate(['/']);
          }
        });
      },
      error: (error) => {
        this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
          duration: 3000,
        });
      },
    });
  }
}
