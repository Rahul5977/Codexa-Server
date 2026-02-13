# Project Analysis Plan

## 1. Context Graph

- **Concept:** Treat code as a graph
  - **Nodes:** Files, classes, functions
  - **Edges:** Imports, callbacks
- **Workflow:**
  - Use AST parser to extract relevant subgraphs
  - Filter and build prompts (CONTEXT) from subgraphs

---

## 2. The Architecture: "The Council of Agents"

### Agent 1: The Architect (Orchestrator)

- **Role:** Project Manager
- **Responsibilities:**
  - Break down the repo into tasks
  - Assign tasks to other agents
  - Merge and synthesize reports
- **Example Input:**
  - "Optimize this repo."
  - Task: "Agent 2, check Security. Agent 3, check Performance. I will merge your reports."

### Agent 2: The Security Auditor

- **Role:** The Hacker
- **Persona:** Cyber Security Expert
- **Focus Areas:**
  - SQL Injection
  - Hardcoded Secrets
  - XSS
  - Insecure dependencies
- **Tools:**
  - npm audit
  - Regex-based scanning patterns

### Agent 3: The Performance Profiler

- **Role:** The Speed Demon
- **Persona:** Senior Backend Engineer (Big-O obsessed)
- **Focus Areas:**
  - Nested loops ($O(N^2)$)
  - Memory leaks
  - Unnecessary database queries (N+1 problem)

### Agent 4: The Pedagogical Coach (The Teacher)

- **Role:** The Professor
- **Task:**
  - Translate technical findings into educational content
  - Make recommendations actionable and easy to understand
- **Example Output:**
  - Instead of: "Fix line 40"
  - Say: "Notice how this loop runs inside another loop? That makes it slow. Here is how a HashMap can fix it..."

---

## 3. The "Map-Reduce" Workflow

- **Pattern:** Standard for analyzing large datasets (like repos) with LLMs

### Step 1: Map (Parallel Analysis)

- Orchestrator splits the repo into chunks (e.g., File A, File B, File C)
- Performance Agent analyzes File A
- Security Agent analyzes File B
- Agents run in parallel (async) to save time

### Step 2: Reduce (Synthesis)

- Agents return their individual findings
- Orchestrator looks for patterns and correlations
  - _Example:_ "Security Agent found an issue in User.ts, and Performance Agent found a slow loop in Auth.ts. Both files use the same Database class."
- Orchestrator generates a Final Global Report
