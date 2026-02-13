import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

// Dùng require vì cloudinary không có @types chuẩn cho toàn bộ API
const cloudinary = require("cloudinary").v2;

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width?: number;
  height?: number;
}

@Injectable()
export class CloudinaryService {
  private configured = false;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>("CLOUDINARY_URL");
    if (url) {
      try {
        // Format: cloudinary://api_key:api_secret@cloud_name
        const parsed = new URL(url);
        cloudinary.config({
          cloud_name: parsed.hostname,
          api_key: parsed.username,
          api_secret: parsed.password,
        });
        this.configured = true;
      } catch {
        this.configured = false;
      }
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Upload ảnh từ buffer (sau khi nhận multipart từ client).
   * Folder dùng cho Lost & Found: "lost-found"
   */
  async uploadBuffer(
    buffer: Buffer,
    options?: { folder?: string; publicId?: string }
  ): Promise<CloudinaryUploadResult> {
    if (!this.configured) {
      throw new Error("Cloudinary chưa được cấu hình (CLOUDINARY_URL)");
    }

    const folder = options?.folder ?? "lost-found";

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          ...(options?.publicId && { public_id: options.publicId }),
        },
        (err: Error, result: CloudinaryUploadResult) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
      uploadStream.end(buffer);
    });
  }

  /**
   * Xóa ảnh theo public_id (khi xóa bài đăng hoặc đổi ảnh).
   */
  async deleteByPublicId(publicId: string): Promise<void> {
    if (!this.configured) return;
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(
        publicId,
        { resource_type: "image" },
        (err: Error) => (err ? reject(err) : resolve())
      );
    });
  }
}
