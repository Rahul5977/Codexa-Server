/**
 * Dynamic Code Wrapper Service
 * Generates wrapper code dynamically based on problem metadata
 * Supports multiple data types and languages
 */

interface Parameter {
  name: string;
  type: string;
}

interface ProblemMetadata {
  functionName: string;
  parameters: Parameter[];
  returnType: string;
}

/**
 * Type mapping for JSON deserialization
 */
const TYPE_PARSERS = {
  python: {
    'int': 'int(INPUT)',
    'long': 'int(INPUT)',
    'float': 'float(INPUT)',
    'double': 'float(INPUT)',
    'boolean': 'bool(INPUT)',
    'string': 'str(INPUT)',
    'int[]': 'INPUT',  // Already a list from JSON
    'string[]': 'INPUT',
    'boolean[]': 'INPUT',
    'int[][]': 'INPUT',
    'string[][]': 'INPUT',
  },
  java: {
    'int': 'INPUT.getAsInt()',
    'long': 'INPUT.getAsLong()',
    'float': 'INPUT.getAsFloat()',
    'double': 'INPUT.getAsDouble()',
    'boolean': 'INPUT.getAsBoolean()',
    'string': 'INPUT.getAsString()',
  },
  cpp: {
    'int': 'INPUT.get<int>()',
    'long': 'INPUT.get<long>()',
    'float': 'INPUT.get<float>()',
    'double': 'INPUT.get<double>()',
    'boolean': 'INPUT.get<bool>()',
    'string': 'INPUT.get<std::string>()',
  }
};

/**
 * Generate Python wrapper
 */
function generatePythonWrapper(metadata: ProblemMetadata, userCode: string): string {
  const { functionName, parameters, returnType } = metadata;
  
  // Build parameter parsing
  const paramParsing = parameters.map(param => {
    const parseLogic = TYPE_PARSERS.python[param.type as keyof typeof TYPE_PARSERS.python] || 'INPUT';
    return `    ${param.name} = test_input['${param.name}']`;
  }).join('\n');
  
  // Build function call
  const paramNames = parameters.map(p => p.name).join(', ');
  
  return `import json
import sys
from typing import List, Optional

${userCode}

if __name__ == "__main__":
    test_input = json.loads(sys.stdin.read())
    
${paramParsing}
    
    solution = Solution()
    result = solution.${functionName}(${paramNames})
    
    print(json.dumps(result))
`;
}

/**
 * Generate Java wrapper
 */
function generateJavaWrapper(metadata: ProblemMetadata, userCode: string): string {
  const { functionName, parameters, returnType } = metadata;
  
  // Check if we need ListNode or TreeNode definitions
  const needsListNode = parameters.some(p => p.type === 'ListNode') || returnType === 'ListNode';
  const needsTreeNode = parameters.some(p => p.type === 'TreeNode') || returnType === 'TreeNode';
  
  // Build parameter extraction using manual JSON parsing
  const paramParsing = parameters.map(param => {
    const javaType = mapToJavaType(param.type);
    return `        ${javaType} ${param.name} = parseInput_${param.name}(input);`;
  }).join('\n');
  
  // Build parse helper methods (no Gson)
  const parseHelpers = parameters.map(param => 
    generateJavaParseHelper(param)
  ).join('\n\n');
  
  const paramNames = parameters.map(p => p.name).join(', ');
  const resultOutput = generateJavaOutputLogic(returnType);
  
  // Include custom class definitions if needed
  let customClasses = '';
  if (needsListNode) {
    customClasses += `
// Definition for singly-linked list
class ListNode {
    int val;
    ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

`;
  }
  if (needsTreeNode) {
    customClasses += `
// Definition for a binary tree node
class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

`;
  }
  
  return `import java.util.*;

${customClasses}${userCode}

public class Main {
    
${parseHelpers}
    
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String input = sc.nextLine();
        
${paramParsing}
        
        Solution solution = new Solution();
        ${returnType === 'void' ? '' : `${mapToJavaType(returnType)} result = `}solution.${functionName}(${paramNames});
        
        ${resultOutput}
    }
}`;
}

/**
 * Generate C++ wrapper
 */
function generateCppWrapper(metadata: ProblemMetadata, userCode: string): string {
  const { functionName, parameters, returnType } = metadata;
  
  // Build parameter parsing with manual JSON parsing
  const paramParsing = parameters.map(param => {
    const cppType = mapToCppType(param.type);
    return `    ${cppType} ${param.name} = parseInput_${param.name}(input);`;
  }).join('\n');
  
  // Build parse helper methods (no nlohmann/json)
  const parseHelpers = parameters.map(param => 
    generateCppParseHelper(param)
  ).join('\n\n');
  
  const paramNames = parameters.map(p => p.name).join(', ');
  const resultOutput = generateCppOutputLogic(returnType);
  
  return `#include <iostream>
#include <vector>
#include <string>
#include <sstream>
using namespace std;

${userCode}

${parseHelpers}

int main() {
    string input;
    getline(cin, input);
    
${paramParsing}
    
    Solution solution;
    ${returnType === 'void' ? '' : mapToCppType(returnType) + ' result = '}solution.${functionName}(${paramNames});
    
    ${resultOutput}
    return 0;
}`;
}

/**
 * Helper: Map types to Java types
 */
function mapToJavaType(type: string): string {
  const typeMap: Record<string, string> = {
    'int': 'int',
    'long': 'long',
    'float': 'float',
    'double': 'double',
    'boolean': 'boolean',
    'string': 'String',
    'int[]': 'int[]',
    'string[]': 'String[]',
    'int[][]': 'int[][]',
    'ListNode': 'ListNode',
    'TreeNode': 'TreeNode',
  };
  return typeMap[type] || type;
}

/**
 * Helper: Generate Java parse helper for a parameter
 */
function generateJavaParseHelper(param: Parameter): string {
  const { name, type } = param;
  
  if (type === 'int') {
    return `    private static int parseInput_${name}(String json) {
        String key = "\\"${name}\\":";
        int startIdx = json.indexOf(key) + key.length();
        int endIdx = json.indexOf(",", startIdx);
        if (endIdx == -1) endIdx = json.indexOf("}", startIdx);
        return Integer.parseInt(json.substring(startIdx, endIdx).trim());
    }`;
  }
  
  if (type === 'string') {
    return `    private static String parseInput_${name}(String json) {
        String key = "\\"${name}\\":";
        int startIdx = json.indexOf(key) + key.length();
        int firstQuote = json.indexOf("\\"", startIdx);
        int secondQuote = json.indexOf("\\"", firstQuote + 1);
        return json.substring(firstQuote + 1, secondQuote);
    }`;
  }
  
  if (type === 'boolean') {
    return `    private static boolean parseInput_${name}(String json) {
        String key = "\\"${name}\\":";
        int startIdx = json.indexOf(key) + key.length();
        int endIdx = json.indexOf(",", startIdx);
        if (endIdx == -1) endIdx = json.indexOf("}", startIdx);
        return Boolean.parseBoolean(json.substring(startIdx, endIdx).trim());
    }`;
  }
  
  if (type === 'int[]') {
    return `    private static int[] parseInput_${name}(String json) {
        String key = "\\"${name}\\":";
        int startIdx = json.indexOf(key) + key.length();
        int arrStart = json.indexOf("[", startIdx);
        int arrEnd = json.indexOf("]", arrStart);
        String arrContent = json.substring(arrStart + 1, arrEnd).trim();
        
        if (arrContent.isEmpty()) return new int[0];
        
        String[] parts = arrContent.split(",");
        int[] result = new int[parts.length];
        for (int i = 0; i < parts.length; i++) {
            result[i] = Integer.parseInt(parts[i].trim());
        }
        return result;
    }`;
  }
  
  if (type === 'string[]') {
    return `    private static String[] parseInput_${name}(String json) {
        String key = "\\"${name}\\":";
        int startIdx = json.indexOf(key) + key.length();
        int arrStart = json.indexOf("[", startIdx);
        int arrEnd = json.indexOf("]", arrStart);
        String arrContent = json.substring(arrStart + 1, arrEnd);
        
        if (arrContent.trim().isEmpty()) return new String[0];
        
        List<String> result = new ArrayList<>();
        int i = 0;
        while (i < arrContent.length()) {
            if (arrContent.charAt(i) == '\\"') {
                int endQuote = arrContent.indexOf('\\"', i + 1);
                result.add(arrContent.substring(i + 1, endQuote));
                i = endQuote + 1;
            } else {
                i++;
            }
        }
        return result.toArray(new String[0]);
    }`;
  }
  
  if (type === 'ListNode') {
    return `    private static ListNode parseInput_${name}(String json) {
        String key = "\\"${name}\\":";
        int startIdx = json.indexOf(key) + key.length();
        int arrStart = json.indexOf("[", startIdx);
        int arrEnd = json.indexOf("]", arrStart);
        String arrContent = json.substring(arrStart + 1, arrEnd).trim();
        
        if (arrContent.isEmpty()) return null;
        
        String[] parts = arrContent.split(",");
        ListNode dummy = new ListNode(0);
        ListNode current = dummy;
        
        for (String part : parts) {
            current.next = new ListNode(Integer.parseInt(part.trim()));
            current = current.next;
        }
        
        return dummy.next;
    }`;
  }
  
  if (type === 'TreeNode') {
    return `    private static TreeNode parseInput_${name}(String json) {
        String key = "\\"${name}\\":";
        int startIdx = json.indexOf(key) + key.length();
        int arrStart = json.indexOf("[", startIdx);
        int arrEnd = json.indexOf("]", arrStart);
        String arrContent = json.substring(arrStart + 1, arrEnd);
        
        if (arrContent.trim().isEmpty()) return null;
        
        String[] parts = arrContent.split(",");
        List<String> values = new ArrayList<>();
        for (String part : parts) {
            values.add(part.trim());
        }
        
        return buildTree(values);
    }
    
    private static TreeNode buildTree(List<String> values) {
        if (values.isEmpty() || values.get(0).equals("null")) return null;
        
        TreeNode root = new TreeNode(Integer.parseInt(values.get(0)));
        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);
        int i = 1;
        
        while (!queue.isEmpty() && i < values.size()) {
            TreeNode node = queue.poll();
            
            if (i < values.size() && !values.get(i).equals("null")) {
                node.left = new TreeNode(Integer.parseInt(values.get(i)));
                queue.offer(node.left);
            }
            i++;
            
            if (i < values.size() && !values.get(i).equals("null")) {
                node.right = new TreeNode(Integer.parseInt(values.get(i)));
                queue.offer(node.right);
            }
            i++;
        }
        
        return root;
    }`;
  }
  
  // Default: return simple integer parsing
  return `    private static int parseInput_${name}(String json) {
        String key = "\\"${name}\\":";
        int startIdx = json.indexOf(key) + key.length();
        int endIdx = json.indexOf(",", startIdx);
        if (endIdx == -1) endIdx = json.indexOf("}", startIdx);
        return Integer.parseInt(json.substring(startIdx, endIdx).trim());
    }`;
}

/**
 * Helper: Generate C++ parse helper
 */
function generateCppParseHelper(param: Parameter): string {
  const { name, type } = param;
  
  if (type === 'int') {
    return `int parseInput_${name}(const string& json) {
    string key = "\\"${name}\\":";
    size_t startIdx = json.find(key) + key.length();
    size_t endIdx = json.find(",", startIdx);
    if (endIdx == string::npos) endIdx = json.find("}", startIdx);
    return stoi(json.substr(startIdx, endIdx - startIdx));
}`;
  }
  
  if (type === 'string') {
    return `string parseInput_${name}(const string& json) {
    string key = "\\"${name}\\":";
    size_t startIdx = json.find(key) + key.length();
    size_t firstQuote = json.find("\\"", startIdx);
    size_t secondQuote = json.find("\\"", firstQuote + 1);
    return json.substr(firstQuote + 1, secondQuote - firstQuote - 1);
}`;
  }
  
  if (type === 'boolean') {
    return `bool parseInput_${name}(const string& json) {
    string key = "\\"${name}\\":";
    size_t startIdx = json.find(key) + key.length();
    return json.find("true", startIdx) < json.find(",", startIdx) || 
           json.find("true", startIdx) < json.find("}", startIdx);
}`;
  }
  
  if (type === 'int[]') {
    return `vector<int> parseInput_${name}(const string& json) {
    string key = "\\"${name}\\":";
    size_t startIdx = json.find(key) + key.length();
    size_t arrStart = json.find("[", startIdx);
    size_t arrEnd = json.find("]", arrStart);
    string arrContent = json.substr(arrStart + 1, arrEnd - arrStart - 1);
    
    vector<int> result;
    if (arrContent.empty()) return result;
    
    stringstream ss(arrContent);
    string token;
    while (getline(ss, token, ',')) {
        result.push_back(stoi(token));
    }
    return result;
}`;
  }
  
  if (type === 'string[]') {
    return `vector<string> parseInput_${name}(const string& json) {
    string key = "\\"${name}\\":";
    size_t startIdx = json.find(key) + key.length();
    size_t arrStart = json.find("[", startIdx);
    size_t arrEnd = json.find("]", arrStart);
    string arrContent = json.substr(arrStart + 1, arrEnd - arrStart - 1);
    
    vector<string> result;
    size_t i = 0;
    while (i < arrContent.length()) {
        if (arrContent[i] == '\\"') {
            size_t endQuote = arrContent.find('\\"', i + 1);
            result.push_back(arrContent.substr(i + 1, endQuote - i - 1));
            i = endQuote + 1;
        } else {
            i++;
        }
    }
    return result;
}`;
  }
  
  return `int parseInput_${name}(const string& json) {
    string key = "\\"${name}\\":";
    size_t startIdx = json.find(key) + key.length();
    size_t endIdx = json.find(",", startIdx);
    if (endIdx == string::npos) endIdx = json.find("}", startIdx);
    return stoi(json.substr(startIdx, endIdx - startIdx));
}`;
}

/**
 * Helper: Generate output logic for Java
 */
function generateJavaOutputLogic(returnType: string): string {
  if (returnType === 'void') {
    return '';
  }
  
  if (returnType === 'int[]') {
    return `StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < result.length; i++) {
            sb.append(result[i]);
            if (i < result.length - 1) sb.append(",");
        }
        sb.append("]");
        System.out.println(sb.toString());`;
  }
  
  if (returnType === 'string[]') {
    return `StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < result.length; i++) {
            sb.append("\\"").append(result[i]).append("\\"");
            if (i < result.length - 1) sb.append(",");
        }
        sb.append("]");
        System.out.println(sb.toString());`;
  }
  
  if (returnType === 'boolean') {
    return 'System.out.println(result);';
  }
  
  if (returnType === 'int' || returnType === 'long') {
    return 'System.out.println(result);';
  }
  
  if (returnType === 'string') {
    return 'System.out.println("\\"" + result + "\\"");';
  }
  
  if (returnType === 'ListNode') {
    return `List<Integer> resultList = new ArrayList<>();
        ListNode current = result;
        while (current != null) {
            resultList.add(current.val);
            current = current.next;
        }
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < resultList.size(); i++) {
            sb.append(resultList.get(i));
            if (i < resultList.size() - 1) sb.append(",");
        }
        sb.append("]");
        System.out.println(sb.toString());`;
  }
  
  if (returnType === 'TreeNode') {
    return `List<String> resultList = new ArrayList<>();
        if (result == null) {
            System.out.println("[]");
        } else {
            Queue<TreeNode> queue = new LinkedList<>();
            queue.offer(result);
            while (!queue.isEmpty()) {
                TreeNode node = queue.poll();
                if (node == null) {
                    resultList.add("null");
                } else {
                    resultList.add(String.valueOf(node.val));
                    queue.offer(node.left);
                    queue.offer(node.right);
                }
            }
            // Remove trailing nulls
            while (!resultList.isEmpty() && resultList.get(resultList.size() - 1).equals("null")) {
                resultList.remove(resultList.size() - 1);
            }
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < resultList.size(); i++) {
                if (resultList.get(i).equals("null")) {
                    sb.append("null");
                } else {
                    sb.append(resultList.get(i));
                }
                if (i < resultList.size() - 1) sb.append(",");
            }
            sb.append("]");
            System.out.println(sb.toString());
        }`;
  }
  
  // Default: print as-is
  return 'System.out.println(result);';
}

/**
 * Helper: Generate output logic for C++
 */
function generateCppOutputLogic(returnType: string): string {
  if (returnType === 'void') {
    return '';
  }
  
  if (returnType === 'int' || returnType === 'long') {
    return 'cout << result << endl;';
  }
  
  if (returnType === 'boolean') {
    return 'cout << (result ? "true" : "false") << endl;';
  }
  
  if (returnType === 'string') {
    return 'cout << "\\"" << result << "\\"" << endl;';
  }
  
  if (returnType === 'int[]') {
    return `cout << "[";
    for (size_t i = 0; i < result.size(); i++) {
        cout << result[i];
        if (i < result.size() - 1) cout << ",";
    }
    cout << "]" << endl;`;
  }
  
  if (returnType === 'string[]') {
    return `cout << "[";
    for (size_t i = 0; i < result.size(); i++) {
        cout << "\\"" << result[i] << "\\"";
        if (i < result.size() - 1) cout << ",";
    }
    cout << "]" << endl;`;
  }
  
  // Default: print as-is
  return 'cout << result << endl;';
}

/**
 * Helper: Map types to C++ types
 */
function mapToCppType(type: string): string {
  const typeMap: Record<string, string> = {
    'int': 'int',
    'long': 'long',
    'float': 'float',
    'double': 'double',
    'boolean': 'bool',
    'string': 'string',
    'int[]': 'vector<int>',
    'string[]': 'vector<string>',
    'int[][]': 'vector<vector<int>>',
  };
  return typeMap[type] || type;
}

/**
 * Main wrapper generation function
 */
export function generateDynamicWrapper(
  userCode: string,
  languageId: number,
  metadata: ProblemMetadata
): string {
  switch (languageId) {
    case 71: // Python
      return generatePythonWrapper(metadata, userCode);
    
    case 62: // Java
      return generateJavaWrapper(metadata, userCode);
    
    case 54: // C++
      return generateCppWrapper(metadata, userCode);
    
    default:
      // For unsupported languages, return code as-is
      return userCode;
  }
}

/**
 * Check if a language supports dynamic wrapping
 */
export function supportsDynamicWrapping(languageId: number): boolean {
  return [71, 62, 54, 63, 74].includes(languageId); // Python, Java, C++, JavaScript, TypeScript
}
