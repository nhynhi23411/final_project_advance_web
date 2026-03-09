import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export const MAX_CLAIMS_LIMIT = 5;

export interface ClaimPayload {
    post_id: string;
    message?: string;
    secret_info?: string;
    image_proof_url?: string;
}

export interface Claim {
    _id: string;
    item_id: string;
    user_id: string;
    evidence_text: string;
    evidence_images: string[];
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    created_at: Date;
    updated_at: Date;
}

@Injectable({ providedIn: 'root' })
export class ClaimService {
    private base = environment.apiUrl;

    constructor(private http: HttpClient) { }

    private authHeaders(): HttpHeaders {
        const token = localStorage.getItem('access_token') || '';
        return new HttpHeaders({ Authorization: `Bearer ${token}` });
    }

    /** Upload evidence image via items/upload-image endpoint. */
    uploadEvidenceImage(file: File): Observable<{ url: string; publicId: string }> {
        const fd = new FormData();
        fd.append('file', file, file.name);
        return this.http.post<{ url: string; publicId: string }>(
            `${this.base}/items/upload-image`,
            fd,
            { headers: this.authHeaders() }
        );
    }

    /** Submit a new claim for an item. */
    submitClaim(data: ClaimPayload): Observable<Claim> {
        return this.http.post<Claim>(`${this.base}/claims`, data, {
            headers: this.authHeaders(),
        });
    }

    /** Get all claims for current user. */
    getMyClaimsForItem(itemId: string): Observable<Claim[]> {
        return this.http.get<Claim[]>(`${this.base}/claims/item/${itemId}`, {
            headers: this.authHeaders(),
        });
    }

    /** Count active claims (PENDING + APPROVED) for current user. */
    getActiveClaimsCount(): Observable<{ count: number }> {
        return this.http.get<{ count: number }>(`${this.base}/claims/count/active`, {
            headers: this.authHeaders(),
        });
    }

    /** Lấy danh sách claims của một post (Dành cho chủ bài đăng). */
    getClaimsForPost(postId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.base}/claims?post_id=${postId}`, {
            headers: this.authHeaders(),
        });
    }

    /** Duyệt hoặc từ chối claim (Dành cho chủ bài đăng). */
    reviewClaim(claimId: string, action: 'UNDER_VERIFICATION' | 'SUCCESSFUL' | 'REJECTED' | 'CANCELLED'): Observable<any> {
        return this.http.patch<any>(`${this.base}/claims/${claimId}/review`, { action }, {
            headers: this.authHeaders(),
        });
    }
}
