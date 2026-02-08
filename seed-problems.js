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

const problems = [
  {
    title: "Two Sum",
    difficulty: "EASY",
    statement:
      "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.",
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
        explanation: "Because nums[1] + nums[2] == 6, we return [1, 2].",
      },
      {
        input: "nums = [3,3], target = 6",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 6, we return [0, 1].",
      },
    ],
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists.",
    ],
    tags: ["Array", "Hash Table"],
    hints: [
      "A really brute force way would be to search for all possible pairs of numbers but that would be too slow. Again, it's best to try out brute force solutions for just for completeness. It is from these brute force solutions that you can come up with optimizations.",
      "So, if we fix one of the numbers, say x, we have to scan the entire array to find the next number y which is value - x where value is the input parameter. Can we change our array somehow so that this search becomes faster?",
      "The second train of thought is, without changing the array, can we use additional space somehow? Like maybe a hash map to speed up the search?",
    ],
    companies: ["Google", "Amazon", "Microsoft", "Facebook", "Apple"],
    testcases: [
      {
        input: { nums: [2, 7, 11, 15], target: 9 },
        output: [0, 1],
      },
      {
        input: { nums: [3, 2, 4], target: 6 },
        output: [1, 2],
      },
      {
        input: { nums: [3, 3], target: 6 },
        output: [0, 1],
      },
      {
        input: { nums: [-1, -2, -3, -4, -5], target: -8 },
        output: [2, 4],
      },
    ],
  },
  {
    title: "Best Time to Buy and Sell Stock",
    difficulty: "EASY",
    statement:
      "You are given an array `prices` where `prices[i]` is the price of a given stock on the `i`th day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock. Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return `0`.",
    examples: [
      {
        input: "prices = [7,1,5,3,6,4]",
        output: "5",
        explanation:
          "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5. Note that buying on day 2 and selling on day 1 is not allowed because you must buy before you sell.",
      },
      {
        input: "prices = [7,6,4,3,1]",
        output: "0",
        explanation:
          "In this case, no transactions are done and the max profit = 0.",
      },
    ],
    constraints: ["1 <= prices.length <= 10^5", "0 <= prices[i] <= 10^4"],
    tags: ["Array", "Dynamic Programming"],
    hints: [
      "Think about how you would track the minimum price seen so far.",
      "At each step, calculate the profit if you were to sell at the current price.",
    ],
    companies: ["Amazon", "Microsoft", "Bloomberg", "Facebook", "Apple"],
    testcases: [
      {
        input: { prices: [7, 1, 5, 3, 6, 4] },
        output: 5,
      },
      {
        input: { prices: [7, 6, 4, 3, 1] },
        output: 0,
      },
      {
        input: { prices: [2, 4, 1] },
        output: 2,
      },
      {
        input: { prices: [3, 2, 6, 5, 0, 3] },
        output: 4,
      },
    ],
  },
  {
    title: "Contains Duplicate",
    difficulty: "EASY",
    statement:
      "Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.",
    examples: [
      {
        input: "nums = [1,2,3,1]",
        output: "true",
        explanation: "The element 1 appears at index 0 and 3.",
      },
      {
        input: "nums = [1,2,3,4]",
        output: "false",
        explanation: "All elements are distinct.",
      },
      {
        input: "nums = [1,1,1,3,3,4,3,2,4,2]",
        output: "true",
        explanation: "Multiple elements appear more than once.",
      },
    ],
    constraints: ["1 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
    tags: ["Array", "Hash Table", "Sorting"],
    hints: [
      "Think about using a Set data structure.",
      "Can you solve it in O(n) time complexity?",
    ],
    companies: ["Amazon", "Apple", "Adobe", "Yahoo"],
    testcases: [
      {
        input: { nums: [1, 2, 3, 1] },
        output: true,
      },
      {
        input: { nums: [1, 2, 3, 4] },
        output: false,
      },
      {
        input: { nums: [1, 1, 1, 3, 3, 4, 3, 2, 4, 2] },
        output: true,
      },
    ],
  },
  {
    title: "Product of Array Except Self",
    difficulty: "MEDIUM",
    statement:
      "Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`. The product of any prefix or suffix of `nums` is guaranteed to fit in a 32-bit integer. You must write an algorithm that runs in O(n) time and without using the division operation.",
    examples: [
      {
        input: "nums = [1,2,3,4]",
        output: "[24,12,8,6]",
        explanation:
          "answer[0] = 2*3*4 = 24, answer[1] = 1*3*4 = 12, answer[2] = 1*2*4 = 8, answer[3] = 1*2*3 = 6",
      },
      {
        input: "nums = [-1,1,0,-3,3]",
        output: "[0,0,9,0,0]",
        explanation: "The product of all elements except 0 results in 0.",
      },
    ],
    constraints: [
      "2 <= nums.length <= 10^5",
      "-30 <= nums[i] <= 30",
      "The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.",
    ],
    tags: ["Array", "Prefix Sum"],
    hints: [
      "Think about how you can compute the product of all elements to the left and right of each index.",
      "Can you do it without using division and in O(1) extra space (excluding the output array)?",
    ],
    companies: ["Amazon", "Microsoft", "Facebook", "Apple", "Lyft"],
    testcases: [
      {
        input: { nums: [1, 2, 3, 4] },
        output: [24, 12, 8, 6],
      },
      {
        input: { nums: [-1, 1, 0, -3, 3] },
        output: [0, 0, 9, 0, 0],
      },
      {
        input: { nums: [2, 3] },
        output: [3, 2],
      },
    ],
  },
  {
    title: "Maximum Subarray",
    difficulty: "MEDIUM",
    statement:
      "Given an integer array `nums`, find the subarray with the largest sum, and return its sum. A subarray is a contiguous non-empty sequence of elements within an array.",
    examples: [
      {
        input: "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        output: "6",
        explanation: "The subarray [4,-1,2,1] has the largest sum 6.",
      },
      {
        input: "nums = [1]",
        output: "1",
        explanation: "The subarray [1] has the largest sum 1.",
      },
      {
        input: "nums = [5,4,-1,7,8]",
        output: "23",
        explanation: "The subarray [5,4,-1,7,8] has the largest sum 23.",
      },
    ],
    constraints: ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
    tags: ["Array", "Dynamic Programming", "Divide and Conquer"],
    hints: [
      "Think about Kadane's Algorithm.",
      "At each position, you need to decide whether to extend the existing subarray or start a new one.",
    ],
    companies: ["Amazon", "Microsoft", "LinkedIn", "Bloomberg", "Adobe"],
    testcases: [
      {
        input: { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] },
        output: 6,
      },
      {
        input: { nums: [1] },
        output: 1,
      },
      {
        input: { nums: [5, 4, -1, 7, 8] },
        output: 23,
      },
      {
        input: { nums: [-1, -2, -3] },
        output: -1,
      },
    ],
  },
];

async function seedProblems() {
  try {
    console.log("🌱 Seeding problems...");

    for (const problem of problems) {
      const created = await prisma.problem.create({
        data: problem,
      });
      console.log(`✅ Created: ${created.title} (${created.difficulty})`);
    }

    console.log("\n🎉 Successfully seeded 5 DSA Array problems!");

    // Verify
    const count = await prisma.problem.count();
    console.log(`📊 Total problems in database: ${count}`);
  } catch (error) {
    console.error("❌ Error seeding problems:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    pool.end();
  }
}

seedProblems();
