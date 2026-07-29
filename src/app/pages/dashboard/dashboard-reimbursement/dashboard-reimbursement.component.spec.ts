import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardReimbursementComponent } from './dashboard-reimbursement.component';

describe('DashboardReimbursementComponent', () => {
  let component: DashboardReimbursementComponent;
  let fixture: ComponentFixture<DashboardReimbursementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardReimbursementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardReimbursementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
