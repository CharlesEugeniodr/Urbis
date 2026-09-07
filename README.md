# URBIS — Plataforma de Participação Cidadã e Monitoramento Urbano

**Versão:** `0.5.0-alpha.1`  
**Produto de propriedade:** **Sigma SIHF Soluções Analíticas S/A — CNPJ 01.851.824/0001-38**  
**Identidade:** **URBIS — Cidades Inteligentes e Pessoas Ativas**  
**Slogan:** **Uma cidade melhor começa com você.**

## Objetivo

O URBIS é uma plataforma de inteligência operacional urbana georreferenciada. O cidadão registra ocorrências com GPS e evidência, a Central recebe em mapa GIS, tria, despacha ordens de serviço, acompanha equipes de campo, mede desempenho e devolve o andamento ao cidadão. A plataforma também possui transparência pública anonimizada, indicadores, participação cidadã e resiliência baseada em fontes documentais versionadas.

## O que a v0.5 consolida

- cadastro/login por e-mail ou CPF, com CPF armazenado somente como fingerprint HMAC na base principal;
- JWT local, OIDC/JWKS opcional e RBAC;
- registro de ocorrência, protocolo idempotente, GPS e associação territorial;
- malha 2025 com **10.997 segmentos GIS operacionais**, 82 registros em quarentena, 46 bairros e 6 zonas;
- **2.541 referências CEP/logradouro** e cruzamento territorial;
- foto/vídeo com SHA-256, storage LOCAL ou S3/MinIO e ICI-URBIS;
- duplicidade espaço-temporal, prioridade, triagem e despacho;
- equipes, OS, rota, geofence e evidência `BEFORE/AFTER`;
- avaliação, pontuação validada e ranking trimestral;
- alertas geolocalizados e motor PLANCON versionado;
- painel público com localização generalizada, consulta por protocolo e SSE;
- WebSocket operacional;
- relatórios CSV/PDF/XLSX;
- dashboard de negócio e `/metrics` Prometheus;
- Redis, Redpanda/Kafka, transactional outbox, FCM worker, MinIO/S3;
- Traefik TLS 1.3/rate limit, Kubernetes HPA/PDB, observabilidade e CI/CD;
- React + TypeScript + Mapbox GL + ECharts para Central e Next.js + Leaflet para transparência;
- apps Flutter cidadão e campo com GPS/câmera, integração FCM preparada e testes smoke incluídos.

## Arquitetura

```text
Flutter Cidadão ─┐
Flutter Campo ───┼──> Traefik/API Gateway ──> NestJS API
React Central ───┤                         │
Next Público ────┘                         ├─ PostgreSQL + PostGIS
                                          ├─ Redis Pub/Sub
                                          ├─ S3/MinIO
                                          ├─ Redpanda/Kafka + outbox relay
                                          ├─ FCM notification worker
                                          └─ Prometheus/Loki/Sentry

Painel Central <── WebSocket
Painel Público <── SSE
```

Detalhes: `docs/ARCHITECTURE.md` e `docs/REQUIREMENTS_TRACEABILITY.md`.

## Estrutura

```text
apps/
  api/                 NestJS + PostgreSQL/PostGIS
  citizen-flutter/     app cidadão
  field-flutter/       app equipe de campo
  web-central-react/   React + Mapbox GL + ECharts
  web-public-next/     Next.js + Leaflet
  *-web-proof/         provas locais sem build externo
core/                  motores puros testáveis
services/              worker FCM e relay Kafka
data/                   territorial + PLANCON versionado
db/migrations/          migrations 001–013
docs/                   documentação técnica, operação, privacidade
infra/                  Docker, K8s, gateway, observabilidade, Terraform
tests/                  núcleo, E2E e performance
```

## Execução da prova local

Requer Node.js 20+.

Windows:

```text
START_URBIS_PANEL.bat
START_URBIS_CITIZEN.bat
```

Shell:

```bash
node tools/local-probe-server.mjs
```

A prova local usa memória/filesystem e foi criada para validação funcional independente de Docker.

## Backend com infraestrutura

```bash
cp .env.example .env
cd infra
docker compose --profile full up -d --build
```

O Compose define PostGIS, Redis, MinIO, Redpanda, API, worker de notificações, relay de eventos, Prometheus, Grafana, Loki, Promtail, Keycloak, InfluxDB opcional e Traefik.

> Nesta entrega, o runtime de construção não possui Docker/PostgreSQL/Redis/Flutter. Portanto esses componentes estão **implementados/configurados, mas não são declarados como executados neste ambiente**.

## Principais APIs

A referência completa está em `docs/openapi.json`.

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `GET /v1/auth/me`
- `POST /v1/occurrences`
- `GET /v1/occurrences/{id}` — inclui timeline
- `POST /v1/occurrences/{id}/evidence`
- `POST /v1/occurrences/{id}/triage`
- `POST /v1/occurrences/{id}/evaluation`
- `POST /v1/occurrences/{id}/score`
- `GET /v1/field/work-orders`
- `POST /v1/field/work-orders/{id}/status`
- `GET /v1/dashboard/summary`
- `GET /v1/alerts`
- `GET /public/occurrences`
- `GET /public/protocol/{protocol}`
- `GET /public/stream`
- `GET /metrics`

WebSocket operacional: `/ws/occurrences?access_token=...`.

## PLANCON e proveniência

O ruleset `PLANCON_PARAUAPEBAS / 2-2023` permanece identificado como **baseline documental 2023**. O motor não converte esse documento em “dado atual 2026”. Medições atuais devem carregar fonte, timestamp e proveniência próprios. A decisão oficial de alerta/ativação continua sob a autoridade competente.

## ICI-URBIS

`ICI-URBIS-alpha.1` combina fonte, consistência geográfica, evidência, tempo, corroboração e validação por autoridade em um escore 0–100. Ele é um **indicador de confiança de engenharia** e não prova sozinho veracidade, autoria, autenticidade ou integridade anterior à ingestão.

## Segurança e LGPD

A versão inclui scrypt, JWT, OIDC opcional, RBAC, CORS, SQL parametrizado, TLS 1.3 configurado no gateway, storage privado, SHA-256 de mídia, anonimização do painel público, solicitações LGPD, trilha de auditoria e scanner Trivy no CI.

Não é alegada nesta alpha: certificação OWASP, pentest, AES-256 real em volume/bucket sem KMS/provedor, MFA, attestation de dispositivo ou certificação WCAG AA. Consulte `docs/SECURITY.md` e `docs/PRIVACY_POLICY_DRAFT.md`.

## Testes desta entrega

Execute:

```bash
npm run test:all
npm run test:coverage
node tests/performance/local-load.mjs
```

Resultados finais registrados nesta versão:

- **43/43 testes funcionais automatizados aprovados**: 6 PLANCON + 4 território + 4 operação + 5 segurança/evidência + 9 negócio + 3 reporting + 12 E2E;
- datasets validados: 2.541 CEPs, 10.997 segmentos GIS, 82 registros em quarentena;
- cobertura do núcleo: **93,30% linhas**, **89,38% funções**, **57,84% branches**;
- carga local: 10.000 requisições, concorrência 100, 0 erro, **p95 36,42 ms**, throughput observado **4.422,84 req/s**; prova explicitamente local/em memória, não produção.

O cenário k6 para homologação real está em `tests/performance/urbis-load.k6.js`.

## Critérios ainda externos

Antes de produção devem ser comprovados em staging/infra real: PostGIS/Redis/MinIO/Redpanda, FCM real, build Flutter Android/iOS, OIDC real, p95 com banco/rede, atualização <3s, SLA 99,5%/99,9%, segurança, WCAG AA e política LGPD final.

## Documentação

- `docs/REQUIREMENTS_TRACEABILITY.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/CONFIGURATION.md`
- `docs/DEPLOYMENT.md`
- `docs/TEST_STRATEGY.md`
- `docs/USER_CITIZEN.md`
- `docs/USER_CENTRAL.md`
- `docs/USER_FIELD.md`
- `docs/SECURITY.md`
- `docs/PRIVACY_POLICY_DRAFT.md`
- `docs/TERMS_OF_USE_DRAFT.md`
- `docs/openapi.json`

## Licença e propriedade

O projeto não adota a licença genérica sugerida no prompt original. Esta versão preserva a titularidade indicada pelo proprietário do produto. Consulte `LICENSE-PROPRIETARY.txt`.
