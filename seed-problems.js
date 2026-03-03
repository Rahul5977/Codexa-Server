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
    ],
    hiddenTestcases: [
      {
        input: { nums: [-1, -2, -3, -4, -5], target: -8 },
        output: [2, 4],
      },
      {
        input: { nums: [1, 2, 3, 4, 5, 6, 7, 8, 9], target: 17 },
        output: [7, 8],
      },
      {
        input: { nums: [0, 4, 3, 0], target: 0 },
        output: [0, 3],
      },
    ],
    // Function metadata for code execution
    functionName: "twoSum",
    parameters: [
      { name: "nums", type: "int[]" },
      { name: "target", type: "int" }
    ],
    returnType: "int[]",
    codeStubs: {
      python: "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        ",
      java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n    }\n}",
      cpp: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};",
      javascript: "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar twoSum = function(nums, target) {\n    \n};"
    }
  },
  {
    title: "Valid Parentheses",
    difficulty: "EASY",
    statement:
      "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid. An input string is valid if: 1) Open brackets must be closed by the same type of brackets. 2) Open brackets must be closed in the correct order. 3) Every close bracket has a corresponding open bracket of the same type.",
    examples: [
      {
        input: 's = "()"',
        output: "true",
        explanation: "The string contains valid parentheses.",
      },
      {
        input: 's = "()[]{}"',
        output: "true",
        explanation: "All brackets are properly closed in correct order.",
      },
      {
        input: 's = "(]"',
        output: "false",
        explanation: "The brackets are not of the same type.",
      },
    ],
    constraints: ["1 <= s.length <= 10^4", "s consists of parentheses only '()[]{}'."],
    tags: ["String", "Stack"],
    hints: [
      "Use a stack data structure to keep track of opening brackets.",
      "When you encounter a closing bracket, check if it matches the most recent opening bracket.",
      "The string is valid only if the stack is empty at the end.",
    ],
    companies: ["Google", "Amazon", "Microsoft", "Facebook", "Bloomberg"],
    testcases: [
      {
        input: { s: "()" },
        output: true,
      },
      {
        input: { s: "()[]{}" },
        output: true,
      },
      {
        input: { s: "(]" },
        output: false,
      },
    ],
    hiddenTestcases: [
      {
        input: { s: "([)]" },
        output: false,
      },
      {
        input: { s: "{[]}" },
        output: true,
      },
      {
        input: { s: "((((" },
        output: false,
      },
      {
        input: { s: "()()()()" },
        output: true,
      },
    ],
    // Function metadata
    functionName: "isValid",
    parameters: [
      { name: "s", type: "string" }
    ],
    returnType: "boolean",
    codeStubs: {
      python: "class Solution:\n    def isValid(self, s: str) -> bool:\n        ",
      java: "class Solution {\n    public boolean isValid(String s) {\n        \n    }\n}",
      cpp: "class Solution {\npublic:\n    bool isValid(string s) {\n        \n    }\n};",
      javascript: "/**\n * @param {string} s\n * @return {boolean}\n */\nvar isValid = function(s) {\n    \n};"
    }
  },
  {
    title: "Reverse Linked List",
    difficulty: "EASY",
    statement:
      "Given the `head` of a singly linked list, reverse the list, and return the reversed list. A linked list can be reversed either iteratively or recursively.",
    examples: [
      {
        input: "head = [1,2,3,4,5]",
        output: "[5,4,3,2,1]",
        explanation: "The list is reversed.",
      },
      {
        input: "head = [1,2]",
        output: "[2,1]",
        explanation: "The list with two nodes is reversed.",
      },
      {
        input: "head = []",
        output: "[]",
        explanation: "Empty list remains empty.",
      },
    ],
    constraints: [
      "The number of nodes in the list is in the range [0, 5000].",
      "-5000 <= Node.val <= 5000",
    ],
    tags: ["Linked List", "Recursion"],
    hints: [
      "Think about changing the next pointers of each node.",
      "You'll need to keep track of the previous node as you iterate.",
      "For recursion, think about what the base case would be.",
    ],
    companies: ["Amazon", "Microsoft", "Apple", "Facebook", "Adobe"],
    testcases: [
      {
        input: { head: [1, 2, 3, 4, 5] },
        output: [5, 4, 3, 2, 1],
      },
      {
        input: { head: [1, 2] },
        output: [2, 1],
      },
    ],
    hiddenTestcases: [
      {
        input: { head: [] },
        output: [],
      },
      {
        input: { head: [1] },
        output: [1],
      },
      {
        input: { head: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
        output: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
      },
    ],
    // Function metadata
    functionName: "reverseList",
    parameters: [
      { name: "head", type: "ListNode" }
    ],
    returnType: "ListNode",
    codeStubs: {
      python: "# Definition for singly-linked list.\n# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution:\n    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:\n        ",
      java: "/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     int val;\n *     ListNode next;\n *     ListNode() {}\n *     ListNode(int val) { this.val = val; }\n *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n * }\n */\nclass Solution {\n    public ListNode reverseList(ListNode head) {\n        \n    }\n}",
      cpp: "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     ListNode *next;\n *     ListNode() : val(0), next(nullptr) {}\n *     ListNode(int x) : val(x), next(nullptr) {}\n *     ListNode(int x, ListNode *next) : val(x), next(next) {}\n * };\n */\nclass Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        \n    }\n};"
    }
  },
  {
    title: "Maximum Depth of Binary Tree",
    difficulty: "EASY",
    statement:
      "Given the `root` of a binary tree, return its maximum depth. A binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.",
    examples: [
      {
        input: "root = [3,9,20,null,null,15,7]",
        output: "3",
        explanation: "The longest path is 3 -> 20 -> 15 (or 7), which has depth 3.",
      },
      {
        input: "root = [1,null,2]",
        output: "2",
        explanation: "The path is 1 -> 2, which has depth 2.",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [0, 10^4].",
      "-100 <= Node.val <= 100",
    ],
    tags: ["Tree", "Depth-First Search", "Breadth-First Search", "Binary Tree"],
    hints: [
      "Think recursively: the depth of a tree is 1 + max(depth of left subtree, depth of right subtree).",
      "You can also solve this using BFS (level-order traversal).",
      "What is the base case? An empty tree has depth 0.",
    ],
    companies: ["Amazon", "Microsoft", "LinkedIn", "Apple", "Google"],
    testcases: [
      {
        input: { root: [3, 9, 20, null, null, 15, 7] },
        output: 3,
      },
      {
        input: { root: [1, null, 2] },
        output: 2,
      },
    ],
    hiddenTestcases: [
      {
        input: { root: [] },
        output: 0,
      },
      {
        input: { root: [1] },
        output: 1,
      },
      {
        input: { root: [1, 2, 3, 4, 5] },
        output: 3,
      },
    ],
    // Function metadata
    functionName: "maxDepth",
    parameters: [
      { name: "root", type: "TreeNode" }
    ],
    returnType: "int",
    codeStubs: {
      python: "# Definition for a binary tree node.\n# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution:\n    def maxDepth(self, root: Optional[TreeNode]) -> int:\n        ",
      java: "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     int val;\n *     TreeNode left;\n *     TreeNode right;\n *     TreeNode() {}\n *     TreeNode(int val) { this.val = val; }\n *     TreeNode(int val, TreeNode left, TreeNode right) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\nclass Solution {\n    public int maxDepth(TreeNode root) {\n        \n    }\n}",
      cpp: "/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     TreeNode *left;\n *     TreeNode *right;\n *     TreeNode() : val(0), left(nullptr), right(nullptr) {}\n *     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n *     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n * };\n */\nclass Solution {\npublic:\n    int maxDepth(TreeNode* root) {\n        \n    }\n};"
    }
  },
  {
    title: "Climbing Stairs",
    difficulty: "EASY",
    statement:
      "You are climbing a staircase. It takes `n` steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
    examples: [
      {
        input: "n = 2",
        output: "2",
        explanation: "There are two ways to climb to the top: 1) 1 step + 1 step, 2) 2 steps.",
      },
      {
        input: "n = 3",
        output: "3",
        explanation: "There are three ways: 1) 1 step + 1 step + 1 step, 2) 1 step + 2 steps, 3) 2 steps + 1 step.",
      },
    ],
    constraints: ["1 <= n <= 45"],
    tags: ["Dynamic Programming", "Math", "Memoization"],
    hints: [
      "To reach step n, you must have come from either step n-1 or step n-2.",
      "This is similar to the Fibonacci sequence.",
      "Think about how you can optimize using memoization or bottom-up DP.",
    ],
    companies: ["Amazon", "Google", "Adobe", "Apple", "Microsoft"],
    testcases: [
      {
        input: { n: 2 },
        output: 2,
      },
      {
        input: { n: 3 },
        output: 3,
      },
    ],
    hiddenTestcases: [
      {
        input: { n: 5 },
        output: 8,
      },
      {
        input: { n: 1 },
        output: 1,
      },
      {
        input: { n: 10 },
        output: 89,
      },
    ],
    // Function metadata
    functionName: "climbStairs",
    parameters: [
      { name: "n", type: "int" }
    ],
    returnType: "int",
    codeStubs: {
      python: "class Solution:\n    def climbStairs(self, n: int) -> int:\n        ",
      java: "class Solution {\n    public int climbStairs(int n) {\n        \n    }\n}",
      cpp: "class Solution {\npublic:\n    int climbStairs(int n) {\n        \n    }\n};",
      javascript: "/**\n * @param {number} n\n * @return {number}\n */\nvar climbStairs = function(n) {\n    \n};"
    }
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
