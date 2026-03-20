import { Request, Response } from "express";
import { prisma } from "@codexa/db";
import { z } from "zod";
import { GetIdeWorkspaceSchema, SaveIdeWorkspaceSchema } from "../dtos/ide-workspace.dto";
import { redisClient } from "../config/redis.js";

const paramsSchema = z.object({
  userId: z.string().uuid("Invalid userId"),
});

const redisWorkspaceKey = (userId: string) => `ide-workspace:${userId}`;

const getPrismaIdeWorkspaceDelegate = () => {
  const prismaAny = prisma as any;
  return prismaAny?.ideWorkspace;
};

const getIdeWorkspaceFromRedis = async (userId: string) => {
  const raw = await redisClient.get(redisWorkspaceKey(userId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveIdeWorkspaceToRedis = async (userId: string, workspace: any) => {
  const payload = {
    ...workspace,
    updatedAt: new Date().toISOString(),
  };

  await redisClient.set(redisWorkspaceKey(userId), JSON.stringify(payload));
  return payload;
};

export const getIdeWorkspace = async (req: Request, res: Response) => {
  try {
    console.log("GET /api/ide-workspace called with params:", req.params);
    const { userId } = paramsSchema.parse(req.params);
    GetIdeWorkspaceSchema.parse({ userId });

    const ideWorkspaceDelegate = getPrismaIdeWorkspaceDelegate();

    if (!ideWorkspaceDelegate) {
      const redisWorkspace = await getIdeWorkspaceFromRedis(userId);
      return res.status(200).json({
        message: redisWorkspace ? "Workspace fetched successfully" : "Workspace not found",
        workspace: redisWorkspace,
      });
    }

    const workspace = await ideWorkspaceDelegate.findUnique({
      where: { userId },
      select: {
        tree: true,
        fileContents: true,
        selectedNodeId: true,
        selectedLanguageId: true,
        stdin: true,
        stdinMode: true,
        selectedStdinFileId: true,
        expandedFolderIds: true,
        updatedAt: true,
      },
    });

    if (!workspace) {
      return res.status(200).json({
        message: "Workspace not found",
        workspace: null,
      });
    }

    return res.status(200).json({
      message: "Workspace fetched successfully",
      workspace,
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ message: error.errors[0]?.message || "Invalid request" });
    }

    console.error("Error fetching IDE workspace:", error);

    // Prisma schema in container may lag behind source; keep IDE usable via Redis fallback.
    if (String(error?.message || "").includes("ideWorkspace")) {
      try {
        const { userId } = paramsSchema.parse(req.params);
        const redisWorkspace = await getIdeWorkspaceFromRedis(userId);
        return res.status(200).json({
          message: redisWorkspace ? "Workspace fetched successfully" : "Workspace not found",
          workspace: redisWorkspace,
        });
      } catch (fallbackError) {
        console.error("Redis fallback fetch failed:", fallbackError);
      }
    }

    return res.status(500).json({ message: "Internal server error" });
  }
};

export const saveIdeWorkspace = async (req: Request, res: Response) => {
  try {
    const { userId } = paramsSchema.parse(req.params);
    const validated = SaveIdeWorkspaceSchema.parse({
      userId,
      workspace: req.body.workspace,
    });

    const ideWorkspaceDelegate = getPrismaIdeWorkspaceDelegate();

    if (!ideWorkspaceDelegate) {
      const savedRedis = await saveIdeWorkspaceToRedis(userId, validated.workspace);
      return res.status(200).json({
        message: "Workspace saved successfully",
        updatedAt: savedRedis.updatedAt,
      });
    }

    const saved = await ideWorkspaceDelegate.upsert({
      where: { userId: validated.userId },
      create: {
        userId: validated.userId,
        tree: validated.workspace.tree,
        fileContents: validated.workspace.fileContents,
        selectedNodeId: validated.workspace.selectedNodeId || null,
        selectedLanguageId: validated.workspace.selectedLanguageId || null,
        stdin: validated.workspace.stdin || "",
        stdinMode: validated.workspace.stdinMode || "manual",
        selectedStdinFileId: validated.workspace.selectedStdinFileId || null,
        expandedFolderIds: validated.workspace.expandedFolderIds || [],
      },
      update: {
        tree: validated.workspace.tree,
        fileContents: validated.workspace.fileContents,
        selectedNodeId: validated.workspace.selectedNodeId || null,
        selectedLanguageId: validated.workspace.selectedLanguageId || null,
        stdin: validated.workspace.stdin || "",
        stdinMode: validated.workspace.stdinMode || "manual",
        selectedStdinFileId: validated.workspace.selectedStdinFileId || null,
        expandedFolderIds: validated.workspace.expandedFolderIds || [],
      },
      select: {
        updatedAt: true,
      },
    });

    return res.status(200).json({
      message: "Workspace saved successfully",
      updatedAt: saved.updatedAt,
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ message: error.errors[0]?.message || "Invalid request" });
    }

    console.error("Error saving IDE workspace:", error);

    // Prisma schema in container may lag behind source; keep IDE usable via Redis fallback.
    if (String(error?.message || "").includes("ideWorkspace")) {
      try {
        const { userId } = paramsSchema.parse(req.params);
        const validated = SaveIdeWorkspaceSchema.parse({
          userId,
          workspace: req.body.workspace,
        });

        const savedRedis = await saveIdeWorkspaceToRedis(userId, validated.workspace);
        return res.status(200).json({
          message: "Workspace saved successfully",
          updatedAt: savedRedis.updatedAt,
        });
      } catch (fallbackError) {
        console.error("Redis fallback save failed:", fallbackError);
      }
    }

    return res.status(500).json({ message: "Internal server error" });
  }
};
