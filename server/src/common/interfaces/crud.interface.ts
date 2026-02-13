import { Document } from "mongoose";

/**
 * Interface chuẩn cho các service CRUD có thể kế thừa.
 * T: Document (Mongoose)
 * C: DTO tạo mới
 * U: DTO cập nhật (thường Partial<C>)
 */
export interface ICrudService<T extends Document, C = unknown, U = Partial<C>> {
  findAll(filter?: Record<string, unknown>): Promise<T[]>;
  findOne(id: string): Promise<T | null>;
  create(dto: C): Promise<T>;
  update(id: string, dto: U): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}
