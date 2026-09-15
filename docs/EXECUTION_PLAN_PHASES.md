# Plano de execução por fases (go/no-go) — URBIS

Este plano operacionaliza as prioridades de homologação, hardening, conformidade e entrada em produção.

## Fase 1 — Homologação técnica integrada (staging)

### Objetivo
Comprovar funcionamento ponta a ponta em ambiente real com PostGIS, Redis, Kafka/Redpanda, MinIO, Keycloak e gateway.

### Entregáveis
- staging com stack completa publicada;
- validações automatizadas de API + WebSocket + SSE (`npm run test:staging:gates`);
- carga de homologação com k6 (`k6 run tests/performance/urbis-load.k6.js`);
- evidências de execução anexadas ao pipeline de `staging`.

### Critérios go/no-go
- saúde da API e autenticação sem erro crítico;
- p95 da API < 300 ms no cenário de homologação definido;
- taxa de falhas abaixo do limite do cenário k6;
- eventos WebSocket/SSE recebidos e sem vazamento de campos privados.

## Fase 2 — Segurança e compliance antes de produção

### Objetivo
Fechar requisitos de segurança e governança para reduzir risco operacional, jurídico e reputacional.

### Entregáveis
- ciclo OWASP com SAST/DAST e pentest externo registrado;
- política formal de gestão de segredos e rotação em produção;
- trilha LGPD com fluxo de direitos do titular auditável;
- definição da estratégia de criptografia em repouso com KMS/provedor real.

### Critérios go/no-go
- nenhuma vulnerabilidade crítica aberta sem exceção formal aprovada;
- segredos fora de código e com rotação ativa;
- controles LGPD críticos implementados e auditáveis;
- decisão arquitetural aprovada para criptografia em repouso.

## Fase 3 — Confiabilidade, piloto e escala municipal

### Objetivo
Garantir operação contínua com observabilidade, resposta a incidentes e validação em campo real.

### Entregáveis
- SLO/SLI definidos para API e painel;
- runbooks de incidentes e rollback operacionalizados;
- validação de autoscaling/probes/recuperação em testes controlados;
- piloto municipal com métricas de resolução, reincidência e satisfação;
- roadmap de expansão (piloto → bairros → escala municipal).

### Critérios go/no-go
- SLO monitorado por janela acordada sem violação crítica recorrente;
- rollback testado e executável;
- resultados do piloto dentro de metas operacionais definidas pela gestão;
- capacidade operacional aprovada para expansão.

## Governança de decisão

- Cada fase exige ata de aprovação técnica (go/no-go) com responsáveis.
- Itens pendentes devem ser explicitados como risco aceito ou bloqueio.
- Nenhum gate externo pode ser promovido como “validado” sem evidência do ambiente correspondente.
