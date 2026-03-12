import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const isMarkdownTableRow = (line: string): boolean => {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|', 1);
};

const isSeparatorRow = (cells: string[]): boolean =>
  cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));

const splitMarkdownTableRow = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

const splitLooseTableRow = (line: string): string[] | null => {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  const tabSeparatedCells = trimmed.split(/\t+/).map((cell) => cell.trim()).filter(Boolean);
  if (tabSeparatedCells.length >= 2) {
    return tabSeparatedCells;
  }

  const spacedCells = trimmed.split(/\s{2,}/).map((cell) => cell.trim()).filter(Boolean);
  if (spacedCells.length >= 2) {
    return spacedCells;
  }

  // Fallback for loose two-column rows such as:
  // "Half Day 5" or "Package Session Hours"
  const trailingValueMatch = trimmed.match(/^(.+?)\s+([A-Za-z0-9/%.-]+)$/);
  if (!trailingValueMatch) {
    return null;
  }

  const [, firstCell, secondCell] = trailingValueMatch;
  if (firstCell.length < 2 || secondCell.length < 1) {
    return null;
  }

  if (/[.:]$/.test(trimmed)) {
    return null;
  }

  return [firstCell.trim(), secondCell.trim()];
};

const buildTableHtml = (rows: string[][], headerCells?: string[]): string => {
  const headerHtml = headerCells
    ? `<thead><tr>${headerCells
        .map((cell) => `<th>${escapeHtml(cell)}</th>`)
        .join('')}</tr></thead>`
    : '';

  const bodyHtml = `<tbody>${rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
    )
    .join('')}</tbody>`;

  return `<div class="chat-table-wrap"><table class="chat-table">${headerHtml}${bodyHtml}</table></div>`;
};

const buildMarkdownTableHtml = (tableLines: string[]): string => {
  const rows = tableLines.map(splitMarkdownTableRow);
  if (!rows.length) {
    return '';
  }

  const hasHeader = rows.length > 1 && isSeparatorRow(rows[1]);
  const headerCells = hasHeader ? rows[0] : undefined;
  const bodyRows = hasHeader ? rows.slice(2) : rows;

  return buildTableHtml(bodyRows, headerCells);
};

const buildLooseTableHtml = (lines: string[]): string | null => {
  const rows = lines.map(splitLooseTableRow);
  if (rows.some((row) => !row)) {
    return null;
  }

  const typedRows = rows as string[][];
  if (typedRows.length < 2) {
    return null;
  }

  const columnCount = typedRows[0].length;
  if (!typedRows.every((row) => row.length === columnCount)) {
    return null;
  }

  const firstRow = typedRows[0];
  const remainingRows = typedRows.slice(1);
  const hasHeader =
    firstRow.every((cell) => /[A-Za-z]/.test(cell)) &&
    remainingRows.some((row) => /\d/.test(row[row.length - 1]));

  return buildTableHtml(hasHeader ? remainingRows : typedRows, hasHeader ? firstRow : undefined);
};

const buildParagraphHtml = (block: string): string => {
  const lines = block
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (!lines.length) {
    return '';
  }

  return `<p>${escapeHtml(lines.join('\n')).replace(/\n/g, '<br>')}</p>`;
};

@Pipe({
  name: 'chatRichText',
  standalone: true
})
export class ChatRichTextPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    if (!value) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }

    const blocks = value.replace(/\r/g, '').split(/\n{2,}/);

    const html = blocks
      .map((block) => {
        const lines = block
          .split('\n')
          .map((line) => line.trimEnd())
          .filter((line) => line.trim().length > 0);

        if (!lines.length) {
          return '';
        }

        if (lines.every(isMarkdownTableRow)) {
          return buildMarkdownTableHtml(lines);
        }

        const looseTableHtml = buildLooseTableHtml(lines);
        if (looseTableHtml) {
          return looseTableHtml;
        }

        return buildParagraphHtml(block);
      })
      .filter(Boolean)
      .join('');

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
