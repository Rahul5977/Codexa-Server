import { Kafka, logLevel } from "kafkajs";
import type { Consumer, EachMessagePayload } from "kafkajs";
import { emailService } from "./email.service.js";
import {
  getOtpEmailTemplate,
  getWelcomeEmailTemplate,
  getLoginAlertEmailTemplate,
} from "../templates/email.templates.js";

// Kafka Topics (must match auth-service)
const KAFKA_TOPICS = {
  NOTIFICATION_EVENTS: "notification.events",
};

// Notification payload type
interface NotificationPayload {
  type: "VERIFY_EMAIL" | "RESET_PASSWORD" | "WELCOME_EMAIL" | "LOGIN_ALERT";
  email: string;
  data: {
    otp?: string;
    resetToken?: string;
    userName?: string;
    expiresAt?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  timestamp: string;
}

class KafkaConsumer {
  private static instance: KafkaConsumer;
  private consumer: Consumer;
  private kafka: Kafka;
  private isConnected: boolean = false;

  private constructor() {
    const brokers = process.env.KAFKA_BROKERS?.split(",") || ["localhost:9092"];
    const groupId = process.env.KAFKA_GROUP_ID || "utils-service-group";

    this.kafka = new Kafka({
      clientId: "utils-service",
      brokers,
      logLevel:
        process.env.NODE_ENV === "development" ? logLevel.WARN : logLevel.ERROR,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.consumer = this.kafka.consumer({
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
  }

  public static getInstance(): KafkaConsumer {
    if (!KafkaConsumer.instance) {
      KafkaConsumer.instance = new KafkaConsumer();
    }
    return KafkaConsumer.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log("✅ Kafka consumer already connected");
      return;
    }

    try {
      await this.consumer.connect();
      this.isConnected = true;
      console.log("✅ Kafka consumer connected successfully");
    } catch (error) {
      console.error("❌ Failed to connect Kafka consumer:", error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.consumer.disconnect();
      this.isConnected = false;
      console.log("✅ Kafka consumer disconnected successfully");
    } catch (error) {
      console.error("❌ Error disconnecting Kafka consumer:", error);
      throw error;
    }
  }

  public async startSendMailConsumer(): Promise<void> {
    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        // Subscribe to notification events topic
        await this.consumer.subscribe({
          topic: KAFKA_TOPICS.NOTIFICATION_EVENTS,
          fromBeginning: false,
        });

        console.log(
          `📥 Subscribed to topic: ${KAFKA_TOPICS.NOTIFICATION_EVENTS}`,
        );

        // Start consuming messages
        await this.consumer.run({
          eachMessage: async (payload: EachMessagePayload) => {
            await this.handleNotificationMessage(payload);
          },
        });

        console.log("🎧 Mail consumer started and listening for messages...");
        return;
      } catch (error) {
        retries++;
        console.error(
          `❌ Failed to start mail consumer (attempt ${retries}/${maxRetries}):`,
          error,
        );
        if (retries < maxRetries) {
          console.log(`⏳ Retrying in 3 seconds...`);
          await new Promise((resolve) => setTimeout(resolve, 3000));
        } else {
          throw error;
        }
      }
    }
  }

  private async handleNotificationMessage(
    payload: EachMessagePayload,
  ): Promise<void> {
    const { topic, partition, message } = payload;

    try {
      if (!message.value) {
        console.warn("⚠️  Received empty message");
        return;
      }

      const notificationPayload: NotificationPayload = JSON.parse(
        message.value.toString(),
      );

      console.log(
        `📨 Received message from ${topic}[${partition}]: ${notificationPayload.type}`,
      );

      await this.processNotification(notificationPayload);
    } catch (error) {
      console.error("❌ Error processing message:", error);
      // In production, you might want to send to a dead-letter queue
    }
  }

  private async processNotification(
    payload: NotificationPayload,
  ): Promise<void> {
    const { type, email, data } = payload;

    let subject: string;
    let html: string;

    switch (type) {
      case "VERIFY_EMAIL":
        subject = "Verify Your Email - Codexa";
        html = getOtpEmailTemplate({
          userName: data.userName || "User",
          otp: data.otp || "000000",
          expiresInMinutes: 10,
          type: "VERIFY_EMAIL",
        });
        break;

      case "RESET_PASSWORD":
        subject = "Reset Your Password - Codexa";
        html = getOtpEmailTemplate({
          userName: data.userName || "User",
          otp: data.otp || "000000",
          expiresInMinutes: 10,
          type: "RESET_PASSWORD",
        });
        break;

      case "WELCOME_EMAIL":
        subject = "Welcome to Codexa! 🎉";
        html = getWelcomeEmailTemplate({
          userName: data.userName || "User",
        });
        break;

      case "LOGIN_ALERT":
        subject = "New Login Detected - Codexa";
        html = getLoginAlertEmailTemplate({
          userName: data.userName || "User",
          ipAddress: data.ipAddress || "Unknown",
          userAgent: data.userAgent || "Unknown",
          timestamp: new Date().toLocaleString(),
        });
        break;

      default:
        console.warn(`⚠️  Unknown notification type: ${type}`);
        return;
    }

    // Send email
    const success = await emailService.sendEmail({
      to: email,
      subject,
      html,
    });

    if (success) {
      console.log(`✅ ${type} email sent to ${email}`);
    } else {
      console.error(`❌ Failed to send ${type} email to ${email}`);
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const kafkaConsumer = KafkaConsumer.getInstance();
