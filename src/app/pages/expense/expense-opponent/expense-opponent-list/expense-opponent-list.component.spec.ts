import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseOpponentListComponent } from './expense-opponent-list.component';

describe('ExpenseOpponentListComponent', () => {
  let component: ExpenseOpponentListComponent;
  let fixture: ComponentFixture<ExpenseOpponentListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseOpponentListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseOpponentListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
