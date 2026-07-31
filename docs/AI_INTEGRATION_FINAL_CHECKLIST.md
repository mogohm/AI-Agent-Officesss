# AI Integration — Final V1 Checklist

Honest status of the AI layer. The office is not a static dashboard: model
selection, department assignment, and agent state are real backend state; task
*execution* is a mock engine and is labeled as simulation in the UI.

## Minimum V1 requirements

| # | Requirement | Status |
|---|---|---|
| 1 | AI model selection connected to real configuration | ✅ model catalog lives in the DB (`ai_models` table, seeded); selection = `PUT /departments/{id} {assigned_ai_model_id}`; persists |
| 2 | Department has assigned/recommended model | ✅ per-dept assignment + `GET /ai-models/recommend?department_type=…` shown in panel 5 |
| 3 | Agent role maps to model capability | ✅ recommendation service maps department type → suitable providers/models; agent visual identity maps role → sprite set |
| 4 | Agent status updated by actual task state | ✅ backend task engine writes `agent.status`; UI polls agents every 15 s |
| 5 | Worker visual state reflects task status | ✅ `stateForAgent`: offline→dim idle, review-family→review pose, work-family→work pose, else idle rotation |
| 6 | Project selection shows which workers are active | ✅ project cards show assigned departments/agents count; `/projects/[id]` page shows detail; tower sprites reflect live status |
| 7 | No fake "AI is working" claims without backend state | ✅ sprites derive only from real `agent.status`; empty floors/companies show honest empty states |
| 8 | Non-implemented execution labeled | ✅ "โหมดจำลอง · simulation" chip on the AI Workers strip; VPS panel labeled "(mock/demo)" |

## AI model / provider configuration

Config source: backend `server/api/config.py` (pydantic-settings, `.env` file).
Frontend never sees provider keys (only `NEXT_PUBLIC_*` vars are exposed).

| Provider | Config source | Env var | Backend availability | Frontend display | If not configured |
|---|---|---|---|---|---|
| OpenAI (GPT) | Settings | `OPENAI_API_KEY` | catalog entry (execution mock) | "GPT (OpenAI)" selectable | selection still works (config-only); execution stays simulation |
| Anthropic (Claude) | Settings | `ANTHROPIC_API_KEY` | catalog entry (execution mock) | "Claude (Anthropic)" | same |
| Google (Gemini) | Settings | `GEMINI_API_KEY` | catalog entry (execution mock) | "Gemini (Google)" | same |
| Local LLM | catalog only | — | catalog entry | "Local LLM" | same |
| Image AI | catalog only | — | catalog entry (image generation used at build-time via the creative worker, not at runtime) | "Image AI" | same |

Provider buttons disable when no catalog model exists for that provider
(`disabled={!has}`), so a trimmed catalog cannot produce broken selections.
Secret handling: keys only in gitignored `.env.local`; templates empty; bundle
scanned clean. Logs may only state key presence yes/no (never values).

## Task flow (V1)

```
Project (create/start via API or Command Center)
  → Department(s) assigned (assigned_department_ids)
    → Agent(s) in those departments (assigned_agent_ids)
      → Department's assigned AI model (assigned_ai_model_id)
        → Task engine (MOCK) advances tasks + sets agent.status
          → Bright tower polls agents (15 s) → sprite state
```

Example verified: agent "status=coding" renders the coding sprite on its
department floor; "offline" renders the dimmed idle sprite.

## Missing AI backend items (V2)

- Real provider execution (OpenAI/Anthropic/Gemini calls) behind the existing
  task-engine interface — the interface is in place; swap mock for real runner.
- Live push (WebSocket `/ws/activities` exists for activity feed; agent status
  could move from polling to push).
- Per-agent model override (currently model is per-department).
