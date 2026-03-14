'use client';

import { use } from 'react';
import { DealCard } from '@/components/deal-card';

export default function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DealCard dealId={id} />;
}
