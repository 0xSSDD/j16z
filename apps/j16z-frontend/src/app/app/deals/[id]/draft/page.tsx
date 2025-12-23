"use client";

import { ResearchDraft } from "@/components/research-draft";
import { use } from "react";

export default function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ResearchDraft dealId={id} />;
}
