'use client';

import { use } from 'react';
import { ResearchDraft } from '@/components/research-draft';

export default function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ResearchDraft dealId={id} />;
}
