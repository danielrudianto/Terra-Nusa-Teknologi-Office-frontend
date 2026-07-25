import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AutocompleteResultComponent } from './autocomplete-result.component';

describe('AutocompleteResultComponent', () => {
  let component: AutocompleteResultComponent;
  let fixture: ComponentFixture<AutocompleteResultComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AutocompleteResultComponent]
    });
    fixture = TestBed.createComponent(AutocompleteResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
