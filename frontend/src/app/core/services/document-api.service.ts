import { HttpClient, HttpEvent } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiBaseService } from './api-base.service';

export interface DocumentSummary {
  id: number;
  originalName: string;
  storedName: string;
  fileType: 'pdf' | 'docx' | 'text' | 'image' | string;
  mimeType: string;
  uploadedAt: string;
  chunkCount: number;
}

export interface UploadDocumentResponse {
  message: string;
  documents: DocumentSummary[];
}

@Injectable({
  providedIn: 'root'
})
export class DocumentApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(ApiBaseService);

  listDocuments(): Observable<DocumentSummary[]> {
    return this.http
      .get<{ documents: DocumentSummary[] }>(this.apiBase.getUrl('/documents'))
      .pipe(map((response) => response.documents));
  }

  uploadDocuments(files: File[]): Observable<HttpEvent<UploadDocumentResponse>> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }

    return this.http.post<UploadDocumentResponse>(this.apiBase.getUrl('/documents/upload'), formData, {
      observe: 'events',
      reportProgress: true
    });
  }
}
