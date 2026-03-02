#!/bin/bash

# Code Execution Service Test Suite
# This script tests various scenarios of the code execution API

API_URL="http://localhost:8003"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Code Execution Service Test Suite${NC}"
echo -e "${BLUE}================================${NC}\n"

# Test 1: Simple Python execution
echo -e "${BLUE}Test 1: Simple Python calculation${NC}"
curl -s -X POST "$API_URL/submissions/run" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(5 + 3)",
    "languageId": 71
  }' | jq '.'
echo -e "\n"

# Test 2: Python with stdin
echo -e "${BLUE}Test 2: Python with stdin input${NC}"
curl -s -X POST "$API_URL/submissions/run" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "name = input()\nprint(f\"Hello, {name}!\")",
    "languageId": 71,
    "stdin": "Codexa"
  }' | jq '.'
echo -e "\n"

# Test 3: C++ execution
echo -e "${BLUE}Test 3: C++ Hello World${NC}"
curl -s -X POST "$API_URL/submissions/run" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "#include <iostream>\nusing namespace std;\nint main() {\n    cout << \"Hello from C++!\" << endl;\n    return 0;\n}",
    "languageId": 54
  }' | jq '.'
echo -e "\n"

# Test 4: JavaScript execution
echo -e "${BLUE}Test 4: JavaScript execution${NC}"
curl -s -X POST "$API_URL/submissions/run" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const arr = [1, 2, 3, 4, 5];\nconst sum = arr.reduce((a, b) => a + b, 0);\nconsole.log(`Sum: ${sum}`);",
    "languageId": 63
  }' | jq '.'
echo -e "\n"

# Test 5: Runtime error
echo -e "${BLUE}Test 5: Runtime error handling${NC}"
curl -s -X POST "$API_URL/submissions/run" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(undefined_variable)",
    "languageId": 71
  }' | jq '.'
echo -e "\n"

# Test 6: Compilation error (C++)
echo -e "${BLUE}Test 6: Compilation error (C++)${NC}"
curl -s -X POST "$API_URL/submissions/run" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "#include <iostream>\nint main() {\n    std::cout << \"Missing semicolon\"\n    return 0;\n}",
    "languageId": 54
  }' | jq '.'
echo -e "\n"

# Test 7: Python loops and logic
echo -e "${BLUE}Test 7: Python loops and logic${NC}"
curl -s -X POST "$API_URL/submissions/run" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n\nfor i in range(10):\n    print(fibonacci(i), end=\" \")\nprint()",
    "languageId": 71
  }' | jq '.'
echo -e "\n"

# Test 8: Java Hello World
echo -e "${BLUE}Test 8: Java Hello World${NC}"
curl -s -X POST "$API_URL/submissions/run" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello from Java!\");\n    }\n}",
    "languageId": 62
  }' | jq '.'
echo -e "\n"

# Test 9: Multiple inputs (Python)
echo -e "${BLUE}Test 9: Multiple line inputs (Python)${NC}"
curl -s -X POST "$API_URL/submissions/run" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "a = int(input())\nb = int(input())\nprint(f\"{a} + {b} = {a+b}\")",
    "languageId": 71,
    "stdin": "5\n3"
  }' | jq '.'
echo -e "\n"

# Test 10: Go execution
echo -e "${BLUE}Test 10: Go execution${NC}"
curl -s -X POST "$API_URL/submissions/run" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "package main\nimport \"fmt\"\nfunc main() {\n    fmt.Println(\"Hello from Go!\")\n}",
    "languageId": 60
  }' | jq '.'
echo -e "\n"

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}All tests completed!${NC}"
echo -e "${GREEN}================================${NC}"
