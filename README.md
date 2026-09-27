# FlowForge

A full-stack job scheduling and execution platform for creating, running, monitoring, and debugging background jobs.

FlowForge combines job management, interval-based scheduling, execution history, retry workflows, and AI-assisted failure analysis in a single developer-focused dashboard.

## Features

### Job Management

- Create, edit, activate, deactivate, and delete jobs
- Configure manual or interval-based execution
- Store job commands and descriptions
- Search and manage jobs through a React dashboard

### Job Execution

- Run active jobs manually
- Automatically execute interval-based jobs
- Track execution states:
  - PENDING
  - RUNNING
  - SUCCESS
  - FAILED
- Record execution duration and exit codes
- Capture command output and error information

### Execution History

- View execution history across all jobs
- Filter runs by execution status
- Inspect individual execution details
- Review stdout/stderr logs
- Track retry relationships between runs

### Retry Workflow

Failed executions can be retried directly from the dashboard.

FlowForge creates a new execution record for every retry and links it to the original failed run, preserving execution history rather than overwriting previous results.

### AI Failure Assistant

FlowForge integrates the OpenAI API to help analyze failed job executions.

For failed runs, the AI assistant can provide:

- A failure summary
- The likely cause
- A technical explanation
- Suggested fixes
- A retry recommendation

AI analyses are stored in PostgreSQL so previously generated diagnostics can be loaded again without requiring another API request.

Execution logs are treated as untrusted input and are supplied to the AI only as diagnostic context.

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- Axios
- Nginx

### Backend

- Node.js
- Express.js
- TypeScript
- PostgreSQL
- `pg`
- Zod
- JSON Web Tokens
- bcrypt
- OpenAI API

### Testing and DevOps

- Vitest
- Supertest
- Docker
- Docker Compose
- GitHub Actions

## Architecture

```text
┌─────────────────────┐
│   React Frontend    │
│    TypeScript       │
└──────────┬──────────┘
           │ HTTP / REST
           ▼
┌─────────────────────┐
│   Express Backend   │
│    TypeScript       │
├─────────────────────┤
│ Authentication      │
│ Job Management      │
│ Job Execution       │
│ Scheduler           │
│ AI Failure Service  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│     PostgreSQL      │
├─────────────────────┤
│ users               │
│ jobs                │
│ job_runs            │
│ job_run_analyses    │
└─────────────────────┘

Failed execution
       │
       ▼
┌─────────────────────┐
│     OpenAI API      │
│ Failure Analysis    │
└─────────────────────┘