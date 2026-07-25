import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EngineeringProjectViewComponent } from './engineering-project-view.component';

describe('EngineeringProjectViewComponent', () => {
  let component: EngineeringProjectViewComponent;
  let fixture: ComponentFixture<EngineeringProjectViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EngineeringProjectViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EngineeringProjectViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
