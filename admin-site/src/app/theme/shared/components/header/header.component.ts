// Angular Import
import { Component, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthHelperService } from 'src/app/services/auth-helper.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() toggleMobileSidebar = new EventEmitter<void>();

  isUserMenuOpen = false;

  constructor(public authHelper: AuthHelperService) {}

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  onToggleMobileSidebar(): void {
    this.toggleMobileSidebar.emit();
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  logout(): void {
    this.isUserMenuOpen = false;
    this.authHelper.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (this.isUserMenuOpen && !target.closest('.nav-item.dropdown')) {
      this.isUserMenuOpen = false;
    }
  }
}
