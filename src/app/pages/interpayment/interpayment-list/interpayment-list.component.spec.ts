import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterpaymentListComponent } from './interpayment-list.component';

describe('InterpaymentListComponent', () => {
  let component: InterpaymentListComponent;
  let fixture: ComponentFixture<InterpaymentListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InterpaymentListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InterpaymentListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
