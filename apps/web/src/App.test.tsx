import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { PreferencesProvider } from './context/PreferencesProvider';

const healthPayload = {
  status: 'ok',
  app: 'Dois Pontos API',
  version: '0.1.0',
  database: 'up',
  timezone: 'America/Sao_Paulo',
  timestamp: '2026-10-28T12:00:00.000Z',
};

const sessionPayload = {
  user: {
    id: 'user-1',
    email: 'ana@exemplo.com',
    displayName: 'Ana',
    avatarUrl: null,
    genderPalette: 'female',
    themeMode: 'auto',
  },
  space: {
    id: 'space-1',
    name: 'Nosso Espaço',
    role: 'owner',
  },
  members: [
    {
      id: 'user-1',
      displayName: 'Ana',
      avatarUrl: null,
      role: 'owner',
      joinedAt: '2026-10-28T12:00:00.000Z',
    },
  ],
};

const spacePayload = {
  space: sessionPayload.space,
  members: sessionPayload.members,
  invites: [],
};

let authenticated = false;
let loginShouldFail = false;

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  authenticated = false;
  loginShouldFail = false;
  localStorage.clear();

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method ?? 'GET';

      if (url.endsWith('/api/health')) {
        return jsonResponse(healthPayload);
      }

      if (url.endsWith('/api/auth/me')) {
        return authenticated
          ? jsonResponse(sessionPayload)
          : jsonResponse(
              {
                error: {
                  code: 'UNAUTHENTICATED',
                  message: 'Faça login para continuar.',
                },
              },
              401,
            );
      }

      if (url.endsWith('/api/auth/login') && method === 'POST') {
        if (loginShouldFail) {
          return jsonResponse(
            {
              error: {
                code: 'INVALID_CREDENTIALS',
                message: 'E-mail ou senha incorretos.',
              },
            },
            401,
          );
        }
        authenticated = true;
        return jsonResponse(sessionPayload);
      }

      if (url.endsWith('/api/auth/logout') && method === 'POST') {
        authenticated = false;
        return {
          ok: true,
          status: 204,
          json: async () => null,
        } as Response;
      }

      if (url.endsWith('/api/spaces/current')) {
        return jsonResponse(spacePayload);
      }

      if (url.endsWith('/api/tasks') && method === 'GET') {
        return jsonResponse({ tasks: [] });
      }

      if (url.endsWith('/api/habits') && method === 'GET') {
        return jsonResponse({ habits: [] });
      }

      if (url.includes('/api/finance/accounts') && method === 'GET') {
        return jsonResponse({ accounts: [] });
      }

      if (url.includes('/api/finance/categories') && method === 'GET') {
        return jsonResponse({ categories: [] });
      }

      if (url.includes('/api/finance/cards') && method === 'GET') {
        return jsonResponse({ cards: [] });
      }

      if (url.includes('/api/finance/invoices') && method === 'GET') {
        return jsonResponse({ invoices: [] });
      }

      if (url.includes('/api/finance/transactions') && method === 'GET') {
        const month = url.match(/month=([^&]+)/)?.[1] ?? '2026-10';
        return jsonResponse({
          transactions: [],
          summary: {
            month,
            incomeCents: 0,
            expenseCents: 0,
            netCents: 0,
            realizedIncomeCents: 0,
            realizedExpenseCents: 0,
            realizedNetCents: 0,
            transactionCount: 0,
          },
        });
      }

      return jsonResponse(
        { error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } },
        404,
      );
    }),
  );
});

describe('autenticação e navegação', () => {
  it('redireciona visitante para o login e entra após autenticar', async () => {
    const user = userEvent.setup();
    renderAt('/');

    expect(
      await screen.findByRole('heading', { name: 'Entrar' }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-segura-123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByRole('heading', {
        name: /bom dia|boa tarde|boa noite/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Contexto ativo: Meu Espaço/)).toBeInTheDocument();
  });

  it('mostra a mensagem de credenciais inválidas', async () => {
    const user = userEvent.setup();
    loginShouldFail = true;
    renderAt('/entrar');

    await screen.findByRole('heading', { name: 'Entrar' });
    await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'E-mail ou senha incorretos.',
    );
  });

  it('abre as configurações autenticadas e alterna o tema', async () => {
    const user = userEvent.setup();
    authenticated = true;
    renderAt('/configuracoes');

    expect(
      await screen.findByRole('heading', { name: 'Configurações' }),
    ).toBeInTheDocument();

    const darkButton = screen.getByRole('button', { name: 'Escuro' });
    await user.click(darkButton);

    expect(darkButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('encerra a sessão pelo menu de usuário', async () => {
    const user = userEvent.setup();
    authenticated = true;
    renderAt('/');

    await screen.findByRole('heading', {
      name: /bom dia|boa tarde|boa noite/i,
    });
    await user.click(screen.getByRole('button', { name: 'Sair da conta' }));

    expect(
      await screen.findByRole('heading', { name: 'Entrar' }),
    ).toBeInTheDocument();
  });

  it('abre a rotina com as abas de tarefas e hábitos', async () => {
    const user = userEvent.setup();
    authenticated = true;
    renderAt('/rotina');

    expect(
      await screen.findByRole('heading', { name: 'Rotina do casal' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Nenhuma tarefa por aqui'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Hábitos/ }));

    expect(await screen.findByText('Nenhum hábito ainda')).toBeInTheDocument();
  });

  it('abre o financeiro com contas e transações vazias', async () => {
    authenticated = true;
    renderAt('/financeiro');

    expect(
      await screen.findByRole('heading', { name: 'Financeiro do casal' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Nenhuma conta cadastrada'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Crie uma conta antes de lançar'),
    ).toBeInTheDocument();
  });

  it('mostra a página 404 para rotas desconhecidas', async () => {
    renderAt('/caminho-inexistente');

    expect(
      await screen.findByRole('heading', { name: 'Página não encontrada' }),
    ).toBeInTheDocument();
  });
});
