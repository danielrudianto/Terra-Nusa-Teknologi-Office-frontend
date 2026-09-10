import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { ExpenseViewComponent } from './expense-view.component';

/*
 * Uji rangka bawaan Angular, diperbaiki.
 *
 * Sebelumnya komponennya didaftarkan lewat `declarations` — padahal ia
 * standalone, sehingga TestBed tidak pernah mengenalinya — dan tanpa satu pun
 * penyedia untuk ApiService, MatDialogRef, MAT_DIALOG_DATA, DatePipe, dan
 * TranslateService yang disuntiknya. Uji ini selalu gagal, dan kegagalannya
 * sudah lama menjadi latar belakang.
 */
describe('ExpenseViewComponent', () => {
  let component: ExpenseViewComponent;
  let fixture: ComponentFixture<ExpenseViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseViewComponent, TranslateModule.forRoot()],
      providers: [
        DatePipe,
        {
          provide: ApiService,
          useValue: {
            get: () =>
              of({
                expense: {
                  id: 1,
                  dpp: 0,
                  ppn: 0,
                  pbbkb: 0,
                  pphPercentage: 0,
                },
                payments: [],
              }),
          },
        },
        { provide: MAT_DIALOG_DATA, useValue: { id: 1 } },
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MatSnackBar, useValue: { open: () => {} } },
        { provide: Router, useValue: { navigate: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpenseViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
