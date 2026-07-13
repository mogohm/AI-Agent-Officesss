"use client";
import { motion } from "framer-motion";
import { Building2, FolderKanban, Layers, Pencil, Trash2 } from "lucide-react";
import type { CompanyOverview } from "@/lib/types";
import { Badge, Button, Card } from "./ui";
import { BuildingThumbnail } from "./production/BuildingThumbnail";

const STATUS_COLOR: Record<string, string> = { active: "#2E9E63", paused: "#C77E1E", archived: "#8DA0C0" };

export function CompanyCard({
  company, onOpen, onEdit, onDelete,
}: {
  company: CompanyOverview; onOpen: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const color = company.theme_color || "#2F66B3";
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }}>
      <Card glow={color} className="overflow-hidden">
        {/* Building visual — ~60% of the card */}
        <div className="skyline relative flex h-40 items-end justify-center" style={{ background: `linear-gradient(180deg, #cfe2fb, ${color}12)` }}>
          <div className="absolute right-3 top-3"><Badge color={STATUS_COLOR[company.status] ?? "#2F66B3"}>{company.status}</Badge></div>
          <div className="h-[86%] w-full"><BuildingThumbnail color={color} floors={Math.max(3, company.department_count)} seed={company.id} /></div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">{company.emoji}</span>
            <h3 className="truncate text-lg font-bold text-ink">{company.name}</h3>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{company.description || "No description yet."}</p>
          <div className="mt-3 flex items-center gap-4 text-sm text-muted">
            <span className="inline-flex items-center gap-1"><Layers size={15} /> {company.department_count} แผนก</span>
            <span className="inline-flex items-center gap-1"><FolderKanban size={15} /> {company.project_count} โปรเจกต์</span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={onOpen} className="flex-1"><Building2 size={16} /> เปิดดู</Button>
            <Button variant="secondary" onClick={onEdit} title="Edit"><Pencil size={16} /></Button>
            <Button variant="danger" onClick={onDelete} title="Delete"><Trash2 size={16} /></Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
