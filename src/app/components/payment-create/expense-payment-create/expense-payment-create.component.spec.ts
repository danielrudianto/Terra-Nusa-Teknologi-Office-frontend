import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpensePaymentCreateComponent } from './expense-payment-create.component';

describe('ExpensePaymentCreateComponent', () => {
  let component: ExpensePaymentCreateComponent;
  let fixture: ComponentFixture<ExpensePaymentCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpensePaymentCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpensePaymentCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
