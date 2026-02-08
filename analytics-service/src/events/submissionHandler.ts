import { prisma } from "@codexa/db";
import type { SubmissionCompletedEvent } from "./definition.events.js";

const DIFFICULTY_WEIGHT: Record<string, number> = {
  EASY: 1.0,
  MEDIUM: 2.0,
  HARD: 3.0,
};

export const handleSubmissionCompleted = async (
  data: SubmissionCompletedEvent,
) => {
  console.log(
    `⚡ Analytics Event: User ${data.userId} | Problem ${data.problemId} | ${data.status}`,
  );

  const isAccepted = data.status === "ACCEPTED";
  const activityDate = new Date(data.createdAt);
  const dateKey = activityDate.toISOString().split("T")[0]!; // "2024-02-14"

  await prisma.$transaction(async (tx) => {
    // -------------------------------------------------------
    // 1. Find or Create UserAnalytics
    // -------------------------------------------------------
    let stats = await tx.userAnalytics.findUnique({
      where: { userId: data.userId },
    });

    if (!stats) {
      stats = await tx.userAnalytics.create({
        data: {
          userId: data.userId,
          activityLog: {},
          topicStrength: {},
          efficiencyStats: {},
          languageStats: {},
        },
      });
    }

    // -------------------------------------------------------
    // 2. Update Activity Heatmap
    // -------------------------------------------------------
    const activityLog = (stats.activityLog as Record<string, number>) || {};
    activityLog[dateKey] = (activityLog[dateKey] || 0) + 1;

    // -------------------------------------------------------
    // 3. Update Streak
    // -------------------------------------------------------
    const today = new Date(activityDate).setHours(0, 0, 0, 0);
    const lastActive = stats.lastActive
      ? new Date(stats.lastActive).setHours(0, 0, 0, 0)
      : 0;
    const diffDays = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));

    let newStreak = stats.streakCurrent;
    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    }
    // If diffDays === 0 (same day), keep current streak

    // -------------------------------------------------------
    // 4. Update Basic Counters
    // -------------------------------------------------------
    const updateData: any = {
      totalAttempted: { increment: 1 },
      lastActive: activityDate,
      activityLog,
      streakCurrent: newStreak,
      streakMax: Math.max(newStreak, stats.streakMax),
    };

    if (isAccepted) {
      updateData.totalSolved = { increment: 1 };
      if (data.difficulty === "EASY") updateData.easySolved = { increment: 1 };
      if (data.difficulty === "MEDIUM")
        updateData.mediumSolved = { increment: 1 };
      if (data.difficulty === "HARD") updateData.hardSolved = { increment: 1 };
    }

    // -------------------------------------------------------
    // 5. Update Language Stats
    // -------------------------------------------------------
    if (data.language) {
      const languageStats =
        (stats.languageStats as Record<string, number>) || {};
      languageStats[data.language] = (languageStats[data.language] || 0) + 1;
      updateData.languageStats = languageStats;
    }

    // -------------------------------------------------------
    // 6. Update Efficiency Stats (per-language avg time)
    // -------------------------------------------------------
    if (isAccepted && data.executionTimeMs > 0 && data.language) {
      const efficiencyStats =
        (stats.efficiencyStats as Record<
          string,
          { totalTime: number; count: number; avgTime: number }
        >) || {};
      const langStats = efficiencyStats[data.language] || {
        totalTime: 0,
        count: 0,
        avgTime: 0,
      };
      langStats.totalTime += data.executionTimeMs;
      langStats.count += 1;
      langStats.avgTime = langStats.totalTime / langStats.count;
      efficiencyStats[data.language] = langStats;
      updateData.efficiencyStats = efficiencyStats;
    }

    await tx.userAnalytics.update({
      where: { userId: data.userId },
      data: updateData,
    });

    // -------------------------------------------------------
    // 7. Update Topic Attempts (for Radar Chart)
    // -------------------------------------------------------
    for (const topic of data.topics) {
      const existing = await tx.topicAttempt.findUnique({
        where: { userId_topic: { userId: data.userId, topic } },
      });

      if (existing) {
        const newAttempted = existing.attempted + 1;
        const newSolved = isAccepted ? existing.solved + 1 : existing.solved;
        const weight = DIFFICULTY_WEIGHT[data.difficulty] || 1.0;
        const strength =
          newAttempted > 0 ? (newSolved / newAttempted) * weight : 0;

        const diffUpdate: any = {
          attempted: newAttempted,
          solved: newSolved,
          strength,
        };
        if (isAccepted) {
          if (data.difficulty === "EASY")
            diffUpdate.easySolved = existing.easySolved + 1;
          if (data.difficulty === "MEDIUM")
            diffUpdate.mediumSolved = existing.mediumSolved + 1;
          if (data.difficulty === "HARD")
            diffUpdate.hardSolved = existing.hardSolved + 1;
        }

        await tx.topicAttempt.update({
          where: { userId_topic: { userId: data.userId, topic } },
          data: diffUpdate,
        });
      } else {
        const weight = DIFFICULTY_WEIGHT[data.difficulty] || 1.0;
        const strength = isAccepted ? (1 / 1) * weight : 0;

        await tx.topicAttempt.create({
          data: {
            userId: data.userId,
            topic,
            attempted: 1,
            solved: isAccepted ? 1 : 0,
            strength,
            easySolved: isAccepted && data.difficulty === "EASY" ? 1 : 0,
            mediumSolved: isAccepted && data.difficulty === "MEDIUM" ? 1 : 0,
            hardSolved: isAccepted && data.difficulty === "HARD" ? 1 : 0,
          },
        });
      }
    }

    // -------------------------------------------------------
    // 8. Update Topic Strength JSON on UserAnalytics
    // -------------------------------------------------------
    const allTopics = await tx.topicAttempt.findMany({
      where: { userId: data.userId },
    });

    const topicStrength: Record<
      string,
      { solved: number; attempted: number; strength: number }
    > = {};
    for (const t of allTopics) {
      topicStrength[t.topic] = {
        solved: t.solved,
        attempted: t.attempted,
        strength: t.strength,
      };
    }

    await tx.userAnalytics.update({
      where: { userId: data.userId },
      data: { topicStrength },
    });

    // -------------------------------------------------------
    // 9. Update Problem Analytics
    // -------------------------------------------------------
    const problemAnalytics = await tx.problemAnalytics.findUnique({
      where: { problemId: data.problemId },
    });

    if (problemAnalytics) {
      const newTotalAttempts = problemAnalytics.totalAttempts + 1;
      const newTotalSolved = isAccepted
        ? problemAnalytics.totalSolved + 1
        : problemAnalytics.totalSolved;

      const langAvgTime =
        (problemAnalytics.languageAvgTime as Record<
          string,
          { totalTime: number; count: number; avgTime: number }
        >) || {};

      let newAvgTime = problemAnalytics.avgTimeMs || 0;
      let newAvgMemory = problemAnalytics.avgMemory || 0;

      if (isAccepted && data.executionTimeMs > 0) {
        // Rolling average
        const prevTotal =
          (problemAnalytics.avgTimeMs || 0) * problemAnalytics.totalSolved;
        newAvgTime =
          problemAnalytics.totalSolved > 0
            ? (prevTotal + data.executionTimeMs) / newTotalSolved
            : data.executionTimeMs;

        const prevMemTotal =
          (problemAnalytics.avgMemory || 0) * problemAnalytics.totalSolved;
        newAvgMemory =
          problemAnalytics.totalSolved > 0
            ? Math.round((prevMemTotal + data.memoryKb) / newTotalSolved)
            : data.memoryKb;

        // Per-language avg
        if (data.language) {
          const ls = langAvgTime[data.language] || {
            totalTime: 0,
            count: 0,
            avgTime: 0,
          };
          ls.totalTime += data.executionTimeMs;
          ls.count += 1;
          ls.avgTime = ls.totalTime / ls.count;
          langAvgTime[data.language] = ls;
        }
      }

      await tx.problemAnalytics.update({
        where: { problemId: data.problemId },
        data: {
          totalAttempts: newTotalAttempts,
          totalSolved: newTotalSolved,
          avgTimeMs: newAvgTime,
          avgMemory: newAvgMemory,
          languageAvgTime: langAvgTime,
        },
      });
    } else {
      const langAvgTime: Record<string, any> = {};
      if (isAccepted && data.language && data.executionTimeMs > 0) {
        langAvgTime[data.language] = {
          totalTime: data.executionTimeMs,
          count: 1,
          avgTime: data.executionTimeMs,
        };
      }

      await tx.problemAnalytics.create({
        data: {
          problemId: data.problemId,
          totalAttempts: 1,
          totalSolved: isAccepted ? 1 : 0,
          avgTimeMs: isAccepted ? data.executionTimeMs : null,
          avgMemory: isAccepted ? data.memoryKb : null,
          languageAvgTime: langAvgTime,
        },
      });
    }
  });

  console.log(`✅ Analytics updated for user ${data.userId}`);
};
