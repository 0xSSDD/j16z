'use client';

import { FinalCta, MidPageCta } from './landing-cta';
import { LandingFaq } from './landing-faq';
import { LandingFeatures } from './landing-features';
import { LandingFooter } from './landing-footer';
import { LandingHero } from './landing-hero';
import { LandingNav } from './landing-nav';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background font-body text-text-main">
      <LandingNav />
      <LandingHero />
      <LandingFeatures />
      <MidPageCta />
      <LandingFaq />
      <FinalCta />
      <LandingFooter />
    </div>
  );
};
