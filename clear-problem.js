require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function clearProblems() {
  try {
    console.log("🗑️  Clearing all problems and related data from database...");

    // First delete all submissions (which reference problems)
    const deletedSubmissions = await prisma.submission.deleteMany({});
    console.log(`✅ Deleted ${deletedSubmissions.count} submissions`);

    // Delete assignment_problems (which reference problems)
    const deletedAssignmentProblems = await prisma.assignmentProblem.deleteMany(
      {},
    );
    console.log(
      `✅ Deleted ${deletedAssignmentProblems.count} assignment problems`,
    );

    // Then delete all problems
    const deletedProblems = await prisma.problem.deleteMany({});
    console.log(`✅ Deleted ${deletedProblems.count} problems`);

    // Verify
    const problemCount = await prisma.problem.count();
    const submissionCount = await prisma.submission.count();
    const assignmentProblemCount = await prisma.assignmentProblem.count();
    console.log(`\n📊 Final counts:`);
    console.log(`   Problems: ${problemCount}`);
    console.log(`   Submissions: ${submissionCount}`);
    console.log(`   Assignment Problems: ${assignmentProblemCount}`);
  } catch (error) {
    console.error("❌ Error clearing problems:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    pool.end();
  }
}

clearProblems();
