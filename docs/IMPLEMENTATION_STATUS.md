# Estado de implementação — URBIS v0.5.0-alpha.1

## Fechamento desta fase

Esta versão consolida sem regressão os blocos v0.1–v0.4 e incorpora os requisitos adicionais do prompt técnico recebido. A fase v0.5 é considerada **fechada como entrega alpha de engenharia**, com distinção explícita entre o que foi executado localmente e o que exige ambiente externo.

## Implementado e testado no núcleo/prova local

- regras PLANCON versionadas no núcleo puro;
- malha territorial, CEP, associação espacial e quarentena;
- autenticação local e RBAC;
- CPF com fingerprint HMAC;
- ocorrência, protocolo, idempotência, prioridade, duplicidade e timeline;
- evidência SHA-256 e ICI;
- triagem, despacho e OS;
- campo: atribuição, rota fallback, geofence, BEFORE/AFTER, ciclo de atendimento;
- avaliação, pontuação humana e ranking;
- alertas geográficos;
- painel público anonimizado e consulta por protocolo;
- WebSocket e SSE;
- relatórios CSV/PDF/XLSX;
- solicitações LGPD;
- métricas Prometheus e dashboard de negócio.

## Implementado/configurado, mas não executado neste runtime

- API NestJS compilada somente em código-fonte; `npm install` excedeu o tempo do runtime e não gerou `node_modules`;
- PostgreSQL/PostGIS real;
- Redis real;
- MinIO/S3 real;
- Redpanda/Kafka real e relay;
- Keycloak/OIDC real;
- FCM com credencial real;
- Prometheus/Grafana/Loki/Promtail em containers;
- builds React/Next em CI externo;
- build/test Flutter em SDK real;
- Kubernetes/staging.

A infraestrutura e pipelines necessários estão presentes no pacote. A ausência de execução local desses componentes não é apresentada como aprovação.

## Gating de homologação implementado no repositório

- teste automatizado de homologação remota para API/WebSocket/SSE em `tests/staging/staging-gates.test.mjs`;
- comando dedicado: `npm run test:staging:gates`;
- execução no pipeline de `staging` após rollout da API, junto ao cenário k6;
- plano de execução em fases/go-no-go documentado em `docs/EXECUTION_PLAN_PHASES.md`.

## Testes executados no fechamento

- PLANCON: 6/6;
- território: 4/4;
- operação: 4/4;
- segurança/evidência/ICI: 5/5;
- regras de negócio: 9/9;
- reporting: 3/3;
- E2E local autenticado: 12/12;
- total funcional: **43/43**;
- validação dos datasets: aprovada;
- validação de release/JSON/YAML/OpenAPI/documentação: aprovada;
- cobertura do núcleo: 93,30% linhas;
- carga local: 10.000 requisições, 0 erro e p95 abaixo de 300 ms no ensaio em memória.

## Não comprovado e não deve ser alegado

- SLA 99,5%/99,9%;
- p95 <300 ms com PostGIS/rede/storage reais;
- 10.000 req/min em staging;
- latência end-to-end <3s em múltiplas instâncias;
- AES-256 em repouso sem KMS/volume criptografado real;
- certificação OWASP/WCAG;
- deploy Kubernetes real;
- entrega FCM real;
- build Android/iOS;
- calibração empírica/ground truth do ICI.

## Dependências de fonte oficial

Geometrias vetoriais oficiais de setores de risco, manchas de inundação, abrigos e rotas de evacuação continuam pendentes quando não fornecidas em formato GIS. O sistema não fabrica essas geometrias a partir de imagens de referência.

Consulte `REQUIREMENTS_TRACEABILITY.md` para o cotejo requisito a requisito.
