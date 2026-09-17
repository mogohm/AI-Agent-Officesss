import { Building2 } from "lucide-react";
import { RUNTIME_COLOR, RUNTIME_LABEL } from "@/lib/office-assets";
import { OfficeTowerShell, type TowerDept, type TowerWorker } from "./OfficeTowerShell";

export type { TowerDept, TowerWorker };
export { TOWER, orderFloors } from "./OfficeTowerShell";

export function WorkerStatusIndicator({ status }: { status: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={{ background: RUNTIME_COLOR[status] ?? "#657A91" }}
      aria-hidden
    />
  );
}

export function TowerStatusLegend() {
  const items = ["IDLE", "WORKING", "THINKING", "WAITING_APPROVAL", "ERROR", "OFFLINE"];
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[#244768]/60 bg-[#0b1626] px-3 py-2 text-[11px] text-[#9DB1C8]">
      <span className="font-semibold text-[#657A91]">สถานะ worker:</span>
      {items.map((key) => (
        <span key={key} className="inline-flex items-center gap-1">
          <WorkerStatusIndicator status={key} />
          {RUNTIME_LABEL[key]}
        </span>
      ))}
    </div>
  );
}

/**
 * Company office tower. The structural shell lives in OfficeTowerShell; this
 * wrapper owns the empty state and the status legend.
 */
export function OfficeTower({ companyId, companyName, departments, workers, selectedDepartmentId }: {
  companyId: string;
  companyName?: string;
  departments: TowerDept[];
  workers: TowerWorker[];
  selectedDepartmentId?: string;
}) {
  if (departments.length === 0) {
    return (
      <div className="grid place-items-center rounded-lg border border-dashed border-[#244768] py-12 text-center">
        <Building2 className="mb-2 h-9 w-9 text-[#657A91]" />
        <div className="text-sm text-[#9DB1C8]">ยังไม่มีแผนก — เพิ่มแผนกเพื่อสร้างชั้นแรกของตึก</div>
      </div>
    );
  }

  return (
    <div>
      <OfficeTowerShell
        companyId={companyId}
        companyName={companyName}
        departments={departments}
        workers={workers}
        selectedDepartmentId={selectedDepartmentId}
      />
      <TowerStatusLegend />
    </div>
  );
}
