"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center gap-2">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-text-muted transition-colors hover:text-text-main"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={isLast ? "font-medium text-text-main" : "text-text-muted"}
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
            {!isLast && (
              <ChevronRight className="h-4 w-4 text-text-dim" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
