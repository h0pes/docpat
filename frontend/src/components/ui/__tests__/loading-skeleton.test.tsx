/**
 * Loading Skeleton Component Tests
 *
 * Tests for the reusable loading skeleton components.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  DashboardCardSkeleton,
  DashboardStatsSkeleton,
  TableRowSkeleton,
  TableSkeleton,
  FormSkeleton,
  PageHeaderSkeleton,
} from '../loading-skeleton';

describe('DashboardCardSkeleton', () => {
  it('renders skeleton card', () => {
    const { container } = render(<DashboardCardSkeleton />);

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders within a card component', () => {
    const { container } = render(<DashboardCardSkeleton />);

    const card = container.querySelector('.rounded-lg.border');
    expect(card).toBeInTheDocument();
  });
});

describe('DashboardStatsSkeleton', () => {
  it('renders 4 skeleton cards', () => {
    const { container } = render(<DashboardStatsSkeleton />);

    const cards = container.querySelectorAll('.rounded-lg.border');
    expect(cards).toHaveLength(4);
  });

  it('renders in grid layout', () => {
    const { container } = render(<DashboardStatsSkeleton />);

    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('md:grid-cols-2');
    expect(grid).toHaveClass('lg:grid-cols-4');
  });
});

describe('TableRowSkeleton', () => {
  it('renders skeleton row', () => {
    const { container } = render(<TableRowSkeleton />);

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders avatar skeleton', () => {
    const { container } = render(<TableRowSkeleton />);

    const avatar = container.querySelector('.rounded-full');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveClass('h-10');
    expect(avatar).toHaveClass('w-10');
  });

  it('renders text skeletons', () => {
    const { container } = render(<TableRowSkeleton />);

    const textSkeletons = container.querySelectorAll('.h-4, .h-3');
    expect(textSkeletons.length).toBeGreaterThan(0);
  });
});

describe('TableSkeleton', () => {
  it('renders default 5 rows', () => {
    const { container } = render(<TableSkeleton />);

    // Each row has multiple skeletons, so count the rounded-full elements
    const avatars = container.querySelectorAll('.rounded-full');
    expect(avatars).toHaveLength(5);
  });

  it('renders custom number of rows', () => {
    const { container } = render(<TableSkeleton rows={3} />);

    const avatars = container.querySelectorAll('.rounded-full');
    expect(avatars).toHaveLength(3);
  });

  it('renders 10 rows when specified', () => {
    const { container } = render(<TableSkeleton rows={10} />);

    const avatars = container.querySelectorAll('.rounded-full');
    expect(avatars).toHaveLength(10);
  });
});

describe('FormSkeleton', () => {
  it('renders form field skeletons', () => {
    const { container } = render(<FormSkeleton />);

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders label skeletons (h-4)', () => {
    const { container } = render(<FormSkeleton />);

    const labels = container.querySelectorAll('.h-4');
    expect(labels.length).toBeGreaterThan(0);
  });

  it('renders input skeletons (h-10)', () => {
    const { container } = render(<FormSkeleton />);

    const inputs = container.querySelectorAll('.h-10');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('renders textarea skeleton (h-24)', () => {
    const { container } = render(<FormSkeleton />);

    const textarea = container.querySelector('.h-24');
    expect(textarea).toBeInTheDocument();
  });
});

describe('PageHeaderSkeleton', () => {
  it('renders header skeletons', () => {
    const { container } = render(<PageHeaderSkeleton />);

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(2);
  });

  it('renders title skeleton', () => {
    const { container } = render(<PageHeaderSkeleton />);

    const title = container.querySelector('.h-8');
    expect(title).toBeInTheDocument();
  });

  it('renders subtitle skeleton', () => {
    const { container } = render(<PageHeaderSkeleton />);

    const subtitle = container.querySelector('.h-4');
    expect(subtitle).toBeInTheDocument();
  });
});
