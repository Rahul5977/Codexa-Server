/**
 * AI Analysis Service
 * Combines static code analysis with Google Gemini LLM to produce
 * a rich analysis report for submitted code.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";
import { redisConnection } from "../config/redis.js";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export interface SubmissionContext {
  submissionId: string;
  code: string;
  language: string; // e.g. "python", "cpp", "java"
  status: string;
  executionTimeMs: number;
  memoryKb: number;
  problemTitle?: string;
  difficulty?: string;
}

export interface StaticAnalysisResult {
  hasNestedLoops: boolean;
  hasRecursion: boolean;
  hasSorting: boolean;
  hasHashMap: boolean;
  hasStack: boolean;
  hasQueue: boolean;
  hasTree: boolean;
  hasGraph: boolean;
  hasDynamicProgramming: boolean;
  loopDepth: number;
  lineCount: number;
  estimatedComplexityHint: string; // human-readable hint for the LLM
}

export interface AIAnalysisReport {
  submissionId: string;
  timeComplexity: string;
  spaceComplexity: string;
  algorithmExplanation: string;
  possibleOptimizations: string[];
  codeQualityFeedback: string[];
  edgeCasesAndBugs: string[];
  summary: string;
  executionTimeMs: number;
  memoryKb: number;
  language: string;
  status: string;
  generatedAt: string;
  cached: boolean;
}

// ------------------------------------------------------------------
// Redis cache helpers
// ------------------------------------------------------------------

const CACHE_PREFIX = "analysis:";

const getCacheKey = (submissionId: string) =>
  `${CACHE_PREFIX}${submissionId}`;

export const getCachedAnalysis = async (
  submissionId: string,
): Promise<AIAnalysisReport | null> => {
  try {
    const raw = await redisConnection.get(getCacheKey(submissionId));
    if (!raw) return null;
    const data = JSON.parse(raw) as AIAnalysisReport;
    data.cached = true;
    return data;
  } catch {
    return null;
  }
};

const cacheAnalysis = async (
  submissionId: string,
  report: AIAnalysisReport,
): Promise<void> => {
  try {
    await redisConnection.setex(
      getCacheKey(submissionId),
      env.AI_ANALYSIS_TTL,
      JSON.stringify(report),
    );
  } catch (err: any) {
    console.warn("⚠️  Failed to cache analysis:", err.message);
  }
};

// ------------------------------------------------------------------
// Static Code Analysis (AST-lite via regex + heuristics)
// ------------------------------------------------------------------

const PATTERNS: Record<string, Record<string, RegExp[]>> = {
  python: {
    loop: [/\bfor\b/, /\bwhile\b/],
    recursion: [/def\s+(\w+)[^:]+:[\s\S]*?\1\s*\(/],
    sorting: [/\.sort\s*\(/, /sorted\s*\(/],
    hashMap: [/\bdict\b/, /\bdefaultdict\b/, /\bcounter\b/i, /=\s*\{\}/],
    stack: [/\.append\s*\(/, /\.pop\s*\(/],
    queue: [/\bdeque\b/, /queue\.Queue/],
    tree: [/TreeNode\b/, /BinaryTree\b/, /\.left\b/, /\.right\b/],
    graph: [/adjacency/i, /\bgraph\b/i, /\bnodes\b/, /\bedges\b/],
    dp: [/\bdp\b/, /memo/i, /cache/i, /lru_cache/i, /functools\.cache/i],
  },
  javascript: {
    loop: [/\bfor\b/, /\bwhile\b/, /\.forEach\b/, /\.map\b/, /\.reduce\b/],
    recursion: [
      /function\s+(\w+)\s*\([^)]*\)\s*\{[\s\S]*?\1\s*\(/,
      /const\s+(\w+)\s*=.*=>[\s\S]*?\1\s*\(/,
    ],
    sorting: [/\.sort\s*\(/],
    hashMap: [/new\s+Map\s*\(/, /new\s+Set\s*\(/, /\{\s*\}/],
    stack: [/\.push\s*\(/, /\.pop\s*\(/],
    queue: [/\.shift\s*\(/, /\.unshift\s*\(/],
    tree: [/TreeNode\b/, /\.left\b/, /\.right\b/],
    graph: [/adjacency/i, /\bgraph\b/i],
    dp: [/\bdp\b/, /memo/i, /cache/i],
  },
  typescript: {
    loop: [/\bfor\b/, /\bwhile\b/, /\.forEach\b/, /\.map\b/, /\.reduce\b/],
    recursion: [/function\s+(\w+)\s*\([^)]*\)\s*\{[\s\S]*?\1\s*\(/],
    sorting: [/\.sort\s*\(/],
    hashMap: [/new\s+Map\s*\(/, /new\s+Set\s*\(/, /Record</],
    stack: [/\.push\s*\(/, /\.pop\s*\(/],
    queue: [/\.shift\s*\(/, /\.unshift\s*\(/],
    tree: [/TreeNode\b/, /\.left\b/, /\.right\b/],
    graph: [/adjacency/i, /\bgraph\b/i],
    dp: [/\bdp\b/, /memo/i],
  },
  java: {
    loop: [/\bfor\b/, /\bwhile\b/],
    recursion: [
      /(\w+)\s+(\w+)\s*\([^)]*\)\s*\{[\s\S]*?\2\s*\(/,
    ],
    sorting: [/Arrays\.sort\b/, /Collections\.sort\b/],
    hashMap: [/HashMap\b/, /HashSet\b/, /TreeMap\b/],
    stack: [/Stack\b/, /Deque\b/, /\.push\b/, /\.pop\b/],
    queue: [/Queue\b/, /LinkedList\b/, /\.offer\b/, /\.poll\b/],
    tree: [/TreeNode\b/, /\.left\b/, /\.right\b/],
    graph: [/adjacency/i, /ArrayList\b/],
    dp: [/\bdp\b/, /memo/i],
  },
  cpp: {
    loop: [/\bfor\b/, /\bwhile\b/],
    recursion: [/(\w+)\s*\([^)]*\)\s*\{[\s\S]*?\1\s*\(/],
    sorting: [/sort\s*\(/, /std::sort\b/],
    hashMap: [/unordered_map\b/, /unordered_set\b/, /map\b/, /set\b/],
    stack: [/stack\b/, /\.push\b/, /\.pop\b/],
    queue: [/queue\b/, /\.push\b/, /\.front\b/, /\.pop\b/],
    tree: [/TreeNode\b/, /->left\b/, /->right\b/],
    graph: [/adjacency/i, /vector\s*<vector/],
    dp: [/\bdp\b/, /memo/i],
  },
};

// Get language-specific patterns, defaulting to python patterns
const getPatterns = (language: string) =>
  PATTERNS[language.toLowerCase()] ||
  PATTERNS["python"]!;

/** Count the maximum nesting depth of loops */
const countLoopDepth = (code: string): number => {
  let depth = 0;
  let maxDepth = 0;
  const lines = code.split("\n");
  for (const line of lines) {
    if (/\b(for|while)\b/.test(line)) depth++;
    maxDepth = Math.max(maxDepth, depth);
    // Rough dedent heuristic — close brackets / outdents reduce depth
    const closes = (line.match(/[}\]]/g) || []).length;
    const opens = (line.match(/[{\[]/g) || []).length;
    if (closes > opens) depth = Math.max(0, depth - (closes - opens));
  }
  return maxDepth;
};

const testPattern = (code: string, patterns: RegExp[]): boolean =>
  patterns.some((p) => p.test(code));

export const runStaticAnalysis = (
  code: string,
  language: string,
): StaticAnalysisResult => {
  const p = getPatterns(language);
  const loopDepth = countLoopDepth(code);
  const lineCount = code.split("\n").filter((l) => l.trim()).length;

  const hasNestedLoops = loopDepth >= 2;
  const hasRecursion = testPattern(code, p["recursion"]!);
  const hasSorting = testPattern(code, p["sorting"]!);
  const hasHashMap = testPattern(code, p["hashMap"]!);
  const hasStack = testPattern(code, p["stack"]!);
  const hasQueue = testPattern(code, p["queue"]!);
  const hasTree = testPattern(code, p["tree"]!);
  const hasGraph = testPattern(code, p["graph"]!);
  const hasDynamicProgramming = testPattern(code, p["dp"]!);

  // Generate a human-readable hint
  const hints: string[] = [];
  if (hasNestedLoops) hints.push(`nested loops detected (depth ≈ ${loopDepth})`);
  if (hasRecursion) hints.push("recursive calls detected");
  if (hasSorting) hints.push("sorting operation detected");
  if (hasHashMap) hints.push("hash map / hash set detected");
  if (hasDynamicProgramming) hints.push("memoization / DP table detected");
  if (hasTree) hints.push("tree traversal patterns detected");
  if (hasGraph) hints.push("graph traversal patterns detected");

  return {
    hasNestedLoops,
    hasRecursion,
    hasSorting,
    hasHashMap,
    hasStack,
    hasQueue,
    hasTree,
    hasGraph,
    hasDynamicProgramming,
    loopDepth,
    lineCount,
    estimatedComplexityHint:
      hints.length > 0 ? hints.join("; ") : "simple iteration or constant logic",
  };
};

// ------------------------------------------------------------------
// Gemini LLM Analysis
// ------------------------------------------------------------------

const buildPrompt = (
  ctx: SubmissionContext,
  staticResult: StaticAnalysisResult,
): string => {
  return `You are an expert software engineer and algorithm analyst. Analyze the following code submission and provide a structured JSON report.

SUBMISSION CONTEXT:
- Language: ${ctx.language}
- Execution Time: ${ctx.executionTimeMs.toFixed(2)} ms
- Memory Used: ${(ctx.memoryKb / 1024).toFixed(2)} MB
- Judge Status: ${ctx.status}
- Problem Difficulty: ${ctx.difficulty || "Unknown"}
${ctx.problemTitle ? `- Problem: ${ctx.problemTitle}` : ""}

STATIC ANALYSIS HINTS:
- ${staticResult.estimatedComplexityHint}
- Loop depth: ${staticResult.loopDepth}
- Lines of code: ${staticResult.lineCount}
- Detected structures: ${[
    staticResult.hasNestedLoops && "nested loops",
    staticResult.hasRecursion && "recursion",
    staticResult.hasSorting && "sorting",
    staticResult.hasHashMap && "hash map/set",
    staticResult.hasDynamicProgramming && "dynamic programming",
    staticResult.hasTree && "tree",
    staticResult.hasGraph && "graph",
  ]
    .filter(Boolean)
    .join(", ") || "none detected"}

CODE:
\`\`\`${ctx.language}
${ctx.code}
\`\`\`

Respond with ONLY a valid JSON object (no markdown, no code fences) matching this exact schema:
{
  "timeComplexity": "string (e.g. O(n log n) with brief justification)",
  "spaceComplexity": "string (e.g. O(n) because of the hash map)",
  "algorithmExplanation": "string (2-3 sentences explaining the core algorithm/approach)",
  "possibleOptimizations": ["array of 2-4 specific optimization suggestions"],
  "codeQualityFeedback": ["array of 2-4 feedback items on naming/structure/readability"],
  "edgeCasesAndBugs": ["array of 1-3 potential edge cases or bugs to watch out for"],
  "summary": "string (1-2 sentences summarizing what the code does)"
}`;
};

export const generateAIAnalysis = async (
  ctx: SubmissionContext,
): Promise<AIAnalysisReport> => {
  // 1. Check Redis cache first
  const cached = await getCachedAnalysis(ctx.submissionId);
  if (cached) return cached;

  // 2. Static analysis
  const staticResult = runStaticAnalysis(ctx.code, ctx.language);

  // 3. LLM analysis
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  // gemini-2.5-flash with thinkingBudget:0 disables thinking mode → fast responses (~5–15s)
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      // @ts-ignore — thinkingConfig is a preview field not yet in the TS types
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const prompt = buildPrompt(ctx, staticResult);

  let llmResponse: any;
  try {
    console.log(`🤖 Calling Gemini for submission ${ctx.submissionId} (${ctx.language}, ${ctx.status})...`);
    const startTime = Date.now();

    // Race Gemini against a 45s timeout so the HTTP request never hangs forever
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini request timed out after 45s")), 45000)
    );
    const result = await Promise.race([model.generateContent(prompt), timeoutPromise]);

    const elapsed = Date.now() - startTime;
    const text = result.response.text().trim();
    console.log(`✅ Gemini responded in ${elapsed}ms. Raw output (first 300 chars):`);
    console.log(text.substring(0, 300));
    // Strip potential markdown fences just in case
    const jsonText = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    llmResponse = JSON.parse(jsonText);
    console.log(`📊 Parsed report — timeComplexity: "${llmResponse.timeComplexity}"`);
  } catch (err: any) {
    console.error("❌ Gemini analysis failed:", err.message);
    throw new Error(`AI analysis failed: ${err.message}`);
  }

  const report: AIAnalysisReport = {
    submissionId: ctx.submissionId,
    timeComplexity: llmResponse.timeComplexity ?? "Unknown",
    spaceComplexity: llmResponse.spaceComplexity ?? "Unknown",
    algorithmExplanation: llmResponse.algorithmExplanation ?? "",
    possibleOptimizations: Array.isArray(llmResponse.possibleOptimizations)
      ? llmResponse.possibleOptimizations
      : [],
    codeQualityFeedback: Array.isArray(llmResponse.codeQualityFeedback)
      ? llmResponse.codeQualityFeedback
      : [],
    edgeCasesAndBugs: Array.isArray(llmResponse.edgeCasesAndBugs)
      ? llmResponse.edgeCasesAndBugs
      : [],
    summary: llmResponse.summary ?? "",
    executionTimeMs: ctx.executionTimeMs,
    memoryKb: ctx.memoryKb,
    language: ctx.language,
    status: ctx.status,
    generatedAt: new Date().toISOString(),
    cached: false,
  };

  // 4. Cache the result
  await cacheAnalysis(ctx.submissionId, report);

  return report;
};
