# PRD — Plataforma SaaS de Gestão de Apostas (BetOps)

## Problema original
Construir uma plataforma web estilo BetTracker/SureControl para gestão de banca, registro e análise matemática de apostas esportivas (arbitragem, freebet, valor), com dashboard analítico, relatórios e suporte multicasas.

## Escolhas e decisões de arquitetura
- Stack implementada no ambiente atual: **React + FastAPI + MongoDB** (mantendo template e variáveis protegidas).
- API com autenticação JWT, modelos Pydantic e isolamento por usuário.
- Seed automático de casas de apostas com a lista completa solicitada pelo usuário ao criar conta.
- Frontend em layout “trading desk” escuro, rotas separadas por módulo e métricas visuais.

## O que foi implementado
- Autenticação: cadastro, login, sessão (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`).
- Multicasas: listagem e cadastro de casas; seed inicial completo da lista fornecida.
- Gestão financeira: transações (depósito/saque), saldo por casa recalculado.
- Apostas: registro com tipos (simples, múltipla, arbitragem, freebet, dutching, super_odds, duplo_green) e lucro/prejuízo automático.
- Calculadoras: arbitragem (stake A/B, lucro garantido, ROI) e freebet (SNR/SR, hedge, lucro esperado).
- Dashboard analítico: banca atual, ROI, yield, taxa de acerto, curva de crescimento, lucro por estratégia, últimas apostas.
- Relatórios avançados: mensal, por estratégia, por casa e performance por faixa de odds.
- UX hardening após testes: bloqueio de submit precoce em Transações/Apostas, validações explícitas, testids estáveis no menu, estados vazios/carregamento, correção de warnings de gráficos.

## Backlog priorizado
### P0 (próximo ciclo)
- Edição/exclusão de transações e apostas.
- Filtros avançados (período, casa, esporte, estratégia) em todas as tabelas.
- Paginação/virtualização para grandes volumes.

### P1
- Estratégias customizadas com metas e tags.
- Importação CSV de histórico de apostas/transações.
- Exportação PDF/CSV de relatórios.

### P2
- Alertas automáticos de ROI/yield por estratégia.
- Benchmark entre casas e ranking de eficiência.
- Camada de cache para dashboards pesados.

## Próximas tarefas recomendadas
1. Implementar CRUD completo de apostas e transações.
2. Adicionar filtros globais por período/casa/estratégia.
3. Criar exportação de relatórios e snapshots mensais.
