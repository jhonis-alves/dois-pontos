# DOIS PONTOS — ESPECIFICAÇÃO DO PRODUTO
Versão do documento: 1.0
Idioma da interface: Português do Brasil (pt-BR)
Moeda padrão: Real brasileiro (BRL)

## 1. Visão geral

**Dois Pontos** é uma aplicação web para casais organizarem a vida individual e compartilhada em um só lugar. Os dois grandes pilares são:

1. **Rotina:** tarefas, hábitos, compromissos, calendário e responsabilidades individuais ou compartilhadas.
2. **Finanças:** receitas, despesas, contas, cartões, parcelas, orçamento, metas e relatórios.

A aplicação deve funcionar em computadores, Android e iOS. O objetivo é entregá-la como uma Progressive Web App (PWA) instalável, com interface responsiva e dados sincronizados entre dispositivos.

Não construir apenas um protótipo visual. O resultado precisa ter persistência real, autenticação, autorização, validações, tratamento de erros e testes.

## 2. Conceito e identidade da marca

Nome: **Dois Pontos**

Conceito: duas pessoas com individualidades próprias que constroem uma vida em conjunto.

A marca deve transmitir organização, parceria, clareza, equilíbrio e planejamento. Usar a logo já criada, se estiver disponível no ambiente de trabalho. Caso contrário, criar uma identidade provisória com dois elementos conectados, sem afirmar que a logo original foi utilizada.

## 3. Plataformas e tecnologia

Compatibilidade desejada:
- Windows, Linux e macOS por navegador moderno.
- Android.
- iPhone e iPad.
- Chrome, Edge e Safari atuais.

Requisitos PWA:
- Web app manifest com nome, nome curto, cores e ícones.
- Service worker.
- HTTPS em produção.
- Instalação nas plataformas suportadas.
- Layout adaptado a toque e telas pequenas.
- Estratégia segura de cache.
- Atualização controlada.
- Estados claros para conexão indisponível.
- Offline apenas para funcionalidades implementadas e testadas; não prometer sincronização offline automática sem implementá-la.

Stack sugerida, caso o ambiente não imponha outra:
- React + TypeScript + Vite.
- Tailwind CSS ou solução equivalente bem organizada.
- Supabase Auth + PostgreSQL + Row Level Security (RLS), ou alternativa equivalente.
- Biblioteca de gráficos e validação adequada.
- Testes unitários, de integração e de interface.

Não usar localStorage como banco de dados principal. Ele pode guardar preferências locais não sensíveis. Os dados oficiais devem estar em um banco remoto para sincronização entre dispositivos. Nunca expor segredos administrativos no navegador.

## 4. Arquitetura modular

Separar o projeto em módulos claros:

1. **Autenticação e acesso:** cadastro, login, sessão, recuperação de senha, convites e autorização.
2. **Dashboard:** resumo da rotina e das finanças de acordo com o contexto ativo.
3. **Rotina:** tarefas, calendário, hábitos, recorrências e responsabilidades.
4. **Financeiro:** receitas, despesas, contas, cartões, parcelamentos, orçamento, metas e relatórios.
5. **Configurações:** perfis, temas, categorias, notificações, preferências e espaço do casal.
6. **Infraestrutura compartilhada:** banco de dados, autorização, validações, sincronização, logs técnicos e tratamento de erros.

Usar componentes reutilizáveis, serviços organizados e regras de negócio centralizadas. Evitar um único arquivo gigante. Se já existir um projeto, inspecionar a estrutura antes de alterar arquivos.

## 5. Contas, perfis e espaço compartilhado

O sistema deve atender inicialmente a dois membros de um casal.

### 5.1 Contas individuais

Cada pessoa deve possuir:
- Conta e autenticação próprias.
- Nome de exibição, e-mail e avatar.
- Preferências visuais próprias.
- Tarefas, hábitos, compromissos, receitas e despesas privadas.
- Preferências de notificação.

### 5.2 Espaço compartilhado

Criar um espaço do casal, chamado por padrão **Nosso Espaço**, acessível às duas contas. Nele, os dois poderão consultar e administrar, conforme as permissões:
- Tarefas e compromissos conjuntos.
- Responsabilidades domésticas.
- Metas do casal.
- Receitas e despesas compartilhadas.
- Orçamentos comuns.
- Contas e cartões compartilhados.
- Relatórios conjuntos.

### 5.3 Vinculação do casal

Fluxo esperado:
1. Primeiro usuário cria uma conta.
2. Cria o espaço do casal.
3. Gera convite seguro para o segundo membro.
4. Segundo membro cria conta ou autentica-se e aceita o convite.
5. As duas contas são vinculadas ao mesmo espaço.
6. Ambos conseguem acessar os dados compartilhados simultaneamente, em dispositivos diferentes.

Convites devem expirar, ser de uso único e poder ser revogados. Inicialmente, permitir exatamente dois membros ativos por espaço.

Não usar uma conta única com senha compartilhada como mecanismo principal. Cada membro deve autenticar-se separadamente e entrar no espaço comum. Um atalho “Nosso Espaço” pode selecionar o contexto após o login.

### 5.4 Privacidade e autorização

Todo registro deve ter um escopo claro:
- Privado do membro A.
- Privado do membro B.
- Compartilhado pelo casal.

A autorização precisa ser aplicada no servidor/banco, não apenas na interface. Se usar Supabase, criar e testar políticas RLS em todas as tabelas relevantes. Nunca confiar somente em IDs enviados pelo navegador.

Registrar autoria e datas de criação/modificação nos registros relevantes. Dados privados não podem vazar por APIs, consultas, relatórios, exportações, logs ou notificações.

## 6. Dashboard

Criar um painel inicial responsivo, claro e personalizável, contendo conforme o contexto e o período:
- Saudação e data atual.
- Seletor entre “Meu Espaço” e “Nosso Espaço”.
- Tarefas pendentes, atrasadas e próximas.
- Próximos compromissos.
- Progresso dos hábitos e metas.
- Receitas, despesas, saldo e orçamento do período.
- Contas a vencer e próximas parcelas.
- Gráficos resumidos.
- Atividades recentes.
- Atalhos para adicionar tarefa, receita ou despesa.

Não sobrecarregar o painel. Os valores devem respeitar o período, o contexto e as permissões do usuário.

## 7. Módulo Rotina

### 7.1 Tarefas

Campos sugeridos:
- Título e descrição.
- Criador e responsável.
- Data de criação, início, prazo e horário.
- Prioridade: baixa, normal, alta, urgente.
- Status: pendente, em andamento, concluída, cancelada.
- Categoria e etiquetas.
- Recorrência e lembretes.
- Subtarefas e observações.
- Escopo individual ou compartilhado.
- Histórico de alterações.

Ações: criar, consultar, editar, concluir, duplicar, arquivar e excluir, com confirmação para ações destrutivas.

### 7.2 Visualizações e filtros

Disponibilizar:
- Lista.
- Kanban.
- Calendário.
- Visão diária, semanal e mensal.
- Tarefas por responsável.
- Tarefas compartilhadas.
- Tarefas atrasadas.
- Filtros por categoria, prioridade, status, responsável e período.
- Pesquisa e ordenação.

### 7.3 Rotina individual e compartilhada

Rotinas individuais podem incluir trabalho, estudo, treino e compromissos particulares. Não devem ser reveladas automaticamente ao outro membro.

Rotinas compartilhadas podem incluir compras, limpeza, refeições, compromissos familiares, lazer, planejamento semanal e pagamentos de contas.

### 7.4 Hábitos e recorrências

Permitir hábitos diários, semanais e mensais, frequência configurável, registro de conclusão, histórico, sequência e metas. Recorrências precisam respeitar fuso horário e datas de término, sem gerar duplicatas ao recarregar a aplicação.

### 7.5 Calendário e planejamento semanal

Calendário diário, semanal e mensal com diferenciação visual entre eventos individuais e compartilhados. Planejamento semanal com prioridades, distribuição de tarefas, revisão de pendências e identificação de possíveis conflitos de horário.

Não afirmar que há integração com Google Calendar ou Apple Calendar sem implementar e testar a integração.

### 7.6 Comentários e histórico

Tarefas compartilhadas podem conter comentários com autoria e horário. Exibir histórico útil de alterações.

## 8. Módulo Financeiro

Configuração padrão:
- Moeda BRL.
- Formatação pt-BR: R$, separador decimal por vírgula e milhar por ponto.
- Datas exibidas em DD/MM/AAAA.

### 8.1 Receitas

Permitir salários, renda extra, freelances, comissões, reembolsos e outras fontes.

Campos: descrição, valor, data de competência, data de recebimento, categoria, origem, responsável, conta de destino, escopo, status (previsto, recebido, cancelado), recorrência e observações.

### 8.2 Despesas

Permitir moradia, água, energia, internet, alimentação, transporte, saúde, lazer, educação, assinaturas, compras pessoais e categorias personalizadas.

Campos: descrição, valor, categoria, data da compra/competência, vencimento, pagamento, responsável, conta/cartão, forma de pagamento, escopo, status (prevista, pendente, paga, cancelada), recorrência, parcelamento e observações.

Distinguir claramente previsto de efetivamente pago.

### 8.3 Contas

Permitir contas correntes, contas digitais, dinheiro, poupança, reservas e outras. Cada conta possui nome, tipo, titularidade, saldo inicial e situação. Calcular saldo a partir do saldo inicial e movimentações válidas, evitando duplicidade.

### 8.4 Cartões de crédito

Permitir múltiplos cartões com nome, instituição, titular, limite total, limite utilizado/disponível, fechamento, vencimento, conta de pagamento e escopo individual/compartilhado.

Implementar compras, parcelas, faturas e pagamento de faturas. O limite deve ser calculado consistentemente com compras e pagamentos.

### 8.5 Parcelamentos

Uma compra parcelada deve registrar valor total, quantidade e valor de parcelas, data da compra, primeira parcela, cartão/meio de pagamento, responsável, categoria e escopo. Gerar parcelas vinculadas à compra original, cada uma com vencimento e status.

Editar, cancelar ou excluir parcelamentos exige regras claras, especialmente se já houver parcelas pagas. Não duplicar parcelas ao atualizar ou reprocessar registros.

### 8.6 Recorrências e contas futuras

Permitir despesas mensais e recorrentes, como aluguel, internet, academia e assinaturas. Exibir próximas obrigações e diferenciar previsto de pago. A geração de ocorrências deve ser idempotente.

### 8.7 Transferências

Transferências entre contas próprias não devem ser contabilizadas como receita ou despesa no orçamento. Registrar os dois lados de forma consistente, evitando transferências parciais ou duplicadas.

### 8.8 Orçamentos

Permitir orçamento total e por categoria, limites individuais e compartilhados, metas de economia e alertas de proximidade do limite. Exibir percentual utilizado, valor restante e comparação entre planejado e realizado.

### 8.9 Metas financeiras

Permitir objetivos como reserva de emergência, viagem, imóvel, veículo e quitação de dívidas. Cada meta deve ter nome, valor desejado, acumulado, prazo, responsáveis, contribuições, escopo e progresso percentual. Não contar a mesma contribuição duas vezes.

### 8.10 Indicadores e relatórios

Dashboard financeiro com receitas recebidas/previstas, despesas pagas/pendentes, saldo, resultado do período, gastos por categoria e membro, gastos individuais versus compartilhados, evolução mensal, vencimentos, cartões, orçamento e metas.

Criar resumo mensal com comparação com mês anterior, maiores categorias de gastos, contas pagas/pendentes e evolução da economia.

Permitir filtros por período, categoria, pessoa, conta, cartão, escopo e status. Exportar CSV e, se viável, PDF, respeitando permissões de privacidade.

### 8.11 Precisão e regras financeiras

Não usar ponto flutuante JavaScript como única representação de dinheiro. Armazenar em centavos inteiros ou tipo decimal apropriado e definir arredondamento consistente.

Distinguir data de compra, competência, vencimento, pagamento e recebimento.

Regras obrigatórias:
- Uma despesa cadastrada não é automaticamente paga.
- Transferências não são novas receitas.
- Uma compra no cartão não pode ser contabilizada novamente como despesa quando a fatura for paga.
- O pagamento da fatura deve liquidar a obrigação sem duplicar os gastos originais.
- Recorrências e parcelas não podem ser duplicadas.
- Testar cálculos e casos de borda.

## 9. Módulo Configurações

Organizar seções:
- Perfil: nome, e-mail, avatar e preferências.
- Espaço do casal: nome, membros, convites, permissões e encerramento.
- Aparência: tema claro, escuro, automático e cor de destaque.
- Rotina: categorias, etiquetas, prioridades, horários e lembretes.
- Financeiro: categorias, contas, cartões, formas de pagamento e preferências.
- Notificações: tarefas, vencimentos, orçamento e alterações compartilhadas.
- Dados e segurança: sessões, exportação, exclusão de conta e informações de privacidade.

Preferências visuais individuais não devem alterar as do outro membro. Encerrar a associação ou excluir uma conta não pode apagar silenciosamente dados compartilhados; definir um fluxo seguro e documentado.

## 10. Identidade visual e temas

Usar a logo existente quando disponível. Construir um design system consistente com tokens para cores, tipografia, espaçamento, bordas, sombras e estados.

### Perfil masculino
- Tema escuro: azul-marinho/grafite azulado, superfícies azul-escuras, destaque azul vivo ou royal, textos claros.
- Tema claro: fundo branco ou cinza muito claro, superfícies brancas, destaque azul-escuro, texto grafite.

### Perfil feminino
- Tema escuro: ameixa/grafite arroxeado, superfícies roxo-escuras, destaque violeta ou lavanda intensa, textos claros.
- Tema claro: fundo branco ou cinza muito claro, superfícies brancas, destaque roxo, texto grafite.

### Espaço compartilhado
Usar a identidade central Dois Pontos, neutra e elegante, combinando as cores da logo. Se a logo não estiver disponível, usar provisoriamente azul profundo, roxo e uma cor complementar discreta.

A preferência de tema é independente por usuário. Ao entrar no espaço compartilhado, usar a identidade compartilhada sem sobrescrever as preferências individuais. Não depender apenas de cor para transmitir status; garantir contraste, acessibilidade, foco visível e alvos de toque adequados.

## 11. Navegação e UX

Desktop: sidebar recolhível e área principal ampla.
Mobile: navegação adaptada, menu compacto ou barra inferior com ações frequentes.

Navegação sugerida:
- Dashboard.
- Rotina.
- Calendário.
- Financeiro.
- Relatórios.
- Configurações.

Cabeçalho com avatar/nome, seletor de contexto, tema, notificações e atalhos de criação.

Implementar pesquisa, filtros, ordenação, estados de carregamento, estados vazios com orientação, mensagens de sucesso/erro, validações e confirmações. Evitar recarregar toda a página para operações comuns.

## 12. Sincronização e confiabilidade

Dados compartilhados devem ser persistidos em banco remoto. Alterações devem aparecer para o outro membro via tempo real, se suportado, ou estratégia confiável de atualização.

Tratar falhas de rede, sessão expirada, edições concorrentes, conflitos, requisições repetidas e reconexão. Não mostrar “salvo” antes de uma confirmação confiável do backend.

Se houver modo offline, indicar quais operações funcionam offline, manter fila segura e sincronizar sem duplicar registros. Não colocar dados financeiros sensíveis em caches públicos ou indiscriminados.

## 13. Segurança e privacidade

Implementar autenticação segura, autorização por registro, validação de entradas, políticas de acesso, tratamento seguro de sessões e convites, prevenção de operações duplicadas e logs sem dados pessoais desnecessários.

Nunca armazenar senhas em texto puro. Não expor dados privados do outro membro por API, relatório, exportação, log ou notificação.

Implementar exportação e solicitação de exclusão de dados com confirmação e regras claras. Documentar como tratar dados compartilhados quando um membro sair do espaço.

## 14. Acessibilidade e compatibilidade

Usar HTML semântico, navegação por teclado, labels adequados, mensagens claras, leitores de tela, foco visível, contraste suficiente, redução de movimento quando solicitada e controles adequados para toque.

Testar diferentes tamanhos de tela e navegadores modernos.

## 15. Testes obrigatórios

Autenticação:
- Cadastro, login, logout e recuperação de senha.
- Convites, revogação e expiração.

Privacidade:
- A não acessa dados privados de B.
- Ambos acessam dados compartilhados autorizados.
- Usuário externo não acessa o espaço.
- Permissões são verificadas no backend.

Rotina:
- CRUD de tarefas, conclusão, exclusão, recorrências sem duplicidade, filtros, prazos e sincronização.

Financeiro:
- Receitas, despesas, saldos, transferências, parcelamentos, faturas, pagamento sem dupla contabilização, recorrências, orçamentos, metas e resumo mensal.

PWA e interface:
- Responsividade, temas, preferências individuais, instalação, estados offline, erros e teclado.

Não declarar testes aprovados sem executá-los. Documentar resultados e limitações.

## 16. Entregáveis

Entregar:
- Código-fonte organizado.
- Migrações e esquema do banco.
- Políticas de segurança.
- Configurações de PWA e ícones.
- Testes.
- Arquivo de exemplo de variáveis de ambiente sem segredos.
- README.
- Instruções de instalação e execução local.
- Instruções para configurar o banco.
- Instruções de implantação e atualização.
- Documentação dos módulos e das regras financeiras.

Nunca incluir credenciais reais no repositório. Se um serviço exigir configuração manual, explicar exatamente o que falta.

## 17. Plano de implementação

Trabalhar por fases, mantendo o projeto executável ao final de cada uma:

1. Fundação: inspecionar ambiente, definir arquitetura, configurar stack, design system, navegação e banco.
2. Autenticação: contas, perfis, convites, espaço compartilhado e segurança.
3. Rotina: tarefas, Kanban, calendário, hábitos e recorrências.
4. Financeiro: receitas, despesas, contas, cartões, parcelas, orçamento, metas e relatórios.
5. Dashboard e configurações: indicadores, gráficos, preferências e notificações.
6. PWA e qualidade: manifesto, service worker, testes, segurança, otimização e documentação.

Priorizar fluxos completos e persistência real em vez de muitas telas superficiais.

## 18. Instruções de trabalho para o agente

1. Primeiro inspecione o ambiente e qualquer projeto já existente.
2. Apresente um plano conciso, o modelo de dados e a estrutura dos módulos.
3. Depois implemente; não pare no planejamento.
4. Se houver um projeto existente, preservar o que funciona e evitar sobrescrever arquivos sem necessidade.
5. Fazer perguntas apenas quando uma decisão essencial não puder ser tomada por padrão razoável.
6. Não simular autenticação, banco, sincronização ou cálculos para fingir que estão funcionais.
7. Não misturar dados de demonstração com dados reais.
8. Executar testes após cada etapa e corrigir falhas encontradas.
9. Não afirmar que algo está pronto, sincronizado ou seguro sem verificar.
10. Manter documentação atualizada sobre decisões, progresso, limitações e próximos passos.
11. Ao finalizar cada fase, registrar um resumo curto em arquivo de progresso e indicar o próximo passo.
12. Para reduzir o uso de contexto, ler este documento e os arquivos de progresso relevantes, trabalhar em um módulo por vez e evitar carregar repetidamente o documento inteiro se o ambiente permitir consultar seções específicas.

## 19. Critérios de aceitação

O sistema só pode ser considerado concluído quando:
- Dois usuários têm contas individuais e acessam o mesmo espaço compartilhado simultaneamente.
- Dados compartilhados sincronizam entre dispositivos.
- Dados privados permanecem isolados.
- Rotina funciona com persistência real.
- Financeiro calcula corretamente saldos, cartões, parcelas e transferências.
- Não há dupla contabilização de compras e faturas.
- Dashboard mostra dados reais.
- Temas e preferências individuais funcionam.
- Espaço compartilhado usa a identidade visual Dois Pontos.
- PWA pode ser instalada nas plataformas suportadas.
- Testes críticos foram executados.
- Documentação permite configurar e executar o projeto.

**Resultado esperado:** uma plataforma Dois Pontos funcional, segura, modular, responsiva e expansível para organização pessoal e financeira de casais.
