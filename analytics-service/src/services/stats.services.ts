import { prisma, Prisma } from "@codexa/db";

// ================================================================
// HELPER: Fetch Problem Stats from Problem Service
// ================================================================
export const fetchProblemStats = async () => {
  try {
    const problemServiceUrl = process.env.PROBLEM_SERVICE_URL || "http://problem-service:8002";
    const response = await fetch(`${problemServiceUrl}/api/problems/stats`);
    
    if (!response.ok) {
      console.error("Failed to fetch problem stats from problem-service");
      return { total: 0, easy: 0, medium: 0, hard: 0 };
    }
    
    const data = await response.json();
    return data.data || { total: 0, easy: 0, medium: 0, hard: 0 };
  } catch (error) {
    console.error("Error fetching problem stats:", error);
    return { total: 0, easy: 0, medium: 0, hard: 0 };
  }
};

// ================================================================
// FEATURE 1: SELF-REFLECTION DASHBOARD
// ================================================================

/**
 * Get complete self-reflection dashboard for a user
 * Includes: heatmap, radar chart data, efficiency metrics, streaks
 */
export const getSelfReflectionDashboard = async (userId: string) => {
  const [analytics, topicAttempts, recentSubmissions] = await Promise.all([
    prisma.userAnalytics.findUnique({ where: { userId } }),
    prisma.topicAttempt.findMany({
      where: { userId },
      orderBy: { strength: "desc" },
    }),
    prisma.submission.findMany({
      where: { userId, status: "ACCEPTED" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        time: true,
        memory: true,
        languageId: true,
        problemId: true,
        createdAt: true,
      },
    }),
  ]);

  if (!analytics) return null;

  return {
    overview: {
      totalSolved: analytics.totalSolved,
      totalAttempted: analytics.totalAttempted,
      successRate:
        analytics.totalAttempted > 0
          ? Math.round((analytics.totalSolved / analytics.totalAttempted) * 100)
          : 0,
      easySolved: analytics.easySolved,
      mediumSolved: analytics.mediumSolved,
      hardSolved: analytics.hardSolved,
    },
    streaks: {
      current: analytics.streakCurrent,
      max: analytics.streakMax,
      lastActive: analytics.lastActive,
    },
    activityHeatmap: analytics.activityLog || {},
    topicStrengths: topicAttempts.map((t) => ({
      topic: t.topic,
      solved: t.solved,
      attempted: t.attempted,
      strength: Math.round(t.strength * 100) / 100,
      easySolved: t.easySolved,
      mediumSolved: t.mediumSolved,
      hardSolved: t.hardSolved,
    })),
    efficiencyStats: analytics.efficiencyStats || {},
    languageStats: analytics.languageStats || {},
  };
};

/**
 * 1. GitHub-Style Activity Heatmap
 * Returns daily submission count for the past year
 */
export const getActivityHeatmap = async (userId: string) => {
  const analytics = await prisma.userAnalytics.findUnique({
    where: { userId },
    select: {
      activityLog: true,
      streakCurrent: true,
      streakMax: true,
      lastActive: true,
    },
  });

  if (!analytics) return { heatmap: {}, streak: { current: 0, max: 0 } };

  const activityLog = (analytics.activityLog as Record<string, number>) || {};

  // Filter to only the last 365 days
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAgoStr = oneYearAgo.toISOString().split("T")[0]!;

  const filteredLog: Record<string, number> = {};
  for (const [date, count] of Object.entries(activityLog)) {
    if (date >= oneYearAgoStr) {
      filteredLog[date] = count;
    }
  }

  // Calculate total active days and max submissions in a day
  const totalActiveDays = Object.keys(filteredLog).length;
  const maxInDay = Math.max(0, ...Object.values(filteredLog));
  const totalSubmissions = Object.values(filteredLog).reduce(
    (s, c) => s + c,
    0,
  );

  return {
    heatmap: filteredLog,
    streak: {
      current: analytics.streakCurrent,
      max: analytics.streakMax,
      lastActive: analytics.lastActive,
    },
    summary: {
      totalActiveDays,
      maxInDay,
      totalSubmissions,
    },
  };
};

/**
 * 2. Radar Chart: Topic Strength Analysis
 * Returns proficiency scores for each topic
 * Strength = (Solved / Attempted) * DifficultyWeight
 */
export const getTopicStrengths = async (userId: string) => {
  const topicAttempts = await prisma.topicAttempt.findMany({
    where: { userId },
    orderBy: { strength: "desc" },
  });

  if (topicAttempts.length === 0) return { topics: [], insights: [] };

  // Normalize strength to 0-100 scale
  const maxStrength = Math.max(...topicAttempts.map((t) => t.strength), 1);

  const topics = topicAttempts.map((t) => ({
    topic: t.topic,
    normalizedStrength: Math.round((t.strength / maxStrength) * 100),
    rawStrength: Math.round(t.strength * 100) / 100,
    solved: t.solved,
    attempted: t.attempted,
    successRate:
      t.attempted > 0 ? Math.round((t.solved / t.attempted) * 100) : 0,
    breakdown: {
      easy: t.easySolved,
      medium: t.mediumSolved,
      hard: t.hardSolved,
    },
  }));

  // Generate insights
  const insights: string[] = [];
  const strongest = topics[0];
  const weakest = topics[topics.length - 1];

  if (strongest && weakest && topics.length >= 2) {
    insights.push(
      `Your strongest topic is "${strongest.topic}" with ${strongest.successRate}% success rate.`,
    );
    if (weakest.successRate < 50) {
      insights.push(
        `You need more practice in "${weakest.topic}" (${weakest.successRate}% success rate).`,
      );
    }
  }

  // Find topics with many attempts but low success
  const needsPractice = topics.filter(
    (t) => t.attempted >= 3 && t.successRate < 40,
  );
  for (const topic of needsPractice) {
    insights.push(
      `"${topic.topic}": ${topic.attempted} attempts but only ${topic.successRate}% success. Focus on this!`,
    );
  }

  return { topics, insights };
};

/**
 * 3. Efficiency Metrics
 * "You are faster than X% of Python users"
 */
export const getEfficiencyMetrics = async (
  userId: string,
  language?: string,
) => {
  const analytics = await prisma.userAnalytics.findUnique({
    where: { userId },
    select: { efficiencyStats: true },
  });

  if (!analytics || !analytics.efficiencyStats) {
    return { metrics: [], percentiles: {} };
  }

  const userEfficiency = analytics.efficiencyStats as Record<
    string,
    { totalTime: number; count: number; avgTime: number }
  >;

  // Get all users' efficiency stats for percentile calculation
  const allAnalytics = await prisma.userAnalytics.findMany({
    where: {
      NOT: { efficiencyStats: { equals: Prisma.JsonNull } },
    },
    select: { userId: true, efficiencyStats: true },
  });

  const percentiles: Record<
    string,
    { avgTime: number; percentile: number; totalUsers: number }
  > = {};

  const targetLanguages = language ? [language] : Object.keys(userEfficiency);

  for (const lang of targetLanguages) {
    const userAvg = userEfficiency[lang]?.avgTime;
    if (!userAvg) continue;

    // Collect all users' avg time for this language
    const allTimes: number[] = [];
    for (const a of allAnalytics) {
      const eff = a.efficiencyStats as Record<string, { avgTime: number }>;
      if (eff?.[lang]?.avgTime) {
        allTimes.push(eff[lang].avgTime);
      }
    }

    // Calculate percentile (lower time = better = higher percentile)
    const slowerCount = allTimes.filter((t) => t > userAvg).length;
    const percentile =
      allTimes.length > 0
        ? Math.round((slowerCount / allTimes.length) * 100)
        : 50;

    percentiles[lang] = {
      avgTime: Math.round(userAvg * 100) / 100,
      percentile,
      totalUsers: allTimes.length,
    };
  }

  // Generate insights
  const insights: string[] = [];
  for (const [lang, data] of Object.entries(percentiles)) {
    if (data.percentile >= 80) {
      insights.push(
        `🚀 You are faster than ${data.percentile}% of ${lang} users!`,
      );
    } else if (data.percentile < 30) {
      insights.push(
        `⚡ Your ${lang} solutions are slower than average (Bottom ${100 - data.percentile}%). Try optimizing.`,
      );
    } else {
      insights.push(
        `Your ${lang} average execution: ${data.avgTime}ms (Top ${100 - data.percentile}%)`,
      );
    }
  }

  return { percentiles, insights };
};

// ================================================================
// FEATURE 2: RIVALRY ENGINE (Social Comparison)
// ================================================================

/**
 * 1. Head-to-Head Win Rate (Common Problems)
 * Compare two users on speed, memory, and attempts
 */
export const getHeadToHead = async (userAId: string, userBId: string) => {
  // Find problems both users have solved
  const [userASubmissions, userBSubmissions] = await Promise.all([
    prisma.submission.findMany({
      where: { userId: userAId, status: "ACCEPTED" },
      select: {
        problemId: true,
        time: true,
        memory: true,
        attemptNumber: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.submission.findMany({
      where: { userId: userBId, status: "ACCEPTED" },
      select: {
        problemId: true,
        time: true,
        memory: true,
        attemptNumber: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Get user names
  const [userA, userB] = await Promise.all([
    prisma.user.findUnique({ where: { id: userAId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: userBId }, select: { name: true } }),
  ]);

  const userAName = userA?.name || "User A";
  const userBName = userB?.name || "User B";

  // Build maps: problemId -> best submission (first accepted)
  const userAMap = new Map<
    string,
    { time: number; memory: number; attempts: number }
  >();
  const userBMap = new Map<
    string,
    { time: number; memory: number; attempts: number }
  >();

  for (const s of userASubmissions) {
    if (!userAMap.has(s.problemId)) {
      userAMap.set(s.problemId, {
        time: parseFloat(s.time || "0"),
        memory: s.memory || 0,
        attempts: s.attemptNumber,
      });
    }
  }

  for (const s of userBSubmissions) {
    if (!userBMap.has(s.problemId)) {
      userBMap.set(s.problemId, {
        time: parseFloat(s.time || "0"),
        memory: s.memory || 0,
        attempts: s.attemptNumber,
      });
    }
  }

  // Find common problems
  const commonProblems = [...userAMap.keys()].filter((pid) =>
    userBMap.has(pid),
  );

  let speedWinsA = 0,
    speedWinsB = 0;
  let memoryWinsA = 0,
    memoryWinsB = 0;
  let attemptWinsA = 0,
    attemptWinsB = 0;

  const details: any[] = [];

  for (const pid of commonProblems) {
    const a = userAMap.get(pid)!;
    const b = userBMap.get(pid)!;

    if (a.time < b.time) speedWinsA++;
    else if (b.time < a.time) speedWinsB++;

    if (a.memory < b.memory) memoryWinsA++;
    else if (b.memory < a.memory) memoryWinsB++;

    if (a.attempts < b.attempts) attemptWinsA++;
    else if (b.attempts < a.attempts) attemptWinsB++;

    details.push({
      problemId: pid,
      speedWinner:
        a.time < b.time ? userAName : a.time > b.time ? userBName : "Tie",
      memoryWinner:
        a.memory < b.memory
          ? userAName
          : a.memory > b.memory
            ? userBName
            : "Tie",
      attemptWinner:
        a.attempts < b.attempts
          ? userAName
          : a.attempts > b.attempts
            ? userBName
            : "Tie",
    });
  }

  const total = commonProblems.length || 1;

  return {
    userA: { id: userAId, name: userAName },
    userB: { id: userBId, name: userBName },
    commonProblemsCount: commonProblems.length,
    totalSolvedA: userAMap.size,
    totalSolvedB: userBMap.size,
    winRates: {
      speed: {
        [userAName]: Math.round((speedWinsA / total) * 100),
        [userBName]: Math.round((speedWinsB / total) * 100),
        winner:
          speedWinsA > speedWinsB
            ? userAName
            : speedWinsB > speedWinsA
              ? userBName
              : "Tie",
      },
      memory: {
        [userAName]: Math.round((memoryWinsA / total) * 100),
        [userBName]: Math.round((memoryWinsB / total) * 100),
        winner:
          memoryWinsA > memoryWinsB
            ? userAName
            : memoryWinsB > memoryWinsA
              ? userBName
              : "Tie",
      },
      consistency: {
        [userAName]: Math.round((attemptWinsA / total) * 100),
        [userBName]: Math.round((attemptWinsB / total) * 100),
        winner:
          attemptWinsA > attemptWinsB
            ? userAName
            : attemptWinsB > attemptWinsA
              ? userBName
              : "Tie",
      },
    },
    summary: `${userAName} wins on Speed (${Math.round((speedWinsA / total) * 100)}%), ${userBName} wins on Consistency (${Math.round((attemptWinsB / total) * 100)}%).`,
    details,
  };
};

/**
 * 2. Skill Gap Analysis
 * Side-by-side topic strength comparison
 */
export const getSkillGap = async (userAId: string, userBId: string) => {
  const [topicsA, topicsB, userA, userB] = await Promise.all([
    prisma.topicAttempt.findMany({ where: { userId: userAId } }),
    prisma.topicAttempt.findMany({ where: { userId: userBId } }),
    prisma.user.findUnique({ where: { id: userAId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: userBId }, select: { name: true } }),
  ]);

  const userAName = userA?.name || "User A";
  const userBName = userB?.name || "User B";

  // Build maps
  const mapA = new Map(topicsA.map((t) => [t.topic, t]));
  const mapB = new Map(topicsB.map((t) => [t.topic, t]));

  // Get all unique topics
  const allTopics = new Set([...mapA.keys(), ...mapB.keys()]);

  const comparison: any[] = [];
  const insights: string[] = [];

  for (const topic of allTopics) {
    const a = mapA.get(topic);
    const b = mapB.get(topic);

    const strengthA = a ? Math.round(a.strength * 100) / 100 : 0;
    const strengthB = b ? Math.round(b.strength * 100) / 100 : 0;

    comparison.push({
      topic,
      [userAName]: {
        strength: strengthA,
        solved: a?.solved || 0,
        attempted: a?.attempted || 0,
      },
      [userBName]: {
        strength: strengthB,
        solved: b?.solved || 0,
        attempted: b?.attempted || 0,
      },
      leader:
        strengthA > strengthB
          ? userAName
          : strengthB > strengthA
            ? userBName
            : "Tie",
      gap: Math.abs(strengthA - strengthB),
    });

    // Generate actionable insights
    if (strengthA > strengthB + 0.5) {
      insights.push(
        `${userAName} is stronger in "${topic}". ${userBName}, practice this topic!`,
      );
    } else if (strengthB > strengthA + 0.5) {
      insights.push(
        `${userBName} dominates "${topic}". ${userAName}, ask ${userBName} for tips!`,
      );
    }
  }

  // Sort by gap (biggest differences first)
  comparison.sort((a: any, b: any) => b.gap - a.gap);

  return {
    userA: { id: userAId, name: userAName },
    userB: { id: userBId, name: userBName },
    comparison,
    insights,
  };
};

/**
 * 3. The "Catch-Up" List
 * Problems User B solved that User A hasn't attempted
 */
export const getCatchUpList = async (userAId: string, userBId: string) => {
  // Get problems solved by User B
  const userBSolvedSubmissions = await prisma.submission.findMany({
    where: { userId: userBId, status: "ACCEPTED" },
    select: { problemId: true },
    distinct: ["problemId"],
  });

  const userBProblemIds = userBSolvedSubmissions.map((s) => s.problemId);

  // Get problems User A has attempted (any status)
  const userAAttemptedSubmissions = await prisma.submission.findMany({
    where: { userId: userAId },
    select: { problemId: true },
    distinct: ["problemId"],
  });

  const userAAttemptedSet = new Set(
    userAAttemptedSubmissions.map((s) => s.problemId),
  );

  // Filter: problems B solved but A hasn't even attempted
  const catchUpProblemIds = userBProblemIds.filter(
    (pid) => !userAAttemptedSet.has(pid),
  );

  if (catchUpProblemIds.length === 0) {
    return {
      problems: [],
      message: "You've attempted all problems your rival has solved! 🎉",
    };
  }

  // Get problem details
  const problems = await prisma.problem.findMany({
    where: { id: { in: catchUpProblemIds } },
    select: { id: true, title: true, difficulty: true, tags: true },
    orderBy: { difficulty: "asc" }, // Easy first
  });

  // Get user names
  const [userA, userB] = await Promise.all([
    prisma.user.findUnique({ where: { id: userAId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: userBId }, select: { name: true } }),
  ]);

  // Prioritize: Easy → Medium → Hard, and topics where User A is weak
  const userATopics = await prisma.topicAttempt.findMany({
    where: { userId: userAId },
    select: { topic: true, strength: true },
  });

  const weakTopics = new Set(
    userATopics.filter((t) => t.strength < 1.0).map((t) => t.topic),
  );

  // Sort: problems matching weak topics first
  const prioritized = problems.map((p) => ({
    ...p,
    matchesWeakTopic: p.tags.some((tag) => weakTopics.has(tag)),
    priority: p.tags.some((tag) => weakTopics.has(tag)) ? 0 : 1,
  }));

  prioritized.sort((a, b) => a.priority - b.priority);

  return {
    userA: { id: userAId, name: userA?.name || "You" },
    userB: { id: userBId, name: userB?.name || "Rival" },
    totalCatchUp: prioritized.length,
    problems: prioritized,
    message: `You have ${prioritized.length} problems to solve to match ${userB?.name || "your rival"}'s level.`,
  };
};

/**
 * Get global leaderboard rank for a user
 */
export const getGlobalRank = async (userId: string) => {
  const stats = await prisma.userAnalytics.findUnique({ where: { userId } });
  if (!stats) return { rank: null, totalUsers: 0 };

  const [rank, totalUsers] = await Promise.all([
    prisma.userAnalytics.count({
      where: { totalSolved: { gt: stats.totalSolved } },
    }),
    prisma.userAnalytics.count(),
  ]);

  return {
    rank: rank + 1,
    totalUsers,
    percentile:
      totalUsers > 0 ? Math.round(((totalUsers - rank) / totalUsers) * 100) : 0,
  };
};

/**
 * Get problem-specific analytics
 */
export const getProblemStats = async (problemId: string) => {
  const analytics = await prisma.problemAnalytics.findUnique({
    where: { problemId },
  });

  if (!analytics) return null;

  const acceptanceRate =
    analytics.totalAttempts > 0
      ? Math.round((analytics.totalSolved / analytics.totalAttempts) * 100)
      : 0;

  return {
    problemId: analytics.problemId,
    totalAttempts: analytics.totalAttempts,
    totalSolved: analytics.totalSolved,
    acceptanceRate,
    avgTimeMs: analytics.avgTimeMs
      ? Math.round(analytics.avgTimeMs * 100) / 100
      : null,
    avgMemory: analytics.avgMemory,
    languageBreakdown: analytics.languageAvgTime || {},
  };
};
