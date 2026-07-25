import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterItemListComponent } from './master-item-list.component';

describe('MasterItemListComponent', () => {
  let component: MasterItemListComponent;
  let fixture: ComponentFixture<MasterItemListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterItemListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterItemListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
