import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { requireCompanyAccess } from "@/lib/rbac";
import { toSafeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { taskId: string } }) {
  try {
    await requireUser();
    const task = await db.agentTask.findUnique({ where: { id: params.taskId }, select: { companyId: true, status: true, updatedAt: true, retryCount: true } });
    if (!task) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "ไม่พบงาน" } }, { status: 404 });
    await requireCompanyAccess(task.companyId);
    return NextResponse.json({ success: true, data: { status: task.status, updatedAt: task.updatedAt.toISOString(), retryCount: task.retryCount } });
  } catch (err) {
    const s = toSafeError(err);
    return NextResponse.json({ success: false, error: { code: s.code, message: s.message } }, { status: s.code === "UNAUTHENTICATED" ? 401 : 403 });
  }
}
