import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReimbursementTodayDialogComponent } from './reimbursement-today-dialog.component';

describe('ReimbursementTodayDialogComponent', () => {
  let component: ReimbursementTodayDialogComponent;
  let fixture: ComponentFixture<ReimbursementTodayDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReimbursementTodayDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReimbursementTodayDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
