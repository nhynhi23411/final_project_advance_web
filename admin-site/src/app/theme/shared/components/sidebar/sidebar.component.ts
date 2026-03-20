// Angular Import
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
  isOpen?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  @Input() isCollapsed = false;
  @Input() isMobileOpen = false;
  @Output() closeMenu = new EventEmitter<void>();

  // Menu items
  menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'home',
      route: '/analytics'
    },
    {
      label: 'Quản lý Người Dùng',
      icon: 'users',
      route: '/users'
    },
    {
      label: 'Quản lý Bài Đăng',
      icon: 'file-text',
      route: '/moderation'
    },
    {
      label: 'Quản lý Ghép cặp',
      icon: 'link',
      route: '/matches'
    },
    {
      label: 'Cấu hình Trọng số Match',
      icon: 'sliders',
      route: '/matches/weights'
    }
  ];

  // public method
  toggleSubmenu(item: MenuItem): void {
    if (item.children) {
      item.isOpen = !item.isOpen;
    }
  }

  onMenuItemClick(): void {
    // Close mobile menu when item clicked
    if (this.isMobileOpen) {
      this.closeMenu.emit();
    }
  }
}
