'use client';

import { Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Pricing', href: '#pricing' },
];

export const LandingNav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    setIsDarkMode(!document.documentElement.classList.contains('light'));

    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains('light')) {
      html.classList.remove('light');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    } else {
      html.classList.add('light');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    }
  };

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'bg-background/80 backdrop-blur-md border-b border-border' : 'bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-sans text-lg font-bold tracking-tight text-text-main">
          J16Z
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-text-muted transition-colors hover:text-text-main"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="hidden rounded-lg p-2 text-text-muted transition-colors hover:text-text-main md:block"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          <Link
            href="/login"
            className="hidden text-sm text-text-muted transition-colors hover:text-text-main md:block"
          >
            Log in
          </Link>

          <Link
            href="/login"
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-primary-950 transition-colors hover:bg-primary-400"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
};
