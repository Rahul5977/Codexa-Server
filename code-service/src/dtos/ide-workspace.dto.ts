import { z } from "zod";

export const GetIdeWorkspaceSchema = z.object({
  userId: z.string().uuid("Invalid userId"),
});

export const SaveIdeWorkspaceSchema = z.object({
  userId: z.string().uuid("Invalid userId"),
  workspace: z.object({
    tree: z.any(),
    fileContents: z.record(z.string()),
    selectedNodeId: z.string().nullable().optional(),
    selectedLanguageId: z.string().optional(),
    stdin: z.string().optional(),
    stdinMode: z.enum(["manual", "file"]).optional(),
    selectedStdinFileId: z.string().nullable().optional(),
    expandedFolderIds: z.array(z.string()).optional(),
  }),
});

export type SaveIdeWorkspaceInput = z.infer<typeof SaveIdeWorkspaceSchema>;