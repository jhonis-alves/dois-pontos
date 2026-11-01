import { CalendarDays, Clock3 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { PhaseNotice } from '../components/ui/PhaseNotice';

export function CalendarPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Calendário"
        title="Calendário"
        description="Visões diária, semanal e mensal com eventos individuais e compartilhados."
      />

      <PhaseNotice
        icon={CalendarDays}
        phase="Próxima etapa"
        title="Calendário e eventos depois"
        description="Tarefas e hábitos já estão ativos. A agenda com eventos individuais e compartilhados será construída na sequência da Rotina."
        items={[
          'Visões diária, semanal e mensal',
          'Diferenciação visual entre privado e compartilhado',
          'Identificação de conflitos de horário',
          'Sem integração externa até ser implementada e testada',
        ]}
      />

      <PhaseNotice
        icon={Clock3}
        phase="Regra"
        title="Fuso horário oficial"
        description="As datas de recorrência usam America/Sao_Paulo como padrão. A geração de ocorrências precisa ser idempotente para não duplicar eventos ao recarregar."
      />
    </div>
  );
}
