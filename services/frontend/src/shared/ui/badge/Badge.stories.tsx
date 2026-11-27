import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Design System/Atomic/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const GoldActive: Story = {
  args: {
    children: 'ULTRA PLATINUM',
    variant: 'gold',
  },
};

export const SuccessWithDot: Story = {
  args: {
    children: 'Validé Zero-Trust',
    variant: 'success',
    dot: true,
  },
};

export const DangerWithDot: Story = {
  args: {
    children: 'Carte Gelée',
    variant: 'danger',
    dot: true,
  },
};

export const WarningWithDot: Story = {
  args: {
    children: 'Mode Replay Démo',
    variant: 'warning',
    dot: true,
  },
};

export const Neutral: Story = {
  args: {
    children: 'Virement SEPA',
    variant: 'neutral',
  },
};
