import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterItemSelectorComponent } from './master-item-selector.component';

describe('MasterItemSelectorComponent', () => {
  let component: MasterItemSelectorComponent;
  let fixture: ComponentFixture<MasterItemSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterItemSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterItemSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
