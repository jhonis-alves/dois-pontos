import { FileDown, PieChart } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { PhaseNotice } from '../components/ui/PhaseNotice';

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Relatórios"
        title="Relatórios"
        description="Resumo mensal, gastos por categoria, evolução e exportação."
      />

      <PhaseNotice
        icon={PieChart}
        phase="Fase 4"
        title="Relatórios em preparação"
        description="Os relatórios serão calculados a partir das transações reais, respeitando período, contexto e permissões. Nenhum número será exibido antes disso."
        items={[
          'Receitas recebidas versus previstas',
          'Despesas pagas versus pendentes',
          'Gastos por categoria, pessoa e escopo',
          'Comparação com o mês anterior',
        ]}
      />

      <PhaseNotice
        icon={FileDown}
        phase="Fase 6"
        title="Exportação"
        description="Exportação em CSV e, se viável, PDF, com filtros de privacidade para nunca incluir dados privados do outro membro."
      />
    </div>
  );
}
