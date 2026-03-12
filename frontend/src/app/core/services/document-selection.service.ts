import { Injectable, computed, signal } from '@angular/core';
import { DocumentSummary } from './document-api.service';

@Injectable({
  providedIn: 'root'
})
export class DocumentSelectionService {
  readonly documents = signal<DocumentSummary[]>([]);
  readonly selectedDocumentIds = signal<number[]>([]);

  readonly selectedDocuments = computed(() => {
    const selectedIds = new Set(this.selectedDocumentIds());
    return this.documents().filter((document) => selectedIds.has(document.id));
  });

  readonly allSelected = computed(() => {
    const documents = this.documents();
    return documents.length > 0 && documents.every((document) => this.selectedDocumentIds().includes(document.id));
  });

  setDocuments(documents: DocumentSummary[]): void {
    this.documents.set(documents);

    const validIds = new Set(documents.map((document) => document.id));
    const nextSelectedIds = this.selectedDocumentIds().filter((id) => validIds.has(id));

    if (nextSelectedIds.length) {
      this.selectedDocumentIds.set(nextSelectedIds);
      return;
    }

    this.selectedDocumentIds.set(documents.map((document) => document.id));
  }

  toggleDocument(documentId: number, checked: boolean): void {
    const currentIds = new Set(this.selectedDocumentIds());

    if (checked) {
      currentIds.add(documentId);
    } else {
      currentIds.delete(documentId);
    }

    this.selectedDocumentIds.set([...currentIds]);
  }

  setAllSelected(checked: boolean): void {
    this.selectedDocumentIds.set(checked ? this.documents().map((document) => document.id) : []);
  }
}
