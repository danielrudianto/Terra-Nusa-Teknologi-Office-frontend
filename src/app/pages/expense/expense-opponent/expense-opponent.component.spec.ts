import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseOpponentComponent } from './expense-opponent.component';

describe('ExpenseOpponentComponent', () => {
  let component: ExpenseOpponentComponent;
  let fixture: ComponentFixture<ExpenseOpponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseOpponentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseOpponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
