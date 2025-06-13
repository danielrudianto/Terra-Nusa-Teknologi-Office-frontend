import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalarySlipListComponent } from './salary-slip-list.component';

describe('SalarySlipListComponent', () => {
  let component: SalarySlipListComponent;
  let fixture: ComponentFixture<SalarySlipListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SalarySlipListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalarySlipListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
