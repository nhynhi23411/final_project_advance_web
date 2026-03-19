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
      label: 'Quản lý Nội dung',
      icon: 'edit-2',
      route: '/moderation'
    },
    {
      label: 'Nhật ký Hoạt động',
      icon: 'file-text',
      route: '/audit-logs'
    },
    {
      label: 'Báo cáo hàng tháng',
      icon: 'bar-chart-2',
      route: '/reports'
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
