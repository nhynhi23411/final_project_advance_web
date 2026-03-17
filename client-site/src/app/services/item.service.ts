import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/** Lỗi đã chuẩn hóa từ API, luôn có message */
export interface ApiError {
    message: string;
}

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
    status?: string;
    approved_at?: Date | string;
    created_by?: string;
    created_by_user_id?: string;
    created_at: Date;
    updated_at: Date;
    location?: { address?: string };
    metadata?: Record<string, any>;
}

export interface MatchSuggestion {
    _id: string;
    score: number;
    text_score: number | null;
    distance_km: number | null;
    source: 'auto' | 'manual';
    created_at: string;
    my_post: Item | null;
    matched_post: Item | null;
}

export interface ManualMatchSuggestionPayload {
    lost_post_id: string;
    found_post_id: string;
}

export interface ManualMatchSuggestionResult {
    message: string;
    created: boolean;
}

@Injectable({ providedIn: 'root' })
export class ItemService {
    private base = environment.apiUrl;

    constructor(private http: HttpClient) { }

    /** Upload one image through backend → Cloudinary. Returns {url, publicId}.
     *  Authorization header is injected automatically by AuthInterceptor. */
    uploadImage(file: File): Observable<UploadResult> {
        const fd = new FormData();
        fd.append('file', file, file.name);
        return this.http.post<UploadResult>(`${this.base}/items/upload-image`, fd);
    }

    /** Create a new Lost / Found item post. */
    createItem(data: ItemPayload): Observable<any> {
        return this.http.post(`${this.base}/items`, data).pipe(
            catchError((err: HttpErrorResponse) => {
                const msg = this.getApiErrorMessage(err);
                return throwError({ message: msg } as ApiError);
            }),
        );
    }

    /** Trích message từ HttpErrorResponse (NestJS trả { message, error, statusCode }) */
    private getApiErrorMessage(err: HttpErrorResponse): string {
        const body = err?.error;
        if (body != null && typeof body === 'object' && !Array.isArray(body)) {
            const m = body.message ?? body.msg;
            if (m != null && m !== '') {
                return Array.isArray(m) ? m.join('. ') : String(m);
            }
        }
        if (typeof body === 'string' && body.length < 300) return body;
        if (err?.status === 400) return 'Yêu cầu không hợp lệ (400).';
        return err?.message || 'Đăng tin thất bại. Vui lòng thử lại.';
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
        return this.http
            .get<Item[] | { data?: Item[] }>(`${this.base}/items${params}`)
            .pipe(map((response) => this.normalizeItemArrayResponse(response)));
    }

    /** Fetch a single item by ID. */
    getItemById(id: string): Observable<Item> {
        return this.http
            .get<Item>(`${this.base}/items/${id}`)
            .pipe(map((item) => this.normalizeItem(item)));
    }

    /** Fetch current user's posts (requires auth). */
    getMyItems(): Observable<Item[]> {
        return this.http
            .get<Item[] | { data?: Item[] }>(`${this.base}/items/my`)
            .pipe(map((response) => this.normalizeItemArrayResponse(response)));
    }

    /** Fetch match suggestions for the current user (score > 60%). */
    getMatchSuggestions(): Observable<MatchSuggestion[]> {
        return this.http
            .get<MatchSuggestion[]>(`${this.base}/matches/my-suggestions`)
            .pipe(
                map((suggestions) =>
                    (Array.isArray(suggestions) ? suggestions : []).map((suggestion) => ({
                        ...suggestion,
                        my_post: suggestion?.my_post ? this.normalizeItem(suggestion.my_post) : null,
                        matched_post: suggestion?.matched_post ? this.normalizeItem(suggestion.matched_post) : null,
                    }))
                )
            );
    }

    createManualMatchSuggestion(payload: ManualMatchSuggestionPayload): Observable<ManualMatchSuggestionResult> {
        return this.http.post<ManualMatchSuggestionResult>(`${this.base}/matches/manual-suggestion`, payload);
    }

    private normalizeItemArrayResponse(response: Item[] | { data?: Item[] } | null | undefined): Item[] {
        const items = Array.isArray(response)
            ? response
            : Array.isArray(response?.data)
                ? response.data
                : [];
        return items.map((item) => this.normalizeItem(item));
    }

    private normalizeItem(item: Item | null | undefined): Item {
        const normalizedType = item?.type || item?.post_type || 'LOST';
        const createdAt = item?.created_at || (item as any)?.createdAt;
        const updatedAt = item?.updated_at || (item as any)?.updatedAt;
        const lostFoundDate = item?.lost_found_date || (item as any)?.metadata?.lost_found_date;
        return {
            ...(item as Item),
            type: normalizedType,
            post_type: item?.post_type || normalizedType,
            created_at: createdAt,
            updated_at: updatedAt,
            lost_found_date: lostFoundDate,
            color: item?.color || (item as any)?.metadata?.color || '',
            brand: item?.brand || (item as any)?.metadata?.brand,
            distinctive_marks: item?.distinctive_marks || (item as any)?.metadata?.distinctive_marks,
            location_text: item?.location_text || item?.location?.address || '',
            images: Array.isArray(item?.images) ? item!.images : [],
            image_public_ids: Array.isArray(item?.image_public_ids) ? item!.image_public_ids : [],
        };
    }
}
