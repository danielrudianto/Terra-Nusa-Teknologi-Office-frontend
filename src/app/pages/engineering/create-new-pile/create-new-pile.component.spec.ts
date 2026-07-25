import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateNewPileComponent } from './create-new-pile.component';

describe('CreateNewPileComponent', () => {
  let component: CreateNewPileComponent;
  let fixture: ComponentFixture<CreateNewPileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateNewPileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateNewPileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
