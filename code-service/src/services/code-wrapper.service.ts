/**
 * Code Wrapper Service
 * Wraps user code with boilerplate for input parsing and output formatting
 * Similar to LeetCode - users only write the solution function
 */

const JAVA_WRAPPER_TWO_SUM = `
import java.util.*;

USER_CODE

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        
        // Read the entire input line
        String input = sc.nextLine();
        
        // Parse: "nums = [2,7,11,15], target = 9"
        String[] parts = input.split(", target = ");
        String numsStr = parts[0].replace("nums = [", "").replace("]", "");
        int target = Integer.parseInt(parts[1]);
        
        // Parse array
        String[] numStrs = numsStr.split(",");
        int[] nums = new int[numStrs.length];
        for (int i = 0; i < numStrs.length; i++) {
            nums[i] = Integer.parseInt(numStrs[i].trim());
        }
        
        // Call user's solution
        Solution sol = new Solution();
        int[] result = sol.twoSum(nums, target);
        
        // Output result
        System.out.println("[" + result[0] + "," + result[1] + "]");
        sc.close();
    }
}
`;

const PYTHON_WRAPPER_TWO_SUM = `
USER_CODE

if __name__ == "__main__":
    import sys
    input_line = sys.stdin.readline().strip()
    
    # Parse: "nums = [2,7,11,15], target = 9"
    parts = input_line.split(", target = ")
    nums_str = parts[0].replace("nums = [", "").replace("]", "")
    target = int(parts[1])
    
    # Parse array
    nums = [int(x.strip()) for x in nums_str.split(",")]
    
    # Call user's solution
    sol = Solution()
    result = sol.twoSum(nums, target)
    
    # Output result
    print(f"[{result[0]},{result[1]}]")
`;

const CPP_WRAPPER_TWO_SUM = `
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

USER_CODE

int main() {
    string input;
    getline(cin, input);
    
    if (input.empty()) {
        return 1;
    }
    
    // Find positions
    size_t numsStart = input.find("[") + 1;
    size_t numsEnd = input.find("]");
    size_t targetStart = input.find("target = ") + 9;
    
    // Extract nums string and target
    string numsStr = input.substr(numsStart, numsEnd - numsStart);
    int target = stoi(input.substr(targetStart));
    
    // Parse array
    vector<int> nums;
    size_t pos = 0;
    while (pos < numsStr.length()) {
        size_t comma = numsStr.find(",", pos);
        if (comma == string::npos) comma = numsStr.length();
        
        string numStr = numsStr.substr(pos, comma - pos);
        // Remove whitespace
        numStr.erase(remove_if(numStr.begin(), numStr.end(), ::isspace), numStr.end());
        if (!numStr.empty()) {
            nums.push_back(stoi(numStr));
        }
        
        pos = comma + 1;
    }
    
    // Call user's solution
    Solution sol;
    vector<int> result = sol.twoSum(nums, target);
    
    // Output result
    cout << "[" << result[0] << "," << result[1] << "]" << endl;
    
    return 0;
}
`;

/**
 * Wraps user code with appropriate boilerplate based on language and problem
 */
export const wrapUserCode = (
  userCode: string,
  languageId: number,
  problemSlug: string = "two-sum"
): string => {
  // For now, we'll hardcode Two Sum wrappers
  // In the future, this should be driven by problem metadata
  
  switch (languageId) {
    case 62: // Java
      return JAVA_WRAPPER_TWO_SUM.replace("USER_CODE", userCode);
    
    case 71: // Python
      return PYTHON_WRAPPER_TWO_SUM.replace("USER_CODE", userCode);
    
    case 54: // C++
      return CPP_WRAPPER_TWO_SUM.replace("USER_CODE", userCode);
    
    // For other languages, return code as-is for now
    default:
      return userCode;
  }
};

/**
 * Check if a language supports code wrapping
 */
export const supportsWrapping = (languageId: number): boolean => {
  return [62, 71, 54].includes(languageId); // Java, Python, C++
};
