import "server-only";
import { db } from "@/lib/db";
import { accessibleCompanyIds } from "@/lib/rbac";
import { startOfMonth } from "@/lib/date";

export async function getUsageSummary() {
  const ids = await accessibleCompanyIds();
  if (ids !== "all" && ids.length === 0) return { companies: [], byModel: [], totals: { totalCost: 0, totalTokens: 0 } };
  const scope = ids === "all" ? {} : { companyId: { in: ids } };
  const since = startOfMonth();

  const companies = await db.company.findMany({
    where: { ...(ids === "all" ? {} : { id: { in: ids } }), archivedAt: null },
    select: { id: true, name: true, currency: true, monthlyBudget: true },
    orderBy: { name: "asc" },
  });

  const [perCompany, byModelRaw, totals] = await Promise.all([
    db.usageRecord.groupBy({ by: ["companyId"], where: { ...scope, recordedAt: { gte: since } }, _sum: { totalCost: true, totalTokens: true } }),
    db.usageRecord.groupBy({ by: ["model", "providerType"], where: { ...scope, recordedAt: { gte: since } }, _sum: { totalCost: true, totalTokens: true }, orderBy: { _sum: { totalCost: "desc" } }, take: 15 }),
    db.usageRecord.aggregate({ where: { ...scope, recordedAt: { gte: since } }, _sum: { totalCost: true, totalTokens: true } }),
  ]);

  const spendByCompany = new Map(perCompany.map((r) => [r.companyId, r]));
  const companyRows = companies.map((c) => {
    const s = spendByCompany.get(c.id);
    const spent = Number(s?._sum.totalCost ?? 0);
    const b = Number(c.monthlyBudget ?? 0);
    const budget = b > 0 ? b : null; // treat 0 as "no budget set"
    return {
      id: c.id, name: c.name, currency: c.currency, budget, spent,
      tokens: Number(s?._sum.totalTokens ?? 0),
      pct: budget && budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : null,
    };
  });

  return {
    companies: companyRows,
    byModel: byModelRaw.map((r) => ({ model: r.model, providerType: r.providerType, cost: Number(r._sum.totalCost ?? 0), tokens: Number(r._sum.totalTokens ?? 0) })),
    totals: { totalCost: Number(totals._sum.totalCost ?? 0), totalTokens: Number(totals._sum.totalTokens ?? 0) },
  };
}
