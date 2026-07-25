import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DataTransferService {
  private data: any = null;

  setData(data: any) {
    console.info('Data set in DataTransferService:', data);
    this.data = data;
  }

  getData() {
    const temp = this.data;
    this.data = null; // Clear after getting (optional)
    return temp;
  }

  clearData() {
    this.data = null;
  }
}
