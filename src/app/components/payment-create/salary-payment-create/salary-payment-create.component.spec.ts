import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalaryPaymentCreateComponent } from './salary-payment-create.component';

describe('SalaryPaymentCreateComponent', () => {
  let component: SalaryPaymentCreateComponent;
  let fixture: ComponentFixture<SalaryPaymentCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SalaryPaymentCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalaryPaymentCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
