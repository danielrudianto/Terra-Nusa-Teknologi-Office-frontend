import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseOpponentSelectorComponent } from './expense-opponent-selector.component';

describe('ExpenseOpponentSelectorComponent', () => {
  let component: ExpenseOpponentSelectorComponent;
  let fixture: ComponentFixture<ExpenseOpponentSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseOpponentSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseOpponentSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
