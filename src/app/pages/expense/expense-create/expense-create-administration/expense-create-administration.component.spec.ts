import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseCreateAdministrationComponent } from './expense-create-administration.component';

describe('ExpenseCreateAdministrationComponent', () => {
  let component: ExpenseCreateAdministrationComponent;
  let fixture: ComponentFixture<ExpenseCreateAdministrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseCreateAdministrationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseCreateAdministrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
