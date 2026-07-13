-- =====================================================================
-- AI Agent Office Web Platform — PostgreSQL schema
-- ---------------------------------------------------------------------
-- The FastAPI backend can auto-create these tables via SQLModel, but this
-- file is the source of truth for production DBs and manual provisioning.
-- Run:  psql "$DATABASE_URL" -f database/schema.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS users (
    id           SERIAL PRIMARY KEY,
    email        TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    role         TEXT NOT NULL DEFAULT 'owner',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companies (
    id          SERIAL PRIMARY KEY,
    owner_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    emoji       TEXT NOT NULL DEFAULT '🏢',
    status      TEXT NOT NULL DEFAULT 'active',
    theme_color TEXT NOT NULL DEFAULT '#5B8CFF',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_models (
    id             SERIAL PRIMARY KEY,
    provider       TEXT NOT NULL,
    model_name     TEXT NOT NULL,
    display_name   TEXT NOT NULL,
    description    TEXT NOT NULL DEFAULT '',
    strengths      JSONB NOT NULL DEFAULT '[]',
    weaknesses     JSONB NOT NULL DEFAULT '[]',
    best_for       JSONB NOT NULL DEFAULT '[]',
    cost_level     TEXT NOT NULL DEFAULT 'medium',
    speed_level    TEXT NOT NULL DEFAULT 'medium',
    quality_level  TEXT NOT NULL DEFAULT 'high',
    context_length INTEGER NOT NULL DEFAULT 128000,
    supports_text  BOOLEAN NOT NULL DEFAULT TRUE,
    supports_image BOOLEAN NOT NULL DEFAULT FALSE,
    supports_code  BOOLEAN NOT NULL DEFAULT TRUE,
    supports_file  BOOLEAN NOT NULL DEFAULT FALSE,
    status         TEXT NOT NULL DEFAULT 'mock',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
    id                   SERIAL PRIMARY KEY,
    company_id           INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name                 TEXT NOT NULL,
    type                 TEXT NOT NULL DEFAULT 'IT / Dev',
    floor_number         INTEGER NOT NULL DEFAULT 1,
    job_description      TEXT NOT NULL DEFAULT '',
    responsibilities     JSONB NOT NULL DEFAULT '[]',
    theme_color          TEXT NOT NULL DEFAULT '#5B8CFF',
    room_style           TEXT NOT NULL DEFAULT 'glass-office',
    assigned_ai_model_id INTEGER REFERENCES ai_models(id) ON DELETE SET NULL,
    status               TEXT NOT NULL DEFAULT 'active',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Enforce unique floor per company at the DB level.
    CONSTRAINT uq_department_floor UNIQUE (company_id, floor_number),
    -- Enforce the 1..15 floor range.
    CONSTRAINT ck_department_floor CHECK (floor_number BETWEEN 1 AND 15)
);
CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_id);

CREATE TABLE IF NOT EXISTS agents (
    id                   SERIAL PRIMARY KEY,
    company_id           INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    department_id        INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    assigned_ai_model_id INTEGER REFERENCES ai_models(id) ON DELETE SET NULL,
    name                 TEXT NOT NULL,
    role                 TEXT NOT NULL DEFAULT 'Developer Agent',
    skills               JSONB NOT NULL DEFAULT '[]',
    personality          TEXT NOT NULL DEFAULT '',
    avatar               TEXT NOT NULL DEFAULT '🧑‍💻',
    accent               TEXT NOT NULL DEFAULT '#5B8CFF',
    status               TEXT NOT NULL DEFAULT 'idle',
    current_task         TEXT NOT NULL DEFAULT '',
    animation_state      TEXT NOT NULL DEFAULT 'idle',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agents_company ON agents(company_id);

CREATE TABLE IF NOT EXISTS projects (
    id                     SERIAL PRIMARY KEY,
    company_id             INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name                   TEXT NOT NULL,
    description            TEXT NOT NULL DEFAULT '',
    type                   TEXT NOT NULL DEFAULT 'Web Application',
    status                 TEXT NOT NULL DEFAULT 'draft',
    priority               TEXT NOT NULL DEFAULT 'medium',
    assigned_department_ids JSONB NOT NULL DEFAULT '[]',
    assigned_agent_ids     JSONB NOT NULL DEFAULT '[]',
    workspace_path         TEXT NOT NULL DEFAULT '',
    github_repo_url        TEXT NOT NULL DEFAULT '',
    vps_status             TEXT NOT NULL DEFAULT 'not_provisioned',
    progress               INTEGER NOT NULL DEFAULT 0,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);

CREATE TABLE IF NOT EXISTS tasks (
    id                SERIAL PRIMARY KEY,
    project_id        INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title             TEXT NOT NULL,
    description       TEXT NOT NULL DEFAULT '',
    status            TEXT NOT NULL DEFAULT 'backlog',
    assignee_agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
    priority          TEXT NOT NULL DEFAULT 'medium',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);

CREATE TABLE IF NOT EXISTS project_files (
    id         SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    path       TEXT NOT NULL,
    kind       TEXT NOT NULL DEFAULT 'file',
    language   TEXT NOT NULL DEFAULT '',
    preview    TEXT NOT NULL DEFAULT '',
    size_bytes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);

CREATE TABLE IF NOT EXISTS activities (
    id            SERIAL PRIMARY KEY,
    company_id    INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    project_id    INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    agent_id      INTEGER REFERENCES agents(id) ON DELETE SET NULL,
    action        TEXT NOT NULL DEFAULT 'system',
    status        TEXT NOT NULL DEFAULT 'info',
    message       TEXT NOT NULL DEFAULT '',
    related_file  TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activities_company ON activities(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_project ON activities(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS vps_workspaces (
    id          SERIAL PRIMARY KEY,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    path        TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'created',
    cpu_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
    memory_mb   INTEGER NOT NULL DEFAULT 0,
    disk_mb     INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commands (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    text            TEXT NOT NULL DEFAULT '',
    detected_intent TEXT NOT NULL DEFAULT '',
    response        TEXT NOT NULL DEFAULT '',
    meta            JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
    id         SERIAL PRIMARY KEY,
    key        TEXT UNIQUE NOT NULL,
    value      TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
