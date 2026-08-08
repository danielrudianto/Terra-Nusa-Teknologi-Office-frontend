import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseOpponentViewComponent } from './expense-opponent-view.component';

describe('ExpenseOpponentViewComponent', () => {
  let component: ExpenseOpponentViewComponent;
  let fixture: ComponentFixture<ExpenseOpponentViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseOpponentViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseOpponentViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
