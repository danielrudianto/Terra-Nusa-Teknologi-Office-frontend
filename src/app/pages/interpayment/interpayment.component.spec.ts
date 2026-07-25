import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterpaymentComponent } from './interpayment.component';

describe('InterpaymentComponent', () => {
  let component: InterpaymentComponent;
  let fixture: ComponentFixture<InterpaymentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InterpaymentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InterpaymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
