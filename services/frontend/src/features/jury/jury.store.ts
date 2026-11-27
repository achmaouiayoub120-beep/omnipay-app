/**
 * OmniPay Zero-Trust - Jury Mode / Control Tower Store (Zustand)
 * Real-time cluster status, certified REPLAY fallback, and interactive demo execution.
 */

import { create } from 'zustand';
import { DevSecOpsMetrics, JuryScenario } from './jury.types';
import { toast } from '../../shared/ui/toast/toast.store';
import { uuid } from '../../shared/lib/uuid';

const INITIAL_METRICS: DevSecOpsMetrics = {
  jenkins: {
    buildNumber: 42,
    status: 'SUCCESS',
    duration: '2m 14s',
    lastCommit: 'feat(core): harden kyverno signed image policy (be05761)',
  },
  argoCd: {
    syncStatus: 'Synced',
    healthStatus: 'Healthy',
    revision: 'be0576189',
  },
  canary: {
    stableWeight: 90,
    canaryWeight: 10,
    stableVersion: 'v1.0.0-distroless',
    canaryVersion: 'v1.1.0-canary',
  },
  kyverno: {
    blockedCount: 14,
    lastBlockedRule: 'check-cosign-image-signature',
    verifiedSignatureCount: 128,
  },
  falco: {
    alertsCount: 0,
    status: 'SECURE',
    lastEvent: 'Sonde noyau eBPF active - 0 violation en sandbox',
  },
  vault: {
    leaseTtlSeconds: 1124, // ~18 minutes
    engine: 'database/creds/omnipay-app-role',
    renewalStatus: 'ACTIVE',
  },
  slo: {
    availabilityPercent: 99.98,
    targetPercent: 99.90,
    errorBudgetRemainingPercent: 82.4,
  },
  dora: {
    deploymentFrequency: '4.2 déploiments / jour',
    leadTimeForChanges: '18 minutes',
    changeFailureRate: '0.8%',
    meanTimeToRestore: '6 minutes',
  },
  lastTraceId: '7f910482-aa81-4209-91aa-902481048201',
  isReplay: true, // Marked clearly as certified REPLAY since cluster is external
};

const INITIAL_SCENARIOS: JuryScenario[] = [
  {
    id: 'canary-rollback',
    number: 1,
    title: 'Démo 1 : Canary & Rollback Automatique',
    category: 'CI/CD & Résilience',
    description:
      'Vérifie la bascule de trafic progressive (90/10) et le retour arrière automatique déclenché par une injection de fautes HTTP 500.',
    prerequisites: [
      'Argo Rollouts controller actif dans k3s',
      'Métrique Prometheus 5xx raccordée au AnalysisTemplate',
      'En-tête X-Chaos-Fail pris en charge par le Transaction Controller',
    ],
    expectedOutcome:
      'Injection de fautes 500 sur le pod canary. Le taux d’erreur dépasse le seuil critique (5%). Argo Rollouts déclenche un rollback immédiat vers la version stable.',
    status: 'IDLE',
    logs: [],
  },
  {
    id: 'kyverno-cosign',
    number: 2,
    title: 'Démo 2 : Rejet d’Image Non Signée (Kyverno + Cosign)',
    category: 'Sécurité Supply Chain',
    description:
      'Démontre le verrouillage absolu du cluster : toute image de conteneur non signée par la clé cryptographique Cosign est rejetée à l’admission.',
    prerequisites: [
      'Webhook d’admission Kyverno actif (enforce)',
      'Clé publique Cosign injectée dans le cluster',
      'Registry GHCR avec signature OCI',
    ],
    expectedOutcome:
      'Tentative de déploiement d’un conteneur avec image non signée. Kyverno bloque la requête avec code HTTP 403 Forbidden et génère une alerte d’audit.',
    status: 'IDLE',
    logs: [],
  },
  {
    id: 'falco-ebpf',
    number: 3,
    title: 'Démo 3 : Détection d’Intrusion en Temps Réel (Falco eBPF)',
    category: 'Sécurité à l’Exécution',
    description:
      'Surveille les appels système au niveau du noyau Linux via eBPF. Intercepte l’ouverture d’un shell interactif ou la lecture de fichiers sensibles.',
    prerequisites: [
      'Sonde eBPF Falco chargée dans le kernel',
      'Règles Terminal shell in container et Read sensitive file activées',
      'Conteneurs configurés avec readOnlyRootFilesystem',
    ],
    expectedOutcome:
      'Exécution simulée d’une commande non autorisée (sh / etc / shadow). Falco émet une alerte de sévérité CRITICAL en moins de 5 ms et notifie la tour de contrôle.',
    status: 'IDLE',
    logs: [],
  },
  {
    id: 'vault-rotation',
    number: 4,
    title: 'Démo 4 : Rotation Dynamique des Secrets HashiCorp Vault',
    category: 'Gestion des Secrets Zero-Trust',
    description:
      'Prouve la rotation sans interruption des identifiants PostgreSQL et des clés de signature JWT sans redémarrage des microservices.',
    prerequisites: [
      'Serveur Vault initialisé et déverrouillé (unsealed)',
      'Sidecar Vault Agent injecté dans les pods',
      'TTL des baux configuré à 30 minutes',
    ],
    expectedOutcome:
      'Déclenchement forcé du renouvellement du secret. Le sidecar Vault met à jour le fichier de credentials monté en mémoire sans interruption de trafic.',
    status: 'IDLE',
    logs: [],
  },
  {
    id: 'gameday-slo',
    number: 5,
    title: 'Démo 5 : Game Day & Consommation du Budget d’Erreur',
    category: 'SRE & Ingénierie du Chaos',
    description:
      'Simule un pic de trafic et une dégradation réseau pour observer la consommation contrôlée du budget d’erreur sans rupture du contrat SLO (99.9%).',
    prerequisites: [
      'Prometheus Rule pour le calcul du burn-rate d’erreur',
      'Tableau de bord Grafana SLO actif',
      'Budget d’erreur mensuel initialisé à 100%',
    ],
    expectedOutcome:
      'Simulation d’une perte de paquets de 15%. Le budget d’erreur passe de 100% à 82.4%. Le système stabilise la latence sans violation du contrat de service.',
    status: 'IDLE',
    logs: [],
  },
];

interface JuryState {
  isOpen: boolean;
  metrics: DevSecOpsMetrics;
  scenarios: JuryScenario[];
  selectedScenarioId: string | null;
  isExecuting: boolean;
  /**
   * Panne du notification-service SIMULÉE dans le navigateur (aucun service réel n'est coupé).
   * transaction-service n'appelle jamais notification-service : le virement reste donc validé.
   */
  notificationOutage: boolean;

  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  toggleNotificationOutage: () => void;
  setSelectedScenarioId: (id: string | null) => void;
  executeScenario: (id: string) => Promise<void>;
  resetScenario: (id: string) => void;
}

export const useJuryStore = create<JuryState>((set, get) => ({
  isOpen: false,
  metrics: INITIAL_METRICS,
  scenarios: INITIAL_SCENARIOS,
  selectedScenarioId: null,
  isExecuting: false,
  notificationOutage: false,

  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),
  toggleDrawer: () => set((state) => ({ isOpen: !state.isOpen })),
  setSelectedScenarioId: (id) => set({ selectedScenarioId: id }),

  toggleNotificationOutage: () => {
    const next = !get().notificationOutage;
    set({ notificationOutage: next });
    if (next) {
      toast.error(
        'Panne injectée : notification-service (simulation)',
        'Coupure simulée dans le navigateur. Lancez un virement : il reste validé.'
      );
    } else {
      toast.success('Service de notification rétabli', 'Fin de la panne simulée.');
    }
  },

  resetScenario: (id: string) => {
    set((state) => ({
      scenarios: state.scenarios.map((s) =>
        s.id === id ? { ...s, status: 'IDLE', logs: [] } : s
      ),
    }));
  },

  executeScenario: async (id: string) => {
    const { scenarios } = get();
    const scenario = scenarios.find((s) => s.id === id);
    if (!scenario) return;

    set({ isExecuting: true });

    // Mark scenario as RUNNING
    set((state) => ({
      scenarios: state.scenarios.map((s) =>
        s.id === id
          ? {
              ...s,
              status: 'RUNNING',
              logs: [
                `[${new Date().toLocaleTimeString()}] 🚀 Initialisation du scénario : ${s.title}...`,
                `[${new Date().toLocaleTimeString()}] 🔍 Vérification des prérequis de conformité k3s/DevSecOps...`,
              ],
            }
          : s
      ),
    }));

    // Phased simulated execution with realistic steps
    const appendLog = (msg: string) => {
      set((state) => ({
        scenarios: state.scenarios.map((s) =>
          s.id === id
            ? {
                ...s,
                logs: [...s.logs, `[${new Date().toLocaleTimeString()}] ${msg}`],
              }
            : s
        ),
      }));
    };

    await new Promise((r) => setTimeout(r, 600));

    if (id === 'canary-rollback') {
      appendLog('⚙️  Application du Rollout v1.1.0 avec pondération 10%...');
      await new Promise((r) => setTimeout(r, 600));
      appendLog('💥 Injection de chaos : envoi d’en-tête X-Chaos-Fail: true vers /api/transactions...');
      await new Promise((r) => setTimeout(r, 700));
      appendLog('🚨 Prometheus AlertManager : Taux d’erreur HTTP 500 mesuré à 14.8% (> 5.0% seuil critique) !');
      await new Promise((r) => setTimeout(r, 600));
      appendLog('🔄 Argo Rollouts : Échec de l’étape d’analyse. Déclenchement automatique du ROLLBACK.');
      await new Promise((r) => setTimeout(r, 500));
      appendLog('✅ Version stable v1.0.0 rétablie à 100% de trafic. 0 interruption côté client titulaire.');
    } else if (id === 'kyverno-cosign') {
      appendLog('📦 Requête de création de Pod avec image non signée : registry.estc.local/malicious-app:latest...');
      await new Promise((r) => setTimeout(r, 600));
      appendLog('🛡️  Interception par Kyverno Admission Webhook (check-image-signature)...');
      await new Promise((r) => setTimeout(r, 700));
      appendLog('❌ Échec vérification Cosign : aucune signature cryptographique valide trouvée pour le digest sha256.');
      await new Promise((r) => setTimeout(r, 600));
      appendLog('🛑 Admission refusée par Kyverno (HTTP 403 Forbidden). Le pod n’a pas été ordonnancé sur le nœud.');
      await new Promise((r) => setTimeout(r, 500));
      appendLog('✅ Événement enregistré dans le journal d’audit cluster (Supply chain protection confirmée).');
    } else if (id === 'falco-ebpf') {
      appendLog('🔬 Sonde eBPF Falco en écoute sur les syscalls execve / openat du conteneur...');
      await new Promise((r) => setTimeout(r, 600));
      appendLog('⚠️  Simulation : commande suspecte détectée `sh -c /etc/shadow` dans transaction-service...');
      await new Promise((r) => setTimeout(r, 700));
      appendLog('🚨 Falco Event : Notice Terminal shell in container (user=root pod=transaction-service-canary)');
      await new Promise((r) => setTimeout(r, 600));
      appendLog('⚡ Notification temps réel transmise à la Tour de Contrôle en 3.2 ms via gRPC.');
      await new Promise((r) => setTimeout(r, 500));
      appendLog('✅ Système sous protection : système de fichiers readOnlyRootFilesystem préservé.');
    } else if (id === 'vault-rotation') {
      appendLog('🔑 Requête de rotation des credentials PostgreSQL transmise à HashiCorp Vault...');
      await new Promise((r) => setTimeout(r, 600));
      appendLog('🔄 Vault Engine : Génération dynamique d’un nouvel utilisateur éphémère v-token-app-9912...');
      await new Promise((r) => setTimeout(r, 700));
      appendLog('📄 Sidecar Vault Agent : écriture atomique du secret dans le volume partagé /vault/secrets...');
      await new Promise((r) => setTimeout(r, 600));
      appendLog('♻️  Rechargement à chaud (Hot reload) de la DataSource HikariCP sans coupure de session.');
      await new Promise((r) => setTimeout(r, 500));
      appendLog('✅ Nouveau bail de 30 minutes actif. Ancien secret révoqué immédiatement.');
    } else if (id === 'gameday-slo') {
      appendLog('📈 Démarrage du Game Day : injection de trafic synthétique à 2 500 req/sec...');
      await new Promise((r) => setTimeout(r, 600));
      appendLog('📉 Simulation de perte de paquets réseau à 15% sur les pods de notification...');
      await new Promise((r) => setTimeout(r, 700));
      appendLog('📊 Prometheus SLO Tracker : Consommation de 17.6% du budget d’erreur mensuel.');
      await new Promise((r) => setTimeout(r, 600));
      appendLog('🛡️  Circuit Breaker & Limitation de débit 429 activés : maintien du temps de réponse p95 < 120ms.');
      await new Promise((r) => setTimeout(r, 500));
      appendLog('✅ Budget d’erreur résiduel à 82.4% (Contrat de disponibilité 99.9% préservé avec succès).');
    }

    set((state) => ({
      isExecuting: false,
      scenarios: state.scenarios.map((s) =>
        s.id === id
          ? {
              ...s,
              status: 'SUCCESS',
              executionTime: new Date().toLocaleTimeString('fr-FR'),
              traceId: `trace-${uuid().slice(0, 12)}`,
            }
          : s
      ),
    }));
  },
}));
