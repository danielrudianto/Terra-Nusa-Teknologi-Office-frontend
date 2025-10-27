export class PurchaseType {
  static getPurchaseType(purchaseType: string) {
    switch (purchaseType) {
      case 'A':
        return 'Transportation';
      case 'B':
        return 'Equipment Rental';
      case 'C':
        return 'Fuel';
      case 'D':
        return 'Manpower';
      case 'E':
        return 'Coordination; Consumption; and Accomodation';
      case 'F':
        return 'Material';
      case 'G':
        return 'Project supporting equipment and supplies';
      case '5.1.1':
        return 'Asset purchase';
      case '5.1.2':
        return 'Asset maintenance';
      case '5.1.3':
        return 'Prepaid rent expense';
      case '5.1.4':
        return 'Employee expense';
      case '5.1.5':
        return 'Logistic expense';
      case '5.1.6':
        return 'Document handling & Stationaries';
      case '5.1.7':
        return 'Utilities';
      case '5.1.8.1':
        return 'PPN';
      case '5.1.8.2':
        return 'PPh pasal 23 dan 4 ayat 2';
      case '5.1.8.3':
        return 'PPh pasal 21';
      case '5.1.8.4':
        return 'SPT Tahunan';
      case '5.1.8.5':
        return 'Annual tax report service';
      case '5.1.8.6':
        return 'Penalty';
      case '5.1.8.7':
        return 'Tax on interest';
      case '5.1.9':
        return 'Administration fees';
      case '5.1.10':
        return 'Interests';
      case '5.1.13':
        return 'Penalty fees';
      case '5.1.12':
        return 'Software';
      case '5.1.11':
        return 'Rounding up';
      case '6.3.1':
        return 'Advertising Expense';
      case '6.3.2':
        return 'Promotional Merchandise';
      case '6.4.1':
        return 'Legal Document (Akta, SBU)';
      case '6.5.1':
        return 'Recruitment Expense';
      case '6.5.2':
        return 'Training Expense';
      default:
        return purchaseType;
    }
  }
}
