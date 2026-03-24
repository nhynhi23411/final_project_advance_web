import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { promises as fs } from "fs";
import * as path from "path";

export interface GeminiChatResponse {
  success: boolean;
  message: string;
  botText?: string;
  error?: string;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly model: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private knowledgeBaseCache = "";

  constructor(private readonly configService: ConfigService) {
    this.model = this.configService.get<string>("GEMINI_MODEL") || "gemini-2.0-flash";
    this.apiKey =
      this.configService.get<string>("GEMINI_API_KEY") ||
      "AIzaSyDh5xujx37sBx9_u8SjYt6C9h3usGJ2Wms";
    this.timeoutMs = Number(this.configService.get<string>("GEMINI_TIMEOUT_MS") || 45000);
  }

  async chatWithKnowledgeBase(userMessage: string): Promise<GeminiChatResponse> {
    const normalizedQuestion = userMessage.trim();
    if (!normalizedQuestion) {
      return {
        success: false,
        message: "Invalid message",
        error: "Nội dung tin nhắn không được để trống.",
      };
    }

    try {
      const knowledgeBaseText = await this.loadKnowledgeBaseAsText();
      const prompt = this.buildPrompt(knowledgeBaseText, normalizedQuestion);
      const botText = await this.generateContent(prompt);

      return {
        success: true,
        message: "Message processed successfully",
        botText,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Gemini service unavailable";
      this.logger.error(`Gemini request failed: ${errorMessage}`);
      return {
        success: false,
        message: "Failed to process message with Gemini chatbot",
        error: "Xin lỗi, chatbot đang bận. Vui lòng thử lại sau.",
      };
    }
  }

  // Read CSV and flatten it into a plain text block.
  async loadKnowledgeBaseAsText(): Promise<string> {
    if (this.knowledgeBaseCache) {
      return this.knowledgeBaseCache;
    }

    const csvPath = path.resolve(
      process.cwd(),
      "../client-site/src/assets/KnowledgeBase.csv",
    );
    const csvRaw = await fs.readFile(csvPath, "utf-8");
    const lines = csvRaw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length <= 1) {
      this.knowledgeBaseCache = "";
      return this.knowledgeBaseCache;
    }

    const rows = lines.slice(1).map((line) => this.parseCsvLine(line));
    const formatted = rows
      .filter((cols) => cols.length >= 2)
      .map((cols, index) => {
        const question = (cols[0] || "").trim();
        const answer = (cols[1] || "").trim();
        return `${index + 1}. Q: ${question}\nA: ${answer}`;
      })
      .join("\n\n");

    this.knowledgeBaseCache = formatted;
    return this.knowledgeBaseCache;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      const next = i + 1 < line.length ? line[i + 1] : "";

      if (ch === '"' && inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }

      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (ch === "," && !inQuotes) {
        result.push(current);
        current = "";
        continue;
      }

      current += ch;
    }

    result.push(current);
    return result;
  }

  private buildPrompt(knowledgeBaseText: string, userQuestion: string): string {
    return [
      "Du lieu Knowledge Base:",
      knowledgeBaseText,
      "",
      `Cau hoi nguoi dung: ${userQuestion}`,
    ].join("\n");
  }

  private async generateContent(prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const response = await axios.post(
      url,
      {
        systemInstruction: {
          parts: [
            {
              text:
                "Bạn là trợ lý hỗ trợ khách hàng của hệ thống Lost & Found. Hãy ưu tiên sử dụng dữ liệu Knowledge Base được cung cấp để trả lời chính xác. Trả lời ngắn gọn, tự nhiên, thân thiện bằng tiếng Việt. Nếu câu hỏi không có thông tin rõ trong Knowledge Base, KHONG duoc tra loi cuc cut nhu 'toi khong biet'. Thay vao do: (1) xac nhan nhu cau cua nguoi dung mot cach dong cam, (2) dua ra huong dan chung an toan va hop ly dua tren quy trinh Lost & Found, (3) neu can thi moi de xuat lien he Admin de duoc xac nhan chinh thuc. Neu thong tin khong chac chan, hay noi ro do la huong dan tam thoi.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      },
      { timeout: this.timeoutMs },
    );

    const text =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Xin lỗi, mình chưa có thông tin về vấn đề này. Bạn vui lòng liên hệ Admin để được hỗ trợ thêm.";

    return String(text).trim();
  }
}
