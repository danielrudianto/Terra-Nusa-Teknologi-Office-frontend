import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';

// Pages

// Material
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { MatTableModule } from '@angular/material/table';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCardModule } from '@angular/material/card';

// Components
import { DashboardCardComponent } from './components/dashboard-card/dashboard-card.component';
import { BankSelectorComponent } from './components/bank-selector/bank-selector.component';

// Interceptors
import { AuthInterceptor } from './services/auth.interceptor';

// Third Parties
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import * as _moment from 'moment';
import { default as _rollupMoment } from 'moment';

// App
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgxMaskDirective, NgxMaskPipe, provideNgxMask } from 'ngx-mask';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatPaginatorIntl } from '@angular/material/paginator';
import {
  AppPaginatorIntl,
  appPaginatorIntlFactory,
} from './services/app-paginator-intl';
import { TranslateService } from '@ngx-translate/core';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NumberFormatInputPipe } from './pipes/number-format-input.pipe';
import { MatExpansionModule } from '@angular/material/expansion';
import { ChunkErrorHandler } from './services/chunk-error.handler';

export const MY_FORMATS = {
  parse: {
    dateInput: 'LL',
  },
  display: {
    dateInput: 'DD MMMM yyyy',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@NgModule({
  declarations: [AppComponent, DashboardCardComponent, BankSelectorComponent],
  bootstrap: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MatDialogModule,
    MatDividerModule,
    MatStepperModule,
    MatSnackBarModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatCardModule,
    NgxExtendedPdfViewerModule,
    NgxMaskDirective,
    NgxMaskPipe,
    NumberFormatInputPipe,
    MatTableModule,
    MatListModule,
    MatMenuModule,
    MatRadioModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatGridListModule,
    MatTabsModule,
    MatSidenavModule,
    MatBottomSheetModule,
    DragDropModule,
    MatExpansionModule,
    MatToolbarModule,
    ClipboardModule,
    TranslateModule.forRoot({
      /*
       * `fallbackLang`, bukan `defaultLanguage`.
       *
       * Sejak ngx-translate v17 `defaultLanguage` dan `useDefaultLang`
       * ditandai deprecated dan memicu peringatan di konsol. Namanya pun
       * lebih jujur: ini bahasa yang dipakai ketika kunci tidak ada di
       * bahasa aktif, bukan bahasa awal aplikasi.
       */
      fallbackLang: 'id',
      loader: {
        provide: TranslateLoader,
        useFactory: (http: HttpClient) =>
          new TranslateHttpLoader(http, './assets/i18n/', '.json'),
        deps: [HttpClient],
      },
    }),
  ],
  providers: [
    /*
     * Potongan aplikasi yang sudah tidak ada memuat ulang halaman sendiri.
     *
     * Nama berkas mengikuti hash isinya, sehingga tab yang terbuka sejak
     * sebelum deploy mencari berkas yang sudah tidak ada. Nginx membalasnya
     * dengan `index.html`, dan peramban menolaknya dengan galat MIME yang
     * tidak menyebut sebabnya sama sekali.
     *
     * Pemberitahuan versi saja tidak cukup: banner itu mengarahkan ke
     * Pengaturan, dan menuju Pengaturan justru memuat potongan yang hilang.
     */
    { provide: ErrorHandler, useClass: ChunkErrorHandler },
    provideNgxMask(),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    provideMomentDateAdapter(MY_FORMATS),
    provideHttpClient(withInterceptorsFromDi()),
    DatePipe,
    DecimalPipe,
    {
      provide: MatPaginatorIntl,
      useFactory: appPaginatorIntlFactory,
      deps: [TranslateService],
    },
  ],
})
export class AppModule {}
