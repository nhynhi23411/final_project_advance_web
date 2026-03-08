import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UploadResult {
    url: string;
    publicId: string;
}

export interface ItemPayload {
    type: 'LOST' | 'FOUND';
    title: string;
    category: string;
    location_text: string;
    lost_found_date?: string;
    description?: string;
    color?: string;
    brand?: string;
    distinctive_marks?: string;
    images?: string[];
    image_public_ids?: string[];
}

export interface Item {
    _id: string;
    type?: 'LOST' | 'FOUND';
    post_type?: 'LOST' | 'FOUND';
    title: string;
    category: string;
    location_text: string;
    lost_found_date: Date;
    description: string;
    color: string;
    brand?: string;
    distinctive_marks?: string;
    images: string[];
    image_public_ids: string[];
    status: 'PENDING' | 'APPROVED' | 'MATCHED' | 'COMPLETED' | 'REJECTED';
    created_by?: string;
    created_by_user_id?: string;
    created_at: Date;
    updated_at: Date;
}

@Injectable({ providedIn: 'root' })
export class ItemService {
    private base = environment.apiUrl;

    constructor(private http: HttpClient) { }

    private authHeaders(): HttpHeaders {
        const token = localStorage.getItem('access_token') || '';
        return new HttpHeaders({ Authorization: `Bearer ${token}` });
    }

    /** Upload one image through backend → Cloudinary. Returns {url, publicId}. */
    uploadImage(file: File): Observable<UploadResult> {
        const fd = new FormData();
        fd.append('file', file, file.name);
        return this.http.post<UploadResult>(`${this.base}/items/upload-image`, fd, {
            headers: this.authHeaders(),
        });
    }

    /** Create a new Lost / Found item post. */
    createItem(data: ItemPayload): Observable<any> {
        return this.http.post(`${this.base}/items`, data, {
            headers: this.authHeaders(),
        });
    }

    /** Fetch items with optional filters. */
    getItems(filters?: Record<string, string>): Observable<Item[]> {
        let params = '';
        if (filters) {
            const qs = Object.entries(filters)
                .filter(([, v]) => !!v)
                .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                .join('&');
            if (qs) params = '?' + qs;
        }
        return this.http.get<Item[]>(`${this.base}/items${params}`);
    }

    /** Fetch a single item by ID. */
    getItemById(id: string): Observable<Item> {
        return this.http.get<Item>(`${this.base}/items/${id}`, {
            headers: this.authHeaders(),
        });
    }

    /** Fetch current user's posts (requires auth). */
    getMyItems(): Observable<Item[]> {
        return this.http.get<Item[]>(`${this.base}/items/my`, {
            headers: this.authHeaders(),
        });
    }
}
