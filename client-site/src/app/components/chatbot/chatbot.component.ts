import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from "@angular/core";
import {
  ChatbotService,
  ChatMessage,
  ChatbotClientError,
  N8nChatResponse,
} from "../../services/chatbot.service";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

@Component({
  selector: "app-chatbot",
  templateUrl: "./chatbot.component.html",
  styleUrls: ["./chatbot.component.css"],
})
export class ChatbotComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild("messagesContainer") private messagesContainer: ElementRef;

  messages: ChatMessage[] = [];
  isLoading = false;
  inputMessage = "";
  showChat = true;

  private destroy$ = new Subject<void>();
  private shouldScroll = false;

  constructor(private chatbotService: ChatbotService) {}

  ngOnInit(): void {
    this.chatbotService.chatMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((messages) => {
        this.messages = messages;
        this.shouldScroll = true;
      });

    this.chatbotService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isLoading) => {
        this.isLoading = isLoading;
      });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error("Error scrolling to bottom:", err);
    }
  }

  sendMessage(): void {
    const message = this.inputMessage.trim();

    if (!message) {
      return;
    }

    // Add user message to chat
    this.chatbotService.addMessage("user", message);
    this.inputMessage = "";

    // Show loading state
    this.chatbotService.setLoading(true);

    // Send to backend
    this.chatbotService.sendMessage(message).subscribe({
      next: (response) => {
        this.chatbotService.setLoading(false);
        const botMessage = this.extractBotMessage(response);
        this.chatbotService.addMessage("bot", botMessage);
      },
      error: (error: ChatbotClientError) => {
        this.chatbotService.setLoading(false);
        console.error("Error sending message:", error);

        this.chatbotService.addMessage(
          "bot",
          error?.message || "Đã xảy ra lỗi, vui lòng thử lại sau.",
        );
      },
    });
  }

  handleKeyPress(event: KeyboardEvent): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat(): void {
    this.chatbotService.clearMessages();
  }

  toggleChat(): void {
    this.showChat = !this.showChat;
  }

  private extractBotMessage(response: N8nChatResponse): string {
    if (!response?.success) {
      return (
        response?.error ||
        "Chatbot chưa thể xử lý yêu cầu của bạn. Vui lòng thử lại."
      );
    }

    if (response.botText && response.botText.trim()) {
      return response.botText.trim();
    }

    const data = response.data;
    if (!data) {
      return "Mình chưa nhận được nội dung phản hồi. Bạn thử lại giúp mình nhé.";
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
            "Mình chưa hiểu ý, bạn thử diễn đạt cách khác nhé.",
        );
      }
    }

    return String(
      data.botText ||
        data.reply ||
        data.message ||
        data.output ||
        "Mình chưa hiểu ý, bạn thử diễn đạt cách khác nhé.",
    );
  }
}
