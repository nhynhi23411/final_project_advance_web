import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from "@angular/core";
import { ChatbotService, ChatMessage } from "../../services/chatbot.service";
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

        if (response.success && response.data) {
          // Extract the response message from n8n
          const botMessage =
            response.data.reply ||
            response.data.message ||
            response.data.output ||
            "Sorry, I couldn't process your request.";

          this.chatbotService.addMessage("bot", String(botMessage));
        } else {
          this.chatbotService.addMessage(
            "bot",
            response.error ||
              "An error occurred. Please try again.",
          );
        }
      },
      error: (error) => {
        this.chatbotService.setLoading(false);
        console.error("Error sending message:", error);

        this.chatbotService.addMessage(
          "bot",
          "Sorry, I encountered an error. Please try again later.",
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
}
