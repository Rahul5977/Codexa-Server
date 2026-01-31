import express from "express";
import dotenv from "dotenv";
import submissionRoutes from "./routes/submission.routes";
import { submissionWorker } from "./workers/submission.workers"; // Import to start worker

dotenv.config();

const app = express();
app.use(express.json());

// Routes
app.use("/submissions", submissionRoutes);

const PORT = process.env.PORT || 3004;

app.listen(PORT, () => {
  console.log(`🚀 Code Service running on port ${PORT}`);
  console.log(`👷 Worker is listening for jobs...`);
});
