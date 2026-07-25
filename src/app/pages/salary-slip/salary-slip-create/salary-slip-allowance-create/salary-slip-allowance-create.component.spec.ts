import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalarySlipAllowanceCreateComponent } from './salary-slip-allowance-create.component';

describe('SalarySlipAllowanceCreateComponent', () => {
  let component: SalarySlipAllowanceCreateComponent;
  let fixture: ComponentFixture<SalarySlipAllowanceCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalarySlipAllowanceCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalarySlipAllowanceCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
