import { z } from "zod";

export const CreateSubmissionSchema = z.object({
  userId: z.string().uuid({ message: "Invalid userId" }),
  problemId: z.string().uuid({ message: "Invalid problemId" }),
  code: z.string().min(1, { message: "Code cannot be empty" }),
  languageId: z.number().int().positive({ message: "Invalid languageId" }),
});

export const RunCodeSchema=z.object({
  code: z.string().min(1, { message: "Code cannot be empty" }),
  languageId: z.number().int().positive({ message: "Invalid languageId" }),
  stdin: z.string().optional(), // User's custom input
})
export type CreateSubmissionDTO = z.infer<typeof CreateSubmissionSchema>;
export type RunCodeDTO=z.infer<typeof RunCodeSchema>
