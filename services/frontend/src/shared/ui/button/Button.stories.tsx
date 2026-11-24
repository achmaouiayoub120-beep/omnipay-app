import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { ArrowRight, Shield } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'Design System/Atomic/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'icon', 'iconSm'],
    },
    isLoading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const PrimaryGold: Story = {
  args: {
    children: 'Confirmer le virement',
    variant: 'primary',
    size: 'md',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Afficher les détails',
    variant: 'secondary',
    size: 'md',
  },
};

export const Outline: Story = {
  args: {
    children: 'Télécharger le reçu',
    variant: 'outline',
    size: 'md',
  },
};

export const Danger: Story = {
  args: {
    children: 'Bloquer la carte',
    variant: 'danger',
    size: 'md',
  },
};

export const LoadingState: Story = {
  args: {
    children: 'Traitement en cours...',
    variant: 'primary',
    isLoading: true,
  },
};

export const DisabledState: Story = {
  args: {
    children: 'Action désactivée',
    variant: 'primary',
    disabled: true,
  },
};

export const WithIcons: Story = {
  render: (args) => (
    <Button {...args}>
      <Shield className="h-4 w-4" />
      <span>Validation Zero-Trust</span>
      <ArrowRight className="h-4 w-4" />
    </Button>
  ),
  args: {
    variant: 'primary',
  },
};
