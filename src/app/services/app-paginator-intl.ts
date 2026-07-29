import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';

/**
 * MatPaginatorIntl dengan dukungan i18n.
 * Dibuat via factory (lihat provider di app.module) supaya injection context aman.
 */
export class AppPaginatorIntl extends MatPaginatorIntl {
  constructor(private translate: TranslateService) {
    super();
    this.translate.onLangChange.subscribe(() => this.applyLabels());
    this.applyLabels();
  }

  private applyLabels(): void {
    this.itemsPerPageLabel = this.translate.instant('paginator.itemsPerPage');
    this.nextPageLabel = this.translate.instant('paginator.nextPage');
    this.previousPageLabel = this.translate.instant('paginator.prevPage');
    this.firstPageLabel = this.translate.instant('paginator.firstPage');
    this.lastPageLabel = this.translate.instant('paginator.lastPage');
    this.changes.next();
  }

  override getRangeLabel = (
    page: number,
    pageSize: number,
    length: number,
  ): string => {
    const of = this.translate.instant('paginator.of');
    if (length === 0 || pageSize === 0) {
      return `0 ${of} ${length}`;
    }
    const start = page * pageSize;
    const end =
      start < length
        ? Math.min(start + pageSize, length)
        : (Math.ceil(length / pageSize) - 1) * pageSize + (length % pageSize);
    return `${start + 1} – ${end} ${of} ${length}`;
  };
}

/** Factory untuk provider MatPaginatorIntl (injection context aman). */
export function appPaginatorIntlFactory(
  translate: TranslateService,
): MatPaginatorIntl {
  return new AppPaginatorIntl(translate);
}
