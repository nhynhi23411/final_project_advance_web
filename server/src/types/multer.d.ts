declare module "multer" {
  export interface File {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    buffer: Buffer;
    size: number;
  }

  export function memoryStorage(): {
    _handleFile(req: unknown, file: unknown, callback: (e?: Error, info?: { buffer: Buffer }) => void): void;
    _removeFile(req: unknown, file: unknown, callback: (e: Error) => void): void;
  };
}
