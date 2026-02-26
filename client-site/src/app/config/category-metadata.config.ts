/**
 * Cấu hình dynamic metadata fields theo từng danh mục sản phẩm.
 * Khi user chọn category, form sẽ render thêm các field tương ứng.
 */

export interface MetadataField {
    /** Key khớp với field trong DB schema (color, brand, distinctive_marks) */
    key: string;
    /** Label hiển thị trên form */
    label: string;
    /** Kiểu input: text | textarea */
    type: 'text' | 'textarea';
    /** Placeholder gợi ý */
    placeholder?: string;
}

/** Danh sách categories hiển thị trên dropdown */
export const CATEGORIES: string[] = [
    'Thiết bị điện tử',
    'Ví tiền',
    'Giấy tờ',
    'Chìa khóa',
    'Túi xách & Hành lý',
    'Trang sức & Phụ kiện',
    'Thể thao & Ngoài trời',
    'Khác',
];

/** Metadata fields động cho từng category */
export const CATEGORY_METADATA: Record<string, MetadataField[]> = {
    'Thiết bị điện tử': [
        { key: 'brand', label: 'Thương hiệu', type: 'text', placeholder: 'Ví dụ: Apple, Samsung, Dell...' },
        { key: 'color', label: 'Màu sắc', type: 'text', placeholder: 'Ví dụ: Đen, Trắng, Xám...' },
        { key: 'distinctive_marks', label: 'Dấu hiệu nhận biết', type: 'textarea', placeholder: 'Sticker, vết trầy, ốp lưng...' },
    ],
    'Ví tiền': [
        { key: 'color', label: 'Màu sắc', type: 'text', placeholder: 'Ví dụ: Nâu, Đen, Đỏ...' },
        { key: 'brand', label: 'Thương hiệu', type: 'text', placeholder: 'Ví dụ: Louis Vuitton, Gucci...' },
        { key: 'distinctive_marks', label: 'Dấu hiệu nhận biết', type: 'textarea', placeholder: 'Có hình, chữ khắc...' },
    ],
    'Giấy tờ': [
        { key: 'distinctive_marks', label: 'Dấu hiệu nhận biết', type: 'textarea', placeholder: 'Loại giấy tờ, số hiệu (nếu nhớ)...' },
    ],
    'Chìa khóa': [
        { key: 'color', label: 'Màu sắc', type: 'text', placeholder: 'Ví dụ: Bạc, Vàng, Đồng...' },
        { key: 'distinctive_marks', label: 'Dấu hiệu nhận biết', type: 'textarea', placeholder: 'Móc khóa, số lượng chìa...' },
    ],
    'Túi xách & Hành lý': [
        { key: 'color', label: 'Màu sắc', type: 'text', placeholder: 'Ví dụ: Đen, Nâu, Xanh...' },
        { key: 'brand', label: 'Thương hiệu', type: 'text', placeholder: 'Ví dụ: Nike, Adidas...' },
        { key: 'distinctive_marks', label: 'Dấu hiệu nhận biết', type: 'textarea', placeholder: 'Tag hành lý, sticker...' },
    ],
    'Trang sức & Phụ kiện': [
        { key: 'color', label: 'Màu sắc', type: 'text', placeholder: 'Ví dụ: Vàng, Bạc...' },
        { key: 'brand', label: 'Thương hiệu', type: 'text', placeholder: 'Ví dụ: Pandora, PNJ...' },
        { key: 'distinctive_marks', label: 'Dấu hiệu nhận biết', type: 'textarea', placeholder: 'Khắc tên, kích thước...' },
    ],
    'Thể thao & Ngoài trời': [
        { key: 'color', label: 'Màu sắc', type: 'text', placeholder: 'Ví dụ: Xanh, Đỏ...' },
        { key: 'brand', label: 'Thương hiệu', type: 'text', placeholder: 'Ví dụ: Wilson, Yonex...' },
        { key: 'distinctive_marks', label: 'Dấu hiệu nhận biết', type: 'textarea', placeholder: 'Số seri, nhãn tên...' },
    ],
    'Khác': [
        { key: 'color', label: 'Màu sắc', type: 'text', placeholder: 'Màu sắc vật phẩm' },
        { key: 'brand', label: 'Thương hiệu', type: 'text', placeholder: 'Thương hiệu (nếu có)' },
        { key: 'distinctive_marks', label: 'Dấu hiệu nhận biết', type: 'textarea', placeholder: 'Mô tả đặc điểm nhận biết...' },
    ],
};
