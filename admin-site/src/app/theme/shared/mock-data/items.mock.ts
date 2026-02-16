// Mock data for testing shared components
import { ItemCard } from '../components/item-card/item-card.component';
import { PostStatus } from '../components/status-badge/status-badge.component';

/**
 * Mock Item Cards Data for testing ItemCardComponent
 */
export const MOCK_ITEMS: ItemCard[] = [
  {
    id: 1,
    title: 'Lost Golden Dog Collar',
    description: 'A beautiful golden dog collar with a name tag. Lost near the park entrance.',
    category: 'Pet Accessories',
    status: 'APPROVED',
    image: 'https://via.placeholder.com/300x200?text=Dog+Collar&bg=FFB6C1',
    location: 'City Park, Main Gate',
    date: '2024-01-15',
    owner: 'John Doe',
    likes: 24,
    comments: 5,
    isLiked: false
  },
  {
    id: 2,
    title: 'Found iPhone 15 Pro Max',
    description: 'iPhone 15 Pro Max found at the shopping mall. Please provide details to claim.',
    category: 'Electronics',
    status: 'PENDING_APPROVAL',
    image: 'https://via.placeholder.com/300x200?text=iPhone&bg=000000',
    location: 'Downtown Shopping Mall',
    date: '2024-01-14',
    owner: 'Sarah Wilson',
    likes: 152,
    comments: 23,
    isLiked: true
  },
  {
    id: 3,
    title: 'Lost Silver Wedding Ring',
    description: 'Precious silver ring with diamond. Lost at the hotel. Sentimental value.',
    category: 'Jewelry',
    status: 'APPROVED',
    image: 'https://via.placeholder.com/300x200?text=Ring&bg=C0C0C0',
    location: 'Grand Hotel, Lobby Area',
    date: '2024-01-13',
    owner: 'Michael Brown',
    likes: 87,
    comments: 12,
    isLiked: false
  },
  {
    id: 4,
    title: 'Found Set of Keys',
    description: 'Set of car keys found on the street. Has a blue keychain attached.',
    category: 'Keys & Access',
    status: 'PENDING_ADMIN',
    image: 'https://via.placeholder.com/300x200?text=Keys&bg=FFD700',
    location: 'Main Street, Near Bus Stop',
    date: '2024-01-12',
    owner: 'Emily Davis',
    likes: 15,
    comments: 3,
    isLiked: false
  },
  {
    id: 5,
    title: 'Lost Purple Backpack',
    description: 'Purple backpack containing textbooks and laptop. Very important for studies.',
    category: 'Bags & Luggage',
    status: 'NEEDS_UPDATE',
    image: 'https://via.placeholder.com/300x200?text=Backpack&bg=800080',
    location: 'University Campus, Library',
    date: '2024-01-11',
    owner: 'Jessica Martinez',
    likes: 32,
    comments: 7,
    isLiked: false
  },
  {
    id: 6,
    title: 'Found Luxury Watch',
    description: 'Rolex watch found at the airport terminal. Looking for the rightful owner.',
    category: 'Watches & Accessories',
    status: 'PENDING_APPROVAL',
    image: 'https://via.placeholder.com/300x200?text=Watch&bg=8B4513',
    location: 'International Airport Terminal 2',
    date: '2024-01-10',
    owner: 'Robert Taylor',
    likes: 210,
    comments: 34,
    isLiked: false
  },
  {
    id: 7,
    title: 'Lost Blue Bicycle',
    description: 'Blue mountain bike with custom parts. Has my name engraved on frame.',
    category: 'Sports & Outdoor',
    status: 'REJECTED',
    image: 'https://via.placeholder.com/300x200?text=Bicycle&bg=0000FF',
    location: 'Downtown Parking Garage',
    date: '2024-01-09',
    owner: 'Christopher Lee',
    likes: 5,
    comments: 1,
    isLiked: false
  },
  {
    id: 8,
    title: 'Found Passport',
    description: 'American passport found at the train station. Requires immediate return.',
    category: 'Documents',
    status: 'PENDING_SYSTEM',
    image: 'https://via.placeholder.com/300x200?text=Passport&bg=8B0000',
    location: 'Central Train Station',
    date: '2024-01-08',
    owner: 'Lisa Anderson',
    likes: 45,
    comments: 8,
    isLiked: true
  },
  {
    id: 9,
    title: 'Lost Cat - Orange Tabby',
    description: 'Missing orange tabby cat named Mittens. Very friendly. Please help find.',
    category: 'Pets',
    status: 'APPROVED',
    image: 'https://via.placeholder.com/300x200?text=Orange+Cat&bg=FFA500',
    location: 'Residential Area, Oak Street',
    date: '2024-01-07',
    owner: 'Amanda White',
    likes: 156,
    comments: 28,
    isLiked: false
  },
  {
    id: 10,
    title: 'Found Designer Handbag',
    description: 'Luxury designer handbag found at the mall. Looking for owner.',
    category: 'Fashion & Accessories',
    status: 'DRAFT',
    image: 'https://via.placeholder.com/300x200?text=Handbag&bg=8B008B',
    location: 'High-end Shopping Mall',
    date: '2024-01-06',
    owner: 'Patricia Jones',
    likes: 78,
    comments: 11,
    isLiked: false
  },
  {
    id: 11,
    title: 'Lost Glasses - Blue Frame',
    description: 'Blue-framed prescription glasses. Essential for daily use.',
    category: 'Accessories',
    status: 'RETURN_PENDING_CONFIRM',
    image: 'https://via.placeholder.com/300x200?text=Glasses&bg=87CEEB',
    location: 'Coffee Shop Near Office',
    date: '2024-01-05',
    owner: 'David Garcia',
    likes: 22,
    comments: 4,
    isLiked: false
  },
  {
    id: 12,
    title: 'Found Wallet with Cash',
    description: 'Leather wallet found with ID and cash. Contacted police.',
    category: 'Wallets & Accessories',
    status: 'ARCHIVED',
    image: 'https://via.placeholder.com/300x200?text=Wallet&bg=8B4513',
    location: 'Restaurant Downtown',
    date: '2024-01-04',
    owner: 'Jennifer Harris',
    likes: 33,
    comments: 6,
    isLiked: false
  }
];

/**
 * Mock data for different statuses
 */
export const MOCK_ITEMS_BY_STATUS: Record<PostStatus, ItemCard[]> = {
  DRAFT: MOCK_ITEMS.filter(item => item.status === 'DRAFT'),
  ARCHIVED: MOCK_ITEMS.filter(item => item.status === 'ARCHIVED'),
  PENDING_SYSTEM: MOCK_ITEMS.filter(item => item.status === 'PENDING_SYSTEM'),
  PENDING_ADMIN: MOCK_ITEMS.filter(item => item.status === 'PENDING_ADMIN'),
  PENDING_APPROVAL: MOCK_ITEMS.filter(item => item.status === 'PENDING_APPROVAL'),
  APPROVED: MOCK_ITEMS.filter(item => item.status === 'APPROVED'),
  NEEDS_UPDATE: MOCK_ITEMS.filter(item => item.status === 'NEEDS_UPDATE'),
  RETURN_PENDING_CONFIRM: MOCK_ITEMS.filter(item => item.status === 'RETURN_PENDING_CONFIRM'),
  RETURNED: MOCK_ITEMS.filter(item => item.status === 'RETURNED'),
  REJECTED: MOCK_ITEMS.filter(item => item.status === 'REJECTED')
};

/**
 * Mock status configurations
 */
export const MOCK_STATUS_DATA = [
  { status: 'DRAFT' as PostStatus, count: 2 },
  { status: 'PENDING_APPROVAL' as PostStatus, count: 3 },
  { status: 'APPROVED' as PostStatus, count: 3 },
  { status: 'NEEDS_UPDATE' as PostStatus, count: 1 },
  { status: 'PENDING_ADMIN' as PostStatus, count: 1 },
  { status: 'RETURN_PENDING_CONFIRM' as PostStatus, count: 1 },
  { status: 'REJECTED' as PostStatus, count: 1 }
];

/**
 * Helper function to get items by status
 */
export function getItemsByStatus(status: PostStatus): ItemCard[] {
  return MOCK_ITEMS_BY_STATUS[status];
}

/**
 * Helper function to get random items for testing
 */
export function getRandomMockItems(count: number): ItemCard[] {
  const shuffled = [...MOCK_ITEMS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, MOCK_ITEMS.length));
}

/**
 * Helper function to create a mock item
 */
export function createMockItem(overrides?: Partial<ItemCard>): ItemCard {
  return {
    id: Math.random(),
    title: 'New Item',
    description: 'Item description',
    category: 'Others',
    status: 'DRAFT',
    image: '',
    location: 'Unknown Location',
    date: new Date().toISOString().split('T')[0],
    owner: 'Anonymous',
    likes: 0,
    comments: 0,
    isLiked: false,
    ...overrides
  };
}
