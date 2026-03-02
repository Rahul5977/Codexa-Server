import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || "classroom-service",
  brokers: process.env.KAFKA_BROKERS?.split(",") || ["localhost:9092"],
});

export const kafkaProducer = kafka.producer();

// Initialize Kafka producer
export async function initKafka() {
  try {
    await kafkaProducer.connect();
    console.log("✅ Kafka producer connected");
  } catch (error) {
    console.error("❌ Kafka producer connection failed:", error);
    throw error;
  }
}

/**
 * Send email notification via Kafka
 */
export interface NotificationPayload {
  to: string;
  subject: string;
  html: string;
  type: "classroom_created" | "classroom_joined";
}

export async function sendEmailNotification(payload: NotificationPayload) {
  try {
    await kafkaProducer.send({
      topic: "notifications",
      messages: [
        {
          value: JSON.stringify(payload),
          headers: {
            type: "email",
          },
        },
      ],
    });
    console.log("📧 Email notification sent via Kafka");
  } catch (error) {
    console.error("❌ Failed to send email notification:", error);
    throw error;
  }
}

export async function disconnectKafka() {
  await kafkaProducer.disconnect();
  console.log("✅ Kafka producer disconnected");
}
