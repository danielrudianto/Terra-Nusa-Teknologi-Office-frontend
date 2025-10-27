import {
  Alignment,
  Margins,
  PageOrientation,
  PageSize,
} from 'pdfmake/interfaces';

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.vfs;

export class ReimbursementHelper {
  static generatePDF(data: {
    name: string;
    date: Date;
    projectName: string;
    bankName: string;
    bankAccountName: string;
    bankAccountNumber: string;
    reimbursementItems: any[];
  }) {
    const date = data.date;
    const projectName = data.projectName;
    const reimbursementItems = data.reimbursementItems.map((item: any) => {
      const itemDate = new Date(item.date);
      return {
        ...item,
        date: itemDate,
      };
    });

    var dd = {
      pageSize: 'A4' as PageSize,
      pageOrientatation: 'portrait' as PageOrientation,
      pageMargins: [40, 20, 40, 20] as Margins,
      fontSize: 12,
      content: [
        // add a divider
        {
          table: {
            widths: [50, '*', 125],
            body: [
              [
                {
                  image:
                    'data:image/png;base64,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',
                  rowSpan: 3,
                  width: 50,
                  alignment: 'center' as Alignment,
                },
                {
                  stack: [
                    {
                      text: 'PT. Alpha Konstruksi Nusantara',
                      alignment: 'center' as Alignment,
                      bold: true,
                      fontSize: 16,
                    },
                    {
                      text: 'Finance department',
                      alignment: 'center' as Alignment,
                      bold: true,
                      fontSize: 12,
                    },
                  ],
                  rowSpan: 2,
                },
                {
                  text: `Bekasi, ${date.toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                  })}`,
                  alignment: 'right' as Alignment,
                },
              ],
              [
                {},
                {},
                {
                  text: 'PM: Michael Andi',
                  alignment: 'right' as Alignment,
                },
              ],
              [
                {},
                {
                  text: `Proyek: ${projectName}`,
                  alignment: 'center' as Alignment,
                },
                {
                  text: `${data.name}`,
                  alignment: 'right' as Alignment,
                },
              ],
              [
                {
                  text: 'Form Reimbursement',
                  colSpan: 3,
                  alignment: 'center' as Alignment,
                  bold: true,
                  fontSize: 14,
                },
              ],
            ],
          },
        },
        {
          table: {
            widths: [20, 100, '*', 100],
            heights: [20, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40],
            headerRows: 1,
            body: [
              [
                {
                  text: 'No.',
                  style: 'tableHeader',
                  alignment: 'center' as Alignment,
                },
                {
                  text: 'Tanggal',
                  style: 'tableHeader',
                  alignment: 'center' as Alignment,
                },
                {
                  text: 'Tujuan transaksi',
                  style: 'tableHeader',
                  alignment: 'center' as Alignment,
                },
                {
                  text: 'Nominal',
                  style: 'tableHeader',
                  alignment: 'center' as Alignment,
                },
              ],
              ...reimbursementItems.map((item: any, index: number) => [
                {
                  text: index + 1,
                  alignment: 'center' as Alignment,
                },
                {
                  text: item.date.toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                  }),
                  alignment: 'center' as Alignment,
                },
                {
                  text: item.description,
                  alignment: 'left' as Alignment,
                },
                {
                  text: item.amount.toLocaleString('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }),
                  alignment: 'right' as Alignment,
                },
              ]),
              // If reimbursementItems is less than 10, fill the rest with empty rows
              ...Array.from({ length: 10 - reimbursementItems.length }, () => [
                '',
                '',
                '',
                '',
              ]).map((row) => [
                { text: '', alignment: 'center' as Alignment },
                { text: '' },
                { text: '' },
                { text: '' },
              ]),
              [
                {
                  text: 'Total',
                  colSpan: 3,
                  alignment: 'right' as Alignment,
                  bold: true,
                },
                {},
                {},
                {
                  text: reimbursementItems
                    .reduce((sum: number, item: any) => sum + item.amount, 0)
                    .toLocaleString('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                    }),
                  alignment: 'right' as Alignment,
                },
              ],
            ],
          },
        },
        {
          text: 'Catatan: Wajib dilengkapi dengan bukti transaksi (bukti pembayaran, nota, dll) yang relevan.',
          margin: [0, 0, 0, 0] as Margins,
          fontSize: 10,
          bold: false,
          italic: true,
          alignment: 'justify' as Alignment,
        },
        {
          table: {
            widths: ['*', '*', '*'],
            heights: [20, 60, 20, 20, 20],
            body: [
              [
                {
                  text: 'Dibuat oleh',
                  alignment: 'center' as Alignment,
                },
                {
                  text: 'Diperiksa oleh',
                  alignment: 'center' as Alignment,
                },
                {
                  text: 'Disetujui oleh',
                  alignment: 'center' as Alignment,
                },
              ],
              [
                {
                  text: 'Paraf',
                  alignment: 'center' as Alignment,
                  color: 'gray',
                },
                {
                  text: 'Paraf',
                  alignment: 'center' as Alignment,
                  color: 'gray',
                },
                {
                  text: 'Paraf',
                  alignment: 'center' as Alignment,
                  color: 'gray',
                },
              ],
              [
                {
                  text: 'Pembayan dilakukan melalui rekening bank berikut:',
                  colSpan: 3,
                },
                {},
                {},
              ],
              [
                {
                  text: `Bank`,
                },
                {
                  text: `: ${data.bankName}`,
                  colSpan: 2,
                },
                {},
              ],
              [
                {
                  text: 'Nama penerima',
                },
                {
                  text: `: ${data.bankAccountName}`,
                  colSpan: 2,
                },
                {},
              ],
              [
                {
                  text: 'Nomor rekening',
                },
                {
                  text: `: ${data.bankAccountNumber}`,
                  colSpan: 2,
                },
                {},
              ],
            ],
          },
        },
        // Create table
      ],
      footer: {
        table: {
          width: ['auto', '*'],
          body: [
            [
              {
                image:
                  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAlgCWAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAHRAbYDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACis6717S7DVLTTLq9iivLv8A1MTHlvT2GTwM4yeBk1o0k09hKSeiCiiimMKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKZLLHBC800iRxRqWd3OFUDkkk9BQA+vPvHHxJtdFhn07SJUn1UMY3YLlLc9yc8M3OMcgEHPTB57xt8UpLlvsPhq4eO32/vbwJtZ8j7qbhlQM/e4OemMZPltebicbb3af3/5HkYvMLe5S+/8AyLF/f3Wp3017ezvPczNueRupP9B2AHAHFeleCfilJbN9h8S3DyW+391eFNzJgfdfaMsDj73Jz1znI8torgp1p05c0WeZSr1KU+eL/wCCfWMUsc8KTQyJJFIoZHQ5VgeQQR1FPr578G+P9Q8MTQ20zPc6TuO+343JnqyE9D325wcnoTke7aTrGn67Yi90y6S4tyxXcoIII6gg4IP1HQg969mhiI1VpufQYbFwrrTR9i9RRRXQdQUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFc74p8Z6X4Vtz9qk8y8eMvDap96TnAycYUZ7n0OMkYq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',
                width: 10,
                alignment: 'center',
                margin: [0, 0, 0, 0] as Margins,
              },
              {
                text: "This document is generated by TerraBot system. For green purpose, this document is not printed. Please don't print this document unless it's necessary.",
                fontSize: 8,
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [15, 2, 2, 2] as Margins,
        alignment: 'center' as Alignment,
      },
    };

    pdfMake.createPdf(dd).open();
  }
}
