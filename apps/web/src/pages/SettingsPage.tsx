import {
  Mail,
  Monitor,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { SpaceSection } from '../components/space/SpaceSection';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { usePreferences } from '../context/preferences';
import { cn } from '../lib/cn';

const THEME_OPTIONS = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'auto', label: 'Automático', icon: Monitor },
] as const;

const PALETTE_OPTIONS = [
  { value: 'male', label: 'Azul', hint: 'Paleta masculina', swatch: 'bg-[#2563eb]' },
  {
    value: 'female',
    label: 'Ameixa',
    hint: 'Paleta feminina',
    swatch: 'bg-[#a855f7]',
  },
] as const;

export function SettingsPage() {
  const { mode, palette, space, activePalette, setMode, setPalette } =
    usePreferences();

  const activePaletteLabel =
    activePalette === 'shared'
      ? 'Compartilhada'
      : activePalette === 'female'
        ? 'Ameixa'
        : 'Azul';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Preferências"
        title="Configurações"
        description="Aparência, espaço do casal e privacidade. As preferências visuais são salvas apenas neste dispositivo."
      />

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Aparência</p>
            <h2 className="section-title mt-1">Tema e paleta</h2>
          </div>
          <Badge variant="primary">
            {space === 'shared' ? 'Identidade compartilhada' : `Paleta: ${activePaletteLabel}`}
          </Badge>
        </div>

        <div className="mt-5 space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Modo de tema</p>
            <div className="segmented" role="group" aria-label="Modo de tema">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  data-active={mode === value}
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                >
                  <Icon size={15} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-[var(--muted)]">
              O modo automático acompanha a preferência do sistema operacional.
            </p>
          </div>

          <div className="divider" />

          <div className="space-y-2">
            <p className="text-sm font-semibold">Paleta individual</p>
            <div className="segmented" role="group" aria-label="Paleta individual">
              {PALETTE_OPTIONS.map(({ value, label, hint, swatch }) => (
                <button
                  key={value}
                  type="button"
                  data-active={palette === value}
                  aria-pressed={palette === value}
                  onClick={() => setPalette(value)}
                  title={hint}
                >
                  <span
                    className={cn('h-3.5 w-3.5 rounded-full', swatch)}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <p className="flex items-start gap-2 text-xs leading-relaxed text-[var(--muted)]">
              <Palette size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              A paleta escolhida vale para o Meu Espaço. Ao entrar no Nosso
              Espaço, a identidade compartilhada é usada sem sobrescrever sua
              preferência.
            </p>
          </div>
        </div>
      </Card>

      <SpaceSection />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Dados e segurança</p>
              <h2 className="section-title mt-1">Privacidade</h2>
            </div>
            <Badge variant="success">Sessão ativa</Badge>
          </div>

          <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-[var(--muted)]">
            <ShieldCheck
              size={16}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            Apenas tema, paleta e contexto são guardados no navegador. Senhas
            são armazenadas como hash scrypt no servidor, e a sessão usa cookie
            HttpOnly. A autorização por escopo é aplicada na API.
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Recuperação de senha</p>
              <h2 className="section-title mt-1">E-mail pendente</h2>
            </div>
            <Badge variant="warning">Pendente</Badge>
          </div>

          <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-[var(--muted)]">
            <Mail
              size={16}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            A recuperação será habilitada quando um provedor de e-mail estiver
            configurado. Nenhum fluxo de recuperação é simulado nesta fase.
          </p>
        </Card>
      </div>
    </div>
  );
}
