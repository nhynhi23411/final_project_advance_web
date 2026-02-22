import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Item, CreateItemPayload } from '../models/item.model';

@Injectable({ providedIn: 'root' })
export class ItemsService {
  constructor(private api: ApiService) {}

  list(filters: { type?: string; category?: string; location?: string; status?: string } = {}): Observable<Item[]> {
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v != null && String(v).trim() !== '') params[k] = String(v).trim();
    });
    return this.api.get<Item[]>('/api/items', params);
  }

  myItems(): Observable<Item[]> {
    return this.api.get<Item[]>('/api/items/my');
  }

  getById(id: string): Observable<Item> {
    return this.api.get<Item>(`/api/items/${encodeURIComponent(id)}`);
  }

  uploadImage(file: File): Observable<{ url: string; publicId: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.postFormData<{ url: string; publicId: string }>('/api/items/upload-image', formData);
  }

  create(payload: CreateItemPayload): Observable<Item> {
    return this.api.post<Item>('/api/items', payload);
  }

  update(id: string, payload: Partial<CreateItemPayload>): Observable<Item> {
    return this.api.patch<Item>(`/api/items/${encodeURIComponent(id)}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/api/items/${encodeURIComponent(id)}`);
  }
}

// Fix: HttpHeaders is used but not imported in items.service - we're not actually adding headers in ApiService per-request; the backend expects Bearer in header. So we need to make ApiService send the token. Let me check - in vanilla app they set Authorization in fetch. So we need to add an HTTP interceptor that adds the token to every request from ApiService. Let me add an interceptor instead of changing ItemsService.