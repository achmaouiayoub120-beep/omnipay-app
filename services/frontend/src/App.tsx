import { useState } from 'react';
import {
  Button,
  Input,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Skeleton,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/shared/ui';
import { Shield, Lock, ArrowRight, Moon, Sun } from 'lucide-react';

export function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isLoading, setIsLoading] = useState(false);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <div className="min-h-screen bg-obsidian-950 text-platinum-100 flex flex-col">
      {/* Header avec espace réservé non-chevauchant */}
      <header className="sticky top-0 z-30 h-[72px] border-b border-obsidian-750 bg-obsidian-900/90 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/cards/ultra-platinum.jpg"
            alt="OmniPay Emblem"
            className="h-10 w-auto rounded border border-gold-400/30 object-contain shadow-gold-glow-subtle"
          />
          <div>
            <h1 className="text-base font-bold tracking-tight text-platinum-50 flex items-center gap-2">
              OmniPay <span className="text-gold-400 text-xs font-semibold">ZERO-TRUST</span>
            </h1>
            <p className="text-[11px] text-platinum-400 font-medium">Design System · Phase 1 Showcase</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="gold" dot>DESIGN TOKENS V2</Badge>
          <Button variant="ghost" size="iconSm" onClick={toggleTheme} title="Basculer le thème">
            {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Main Content Showcase */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 space-y-10">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-platinum-50">
                Design System & Primitives Atomiques
              </h2>
              <p className="text-sm text-platinum-400 mt-1">
                Composants Radix UI accessibles, conformes WCAG 2.2 AA, avec palette Obsidienne & Or Champagne.
              </p>
            </div>
            <Badge variant="success" dot>Contraste AA Validé</Badge>
          </div>
        </div>

        {/* Section 1 : Boutons & États */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>1. Boutons (Button Variants & States)</CardTitle>
              <CardDescription>États : défaut, hover, focus, disabled, loading</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
              <Button variant="primary">
                <span>Confirmer</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="secondary">Détails de compte</Button>
              <Button variant="outline">
                <Shield className="h-4 w-4" />
                <span>Zero-Trust Check</span>
              </Button>
              <Button variant="ghost">Annuler</Button>
              <Button variant="danger">Bloquer</Button>
              <Button
                variant="primary"
                isLoading={isLoading}
                onClick={() => {
                  setIsLoading(true);
                  setTimeout(() => setIsLoading(false), 2000);
                }}
              >
                {isLoading ? 'Exécution...' : 'Tester Loading State'}
              </Button>
              <Button variant="primary" disabled>Désactivé</Button>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-platinum-500">Accessible par navigation clavier (Tab / Entrée / Espace)</p>
          </CardFooter>
        </Card>

        {/* Section 2 : Formulaires & Champs */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>2. Champs de Saisie (Input & Validation)</CardTitle>
              <CardDescription>Support d'accessibilité ARIA, icônes et gestion des erreurs</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="IBAN Bénéficiaire (Format ISO 13616)"
                placeholder="FR76 3000 6000 0112 3456 7890 189"
                helperText="Validation mathématique de clé modulo-97"
              />
              <Input
                label="Montant du virement (€)"
                placeholder="500,00"
                defaultValue="1 250,00"
                helperText="Traité en unités mineures entières (centimes)"
              />
              <Input
                label="Code Secret MFA (TOTP)"
                placeholder="••••••"
                error="Le code à usage unique doit comporter 6 chiffres exacts."
                leftIcon={<Lock className="h-4 w-4" />}
              />
              <Input
                label="Identifiant Compte Titulaire"
                defaultValue="ACC-ALICE-001 (Compte Courant)"
                disabled
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3 : Badges & Onglets */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>3. Badges & Onglets Radix (Tabs Primitive)</CardTitle>
              <CardDescription>Sélection de vue sans décalage de mise en page</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-3 items-center">
              <Badge variant="gold" dot>ULTRA PLATINUM</Badge>
              <Badge variant="success" dot>Opération Validée</Badge>
              <Badge variant="warning" dot>Mode Replay Démo</Badge>
              <Badge variant="danger" dot>Échec d'admission Kyverno</Badge>
              <Badge variant="neutral">Virement SEPA Instant</Badge>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">Toutes les opérations</TabsTrigger>
                <TabsTrigger value="debits">Débits</TabsTrigger>
                <TabsTrigger value="credits">Crédits</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="text-xs text-platinum-400 p-2">
                Vue consolidée du grand livre bancaire.
              </TabsContent>
              <TabsContent value="debits" className="text-xs text-platinum-400 p-2">
                Virements sortants et prélèvements.
              </TabsContent>
              <TabsContent value="credits" className="text-xs text-platinum-400 p-2">
                Virements entrants et dépôts.
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Section 4 : Modal Dialog Radix Accessible */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>4. Modale Radix UI Accessible (Dialog Primitive)</CardTitle>
              <CardDescription>Gestion de focus trap, touche Échap, overlay dépoli</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Ouvrir la Modale de Démonstration</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmation de Virement de Sécurité</DialogTitle>
                  <DialogDescription>
                    Veuillez vérifier les informations de contrepartie avant validation.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-3">
                  <div className="p-3 bg-obsidian-950 rounded-lg border border-obsidian-750 flex justify-between items-center text-sm">
                    <span className="text-platinum-400">IBAN Cible :</span>
                    <span className="font-mono text-platinum-100 font-semibold">FR76 3000 6000 0112 3456 7890 189</span>
                  </div>
                  <div className="p-3 bg-obsidian-950 rounded-lg border border-obsidian-750 flex justify-between items-center text-sm">
                    <span className="text-platinum-400">Montant :</span>
                    <span className="text-gold-400 font-bold tabular-nums text-base">250,00 €</span>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="primary">Confirmer l'opération</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Section 5 : Squelettes de Chargement */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>5. Squelettes de Chargement (Skeleton UI)</CardTitle>
              <CardDescription>Transition visuelle fluide sans sursaut de mise en page (CLS &lt; 0.05)</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-w-md">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="h-14 border-t border-obsidian-750/80 px-6 flex items-center justify-between text-xs text-platinum-500">
        <span>OmniPay Zero-Trust · Staff Design System v2.0.0</span>
        <span>Conforme WCAG 2.2 AA · 100% Hors-ligne</span>
      </footer>
    </div>
  );
}
