-- =====================================================================
-- AI Agent Office — demo seed (PostgreSQL)
-- ---------------------------------------------------------------------
-- Optional: the backend also seeds automatically on first run (AUTO_SEED).
-- Run after schema.sql:  psql "$DATABASE_URL" -f database/seed.sql
-- Safe to run once on a fresh database.
-- =====================================================================

-- AI models (mock) --------------------------------------------------------
INSERT INTO ai_models (provider, model_name, display_name, description, strengths, weaknesses, best_for,
                       cost_level, speed_level, quality_level, context_length,
                       supports_text, supports_image, supports_code, supports_file, status) VALUES
('openai','gpt-4o','GPT-4o (OpenAI)','Versatile flagship model. Great all-rounder.',
 '["Reasoning","Coding","Writing"]','["Cost at scale"]','["Coding","Marketing","Sales","HR"]',
 'medium','fast','high',128000,TRUE,TRUE,TRUE,TRUE,'mock'),
('anthropic','claude-3-5-sonnet','Claude 3.5 (Anthropic)','Strong reasoning and long-context coding partner.',
 '["Architecture","Long context","Careful reasoning"]','["No native image gen"]','["Coding","QA","Research","HR"]',
 'medium','medium','high',200000,TRUE,FALSE,TRUE,TRUE,'mock'),
('google','gemini-1.5-pro','Gemini 1.5 (Google)','Huge context window, good for research and analysis.',
 '["Massive context","Research","Summarization"]','["Coding depth"]','["Data / Research","Marketing"]',
 'low','fast','high',1000000,TRUE,TRUE,TRUE,TRUE,'mock'),
('local','llama-3-70b','Local LLM (Llama 3)','Self-hosted model for private, offline workloads.',
 '["Privacy","No API cost","Offline"]','["Needs GPU","Lower quality"]','["Coding","Internal tools"]',
 'low','medium','medium',32000,TRUE,FALSE,TRUE,FALSE,'mock'),
('image','image-ai-xl','Image AI (Diffusion XL)','Generates concept art, UI mockups, and game assets.',
 '["Concept art","Assets","Mockups"]','["No text reasoning"]','["Design","Game Studio"]',
 'medium','medium','high',0,FALSE,TRUE,FALSE,FALSE,'mock');

-- Company A: AI Game Studio ----------------------------------------------
INSERT INTO companies (name, emoji, description, theme_color)
VALUES ('AI Game Studio','🎮','A studio building cute idle games with AI teams.','#A98BFF');

INSERT INTO departments (company_id, name, type, floor_number, theme_color, assigned_ai_model_id, responsibilities)
SELECT c.id, d.name, d.type, d.floor, d.color,
       (SELECT id FROM ai_models WHERE provider = d.provider LIMIT 1),
       '["Define scope","Deliver quality","Collaborate"]'
FROM companies c
CROSS JOIN (VALUES
    ('Product Management','Product Management',1,'#5B8CFF','anthropic'),
    ('Engineering','IT / Dev',2,'#5BE49B','anthropic'),
    ('Art & Design','Design',3,'#FF7AC6','image'),
    ('Game Studio','Game Studio',4,'#FFD166','openai'),
    ('Quality','QA / Tester',5,'#3BE8E0','anthropic'),
    ('Growth','Marketing',6,'#FF9F6B','google')
) AS d(name, type, floor, color, provider)
WHERE c.name = 'AI Game Studio';

INSERT INTO agents (company_id, department_id, name, role, avatar, accent, status, animation_state, skills, current_task)
SELECT c.id,
       (SELECT id FROM departments WHERE company_id = c.id AND type = a.dtype LIMIT 1),
       a.name, a.role, a.avatar, a.accent, a.status, a.status, '["Teamwork","AI"]', 'Working on Idle City Builder'
FROM companies c
CROSS JOIN (VALUES
    ('Nova','Project Manager Agent','Product Management','🧑‍💼','#5B8CFF','planning'),
    ('Byte','Backend Developer Agent','IT / Dev','👨‍💻','#5BE49B','coding'),
    ('Pixel','UI/UX Designer Agent','Design','👩‍🎨','#FF7AC6','designing'),
    ('Quest','Game Designer Agent','Game Studio','🕹️','#FFD166','thinking'),
    ('Scout','QA Tester Agent','QA / Tester','🕵️','#3BE8E0','testing'),
    ('Echo','Marketing Agent','Marketing','📣','#FF9F6B','writing')
) AS a(name, role, dtype, avatar, accent, status)
WHERE c.name = 'AI Game Studio';

INSERT INTO projects (company_id, name, description, type, status, priority, progress, workspace_path, vps_status)
SELECT id, 'Idle City Builder','A cozy idle game where AI builds a neon city.','Game','in_progress','high',45,
       '/workspaces/companies/company-1/idle-city-builder','running'
FROM companies WHERE name = 'AI Game Studio';

-- Company B: Neon Labs ----------------------------------------------------
INSERT INTO companies (name, emoji, description, theme_color)
VALUES ('Neon Labs','🧪','Automation & data tools powered by AI agents.','#3BE8E0');

INSERT INTO departments (company_id, name, type, floor_number, theme_color)
SELECT c.id, d.name, d.type, d.floor, d.color
FROM companies c
CROSS JOIN (VALUES
    ('Support','Lobby / Support',1,'#5B8CFF'),
    ('Engineering','IT / Dev',2,'#5BE49B'),
    ('Research','Data / Research',3,'#A98BFF')
) AS d(name, type, floor, color)
WHERE c.name = 'Neon Labs';
