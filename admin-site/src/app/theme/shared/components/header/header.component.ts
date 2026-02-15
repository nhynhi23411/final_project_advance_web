// Angular Import
import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

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

  // public props
  isUserMenuOpen = false;

  // public method
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
    // Implement logout logic here
    console.log('Logout');
  }
}
