import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EngineeringDashboardComponent } from './engineering-dashboard.component';

describe('EngineeringDashboardComponent', () => {
  let component: EngineeringDashboardComponent;
  let fixture: ComponentFixture<EngineeringDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EngineeringDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EngineeringDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
