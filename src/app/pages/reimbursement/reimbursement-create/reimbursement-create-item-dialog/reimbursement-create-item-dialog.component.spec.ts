import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReimbursementCreateItemDialogComponent } from './reimbursement-create-item-dialog.component';

describe('ReimbursementCreateItemDialogComponent', () => {
  let component: ReimbursementCreateItemDialogComponent;
  let fixture: ComponentFixture<ReimbursementCreateItemDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ReimbursementCreateItemDialogComponent]
    });
    fixture = TestBed.createComponent(ReimbursementCreateItemDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
