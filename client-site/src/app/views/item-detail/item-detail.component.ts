import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemService, Item } from '../../services/item.service';
import { ClaimService, MAX_CLAIMS_LIMIT } from '../../services/claim.service';
import { SAMPLE_ITEMS } from '../../shared/sample-items';

@Component({
    selector: 'app-item-detail',
    templateUrl: './item-detail.component.html',
    styleUrls: ['./item-detail.component.scss'],
})
export class ItemDetailComponent implements OnInit {
    item: Item | null = null;
    currentUserId: string | null = null;
    activeClaimsCount: number = 0;
    isLoading = true;
    error: string | null = null;
    successMessage: string | null = null;
    MAX_CLAIMS_LIMIT = MAX_CLAIMS_LIMIT;
    showClaimModal = false;
    selectedImage: string | null = null;

    // when the backend has no real posts the landing page uses this same sample list
    private sampleItems: Item[] = SAMPLE_ITEMS;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private itemService: ItemService,
        private claimService: ClaimService
    ) {
        // try to read user id if available; even if absent we just use isLoggedIn() later
        this.currentUserId = localStorage.getItem('user_id') || null;
    }

    ngOnInit(): void {
        this.loadItemDetail();
        this.loadActiveClaimsCount();
    }

    loadItemDetail(): void {
        const itemId = this.route.snapshot.paramMap.get('id');
        if (!itemId) {
            this.error = 'Item ID not found';
            this.isLoading = false;
            return;
        }

        // local stub for sample items used on landing page when backend empty
        if (itemId.startsWith('sample')) {
            const sample = this.getSampleItem(itemId);
            if (sample) {
                this.item = sample;
                this.isLoading = false;
                return;
            }
            // fall back to API if for some reason the id isn't in our list
        }

        this.itemService.getItemById(itemId).subscribe({
            next: (item) => {
                this.item = item;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error loading item:', err);
                if (err.status === 404) {
                    this.error = 'Tin đăng không tồn tại.';
                } else {
                    // show more descriptive message if available
                    this.error = err?.error?.message || 'Failed to load item details';
                }
                this.isLoading = false;
            },
        });
    }

    loadActiveClaimsCount(): void {
        this.claimService.getActiveClaimsCount().subscribe({
            next: (result) => {
                this.activeClaimsCount = result.count;
            },
            error: (err) => {
                console.error('Error loading claims count:', err);
                this.activeClaimsCount = 0;
            },
        });
    }

    // convenience getter used by template to determine login state
    get isLoggedIn(): boolean {
        return !!(localStorage.getItem('access_token') || localStorage.getItem('user_id'));
    }

    /**
     * Button should appear on every approved item page.  
     * Users will either be asked to log in or will submit a claim.
     */
    isClaimButtonVisible(): boolean {
        return !!this.item && this.item.status === 'APPROVED';
    }

    isClaimButtonDisabled(): boolean {
        // Disable if max claims limit reached
        return this.activeClaimsCount >= MAX_CLAIMS_LIMIT;
    }

    openClaimModal(): void {
        this.showClaimModal = true;
    }

    closeClaimModal(): void {
        this.showClaimModal = false;
    }

    onClaimSuccess(): void {
        this.showClaimModal = false;
        this.successMessage = 'Yêu cầu xác minh đã gửi thành công';
        setTimeout(() => {
            this.successMessage = null;
        }, 5000);
    }

    goBack(): void {
        this.router.navigate(['/landing']);
    }

    getItemTypeLabel(): string {
        return this.item?.type === 'LOST' ? 'Bị mất' : 'Nhặt được';
    }

    getItemTypeClass(): string {
        return this.item?.type === 'LOST'
            ? 'bg-red-100 text-red-600'
            : 'bg-emerald-100 text-emerald-600';
    }

    getItemTypeIcon(): string {
        return this.item?.type === 'LOST'
            ? 'fas fa-exclamation-circle'
            : 'fas fa-hand-holding-heart';
    }

    getStatusLabel(): string {
        if (!this.item) return '';
        const statusMap: Record<string, string> = {
            PENDING: 'Chờ duyệt',
            APPROVED: 'Được duyệt',
            MATCHED: 'Đã match',
            COMPLETED: 'Đã hoàn tất',
            REJECTED: 'Bị từ chối',
        };
        return statusMap[this.item.status] || this.item.status;
    }

    formatDate(date: Date | string): string {
        const d = new Date(date);
        return d.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    private getSampleItem(id: string): Item | undefined {
        return this.sampleItems.find((it) => it._id === id);
    }
}
