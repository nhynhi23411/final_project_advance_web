import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import type { AxiosError } from "axios";
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
  private readonly apiVersion: string;
  private readonly fallbackModels: string[];
  private readonly timeoutMs: number;
  private knowledgeBaseCache = "";

  constructor(private readonly configService: ConfigService) {
    this.model =
      this.configService.get<string>("GEMINI_MODEL")?.trim() ||
      "gemini-1.5-flash";
    this.apiKey = this.configService.get<string>("GEMINI_API_KEY")?.trim() || "";
    this.apiVersion =
      this.configService.get<string>("GEMINI_API_VERSION")?.trim() || "v1beta";
    this.fallbackModels =
      this.configService
        .get<string>("GEMINI_MODEL_FALLBACKS")
        ?.split(",")
        .map((model) => model.trim())
        .filter(Boolean) || ["gemini-1.5-flash", "gemini-2.0-flash"];
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
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is missing");
    }
    const modelsToTry = Array.from(
      new Set([this.model, ...this.fallbackModels].filter(Boolean)),
    );
    let lastError: unknown;

    for (const modelName of modelsToTry) {
      try {
        const response = await axios.post(
          this.buildGenerateContentUrl(modelName),
          {
            systemInstruction: {
              parts: [
                {
                  text:
                    "Bạn là trợ lý hỗ trợ khách hàng của hệ thống Lost & Found. Hãy ưu tiên sử dụng dữ liệu Knowledge Base được cung cấp để trả lời chính xác. Trả lời ngắn gọn, tự nhiên, thân thiện bằng tiếng Việt. Luôn trả lời bằng văn bản thuần, không dùng Markdown, không dùng ký hiệu như **, #, -, *, hoặc danh sách đánh số. Nếu cần liệt kê nhiều ý, hãy viết thành câu bình thường trong một đoạn văn mạch lạc. Nếu câu hỏi không có thông tin rõ trong Knowledge Base, không trả lời cụt như 'tôi không biết'. Thay vào đó, hãy xác nhận nhu cầu của người dùng một cách đồng cảm, đưa ra hướng dẫn chung an toàn và hợp lý theo quy trình Lost & Found, rồi mới đề xuất liên hệ Admin nếu cần xác nhận chính thức. Nếu thông tin chưa chắc chắn, hãy nói rõ đó là hướng dẫn tạm thời.",
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
      } catch (error) {
        lastError = error;
        const status = this.getAxiosStatus(error);
        const errorDetails = this.extractAxiosErrorMessage(error);
        this.logger.warn(
          `Gemini call failed with model ${modelName} (status: ${status || "n/a"}): ${errorDetails}`,
        );

        if (status === 403 || status === 404) {
          continue;
        }

        throw new Error(errorDetails);
      }
    }

    throw new Error(
      `Gemini request failed for all configured models. ${this.extractAxiosErrorMessage(lastError)} ` +
        "If status is 403, check API key restrictions and enable Generative Language API for the key.",
    );
  }

  private buildGenerateContentUrl(modelName: string): string {
    return `https://generativelanguage.googleapis.com/${this.apiVersion}/models/${modelName}:generateContent?key=${this.apiKey}`;
  }

  private getAxiosStatus(error: unknown): number | undefined {
    if (!axios.isAxiosError(error)) {
      return undefined;
    }
    return error.response?.status;
  }

  private extractAxiosErrorMessage(error: unknown): string {
    if (!error) {
      return "Unknown Gemini error";
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{
        error?: { message?: string };
      }>;
      const apiMessage = axiosError.response?.data?.error?.message;
      if (apiMessage) {
        return apiMessage;
      }
      return axiosError.message;
    }

    return error instanceof Error ? error.message : String(error);
  }
}
