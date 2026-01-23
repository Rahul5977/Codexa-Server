import { Kafka, Partitioners, logLevel } from "kafkajs";
import type { Producer } from "kafkajs";

// Kafka Topics
export const KAFKA_TOPICS = {
  NOTIFICATION_EVENTS: "notification.events",
} as const;

// Message Types
export type NotificationEventType =
  | "VERIFY_EMAIL"
  | "RESET_PASSWORD"
  | "WELCOME_EMAIL"
  | "LOGIN_ALERT";

export interface NotificationPayload {
  type: NotificationEventType;
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

class KafkaProducer {
  private static instance: KafkaProducer;
  private producer: Producer;
  private kafka: Kafka;
  private isConnected: boolean = false;

  private constructor() {
    const brokers = process.env.KAFKA_BROKERS?.split(",") || ["localhost:9092"];

    this.kafka = new Kafka({
      clientId: "auth-service",
      brokers,
      logLevel:
        process.env.NODE_ENV === "development" ? logLevel.WARN : logLevel.ERROR,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.producer = this.kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner,
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });
  }

  public static getInstance(): KafkaProducer {
    if (!KafkaProducer.instance) {
      KafkaProducer.instance = new KafkaProducer();
    }
    return KafkaProducer.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log("✅ Kafka producer already connected");
      return;
    }

    try {
      await this.producer.connect();
      this.isConnected = true;
      console.log("✅ Kafka producer connected successfully");
    } catch (error) {
      console.error("❌ Failed to connect Kafka producer:", error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.producer.disconnect();
      this.isConnected = false;
      console.log("✅ Kafka producer disconnected successfully");
    } catch (error) {
      console.error("❌ Error disconnecting Kafka producer:", error);
      throw error;
    }
  }

  public async sendMessage<T extends Record<string, unknown>>(
    topic: string,
    message: T,
    key?: string,
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Kafka producer is not connected");
    }

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: key ?? null,
            value: JSON.stringify(message),
            timestamp: Date.now().toString(),
          },
        ],
      });
      console.log(`📤 Message sent to topic: ${topic}`);
    } catch (error) {
      console.error(`❌ Failed to send message to topic ${topic}:`, error);
      throw error;
    }
  }

  public async sendNotificationEvent(
    payload: NotificationPayload,
  ): Promise<void> {
    await this.sendMessage(
      KAFKA_TOPICS.NOTIFICATION_EVENTS,
      payload as unknown as Record<string, unknown>,
      payload.email,
    );
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const kafkaProducer = KafkaProducer.getInstance();
