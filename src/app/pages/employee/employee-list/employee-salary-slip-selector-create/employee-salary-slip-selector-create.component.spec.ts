import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeSalarySlipSelectorCreateComponent } from './employee-salary-slip-selector-create.component';

describe('EmployeeSalarySlipSelectorCreateComponent', () => {
  let component: EmployeeSalarySlipSelectorCreateComponent;
  let fixture: ComponentFixture<EmployeeSalarySlipSelectorCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeSalarySlipSelectorCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeeSalarySlipSelectorCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
