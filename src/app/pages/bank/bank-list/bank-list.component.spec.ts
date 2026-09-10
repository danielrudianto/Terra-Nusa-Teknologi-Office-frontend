import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { BankListComponent } from './bank-list.component';

/*
 * Uji rangka bawaan Angular, dilengkapi penyedianya.
 *
 * Sebelumnya `imports: [BankListComponent]` berdiri sendiri tanpa satu pun
 * penyedia, padahal komponennya menyuntik TranslateService, ApiService,
 * MatDialog, MatSnackBar, dan Router sejak awal — sehingga uji ini selalu
 * gagal dengan NG0201 dan kegagalannya sudah lama menjadi latar belakang.
 */
describe('BankListComponent', () => {
  let component: BankListComponent;
  let fixture: ComponentFixture<BankListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BankListComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: ApiService,
          useValue: {
            get: () => of({ data: [], count: 0, balances: [] }),
            delete: () => of({}),
          },
        },
        { provide: MatSnackBar, useValue: { open: () => {} } },
        {
          provide: MatDialog,
          useValue: { open: () => ({ afterClosed: () => of(null) }) },
        },
        { provide: Router, useValue: { navigate: () => {} } },
        { provide: ActivatedRoute, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BankListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
