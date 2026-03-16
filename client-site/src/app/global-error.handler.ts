import { ErrorHandler, Injectable } from "@angular/core";

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    console.error("[App Error]", error);
    if (error?.message) {
      console.error("[App Error] Message:", error.message);
    }
    if (error?.stack) {
      console.error("[App Error] Stack:", error.stack);
    }
  }
}
