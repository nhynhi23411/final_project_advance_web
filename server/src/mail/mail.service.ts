import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  private buildTransporter() {
    const host = this.config.get<string>("SMTP_HOST");
    const port = Number(this.config.get<string>("SMTP_PORT") || 587);
    const user = this.config.get<string>("SMTP_USER");
    const pass = this.config.get<string>("SMTP_PASS");
    const secure = String(this.config.get<string>("SMTP_SECURE") || "false") === "true";

    if (!host || !user || !pass) return null;
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  async sendPasswordResetEmail(input: {
    to: string;
    resetUrl: string;
    receiverName?: string;
    expiresMinutes: number;
  }) {
    const from =
      this.config.get<string>("SMTP_FROM") ||
      this.config.get<string>("SMTP_USER") ||
      "no-reply@lostfound.local";
    const appName = this.config.get<string>("MAIL_APP_NAME") || "Lost & Found";

    const subject = `[${appName}] Đặt lại mật khẩu`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #222">
        <p>Xin chào ${input.receiverName || "bạn"},</p>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
        <p>
          Bấm vào liên kết sau để đặt lại mật khẩu (hết hạn sau ${input.expiresMinutes} phút):
        </p>
        <p><a href="${input.resetUrl}">${input.resetUrl}</a></p>
        <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
      </div>
    `;

    const transporter = this.buildTransporter();
    if (!transporter) {
      this.logger.warn(
        `SMTP chưa cấu hình. Skip gửi email reset cho ${input.to}. Link: ${input.resetUrl}`,
      );
      return;
    }

    await transporter.sendMail({
      from,
      to: input.to,
      subject,
      html,
    });
  }
}
