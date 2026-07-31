import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const DEPTS_A = [
  { name: "Marketing", floorType: "MARKETING", floorOrder: 6, color: "#7B5BD6" },
  { name: "Sales", floorType: "SALES", floorOrder: 5, color: "#2E7BC4" },
  { name: "HR", floorType: "MANAGEMENT", floorOrder: 4, color: "#C94F6E" },
  { name: "IT / Dev", floorType: "DEVELOPMENT", floorOrder: 3, color: "#2F9BB0" },
  { name: "Design / Meeting", floorType: "CREATIVE", floorOrder: 2, color: "#D98A3D" },
  { name: "Lobby / Support", floorType: "SUPPORT", floorOrder: 1, color: "#3E9E5F" },
] as const;

const PROVIDER_MODELS = [
  { providerType: "OPENAI", modelKey: "gpt-4o", displayName: "GPT-4o", inputPer1k: "0.005", outputPer1k: "0.015" },
  { providerType: "OPENAI", modelKey: "gpt-4o-mini", displayName: "GPT-4o mini", inputPer1k: "0.00015", outputPer1k: "0.0006" },
  { providerType: "ANTHROPIC", modelKey: "claude-sonnet-4", displayName: "Claude Sonnet 4", inputPer1k: "0.003", outputPer1k: "0.015" },
  { providerType: "GOOGLE", modelKey: "gemini-2.0-flash", displayName: "Gemini 2.0 Flash", inputPer1k: "0.0001", outputPer1k: "0.0004" },
  { providerType: "LOCAL", modelKey: "local-llama", displayName: "Local LLM", inputPer1k: "0", outputPer1k: "0" },
] as const;

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);
  const owner = await db.user.upsert({
    where: { email: "owner@demo.local" },
    update: { passwordHash, name: "Demo Owner", globalRole: "SUPER_ADMIN" },
    create: { email: "owner@demo.local", passwordHash, name: "Demo Owner", globalRole: "SUPER_ADMIN" },
  });

  // Provider models (pricing catalog; no secrets).
  for (const m of PROVIDER_MODELS) {
    const existing = await db.providerModel.findFirst({ where: { providerType: m.providerType as any, modelKey: m.modelKey, connectionId: null } });
    const data = {
      providerType: m.providerType as any,
      modelKey: m.modelKey,
      displayName: m.displayName,
      inputPer1k: new Prisma.Decimal(m.inputPer1k),
      outputPer1k: new Prisma.Decimal(m.outputPer1k),
    };
    if (existing) await db.providerModel.update({ where: { id: existing.id }, data });
    else await db.providerModel.create({ data });
  }

  const companies = [
    { slug: "company-a", name: "COMPANY A", legalName: "AI Solutions Co., Ltd.", full: true },
    { slug: "company-b", name: "COMPANY B", legalName: "DataCraft Co., Ltd.", full: false, deptCount: 8 },
    { slug: "company-c", name: "COMPANY C", legalName: "Creative Minds Co., Ltd.", full: false, deptCount: 5 },
    { slug: "company-d", name: "COMPANY D", legalName: "NextGen Tech Co., Ltd.", full: false, deptCount: 7, status: "PAUSED" as const },
  ];

  for (const c of companies) {
    const company = await db.company.upsert({
      where: { slug: c.slug },
      update: { name: c.name, legalName: c.legalName },
      create: {
        slug: c.slug, name: c.name, legalName: c.legalName,
        description: `${c.name} — demo workspace`,
        currency: "USD", monthlyBudget: new Prisma.Decimal("500"),
        status: (c as any).status ?? "ACTIVE",
      },
    });
    await db.companyMember.upsert({
      where: { companyId_userId: { companyId: company.id, userId: owner.id } },
      update: { role: "OWNER" },
      create: { companyId: company.id, userId: owner.id, role: "OWNER" },
    });

    const deptDefs = c.full
      ? DEPTS_A.map((d) => ({ ...d }))
      : Array.from({ length: (c as any).deptCount ?? 4 }, (_, i) => {
          const base = DEPTS_A[i % DEPTS_A.length];
          return { name: base.name, floorType: base.floorType, floorOrder: ((c as any).deptCount ?? 4) - i, color: base.color };
        });

    const deptIds: Record<string, string> = {};
    for (const d of deptDefs) {
      const slug = d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const dept = await db.department.upsert({
        where: { companyId_slug: { companyId: company.id, slug } },
        update: { name: d.name, floorOrder: d.floorOrder, floorType: d.floorType as any, themeColor: d.color },
        create: {
          companyId: company.id, name: d.name, slug, floorOrder: d.floorOrder,
          floorType: d.floorType as any, themeColor: d.color,
          description: `${d.name} department`,
        },
      });
      deptIds[d.name] = dept.id;
    }

    if (c.full) {
      const workerDefs = [
        { name: "Echo", role: "Marketing Agent", dept: "Marketing", avatar: "marketer" },
        { name: "Sol", role: "Sales Agent", dept: "Sales", avatar: "sales" },
        { name: "Hera", role: "HR Agent", dept: "HR", avatar: "hr" },
        { name: "Byte", role: "Backend Developer", dept: "IT / Dev", avatar: "dev-b" },
        { name: "Ada", role: "Frontend Developer", dept: "IT / Dev", avatar: "dev-a" },
        { name: "Pixel", role: "UI/UX Designer", dept: "Design / Meeting", avatar: "designer" },
        { name: "Lin", role: "Support Agent", dept: "Lobby / Support", avatar: "pm" },
      ];
      for (const w of workerDefs) {
        const slug = w.name.toLowerCase();
        await db.aIWorker.upsert({
          where: { companyId_slug: { companyId: company.id, slug } },
          update: { role: w.role, departmentId: deptIds[w.dept] },
          create: {
            companyId: company.id, departmentId: deptIds[w.dept], name: w.name, slug,
            role: w.role, avatarKey: w.avatar, runtimeStatus: "IDLE",
            skills: ["Teamwork", "AI"], toolPermissions: ["web_search", "file_read"],
            monthlyBudget: new Prisma.Decimal("50"),
          },
        });
      }

      const projectDefs = [
        { name: "Project Alpha", slug: "project-alpha", status: "ACTIVE", priority: "HIGH", progress: 65 },
        { name: "Project Beta", slug: "project-beta", status: "COMPLETED", priority: "HIGH", progress: 100 },
        { name: "Project Gamma", slug: "project-gamma", status: "PLANNING", priority: "MEDIUM", progress: 5 },
        { name: "Project Delta", slug: "project-delta", status: "ARCHIVED", priority: "LOW", progress: 100 },
      ] as const;
      for (const p of projectDefs) {
        await db.project.upsert({
          where: { companyId_slug: { companyId: company.id, slug: p.slug } },
          update: { status: p.status as any, priority: p.priority as any, progress: p.progress },
          create: {
            companyId: company.id, name: p.name, slug: p.slug, status: p.status as any,
            priority: p.priority as any, progress: p.progress, createdById: owner.id,
            description: `${p.name} — demo project`,
          },
        });
      }

      await db.activityLog.create({
        data: {
          companyId: company.id, userId: owner.id, entityType: "company", entityId: company.id,
          action: "seed", message: `Seeded ${company.name}`,
        },
      }).catch(() => {});
    }
  }

  console.log("Seed complete: owner + 4 companies + departments/workers/projects + provider models.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
