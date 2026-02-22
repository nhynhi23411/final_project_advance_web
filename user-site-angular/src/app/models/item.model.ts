export type ItemStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'MATCHED'
  | 'RETURN_PENDING'
  | 'RETURNED'
  | 'CLOSED';

export type ItemType = 'LOST' | 'FOUND';

export interface Item {
  _id: string;
  type: ItemType;
  title: string;
  description?: string;
  category?: string;
  color?: string;
  brand?: string;
  distinctive_marks?: string;
  lost_found_date?: string;
  location_text: string;
  images?: string[];
  image_public_ids?: string[];
  status: ItemStatus;
  created_by?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateItemPayload {
  type: ItemType;
  title: string;
  description?: string;
  category?: string;
  color?: string;
  brand?: string;
  distinctive_marks?: string;
  lost_found_date?: string;
  location_text: string;
  images?: string[];
  image_public_ids?: string[];
}
