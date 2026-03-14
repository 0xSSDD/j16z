'use client';

import { Github } from 'lucide-react';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Changelog', href: '#' },
      { label: 'Status', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: 'mailto:hello@j16z.com' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '#' },
      { label: 'API Reference', href: '#' },
      { label: 'Help Center', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Security', href: '#' },
    ],
  },
];

export const LandingFooter = () => (
  <footer className="bg-[#0a0a0a] text-white">
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
        <div className="col-span-2 md:col-span-1">
          <span className="font-sans text-lg font-bold tracking-tight text-white">J16Z</span>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="mb-4 text-xs font-medium uppercase tracking-wider text-[#52525b]">{col.title}</h4>
            <ul className="space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-[#a1a1aa] transition-colors hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-[#27272a] pt-8 sm:flex-row">
        <span className="text-sm text-[#52525b]">&copy; 2026 J16Z. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/j16z"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#a1a1aa] transition-colors hover:text-white"
            aria-label="GitHub"
          >
            <Github className="size-4" />
          </a>
          <a
            href="https://x.com/j16z"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[#a1a1aa] transition-colors hover:text-white"
            aria-label="X (Twitter)"
          >
            &#x1D54F;
          </a>
        </div>
      </div>
    </div>
  </footer>
);
