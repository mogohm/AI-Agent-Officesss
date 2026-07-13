# API Spec

Base URL: `http://localhost:8000` (dev). Interactive docs at `/docs`.
All request/response bodies are JSON. Errors return `{ "detail": "..." }`.

## Health & meta
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | Liveness probe |
| GET | `/api/meta/options` | Enum/option lists for dropdowns |
| GET | `/api/server/status` | Mock VPS/server monitor summary |

## Companies
| Method | Path |
| --- | --- |
| GET | `/api/companies` (returns overview w/ counts) |
| POST | `/api/companies` |
| GET | `/api/companies/{id}` |
| PUT | `/api/companies/{id}` |
| DELETE | `/api/companies/{id}` |

## Departments
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/companies/{company_id}/departments` | |
| POST | `/api/companies/{company_id}/departments` | 422 if >15; 409 if floor taken |
| GET | `/api/departments/{id}` | |
| GET | `/api/departments/{id}/usage` | `{agents, projects}` for delete warning |
| PUT | `/api/departments/{id}` | |
| DELETE | `/api/departments/{id}` | detaches agents |

## AI models
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/ai-models` | |
| POST | `/api/ai-models` | |
| PUT | `/api/ai-models/{id}` | |
| DELETE | `/api/ai-models/{id}` | |
| GET | `/api/ai-models/recommend?department_type=IT_DEV` | rule-based |

## Agents
| Method | Path |
| --- | --- |
| GET | `/api/companies/{company_id}/agents` |
| POST | `/api/companies/{company_id}/agents` |
| PUT | `/api/agents/{id}` |
| DELETE | `/api/agents/{id}` |

## Projects
| Method | Path |
| --- | --- |
| GET | `/api/companies/{company_id}/projects` |
| POST | `/api/companies/{company_id}/projects` |
| GET | `/api/projects/{id}` |
| PUT | `/api/projects/{id}` |
| DELETE | `/api/projects/{id}` |
| POST | `/api/projects/{id}/start` |
| POST | `/api/projects/{id}/pause` |
| POST | `/api/projects/{id}/resume` |

## Tasks
| Method | Path |
| --- | --- |
| GET | `/api/projects/{project_id}/tasks` |
| POST | `/api/projects/{project_id}/tasks` |
| PUT | `/api/tasks/{id}` |
| DELETE | `/api/tasks/{id}` |

## Workspace (VPS, mock)
| Method | Path |
| --- | --- |
| POST | `/api/projects/{id}/workspace/create` |
| GET | `/api/projects/{id}/workspace/files` |
| GET | `/api/projects/{id}/workspace/logs` |
| GET | `/api/projects/{id}/workspace/status` |
| POST | `/api/projects/{id}/workspace/run-command` (body `{command}`; safety-checked) |

## Commands (Command Center)
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/commands` | body `{text, company_id?}`; mock intent |
| GET | `/api/commands/history` | |

## Activities
| Method | Path |
| --- | --- |
| GET | `/api/activities?limit=50` |
| GET | `/api/projects/{id}/activities` |
| GET | `/api/companies/{id}/activities` |

## WebSocket
| Path | Payload |
| --- | --- |
| `WS /ws/activities` | global activity events (JSON) |
| `WS /ws/projects/{project_id}` | project-scoped activity events |

### Example: create a company
```bash
curl -X POST http://localhost:8000/api/companies \
  -H 'Content-Type: application/json' \
  -d '{"name":"AI Game Studio","description":"cozy idle games","emoji":"🎮"}'
```

### Example: run a command
```bash
curl -X POST http://localhost:8000/api/commands \
  -H 'Content-Type: application/json' \
  -d '{"text":"สร้างโปรเจกต์เกม idle city builder","company_id":1}'
```
