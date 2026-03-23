import { Injectable, HttpException, HttpStatus, Logger } from "@nestjs/common";
import axios, { AxiosError } from "axios";

export interface ChatbotRequest {
  chatInput: string;
  userId: string;
}

export interface ChatbotResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

@Injectable()
export class N8nChatbotService {
  private readonly logger = new Logger(N8nChatbotService.name);
  private readonly n8nWebhookUrl =
    "https://martechagent.app.n8n.cloud/webhook/angular-chat";

  async sendMessageToN8n(request: ChatbotRequest): Promise<ChatbotResponse> {
    try {
      this.logger.log(
        `Sending message to n8n: userId=${request.userId}, message=${request.chatInput}`,
      );

      const response = await axios.post(this.n8nWebhookUrl, {
        chatInput: request.chatInput,
        userId: request.userId,
      });

      this.logger.log(`N8n response received: ${JSON.stringify(response.data)}`);

      return {
        success: true,
        message: "Message processed successfully",
        data: response.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `Error communicating with n8n: ${axiosError.message}`,
        axiosError.stack,
      );

      return {
        success: false,
        message: "Failed to process message with AI chatbot",
        error:
          axiosError.message ||
          "N8n webhook did not respond. Please try again later.",
      };
    }
  }
}
