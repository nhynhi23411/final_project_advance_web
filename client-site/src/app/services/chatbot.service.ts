import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, BehaviorSubject } from "rxjs";
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
  data?: any;
  error?: string;
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
}
