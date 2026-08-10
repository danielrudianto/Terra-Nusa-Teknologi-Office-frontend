import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalarySlipViewComponent } from './salary-slip-view.component';

describe('SalarySlipViewComponent', () => {
  let component: SalarySlipViewComponent;
  let fixture: ComponentFixture<SalarySlipViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SalarySlipViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalarySlipViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
