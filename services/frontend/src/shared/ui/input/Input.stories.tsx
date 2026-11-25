import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';
import { MagnifyingGlass, Lock } from '@phosphor-icons/react';

const meta: Meta<typeof Input> = {
  title: 'Design System/Atomic/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    label: 'IBAN du Bénéficiaire',
    placeholder: 'FR76 3000 6000 0112 3456 7890 189',
    helperText: 'Validation de clé modulo-97 automatique',
  },
};

export const WithLeftIcon: Story = {
  args: {
    label: 'Rechercher une transaction',
    placeholder: 'Motif, destinataire ou montant...',
    leftIcon: <MagnifyingGlass className="h-4 w-4" />,
  },
};

export const WithError: Story = {
  args: {
    label: 'Code d\'authentification (MFA)',
    defaultValue: '12345',
    error: 'Le code de sécurité doit contenir 6 chiffres exacts',
    leftIcon: <Lock className="h-4 w-4" />,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Identifiant compte source',
    defaultValue: 'ACC-ALICE-001 (Compte Courant)',
    disabled: true,
  },
};
