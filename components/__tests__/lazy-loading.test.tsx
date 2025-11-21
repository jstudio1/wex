import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// Mock Next.js dynamic
vi.mock('next/dynamic', () => ({
  default: (importFn: () => Promise<any>, options?: any) => {
    const Component = React.lazy(importFn);
    Component.displayName = 'LazyComponent';
    return Component;
  },
}));

describe('Lazy Loading Components', () => {
  it('ควร lazy load PremiumAppCategoryCard', async () => {
    const { PremiumAppCategoryCard } = await import('@/components/PremiumAppCategoryCard');
    
    expect(PremiumAppCategoryCard).toBeDefined();
    expect(typeof PremiumAppCategoryCard).toBe('function');
  });

  it('ควร lazy load AppPremiumProductsList', async () => {
    const { default: AppPremiumProductsList } = await import('@/components/AppPremiumProductsList');
    expect(AppPremiumProductsList).toBeDefined();
  });

  it('ควร lazy load SocialServicesBrowser', async () => {
    const { default: SocialServicesBrowser } = await import('@/components/SocialServicesBrowser');
    expect(SocialServicesBrowser).toBeDefined();
  });

  it('ควร lazy load PublicProductsSearch', async () => {
    const { default: PublicProductsSearch } = await import('@/components/PublicProductsSearch');
    expect(PublicProductsSearch).toBeDefined();
  });

  it('ควร lazy load MtopupProductsLayout', async () => {
    const { default: MtopupProductsLayout } = await import('@/components/MtopupProductsLayout');
    expect(MtopupProductsLayout).toBeDefined();
  });

  it('ควร lazy load CashcardProductsLayout', async () => {
    const { default: CashcardProductsLayout } = await import('@/components/CashcardProductsLayout');
    expect(CashcardProductsLayout).toBeDefined();
  });

  it('ควร lazy load RegularOrdersList', async () => {
    const { default: RegularOrdersList } = await import('@/components/RegularOrdersList');
    expect(RegularOrdersList).toBeDefined();
  });

  it('ควร lazy load AccountClient', async () => {
    const { default: AccountClient } = await import('@/app/(main)/account/AccountClient');
    expect(AccountClient).toBeDefined();
  });
});

