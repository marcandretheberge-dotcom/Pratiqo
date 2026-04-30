@AGENTS.md

# Pratiqo — Project Context for Claude Code
# Claude.md - AI-Assisted Development Configuration

## Purpose
Configuration settings for Claude-based application supporting AI-assisted development workflows across code generation, documentation, data analysis, testing, debugging, and project planning.

## Audience
Personal use for full-stack development (multiple languages).

---

## Core Directives

### 1. Output Format Preferences
- **Default Behavior**: Use mixed/context-dependent formats
  - JSON for structured data and APIs
  - Markdown for documentation and planning
  - Code blocks with appropriate syntax highlighting
  - YAML for configuration files
  - HTML/JSX when building UI components
- **Principle**: Choose the format that best serves the use case; ask if ambiguous

### 2. Code Generation Standards

#### Quality & Approach
- **Priority**: Balanced approach between production-readiness and clarity
  - Code should be functional and deployable, not just theoretical
  - Include comments explaining non-obvious logic, especially architectural decisions
  - Avoid over-engineering; prioritize clarity and maintainability
  - When trade-offs exist, explain the reasoning briefly

#### Naming Conventions
- **Approach**: Mix of framework standards + custom conventions
  - Follow language/framework idioms by default (PEP 8 for Python, camelCase for JS, snake_case for SQL, etc.)
  - When custom conventions are mentioned, apply them consistently
  - Ask for clarification if conventions conflict with best practices

#### Code Organization
- **Structure**: Modular & composable components
  - Design for reusability and independence
  - Minimize coupling between modules
  - Each component should have a single, clear responsibility
  - Make it easy to integrate into existing codebases or use standalone
  - Provide clear interfaces between modules

### 3. Technology Stack
- **Scope**: Full-stack, multiple languages
- **Approach**: No specific languages prioritized
  - Generate best-practices code in any language/framework the user specifies
  - If language choice is ambiguous, ask rather than assume
  - Apply language-specific idioms and conventions

### 4. Documentation & Content
- **Standards**: 
  - Clear, concise Markdown formatting
  - Structure with headers, lists, and code examples
  - Include context and rationale for technical decisions
  - Provide quick-start and reference sections where applicable

### 5. Security & Privacy

#### General Best Practices
- **Data Handling**:
  - Never hardcode secrets, API keys, or credentials
  - Use environment variables for sensitive configuration
  - Implement input validation and sanitization
  - Avoid logging sensitive information (passwords, tokens, PII)
  - Warn the user if generating code that handles sensitive data

- **Code Safety**:
  - Follow OWASP guidelines for web applications
  - Validate and sanitize all external inputs
  - Use prepared statements for database queries
  - Apply principle of least privilege in permissions/access

- **Transparency**:
  - Flag potential security concerns explicitly
  - Suggest secure alternatives when generating code

### 6. Error Handling Philosophy

#### Principle: User-Friendly Messages
- **Error Design**:
  - Errors should be clear and actionable
  - Include what went wrong + how to fix it
  - Avoid cryptic error codes without explanation
  - Provide context about where/why the error occurred

- **Implementation**:
  - Use descriptive error messages in code
  - Include stack traces for debugging (in development mode)
  - Provide fallback graceful degradation where appropriate
  - Log comprehensive details internally while showing user-friendly messages externally

### 7. Testing & Debugging

#### Approach
- Generate test cases alongside main code when relevant
- Include basic error scenarios in tests
- Provide debugging hints and common pitfalls
- Use logging to aid troubleshooting

### 8. Data Analysis & Processing

#### Standards
- Handle data thoughtfully (validate, clean, document assumptions)
- Include performance considerations for large datasets
- Provide clear explanations of analysis results
- Use appropriate visualization suggestions

### 9. Project Planning & Management

#### Guidelines
- Structure plans with clear milestones and dependencies
- Provide realistic time estimates with assumptions
- Break down large tasks into manageable components
- Include risk assessment and mitigation strategies

---

## Usage Notes

- **Clarification**: If any instruction is ambiguous or conflicts with user intent, ask for clarification
- **Context**: Provide reasoning for significant architectural decisions ("the why")
- **Balance**: Prioritize readability and maintainability over cleverness
- **Iteration**: Be ready to refactor or optimize based on feedback

---

## Quick Reference

| Aspect | Preference |
|--------|-----------|
| Output Format | Context-dependent (JSON/Markdown/Code/YAML) |
| Code Quality | Balanced (production-ready + educational) |
| Naming Style | Standard conventions + custom when specified |
| Code Structure | Modular & composable |
| Security Level | General best practices |
| Error Handling | User-friendly messages |
| Documentation | Clear, with reasoning included |
| Testing | Include when relevant |

