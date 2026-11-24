import type { Meta, StoryObj } from '@storybook/react';
import { CreditCard3D } from './CreditCard3D';

const meta: Meta<typeof CreditCard3D> = {
  title: 'Features/Cards/CreditCard3D',
  component: CreditCard3D,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CreditCard3D>;

export const ActiveUltraPlatinum: Story = {
  args: {
    card: {
      id: 'CARD-ALICE-01',
      accountId: 'ACC-ALICE-001',
      cardholderName: 'ALICE DUPONT',
      type: 'ULTRA_PLATINUM',
      maskedPan: '•••• •••• •••• 4821',
      fullPan: '4532 8912 6743 4821',
      lastFour: '4821',
      expiryMonth: 12,
      expiryYear: 28,
      cvv: '842',
      isFrozen: false,
      isVirtual: false,
      contactlessEnabled: true,
      monthlySpendLimitMinor: 500000,
      currentMonthSpentMinor: 145000,
    },
  },
};

export const FrozenCard: Story = {
  args: {
    card: {
      id: 'CARD-ALICE-02',
      accountId: 'ACC-ALICE-001',
      cardholderName: 'ALICE DUPONT',
      type: 'ULTRA_PLATINUM',
      maskedPan: '•••• •••• •••• 4821',
      fullPan: '4532 8912 6743 4821',
      lastFour: '4821',
      expiryMonth: 12,
      expiryYear: 28,
      cvv: '842',
      isFrozen: true,
      isVirtual: false,
      contactlessEnabled: true,
      monthlySpendLimitMinor: 500000,
      currentMonthSpentMinor: 145000,
    },
  },
};
