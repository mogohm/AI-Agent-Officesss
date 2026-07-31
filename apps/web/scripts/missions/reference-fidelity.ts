import "dotenv/config";
import { PrismaClient, type AgentRoleKind } from "@prisma/client";
import { evaluateRqGate } from "@/lib/delivery/gates";

/**
 * Built-in mission template (§26): AI AGENT OFFICE — FINAL REFERENCE FIDELITY.
 *
 * Creates the mission, structured requirements, MEASURABLE acceptance criteria,
 * visual checkpoints (8 routes x 4 viewports), the work-package dependency graph
 * and the quality gates — all as real PostgreSQL rows. Idempotent by mission key.
 *
 * This script only PLANS. Execution requires the orchestrator + worker
 * (phases 2-8), which are not implemented yet.
 */

const KEY = "VISUAL-2026-001";
const REPO = "https://github.com/mogohm/AI-Agent-Officesss.git";

const ROUTES = [
  { key: "dashboard", route: "/dashboard" },
  { key: "companies", route: "/companies" },
  { key: "company-office", route: "/companies/:companyId" },
  { key: "department", route: "/companies/:companyId/departments/:departmentId" },
  { key: "workers", route: "/workers" },
  { key: "projects", route: "/projects" },
  { key: "infrastructure", route: "/infrastructure" },
  { key: "activity", route: "/activity" },
];
const VIEWPORTS = ["1920x1080", "1600x900", "1440x900", "390x844"];

/** The owner's 15 constraints, each with an objectively verifiable measurement. */
const REQUIREMENTS: {
  key: string;
  kind: "FUNCTIONAL" | "VISUAL" | "NON_FUNCTIONAL" | "CONSTRAINT";
  title: string;
  description: string;
  criteria: { key: string; statement: string; measurement: string }[];
}[] = [
  {
    key: "REQ-001", kind: "CONSTRAINT", title: "Database เป็น source of truth",
    description: "ทุกค่าที่แสดงผลต้องมาจากฐานข้อมูล ไม่มีค่าตายตัวใน UI",
    criteria: [{
      key: "AC-001", statement: "ทุกหน้าใน scope อ่านข้อมูลจาก Prisma เท่านั้น",
      measurement: "grep ไม่พบ literal data array ที่ถูก render ในไฟล์ app/(app)/**; ทุกหน้าเรียก lib/data/* อย่างน้อย 1 ครั้ง",
    }],
  },
  {
    key: "REQ-002", kind: "CONSTRAINT", title: "ห้ามใช้ visual mock arrays ใน production",
    description: "ห้ามมี array ปลอมสำหรับตกแต่งใน production component",
    criteria: [{
      key: "AC-002", statement: "ไม่มี mock/fake/placeholder data array ใน production component",
      measurement: "forbidden-pattern scan: `const \\w+ = \\[\\s*\\{` ใน app|components ต้องไม่ใช่ข้อมูลธุรกิจ (allowlist: nav, options, tone maps)",
    }],
  },
  {
    key: "REQ-003", kind: "VISUAL", title: "ตึกบริษัทต้องเห็นเต็มหลัง",
    description: "ภาพตึกบนการ์ดบริษัทต้องเห็นตั้งแต่หลังคาถึงฐาน ไม่ถูก crop",
    criteria: [{
      key: "AC-003", statement: "ภาพตึกใช้ object-fit: contain และฐานตึกไม่ถูกตัด",
      measurement: "computed style ของ img = 'contain'; pixel scan แถวล่างสุด 3% ของกรอบต้องเป็นพื้นหลัง ไม่ใช่ตัวตึก",
    }],
  },
  {
    key: "REQ-004", kind: "VISUAL", title: "บริษัทหลักแต่ละแห่งต้องมีภาพต่างกัน",
    description: "COMPANY A/B/C/D ต้องใช้ภาพตึกคนละแบบ",
    criteria: [{
      key: "AC-004", statement: "การ์ดบริษัทหลัก 4 ใบใช้ไฟล์ภาพไม่ซ้ำกัน",
      measurement: "เก็บ src ของ img ทั้ง 4 การ์ด → new Set(src).size === 4",
    }],
  },
  {
    key: "REQ-005", kind: "VISUAL", title: "Tower ต้องเป็นอาคารเดียว",
    description: "ไม่ใช่ภาพห้องแยกวางต่อกัน ต้องมีเปลือกอาคารร่วม",
    criteria: [{
      key: "AC-005", statement: "ทุกชั้นอยู่ในเปลือกอาคารเดียวกัน ผนังซ้าย/ขวาตรงกัน",
      measurement: "bounding box ซ้าย/ขวาของทุก [data-testid=dept-floor] ต่างกันไม่เกิน 2px; ไม่มีช่องว่างแนวตั้งระหว่างชั้น > 2px",
    }],
  },
  {
    key: "REQ-006", kind: "VISUAL", title: "ทุกชั้นใช้ perspective และ boundary เดียวกัน",
    description: "มุมกล้องและขอบเขตพื้นห้องต้องเป็นมาตรฐานเดียว",
    criteria: [{
      key: "AC-006", statement: "asset ทุกชั้นมี aspect ratio และ camera angle เดียวกัน",
      measurement: "ทุกไฟล์ floor asset มีอัตราส่วนต่างกันไม่เกิน 1%; ความสูงชั้นเท่ากันทุกชั้น (±2px)",
    }],
  },
  {
    key: "REQ-007", kind: "VISUAL", title: "Background ห้ามมีคน",
    description: "ภาพพื้นหลังห้องต้องมีแต่เฟอร์นิเจอร์ ไม่มีคนวาดติดมา",
    criteria: [{
      key: "AC-007", statement: "floor asset ที่ใช้ใน tower ไม่มีรูปคนฝังอยู่",
      measurement: "asset audit manifest ระบุ hasBakedCharacters=false ทุกไฟล์ + ตรวจด้วยสายตาโดย UX agent บันทึกเป็นหลักฐาน",
    }],
  },
  {
    key: "REQ-008", kind: "FUNCTIONAL", title: "Worker ทุกคนต้องมาจากฐานข้อมูล",
    description: "sprite ที่เห็นต้องตรงกับ AIWorker ในฐานข้อมูล",
    criteria: [{
      key: "AC-008", statement: "จำนวน sprite ที่แสดง = จำนวน worker ในฐานข้อมูลของแผนกนั้น",
      measurement: "นับ [data-testid=worker-sprite] ต่อชั้น เทียบกับ COUNT(*) จาก AIWorker WHERE departmentId=... (ตรงกันทุกแผนก)",
    }],
  },
  {
    key: "REQ-009", kind: "VISUAL", title: "Worker sprite ต้องสัมพันธ์กับโต๊ะและเฟอร์นิเจอร์",
    description: "ตัวละครต้องยืน/นั่งตรงตำแหน่งโต๊ะ ไม่ลอย ไม่ทับของ",
    criteria: [{
      key: "AC-009", statement: "sprite วางตรงพิกัดที่นั่งที่กำหนด และเท้าอยู่บนระนาบพื้น",
      measurement: "seat coordinate manifest ต่อ floor type; ตำแหน่ง sprite ต่างจากพิกัดที่นั่งไม่เกิน 8px; ไม่มี 2 sprite ทับกัน > 30%",
    }],
  },
  {
    key: "REQ-010", kind: "VISUAL", title: "Overview เห็นตึกทั้งหมดใน 1920x1080",
    description: "ต้องไม่ต้องเลื่อนจอหลายหน้าจึงจะเห็น B1",
    criteria: [{
      key: "AC-010", statement: "ที่ 1920x1080 เห็นตึกครบทุกชั้นรวม B1 ในหน้าจอเดียว",
      measurement: "bounding box ของ tower ทั้งหมด height <= 830px และอยู่ใน viewport โดยไม่ต้อง scroll",
    }],
  },
  {
    key: "REQ-011", kind: "NON_FUNCTIONAL", title: "หน้าจัดการยังอ่านง่ายและใช้งานจริง",
    description: "ความสวยต้องไม่ทำให้ใช้งานยาก",
    criteria: [{
      key: "AC-011", statement: "ข้อความเนื้อหาไม่เล็กกว่า 11px และ contrast ผ่าน WCAG AA",
      measurement: "computed font-size >= 11px ทุก text node ที่เป็นเนื้อหา; contrast ratio >= 4.5:1 (axe-core ไม่มี violation ระดับ serious/critical)",
    }],
  },
  {
    key: "REQ-012", kind: "NON_FUNCTIONAL", title: "Responsive ผ่าน desktop/tablet/mobile",
    description: "ทุก viewport ต้องใช้งานได้และไม่ล้น",
    criteria: [{
      key: "AC-012", statement: "ทุก viewport ไม่มี horizontal overflow และ office ยังแสดงผล",
      measurement: "document.scrollWidth <= window.innerWidth ทุกหน้า ทุก viewport; ที่ 390x844 ยังพบ tower/sprite (อาจ scroll ภายในได้)",
    }],
  },
  {
    key: "REQ-013", kind: "FUNCTIONAL", title: "CRUD และ authorization เดิมห้ามเสีย",
    description: "ระบบเดิมต้องทำงานได้ครบเหมือนเดิม",
    criteria: [{
      key: "AC-013", statement: "UAT ชุดเดิม 13 scenario ผ่านทั้งหมด และ authz ยังบังคับใช้",
      measurement: "npx playwright test tests/e2e/uat.spec.ts = 13/13 passed; unauthenticated /dashboard redirect ไป /login; no-self-approval ยังบังคับ",
    }],
  },
  {
    key: "REQ-014", kind: "NON_FUNCTIONAL", title: "Browser console ต้องไม่มี error",
    description: "ทุกหน้าใน scope ต้อง console สะอาด",
    criteria: [{
      key: "AC-014", statement: "ไม่มี console error ในทุกหน้าและทุก viewport",
      measurement: "Playwright เก็บ console listener: จำนวน message ระดับ error = 0 ต่อหน้า (8 หน้า x 4 viewport)",
    }],
  },
  {
    key: "REQ-015", kind: "NON_FUNCTIONAL", title: "Critical request ต้องไม่มี network failure",
    description: "ไม่มี request สำคัญที่ล้มเหลว",
    criteria: [{
      key: "AC-015", statement: "ไม่มี response >= 400 ใน request ของหน้าใน scope",
      measurement: "Playwright response listener: จำนวน response status >= 400 (ยกเว้น analytics/3rd-party) = 0",
    }],
  },
  {
    key: "REQ-016", kind: "VISUAL", title: "คะแนน visual ถึงเป้า",
    description: "ต้องผ่านเกณฑ์คุณภาพภาพรวม",
    criteria: [{
      key: "AC-016", statement: "overall visual score >= 95 และไม่มีหมวดใดต่ำกว่า 9/10",
      measurement: "VisualComparison.overallScore >= 95 ทุก required checkpoint และ min(categoryScores) >= 9",
    }],
  },
];

/** Work packages + dependency graph. */
const PACKAGES: { key: string; title: string; role: AgentRoleKind; criterion?: string; deps: string[]; risk: "LOW" | "MEDIUM" | "HIGH" }[] = [
  { key: "WP-001", title: "Asset audit: วัดขนาด/มุมกล้อง/คนฝังในภาพ ของ floor asset ทุกไฟล์", role: "UX_VISUAL", criterion: "AC-007", deps: [], risk: "LOW" },
  { key: "WP-002", title: "สร้าง floor asset มาตรฐาน 1600x600 ไม่มีคน + seat coordinate manifest", role: "ASSET", criterion: "AC-006", deps: ["WP-001"], risk: "HIGH" },
  { key: "WP-003", title: "OfficeTowerShell: เปลือกอาคารเดียว ผนัง/เสา/สแลบ ตรงกันทุกชั้น", role: "FRONTEND_DEV", criterion: "AC-005", deps: ["WP-002"], risk: "HIGH" },
  { key: "WP-004", title: "วาง WorkerSprite ตามพิกัดที่นั่งจริง + ผูกกับ AIWorker จากฐานข้อมูล", role: "FRONTEND_DEV", criterion: "AC-009", deps: ["WP-003"], risk: "MEDIUM" },
  { key: "WP-005", title: "Overview mode ให้ตึกพอดี 1920x1080 + Detail mode + zoom controls", role: "FRONTEND_DEV", criterion: "AC-010", deps: ["WP-003"], risk: "MEDIUM" },
  { key: "WP-006", title: "การ์ดบริษัท: contain เต็มหลัง + ภาพต่างกัน 4 แบบ (Dashboard + Companies)", role: "FRONTEND_DEV", criterion: "AC-003", deps: [], risk: "LOW" },
  { key: "WP-007", title: "หน้าจัดการ: Department/Projects/Infrastructure/Activity ให้แน่นและอ่านง่าย", role: "FRONTEND_DEV", criterion: "AC-011", deps: [], risk: "LOW" },
  { key: "WP-008", title: "Responsive pass 4 viewport + ไม่มี horizontal overflow", role: "FRONTEND_DEV", criterion: "AC-012", deps: ["WP-005", "WP-006", "WP-007"], risk: "MEDIUM" },
  { key: "WP-009", title: "Code review: ตรวจ mock array, regression, security", role: "CODE_REVIEW", criterion: "AC-002", deps: ["WP-004", "WP-006", "WP-007"], risk: "LOW" },
  { key: "WP-010", title: "QA: lint/typecheck/unit/integration/build + UAT เดิม 13 scenario", role: "QA", criterion: "AC-013", deps: ["WP-009"], risk: "LOW" },
  { key: "WP-011", title: "UAT + visual comparison 8 หน้า x 4 viewport + console/network clean", role: "UAT", criterion: "AC-016", deps: ["WP-008", "WP-010"], risk: "MEDIUM" },
  { key: "WP-012", title: "Release candidate + รายงาน + ขออนุมัติ owner", role: "RELEASE", deps: ["WP-011"], risk: "LOW" },
];

const prisma = new PrismaClient();

async function main() {
  // idempotent: rebuild the plan for this mission key
  await prisma.mission.deleteMany({ where: { key: KEY } });

  const mission = await prisma.mission.create({
    data: {
      key: KEY,
      title: "AI Agent Office — Final Reference Fidelity",
      instruction:
        "ปรับระบบ AI Agent Office ให้ตรงกับ references/ai-agent-office-reference.png " +
        "ทั้งแนวคิด รูปแบบ การใช้งาน Visual Density และ Pixel Art Management UI",
      status: "DRAFT",
      autonomyLevel: "LEVEL_4",
      repositoryUrl: REPO,
      baseBranch: "master",
      targetRoutes: ROUTES.map((r) => r.route),
      targetModules: ["dashboard", "companies", "company-office", "department", "workers", "projects", "infrastructure", "activity"],
      visualTarget: 95,
      visualMinCategory: 9,
      functionalTarget: 100,
      requireApproval: true,
      testDataPolicy: "isolated",
      budget: { create: {} },
      references: { create: [{ label: "approved reference", storageKey: "references/ai-agent-office-reference.png" }] },
    },
  });

  for (const r of REQUIREMENTS) {
    await prisma.missionRequirement.create({
      data: {
        missionId: mission.id, key: r.key, kind: r.kind, title: r.title, description: r.description,
        criteria: { create: r.criteria.map((c) => ({ key: c.key, statement: c.statement, measurement: c.measurement, required: true })) },
      },
    });
  }

  const criteria = await prisma.acceptanceCriterion.findMany({
    where: { requirement: { missionId: mission.id } }, select: { id: true, key: true },
  });
  const criterionByKey = new Map(criteria.map((c) => [c.key, c.id]));

  for (const p of PACKAGES) {
    await prisma.workPackage.create({
      data: {
        missionId: mission.id, key: p.key, title: p.title, role: p.role,
        objective: p.title, scope: `scope: ${p.criterion ?? "cross-cutting"}`,
        riskLevel: p.risk, status: p.deps.length === 0 ? "READY" : "BACKLOG",
        criterionId: p.criterion ? criterionByKey.get(p.criterion) : undefined,
      },
    });
  }
  const packages = await prisma.workPackage.findMany({ where: { missionId: mission.id }, select: { id: true, key: true } });
  const pkgByKey = new Map(packages.map((p) => [p.key, p.id]));
  for (const p of PACKAGES) {
    for (const dep of p.deps) {
      await prisma.workPackageDependency.create({
        data: { workPackageId: pkgByKey.get(p.key)!, dependsOnId: pkgByKey.get(dep)! },
      });
    }
  }

  // traceability: every criterion is linked to the package that will satisfy it
  for (const p of PACKAGES) {
    if (!p.criterion) continue;
    await prisma.requirementTrace.create({
      data: { criterionId: criterionByKey.get(p.criterion)!, workPackageId: pkgByKey.get(p.key)!, note: `planned by ${p.key}`, satisfied: false },
    });
  }

  // visual checkpoints: 8 routes x 4 viewports
  for (const r of ROUTES) {
    for (const vp of VIEWPORTS) {
      await prisma.visualCheckpoint.create({
        data: {
          missionId: mission.id, key: r.key, route: r.route, viewport: vp,
          referenceKey: "references/ai-agent-office-reference.png", targetScore: 95, required: true,
        },
      });
    }
  }

  // quality gates (global config rows, created once)
  for (const [kind, name] of [
    ["RQ_GATE", "Requirements"], ["ARCHITECTURE_GATE", "Architecture"], ["REVIEW_GATE", "Code review"],
    ["QA_GATE", "Automated QA"], ["PREVIEW_GATE", "Preview deployment"], ["UAT_GATE", "Browser UAT"],
    ["VISUAL_GATE", "Visual fidelity"], ["RELEASE_GATE", "Release"],
  ] as const) {
    await prisma.qualityGate.upsert({ where: { kind }, update: { name }, create: { kind, name } });
  }

  // evaluate RQ_GATE for real against what we just persisted
  const [reqCount, critCount, measurable, traceCount] = await Promise.all([
    prisma.missionRequirement.count({ where: { missionId: mission.id } }),
    prisma.acceptanceCriterion.count({ where: { requirement: { missionId: mission.id } } }),
    prisma.acceptanceCriterion.count({ where: { requirement: { missionId: mission.id }, measurement: { not: "" } } }),
    prisma.requirementTrace.count({ where: { criterion: { requirement: { missionId: mission.id } } } }),
  ]);
  const rq = evaluateRqGate({ requirements: reqCount, criteria: critCount, measurableCriteria: measurable, tracesInitialised: traceCount > 0 });

  await prisma.qualityGateResult.create({
    data: {
      missionId: mission.id, kind: "RQ_GATE", status: rq.status, iteration: 0,
      checks: rq.checks as unknown as object, blockingReasons: rq.blockingReasons,
    },
  });
  await prisma.missionAuditLog.create({
    data: {
      missionId: mission.id, action: "mission.planned", entityType: "mission", entityId: mission.id,
      fromState: "DRAFT", toState: "DRAFT", reason: "built-in reference-fidelity template instantiated",
      evidence: { requirements: reqCount, criteria: critCount, packages: PACKAGES.length, checkpoints: ROUTES.length * VIEWPORTS.length },
    },
  });

  const wpCount = await prisma.workPackage.count({ where: { missionId: mission.id } });
  const cpCount = await prisma.visualCheckpoint.count({ where: { missionId: mission.id } });
  const depCount = await prisma.workPackageDependency.count({ where: { workPackage: { missionId: mission.id } } });

  console.log(`mission        : ${mission.key} (${mission.id})`);
  console.log(`requirements   : ${reqCount}`);
  console.log(`criteria       : ${critCount} (measurable: ${measurable})`);
  console.log(`work packages  : ${wpCount} (dependencies: ${depCount})`);
  console.log(`checkpoints    : ${cpCount}`);
  console.log(`traces         : ${traceCount}`);
  console.log(`RQ_GATE        : ${rq.status}${rq.blockingReasons.length ? " — " + rq.blockingReasons.join("; ") : ""}`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
