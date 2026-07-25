import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalarySlipDeductionCreateComponent } from './salary-slip-deduction-create.component';

describe('SalarySlipDeductionCreateComponent', () => {
  let component: SalarySlipDeductionCreateComponent;
  let fixture: ComponentFixture<SalarySlipDeductionCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalarySlipDeductionCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalarySlipDeductionCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
