import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
import { Button } from '../button/Button';
import { Badge } from '../badge/Badge';

const meta: Meta<typeof Card> = {
  title: 'Design System/Atomic/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const SolidFinancialCard: Story = {
  render: () => (
    <Card className="w-[380px]">
      <CardHeader>
        <div>
          <CardTitle>Plafonds de Paiement</CardTitle>
          <CardDescription>Plafond mensuel carte Ultra Platinum</CardDescription>
        </div>
        <Badge variant="gold">ACTIF</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-platinum-400">Utilisé ce mois</span>
            <span className="text-platinum-100 font-semibold tabular-nums">2 450,00 €</span>
          </div>
          <div className="w-full bg-obsidian-950 h-2 rounded-full overflow-hidden border border-obsidian-700">
            <div className="bg-gold-400 h-full w-[49%]" />
          </div>
          <p className="text-xs text-platinum-500">Plafond maximal autorisé : 5 000,00 €</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm">Ajuster le plafond</Button>
      </CardFooter>
    </Card>
  ),
};
