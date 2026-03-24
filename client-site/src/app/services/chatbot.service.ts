import { Injectable } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Observable, BehaviorSubject, throwError } from "rxjs";
import { catchError, timeout } from "rxjs/operators";
import { environment } from "../../environments/environment";

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  message: string;
  timestamp: Date;
}

export interface N8nChatResponse {
  success: boolean;
  message: string;
  botText?: string;
  data?: any;
  error?: string;
  requestId?: string;
}

export interface ChatbotClientError {
  type: "auth" | "timeout" | "network" | "server" | "unknown";
  message: string;
  originalError: any;
}

@Injectable({ providedIn: "root" })
export class ChatbotService {
  private readonly baseUrl = environment.apiUrl;
  private readonly chatMessagesSubject = new BehaviorSubject<ChatMessage[]>([]);

  public chatMessages$ = this.chatMessagesSubject.asObservable();
  public isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.isLoadingSubject.asObservable();

  private messageIdCounter = 0;

  constructor(private readonly http: HttpClient) {}

  /**
   * Add a message to the chat
   */
  addMessage(sender: "user" | "bot", message: string): string {
    const id = `msg-${++this.messageIdCounter}-${Date.now()}`;
    const newMessage: ChatMessage = {
      id,
      sender,
      message,
      timestamp: new Date(),
    };
    const currentMessages = this.chatMessagesSubject.value;
    this.chatMessagesSubject.next([...currentMessages, newMessage]);
    return id;
  }

  /**
   * Send message to backend and forward to n8n
   */
  sendMessage(message: string): Observable<N8nChatResponse> {
    return this.http.post<N8nChatResponse>(
      `${this.baseUrl}/chat/n8n-chatbot`,
      { message: message.trim() },
    ).pipe(
      timeout(50000),
      catchError((error) => throwError(this.toClientError(error))),
    );
  }

  /**
   * Clear all messages
   */
  clearMessages(): void {
    this.chatMessagesSubject.next([]);
    this.messageIdCounter = 0;
  }

  /**
   * Get all current messages
   */
  getMessages(): ChatMessage[] {
    return this.chatMessagesSubject.value;
  }

  /**
   * Set loading state
   */
  setLoading(isLoading: boolean): void {
    this.isLoadingSubject.next(isLoading);
  }

  private toClientError(error: any): ChatbotClientError {
    if (error?.name === "TimeoutError") {
      return {
        type: "timeout",
        message: "Chatbot phản hồi chậm. Vui lòng thử lại.",
        originalError: error,
      };
    }

    const httpError = error as HttpErrorResponse;
    if (httpError?.status === 401) {
      return {
        type: "auth",
        message: "Bạn cần đăng nhập lại để tiếp tục chat.",
        originalError: error,
      };
    }
    if (httpError?.status === 0) {
      return {
        type: "network",
        message: "Không kết nối được tới máy chủ. Vui lòng kiểm tra mạng.",
        originalError: error,
      };
    }
    if (httpError?.status >= 500) {
      return {
        type: "server",
        message: "Hệ thống đang bận. Vui lòng thử lại sau.",
        originalError: error,
      };
    }
    return {
      type: "unknown",
      message: "Đã có lỗi xảy ra khi gửi tin nhắn.",
      originalError: error,
    };
  }
}
