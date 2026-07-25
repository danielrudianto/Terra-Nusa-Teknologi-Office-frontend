import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReimbursementConfirmComponent } from './reimbursement-confirm.component';

describe('ReimbursementConfirmComponent', () => {
  let component: ReimbursementConfirmComponent;
  let fixture: ComponentFixture<ReimbursementConfirmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReimbursementConfirmComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReimbursementConfirmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
