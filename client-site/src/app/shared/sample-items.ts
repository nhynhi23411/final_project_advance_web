import { Item } from '../services/item.service';

// Shared sample items used when the backend returns no real data.
// Keeping them in one place ensures both landing and detail components
// show consistent information.
export const SAMPLE_ITEMS: Item[] = [
    {
        _id: 'sample1',
        type: 'LOST',
        title: 'Ví da màu nâu',
        category: 'Ví',
        location_text: 'Công viên trung tâm Long Xuyên',
        lost_found_date: new Date(),
        description: 'Ví da bị mất, có nhiều thẻ ATM.',
        color: 'Nâu',
        distinctive_marks: '',
        images: [
            'https://media.loveitopcdn.com/5779/huong-dan-lam-vi-da-nam-handmade-01.jpeg',
        ],
        image_public_ids: [],
        status: 'APPROVED',
        created_by: 'user123',
        created_at: new Date(),
        updated_at: new Date(),
    },
    {
        _id: 'sample2',
        type: 'FOUND',
        title: 'Điện thoại iPhone màu đen',
        category: 'Điện thoại',
        location_text: 'Quán cà phê gần Đại học An Giang',
        lost_found_date: new Date(),
        description: 'IPhone nhặt được, chưa mở khóa.',
        color: 'Đen',
        // brand intentionally omitted per new request
        distinctive_marks: '',
        images: [
            'https://cdn-media.sforum.vn/storage/app/media/ctv_seo8/iphone%20ch%E1%BB%A5p%20%E1%BA%A3nh%20b%E1%BB%8B%20xoay%20ngang/iphone-chup-anh-bi-xoay-ngang-2.jpg',
        ],
        image_public_ids: [],
        status: 'APPROVED',
        created_by: 'user456',
        created_at: new Date(),
        updated_at: new Date(),
    },
    {
        _id: 'sample3',
        type: 'LOST',
        title: 'Giấy tờ - Căn cước công dân',
        category: 'Giấy tờ',
        location_text: 'Nhà ga thành phố',
        lost_found_date: new Date(),
        description: 'Giấy tờ tùy thân bị thất lạc, cần liên hệ ngay.',
        color: 'Trắng',
        distinctive_marks: '',
        images: [
            'assets/img/cccd.webp'
        ],
        image_public_ids: [],
        status: 'APPROVED',
        created_by: 'user789',
        created_at: new Date(),
        updated_at: new Date(),
    },
];
