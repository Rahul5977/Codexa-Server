import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private static instance: EmailService;
  private transporter: Transporter<SMTPTransport.SentMessageInfo>;
  private isConnected: boolean = false;

  private constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.transporter.verify();
      this.isConnected = true;
      console.log("✅ Email service connected successfully");
    } catch (error) {
      console.error("❌ Email service connection failed:", error);
      // Don't throw - we can still run the service but log errors
      console.warn("⚠️  Email sending will be simulated in development mode");
    }
  }

  public async sendEmail(options: EmailOptions): Promise<boolean> {
    const { to, subject, html, text } = options;

    // In development without SMTP configured, simulate sending
    if (!this.isConnected && process.env.NODE_ENV === "development") {
      console.log("📧 [SIMULATED] Email sent:");
      console.log(`   To: ${to}`);
      console.log(`   Subject: ${subject}`);
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || "Codexa <noreply@codexa.com>",
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
      });

      console.log(
        `📧 Email sent successfully to ${to} (ID: ${info.messageId})`,
      );
      return true;
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error);
      return false;
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "").trim();
  }

  public async disconnect(): Promise<void> {
    this.transporter.close();
    this.isConnected = false;
    console.log("✅ Email service disconnected");
  }
}

export const emailService = EmailService.getInstance();
