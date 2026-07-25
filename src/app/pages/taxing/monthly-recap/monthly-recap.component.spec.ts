import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyRecapComponent } from './monthly-recap.component';

describe('MonthlyRecapComponent', () => {
  let component: MonthlyRecapComponent;
  let fixture: ComponentFixture<MonthlyRecapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonthlyRecapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlyRecapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
