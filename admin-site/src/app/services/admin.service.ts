import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PostStatus } from 'src/app/theme/shared/components/status-badge/status-badge.component';

export interface Item {
  _id?: string;
  id?: string | number;
  title?: string;
  status?: PostStatus;
  isUpdating?: boolean;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * fetch items that currently have status PENDING_ADMIN
   */
  getPendingItems(): Observable<Item[]> {
    return this.http.get<Item[]>(`${this.baseUrl}/items`, {
      params: { status: 'PENDING_ADMIN' }
    });
  }

  /**
   * change status of a single item
   */
  changeStatus(
    id: string | number,
    status: PostStatus,
    reason?: string
  ): Observable<any> {
    const body: any = { status };
    if (reason && reason.trim()) {
      body.reject_reason = reason.trim();
    }
    return this.http.patch(`${this.baseUrl}/items/${id}`, body);
  }
}
