import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterpaymentViewComponent } from './interpayment-view.component';

describe('InterpaymentViewComponent', () => {
  let component: InterpaymentViewComponent;
  let fixture: ComponentFixture<InterpaymentViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterpaymentViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InterpaymentViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
