"use client";

import { useState } from "react";
import { BookOpen, BriefcaseBusiness, CupSoda, KeyRound, Package, Shirt, Smartphone, Watch } from "lucide-react";
import type { PublicReport } from "@/shared/api";

const categoryIcons = {
  Bags: BriefcaseBusiness,
  Electronics: Smartphone,
  Keys: KeyRound,
  Clothing: Shirt,
  Books: BookOpen,
  Accessories: Watch,
  Drinkware: CupSoda,
  Other: Package,
} as const;

export function ItemVisual({ report, compact = false }: { report: PublicReport; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  const Icon = categoryIcons[report.category];
  const className = compact ? "item-visual item-visual-compact" : "item-visual";
  return (
    <div className={className}>
      {report.has_shared_preview && !failed ? (
        // The preview endpoint checks the viewer's cookie; an image optimizer cannot fetch it on their behalf.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={"/api/v1/reports/" + encodeURIComponent(report.id) + "/preview"}
          alt={compact ? "" : "Reporter-approved photo preview of " + report.title}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="item-visual-empty">
          <Icon size={compact ? 22 : 36} strokeWidth={1.5} aria-hidden="true" />
          {compact ? null : <span>No shared item photo</span>}
        </div>
      )}
    </div>
  );
}
