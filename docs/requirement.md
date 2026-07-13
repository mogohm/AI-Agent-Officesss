# Requirements — AI Agent Office Web Platform (MVP v0.1)

## Concept
A browser-based AI office management platform. **Company = building**,
**department = floor** (max 15/company), each company runs multiple projects
whose workspaces/execution live on a VPS. Cute isometric pixel-art office UI,
management-game feel, but professional and responsive.

## Hard constraints
1. No native mobile app — responsive web only.
2. No external chat apps (Telegram/LINE/Discord). Command Center is in-app.
3. Usable from mobile browsers (touch-friendly, responsive layouts).
4. Backend, AI workers, workspaces, logs, and file generation run on the VPS.
5. Start with **mock** AI agents and **mock** AI model selection.
6. No real OpenAI/Claude API yet.
7. Architecture prepared for OpenAI, Claude, Gemini, Local LLM, Image AI.
8. Architecture prepared for real VPS workspace execution.
9. Clean, modular, scalable, production-friendly code.

## MVP scope delivered
- Company Overview + Company CRUD (building cards).
- Company Building view; dynamic floors from departments; **max 15** enforced;
  badge “สูงสุด 15 แผนก / 15 ชั้น”; B1 VPS floor (not counted).
- Department CRUD; unique floor per company; job description editor; example
  responsibilities; theme color / room style; assigned AI model.
- Mock AI models + rule-based recommendations per department type.
- Agent Directory (CRUD) with statuses and animated life-simulation sprites.
- Project CRUD + lifecycle (start/pause/resume) + Project Detail (overview,
  team, task board, timeline, files, workspace, logs, GitHub placeholder).
- Mock VPS workspace panel + Server Monitor.
- Command Center with mock Thai/English intent parsing + history.
- Realtime-ish Activity Feed (WebSocket + polling fallback).
- Seed data, README, `.env.example`, deployment guide.

## Explicitly NOT in MVP
- Real AI API calls, real shell execution, real GitHub push, authentication/
  multi-tenant separation (a `users` table exists for later).

## Reference option lists
- **Department types:** Lobby/Support, Marketing, Sales, HR, IT/Dev, Design,
  Game Studio, QA/Tester, Data/Research, Finance, Legal, Content, DevOps,
  Product Management, Customer Service.
- **Agent roles:** PM, Business Analyst, System Analyst, Developer, Frontend,
  Backend, Database, UI/UX Designer, Game Designer, QA Tester, DevOps,
  Research, Marketing, Sales, HR, Document.
- **Agent statuses:** idle, thinking, planning, coding, designing, writing,
  reviewing, testing, meeting, waiting, done, error.
- **Project types:** Web App, Mobile App, Game, Dashboard, Automation, Scraper,
  AI Tool, Business System, Report System, Design Project, Document Project.
- **Project statuses:** draft, planning, in_progress, reviewing, testing,
  completed, archived, failed, paused.
