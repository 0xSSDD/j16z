'use client';

import { MemoList } from '@/components/memo/memo-list';
import { NewsSection } from '@/components/news-section';
import type { Deal, NewsItem } from '@/lib/types';

interface NewsResearchTabProps {
  deal: Deal;
  newsItems?: NewsItem[];
}

export function NewsResearchTab({ deal }: NewsResearchTabProps) {
  return (
    <div className="divide-y divide-border">
      <div className="p-4">
        <h3 className="text-sm font-mono font-semibold text-text-muted uppercase tracking-wider mb-3">
          News & Research
        </h3>
        <NewsSection dealId={deal.id} />
      </div>
      <div className="p-4">
        <h3 className="text-sm font-mono font-semibold text-text-muted uppercase tracking-wider mb-3">
          Research Memos
        </h3>
        <MemoList dealId={deal.id} />
      </div>
    </div>
  );
}
