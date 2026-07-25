import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseOpponentCreateComponent } from './expense-opponent-create.component';

describe('ExpenseOpponentCreateComponent', () => {
  let component: ExpenseOpponentCreateComponent;
  let fixture: ComponentFixture<ExpenseOpponentCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseOpponentCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseOpponentCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
