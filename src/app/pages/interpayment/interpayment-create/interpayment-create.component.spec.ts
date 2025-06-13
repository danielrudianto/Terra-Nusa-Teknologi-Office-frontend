import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterpaymentCreateComponent } from './interpayment-create.component';

describe('InterpaymentCreateComponent', () => {
  let component: InterpaymentCreateComponent;
  let fixture: ComponentFixture<InterpaymentCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InterpaymentCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InterpaymentCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
