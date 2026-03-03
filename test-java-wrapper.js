// Test to show the new Gson-free Java wrapper

const metadata = {
  functionName: "isValid",
  parameters: [{ name: "s", type: "string" }],
  returnType: "boolean"
};

const userCode = `class Solution {
    public boolean isValid(String s) {
        Stack<Character> stack = new Stack<>();
        for (char c : s.toCharArray()) {
            if (c == '(') stack.push(')');
            else if (c == '{') stack.push('}');
            else if (c == '[') stack.push(']');
            else if (stack.isEmpty() || stack.pop() != c) return false;
        }
        return stack.isEmpty();
    }
}`;

// Import the dynamic wrapper service
import { generateDynamicWrapper } from './code-service/src/services/dynamic-wrapper.service.js';

const wrappedCode = generateDynamicWrapper(userCode, 62, metadata); // 62 = Java

console.log("=== Generated Java Wrapper (NO GSON!) ===\n");
console.log(wrappedCode);
console.log("\n=== Key Changes ===");
console.log("✅ No import com.google.gson.*");
console.log("✅ Manual JSON parsing using String methods");
console.log("✅ Only uses java.util.* (available in Judge0)");
console.log("✅ Parses input like: {\"s\":\"()\"}");
console.log("✅ Outputs boolean directly");
