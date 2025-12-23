"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { Deal, Event, Clause } from "@/lib/types";
import { MOCK_DEALS, MOCK_EVENTS, MOCK_CLAUSES } from "@/lib/constants";
import { formatDate, formatTime, formatDateForFilename } from "@/lib/date-utils";
import { exportTextFile } from "@/lib/file-utils";

interface ResearchDraftProps {
  dealId: string;
}

export function ResearchDraft({ dealId }: ResearchDraftProps) {
  const router = useRouter();
  const deal = MOCK_DEALS.find((d) => d.id === dealId);
  const events = MOCK_EVENTS.filter((e) => e.dealId === dealId);
  const clauses = MOCK_CLAUSES.filter((c) => c.dealId === dealId);

  const [content, setContent] = React.useState("");
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);

  React.useEffect(() => {
    if (deal) {
      const initialContent = generateDraft(deal, events, clauses);
      setContent(initialContent);
    }
  }, [deal, events, clauses]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLastSaved(new Date());
    }, 5000);
    return () => clearTimeout(timer);
  }, [content]);

  if (!deal) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-mono font-bold text-foreground mb-2">Deal Not Found</h1>
          <button
            onClick={() => router.push("/app/deals")}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 dark:text-zinc-950 rounded-md font-mono text-sm transition-colors"
          >
            Back to Deals
          </button>
        </div>
      </div>
    );
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
  };

  const exportMarkdown = () => {
    exportTextFile(
      content,
      `${deal.acquirerSymbol}-${deal.symbol}-memo-${formatDateForFilename()}.md`,
      "text/markdown"
    );
  };

  const exportDocx = async () => {
    const doc = new Document({
      sections: [
        {
          children: content.split("\n").map((line) => {
            if (line.startsWith("# ")) {
              return new Paragraph({
                text: line.replace("# ", ""),
                heading: HeadingLevel.HEADING_1,
              });
            } else if (line.startsWith("## ")) {
              return new Paragraph({
                text: line.replace("## ", ""),
                heading: HeadingLevel.HEADING_2,
              });
            } else if (line.startsWith("### ")) {
              return new Paragraph({
                text: line.replace("### ", ""),
                heading: HeadingLevel.HEADING_3,
              });
            } else {
              return new Paragraph({
                children: [new TextRun(line)],
              });
            }
          }),
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${deal.acquirerSymbol}-${deal.symbol}-memo-${formatDateForFilename()}.docx`;
    a.click();
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/app/deals/${dealId}`)}
            className="text-sm text-muted-foreground hover:text-foreground font-mono flex items-center gap-1"
          >
            ← Back to Deal
          </button>
          <h1 className="text-lg font-mono font-bold text-foreground">
            Research Draft: {deal.acquirerSymbol} / {deal.symbol}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-xs text-muted-foreground font-mono">
              Saved {formatTime(lastSaved)}
            </span>
          )}
          <button
            onClick={copyToClipboard}
            className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md font-mono text-sm transition-colors"
          >
            Copy
          </button>
          <button
            onClick={exportMarkdown}
            className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md font-mono text-sm transition-colors"
          >
            Export .md
          </button>
          <button
            onClick={exportDocx}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 dark:text-zinc-950 rounded-md font-mono text-sm transition-colors"
          >
            Export .docx
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto p-6">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-full bg-background text-foreground font-mono text-sm p-6 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          placeholder="Start writing your research memo..."
        />
      </div>
    </div>
  );
}

function generateDraft(deal: Deal, events: Event[], clauses: Clause[]): string {
  const regulatoryEvents = events.filter((e) => e.type === "AGENCY");
  const litigationEvents = events.filter((e) => e.type === "COURT");

  return `# ${deal.acquirerName} / ${deal.companyName} - M&A Analysis

**Date:** ${formatDate(new Date())}
**Status:** ${deal.status}
**Deal Value:** $${(deal.reportedEquityTakeoverValue / 1e9).toFixed(1)}B
**Consideration:** ${deal.considerationType}

## Executive Summary

${deal.acquirerName} announced its acquisition of ${deal.companyName} on ${formatDate(deal.announcementDate)} for approximately $${(deal.reportedEquityTakeoverValue / 1e9).toFixed(1)} billion in ${deal.considerationType.toLowerCase()} consideration. The current deal spread is ${deal.currentSpread.toFixed(1)}%, with an estimated probability of close at ${deal.p_close_base}%, yielding an expected value of ${deal.ev.toFixed(2)}%.

## Deal Terms

${clauses.length > 0 ? clauses.map((c) => `**${c.type.replace(/_/g, " ")}:** ${c.value} (${c.sourceFilingType} ${c.sourceSection})`).join("\n\n") : "No deal terms available."}

## Regulatory Review

${regulatoryEvents.length > 0 ? `The transaction is subject to regulatory review by multiple jurisdictions. Key developments include:

${regulatoryEvents.map((e) => `- **${formatDate(e.timestamp)}:** ${e.title} - ${e.summary}`).join("\n")}` : "No significant regulatory issues identified."}

${deal.regulatoryFlags.length > 0 ? `\n**Active Regulatory Concerns:** ${deal.regulatoryFlags.map((f) => f.replace(/_/g, " ")).join(", ")}` : ""}

## Litigation

${litigationEvents.length > 0 ? `The transaction faces litigation challenges:

${litigationEvents.map((e) => `- **${formatDate(e.timestamp)}:** ${e.title} - ${e.summary}`).join("\n")}` : "No active litigation."}

## Risk Assessment

**Key Risks:**
${deal.regulatoryFlags.length > 0 ? `- Regulatory approval uncertainty (${deal.regulatoryFlags.length} active review${deal.regulatoryFlags.length > 1 ? "s" : ""})` : ""}
${deal.litigationCount > 0 ? `- Litigation risk (${deal.litigationCount} active case${deal.litigationCount > 1 ? "s" : ""})` : ""}
- Market risk (current spread: ${deal.currentSpread.toFixed(1)}%)
- Timing risk (outside date: ${formatDate(deal.outsideDate)})

## Scenario Analysis

**Base Case (${deal.p_close_base}% probability):**
- Deal closes successfully
- Return: ${deal.currentSpread.toFixed(1)}%

**Downside Case (${100 - deal.p_close_base}% probability):**
- Deal terminates
- Estimated loss: -${(deal.currentSpread * 0.5).toFixed(1)}%

**Expected Value:** ${deal.ev.toFixed(2)}%

## Recommendation

${deal.ev > 2 ? "**BUY** - Attractive risk/reward profile with expected value above 2%." : deal.ev > 1 ? "**HOLD** - Moderate risk/reward profile." : "**PASS** - Insufficient expected value given risks."}

---

*This memo is for informational purposes only and does not constitute investment advice.*
`;
}
