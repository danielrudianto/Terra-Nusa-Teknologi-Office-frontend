import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PphSalaryRecapComponent } from './pph-salary-recap.component';

describe('PphSalaryRecapComponent', () => {
  let component: PphSalaryRecapComponent;
  let fixture: ComponentFixture<PphSalaryRecapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PphSalaryRecapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PphSalaryRecapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
