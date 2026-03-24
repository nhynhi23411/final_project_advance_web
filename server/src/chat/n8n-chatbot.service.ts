import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosError } from "axios";

export interface ChatbotRequest {
  message: string;
  userId: string;
  sessionId?: string;
}

export interface ChatbotResponse {
  success: boolean;
  message: string;
  botText?: string;
  data?: any;
  error?: string;
  requestId?: string;
}

@Injectable()
export class N8nChatbotService {
  private readonly logger = new Logger(N8nChatbotService.name);
  private readonly n8nWebhookUrl: string;
  private readonly n8nTimeoutMs: number;
  private readonly n8nRetryCount: number;

  constructor(private readonly configService: ConfigService) {
    this.n8nWebhookUrl =
      this.configService.get<string>("N8N_WEBHOOK_URL") ||
      "https://martechagent.app.n8n.cloud/webhook/angular-chat";
    this.n8nTimeoutMs = Number(
      this.configService.get<string>("N8N_TIMEOUT_MS") || 45000,
    );
    this.n8nRetryCount = Number(
      this.configService.get<string>("N8N_RETRY_COUNT") || 0,
    );
  }

  async sendMessageToN8n(request: ChatbotRequest): Promise<ChatbotResponse> {
    const requestId = `chat-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const payload = {
      message: request.message,
      chatInput: request.message,
      userId: request.userId,
      sessionId: request.sessionId || request.userId,
    };

    try {
      this.logger.log(
        `[${requestId}] Sending chatbot request to n8n for user ${request.userId}`,
      );
      const response = await this.sendWithRetry(payload, requestId);
      const botText = this.extractBotText(response.data);

      this.logger.log(`[${requestId}] N8n response received`);

      return {
        success: true,
        message: "Message processed successfully",
        botText,
        data: response.data,
        requestId,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      const statusCode = axiosError.response?.status;
      const normalizedMessage =
        statusCode === 408 || axiosError.code === "ECONNABORTED"
          ? "N8n webhook timeout. Please try again."
          : axiosError.message ||
            "N8n webhook did not respond. Please try again later.";

      this.logger.error(
        `[${requestId}] Error communicating with n8n: ${normalizedMessage}`,
        axiosError.stack,
      );

      return {
        success: false,
        message: "Failed to process message with AI chatbot",
        error: normalizedMessage,
        requestId,
      };
    }
  }

  private async sendWithRetry(payload: Record<string, string>, requestId: string) {
    const maxAttempts = Math.max(1, this.n8nRetryCount + 1);
    let attempt = 0;
    let lastError: AxiosError | null = null;

    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        return await axios.post(this.n8nWebhookUrl, payload, {
          timeout: this.n8nTimeoutMs,
        });
      } catch (error) {
        lastError = error as AxiosError;
        const shouldRetry =
          attempt < maxAttempts && this.isRetryableError(lastError);

        if (!shouldRetry) {
          throw lastError;
        }

        this.logger.warn(`[${requestId}] Retry n8n request attempt ${attempt + 1}/${maxAttempts}`);
        await this.wait(500);
      }
    }

    throw lastError;
  }

  private isRetryableError(error: AxiosError): boolean {
    const status = error.response?.status;
    if (!status) {
      return true;
    }
    return status >= 500 || status === 429 || status === 408;
  }

  private extractBotText(data: any): string {
    if (!data) {
      return "";
    }
    if (typeof data === "string") {
      return data;
    }
    if (Array.isArray(data)) {
      const firstItem = data[0];
      if (typeof firstItem === "string") {
        return firstItem;
      }
      if (firstItem && typeof firstItem === "object") {
        return String(
          firstItem.botText ||
            firstItem.reply ||
            firstItem.message ||
            firstItem.output ||
            "",
        );
      }
      return "";
    }
    return String(data.botText || data.reply || data.message || data.output || "");
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
