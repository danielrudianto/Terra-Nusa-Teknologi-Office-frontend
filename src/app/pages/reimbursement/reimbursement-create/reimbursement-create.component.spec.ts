import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReimbursementCreateComponent } from './reimbursement-create.component';

describe('ReimbursementCreateComponent', () => {
  let component: ReimbursementCreateComponent;
  let fixture: ComponentFixture<ReimbursementCreateComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ReimbursementCreateComponent]
    });
    fixture = TestBed.createComponent(ReimbursementCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
