import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EngineeringTableComponent } from './engineering-table.component';

describe('EngineeringTableComponent', () => {
  let component: EngineeringTableComponent;
  let fixture: ComponentFixture<EngineeringTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EngineeringTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EngineeringTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
