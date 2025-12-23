"use client";

import { DealCard } from "@/components/deal-card";
import { use } from "react";

export default function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DealCard dealId={id} />;
}
