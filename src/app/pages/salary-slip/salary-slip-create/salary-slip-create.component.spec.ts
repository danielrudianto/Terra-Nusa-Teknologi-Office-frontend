import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalarySlipCreateComponent } from './salary-slip-create.component';

describe('SalarySlipCreateComponent', () => {
  let component: SalarySlipCreateComponent;
  let fixture: ComponentFixture<SalarySlipCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SalarySlipCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalarySlipCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
