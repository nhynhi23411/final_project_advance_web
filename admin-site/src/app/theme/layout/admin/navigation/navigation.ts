export interface NavigationItem {
  id: string;
  title: string;
  type: 'item' | 'collapse' | 'group';
  translate?: string;
  icon?: string;
  hidden?: boolean;
  url?: string;
  classes?: string;
  exactMatch?: boolean;
  external?: boolean;
  target?: boolean;
  breadcrumbs?: boolean;
  badge?: {
    title?: string;
    type?: string;
  };
  children?: NavigationItem[];
}

export const NavigationItems: NavigationItem[] = [
  {
    id: 'navigation',
    title: 'Navigation',
    type: 'group',
    icon: 'icon-group',
    children: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        type: 'item',
        url: '/analytics',
        icon: 'feather icon-home'
      },
      {
        id: 'users',
        title: 'Quản lý Người Dùng',
        type: 'item',
        url: '/users',
        icon: 'feather icon-users'
      },
      {
        id: 'posts',
        title: 'Quản lý Nội dung',
        type: 'item',
        url: '/moderation',
        icon: 'feather icon-edit-2'
      },
      {
        id: 'matches',
        title: 'Quản lý Ghép cặp',
        type: 'item',
        url: '/matches',
        icon: 'feather icon-shuffle'
      },
      {
        id: 'audit-logs',
        title: 'Nhật ký Hoạt động',
        type: 'item',
        url: '/audit-logs',
        icon: 'feather icon-file-text'
      },
      {
        id: 'reports',
        title: 'Báo cáo hàng tháng',
        type: 'item',
        url: '/reports',
        icon: 'feather icon-bar-chart-2'
      },
      {
        id: 'system-config',
        title: 'Cấu hình Hệ thống',
        type: 'item',
        url: '/system-config',
        icon: 'feather icon-settings'
      }
    ]
  },
];
