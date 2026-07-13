# Prompt Library (for future real-AI wiring)

These prompts are **not used yet** (MVP is mock). They document how each agent
role and the Command Center intent parser should be prompted once real
providers (OpenAI / Claude / Gemini / Local LLM / Image AI) are connected in
`command_service.py` and a future `ai_gateway.py`.

## Command Center — intent router
System:
> You convert a user's Thai/English office command into a structured action.
> Return JSON: `{ "intent": one of [create_company, create_department,
> create_project, start_dev, design_ui, qa_review, unknown], "name": string,
> "args": object }`. Only output JSON.

The backend then calls the *same* service functions used by the REST API, so
the mock and real paths share one execution layer.

## Role prompts (per agent role)
- **Project Manager Agent** — "You are a PM. Break the goal into a milestone
  plan and assign tasks to the right departments. Output a task list."
- **Business/System Analyst** — "Write clear requirements and acceptance
  criteria from the goal."
- **Developer / Frontend / Backend / Database** — "Implement the described
  feature. Prefer clean, typed, tested code. Explain file changes."
- **UI/UX & Game Designer** — "Propose UI/gameplay concepts and asset lists;
  keep the cute isometric office style."
- **QA Tester** — "Produce a test checklist and report issues with severity."
- **DevOps** — "Prepare build/deploy steps within the safety allowlist."
- **Research / Marketing / Sales / HR / Document** — role-appropriate outputs.

## Model routing (recommendation)
Mirror `api/utils/recommendations.py`:
- IT/Dev → Claude, GPT, Local LLM (coding, architecture, debugging)
- Design → Image AI, GPT (concept art, UI ideas)
- Marketing → GPT, Gemini · Sales → GPT · HR → Claude/GPT
- QA → Claude/GPT · Data/Research → Gemini/Claude/GPT
- Game Studio → GPT, Claude, Image AI

## Safety
All tool/command execution must pass `worker/safety.py` (allowlist + blocklist)
before running. Never pass untrusted text to a shell with `shell=True`.
