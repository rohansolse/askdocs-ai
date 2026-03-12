import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiBaseService } from './api-base.service';

export interface ChatMessage {
  id: number;
  chatId: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ChatHistory {
  id: number;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}

export interface AskQuestionRequest {
  question: string;
  chatId?: number;
}

export interface AskQuestionResponse {
  chatId: number;
  title: string;
  answer: string;
  context: Array<{
    documentId: number;
    documentName: string;
    chunkIndex: number;
    similarity: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class ChatApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(ApiBaseService);

  getHistory(): Observable<ChatHistory[]> {
    return this.http
      .get<{ chats: ChatHistory[] }>(this.apiBase.getUrl('/chat/history'))
      .pipe(map((response) => response.chats));
  }

  askQuestion(payload: AskQuestionRequest): Observable<AskQuestionResponse> {
    return this.http.post<AskQuestionResponse>(this.apiBase.getUrl('/chat/ask'), payload);
  }
}

