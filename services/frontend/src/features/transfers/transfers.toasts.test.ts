import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTransferStore, insufficientFundsMessage } from './transfers.store';
import { useAuthStore } from '../auth/auth.store';
import { useAccountsStore } from '../accounts/accounts.store';
import { useTransactionsStore } from '../transactions/transactions.store';
import { useJuryStore } from '../jury/jury.store';
import { useToastStore } from '../../shared/ui/toast/toast.store';
import { formatMinorToCurrency } from '../../shared/lib/money';

type Handler = (url: string, init: RequestInit | undefined) => { status: number; body?: unknown } | Promise<{ status: number; body?: unknown }>;

function mockFetch(handler: Handler) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const { status, body } = await handler(url, init);
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

const isPost = (init?: RequestInit) => init?.method === 'POST';
const postCalls = (fn: ReturnType<typeof mockFetch>) => fn.mock.calls.filter(([, init]) => isPost(init as RequestInit));
const keyOf = (call: unknown[]) => ((call[1] as RequestInit).headers as Record<string, string>)['X-Idempotency-Key'];
const toastsOf = (kind: string) => useToastStore.getState().toasts.filter((t) => t.kind === kind);

function readyTransfer(amountMinor = 25000) {
  const store = useTransferStore.getState();
  store.selectBeneficiary(store.beneficiaries[0]); // Bob Martin -> ACC-BOB-002
  useTransferStore.getState().setAmountMinor(amountMinor);
  useTransferStore.getState().setReason('Remboursement');
}

describe('Toasts de virement et idempotence', () => {
  beforeEach(() => {
    useTransferStore.getState().resetWizard();
    useToastStore.getState().clear();
    useAccountsStore.getState().reset();
    useTransactionsStore.setState({ transactions: [], isLoading: false });
    useJuryStore.setState({ notificationOutage: false });
    useAuthStore.setState({
      session: { username: 'alice', roles: ['ROLE_USER'], token: 'jeton-de-test', expiresAt: Math.floor(Date.now() / 1000) + 3600 },
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('virement confirmé : toast vert avec l’identifiant, puis solde et historique relus automatiquement', async () => {
    const fetchMock = mockFetch((url, init) => {
      if (isPost(init)) return { status: 200, body: { transactionId: 'tx-123', status: 'SUCCESS', amount: 250 } };
      if (url.endsWith('/accounts/me')) return { status: 200, body: [{ accountId: 'ACC-ALICE-001', balance: 750, currency: 'EUR' }] };
      return { status: 200, body: [] };
    });
    readyTransfer();

    expect(await useTransferStore.getState().submitTransfer()).toBe(true);

    // Appels same-origin (chemins relatifs) : le portail ne dépend pas du CORS des microservices
    expect(fetchMock.mock.calls.every(([u]) => String(u).startsWith('/api/transactions'))).toBe(true);

    const [green] = toastsOf('success');
    expect(green.title).toBe('Virement confirmé');
    expect(green.description).toContain('tx-123');
    expect(useTransferStore.getState().currentStep).toBe('success');
    // Rafraîchissement automatique après le virement : solde réel + historique
    expect(useAccountsStore.getState().accounts[0].balanceMinor).toBe(75000);
    const urls = fetchMock.mock.calls.map(([u]) => String(u));
    expect(urls.some((u) => u.endsWith('/api/transactions/accounts/me'))).toBe(true);
    expect(fetchMock.mock.calls.some(([u, init]) => String(u).endsWith('/api/transactions') && !isPost(init as RequestInit))).toBe(true);
  });

  it('triple clic : trois requêtes, MÊME clé, un toast vert et deux toasts jaunes exacts', async () => {
    let first = true;
    const fetchMock = mockFetch((url, init) => {
      if (isPost(init)) {
        const status = first ? 'SUCCESS' : 'IDEMPOTENT_REPLAY';
        first = false;
        return { status: 200, body: { transactionId: 'tx-1', status, amount: 250 } };
      }
      return { status: 200, body: url.endsWith('/accounts/me') ? [] : [] };
    });
    readyTransfer();

    const results = await Promise.all([
      useTransferStore.getState().submitTransfer(),
      useTransferStore.getState().submitTransfer(),
      useTransferStore.getState().submitTransfer(),
    ]);

    expect(results).toEqual([true, true, true]);
    const posts = postCalls(fetchMock);
    expect(posts).toHaveLength(3);
    expect(new Set(posts.map(keyOf)).size).toBe(1);
    expect(toastsOf('success')).toHaveLength(1);
    const yellow = toastsOf('warning');
    expect(yellow).toHaveLength(2);
    expect(yellow[0].description).toBe('Transaction déjà enregistrée, pas de double prélèvement');
    expect(useTransferStore.getState().pendingCount).toBe(0);
    expect(useTransferStore.getState().isLoading).toBe(false);
  });

  it('HTTP 422 : toast rouge au libellé bancaire exact avec le solde réel', async () => {
    mockFetch((url, init) => {
      if (isPost(init)) return { status: 422, body: { status: 422, error: 'Unprocessable Entity' } };
      if (url.endsWith('/accounts/me')) return { status: 200, body: [{ accountId: 'ACC-ALICE-001', balance: 1250, currency: 'EUR' }] };
      return { status: 200, body: [] };
    });
    readyTransfer(500000); // 5 000,00 €

    expect(await useTransferStore.getState().submitTransfer()).toBe(false);

    const [red] = toastsOf('error');
    expect(red.title).toBe('Virement rejeté');
    expect(red.description).toBe(
      `Fonds insuffisants : solde disponible ${formatMinorToCurrency(125000)} vs montant requis ${formatMinorToCurrency(500000)}`
    );
    expect(red.description).toMatch(/^Fonds insuffisants : solde disponible .+ vs montant requis .+$/);
    expect(useTransferStore.getState().currentStep).not.toBe('success');
    expect(useTransferStore.getState().lastReceipt).toBeNull();
  });

  it('insufficientFundsMessage formate solde et montant en euros', () => {
    expect(insufficientFundsMessage(125000, 500000)).toBe(
      `Fonds insuffisants : solde disponible ${formatMinorToCurrency(125000)} vs montant requis ${formatMinorToCurrency(500000)}`
    );
  });

  it('la clé est conservée après une erreur réseau ou 500, renouvelée après un rejet définitif', async () => {
    let status = 0; // 0 = coupure réseau
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (isPost(init) && status === 0) throw new TypeError('Failed to fetch');
      return new Response(JSON.stringify({}), { status: isPost(init) ? status : 200, headers: { 'Content-Type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    readyTransfer();
    const key = useTransferStore.getState().idempotencyKey;

    expect(await useTransferStore.getState().submitTransfer()).toBe(false); // réseau coupé
    expect(useTransferStore.getState().idempotencyKey).toBe(key);
    expect(toastsOf('success')).toHaveLength(0); // aucun faux succès
    expect(toastsOf('error')[0].description).toContain('Réseau indisponible');

    status = 500;
    expect(await useTransferStore.getState().submitTransfer()).toBe(false);
    expect(useTransferStore.getState().idempotencyKey).toBe(key);

    status = 403;
    expect(await useTransferStore.getState().submitTransfer()).toBe(false);
    expect(useTransferStore.getState().idempotencyKey).not.toBe(key);
    expect(postCalls(fetchMock as unknown as ReturnType<typeof mockFetch>).map(keyOf).slice(0, 3)).toEqual([key, key, key]);
  });

  it('la clé change quand l’intention change, pas quand la même valeur est ressaisie', () => {
    readyTransfer(10000);
    const key = useTransferStore.getState().idempotencyKey;

    useTransferStore.getState().setAmountMinor(10000);
    useTransferStore.getState().setReason('Remboursement');
    expect(useTransferStore.getState().idempotencyKey).toBe(key);

    useTransferStore.getState().setAmountMinor(20000);
    expect(useTransferStore.getState().idempotencyKey).not.toBe(key);
  });

  it('panne notification simulée : toast bleu, le virement reste confirmé', async () => {
    mockFetch((_url, init) => {
      if (isPost(init)) return { status: 200, body: { transactionId: 'tx-9', status: 'SUCCESS', amount: 250 } };
      return { status: 200, body: [] };
    });
    useJuryStore.getState().toggleNotificationOutage();
    expect(useJuryStore.getState().notificationOutage).toBe(true);
    readyTransfer();

    expect(await useTransferStore.getState().submitTransfer()).toBe(true);

    expect(toastsOf('success').some((t) => t.title === 'Virement confirmé')).toBe(true);
    const [blue] = toastsOf('info');
    expect(blue.title).toBe('Notification indisponible (panne simulée)');
    expect(useTransferStore.getState().lastReceipt?.status).toBe('SUCCESS');

    useJuryStore.getState().toggleNotificationOutage();
    expect(useJuryStore.getState().notificationOutage).toBe(false);
  });

  it('le store de toasts borne le nombre de notifications visibles et permet de les fermer', () => {
    const { push, dismiss } = useToastStore.getState();
    const ids = Array.from({ length: 8 }, (_, i) => push('info', `Toast ${i}`));
    expect(useToastStore.getState().toasts).toHaveLength(5);
    dismiss(ids[7]);
    expect(useToastStore.getState().toasts).toHaveLength(4);
  });
});
