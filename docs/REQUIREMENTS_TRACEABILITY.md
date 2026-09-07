# Matriz de rastreabilidade — URBIS v0.5.0-alpha.1

Esta matriz consolida o prompt técnico de requisitos recebido para o URBIS e o estado efetivo desta versão. Os estados usados são:

- **IMPLEMENTADO + TESTADO LOCALMENTE**: existe código e teste executado no núcleo/prova local;
- **IMPLEMENTADO / PENDENTE DE VALIDAÇÃO EXTERNA**: existe código/configuração, mas o runtime desta entrega não possui o serviço/SDK necessário;
- **ESTRUTURAL**: arquitetura/documentação preparada, sem alegação de produção;
- **PENDENTE DE FONTE/ATO EXTERNO**: depende de dado oficial, contrato, credencial ou homologação que não pode ser inventado.

| Requisito | Estado v0.5 | Evidência principal |
|---|---|---|
| Cadastro por e-mail/CPF | IMPLEMENTADO + TESTADO LOCALMENTE | `apps/api/src/auth`, E2E CPF/HMAC |
| OAuth2/OIDC/Gov.br/social | IMPLEMENTADO / PENDENTE DE VALIDAÇÃO EXTERNA | `auth/oidc.service.ts`, Keycloak no Compose; provedor real não configurado |
| Registro com categoria, comentário e GPS | IMPLEMENTADO + TESTADO LOCALMENTE | `/v1/occurrences`, app cidadão/prova web |
| Foto/vídeo e SHA-256 | IMPLEMENTADO + TESTADO LOCALMENTE | `evidence.service.ts`, testes de evidência |
| Protocolo único | IMPLEMENTADO + TESTADO LOCALMENTE | `urbis_next_protocol()`, testes operacionais/E2E |
| Timeline/status | IMPLEMENTADO + TESTADO LOCALMENTE | `occurrence_events`, `GET /v1/occurrences/{id}` |
| Push FCM | IMPLEMENTADO / PENDENTE DE CREDENCIAL E TESTE REAL | outbox + `services/notification-worker`; Firebase externo requerido |
| Avaliação após resolução | IMPLEMENTADO + TESTADO LOCALMENTE | `/v1/occurrences/{id}/evaluation` |
| Pontuação somente após validação humana | IMPLEMENTADO + TESTADO LOCALMENTE | `/score`, `citizen_scores`, testes |
| Ranking trimestral | IMPLEMENTADO + TESTADO LOCALMENTE | `/v1/rankings/current` |
| Alertas geolocalizados | IMPLEMENTADO + TESTADO LOCALMENTE | `resilience_alerts`, filtro PostGIS/teste de negócio |
| Mapa GIS central em tempo real | IMPLEMENTADO + TESTADO LOCALMENTE na prova; React estrutural | `panel-gis-proof`, WebSocket, `web-central-react` |
| Triagem/duplicidade | IMPLEMENTADO + TESTADO LOCALMENTE | núcleo operacional e E2E |
| Despacho e OS | IMPLEMENTADO + TESTADO LOCALMENTE | `work_orders`, dispatch rules |
| Equipe de campo | IMPLEMENTADO + TESTADO LOCALMENTE na prova; Flutter não compilado | `/v1/field/*`, `field-web-proof`, `field-flutter` |
| Rota GPS | IMPLEMENTADO; Mapbox real depende de token | Mapbox Directions + fallback explicitamente não viário |
| Fotos antes/depois | IMPLEMENTADO + TESTADO LOCALMENTE | propósito `BEFORE/AFTER`, E2E |
| Geofence da OS | IMPLEMENTADO + TESTADO LOCALMENTE | `FIELD_GEOFENCE_M`, E2E |
| Painel público anonimizado | IMPLEMENTADO + TESTADO LOCALMENTE na prova; Next/Leaflet estrutural | `/public/*`, SSE, `public-web-proof`, `web-public-next` |
| Consulta pública por protocolo | IMPLEMENTADO + TESTADO LOCALMENTE | `/public/protocol/{protocol}` |
| Garantia de obra | IMPLEMENTADO ESTRUTURALMENTE; depende de cadastro contratual oficial | `urbis_match_active_warranties()` |
| Relatórios CSV/PDF/XLSX | IMPLEMENTADO + TESTADO LOCALMENTE | `reports.controller.ts`, testes de reporting |
| PostgreSQL/PostGIS | IMPLEMENTADO / PENDENTE DE EXECUÇÃO NESTE RUNTIME | migrations 001–013, Compose |
| TimescaleDB/InfluxDB | ESTRUTURAL / opcional | InfluxDB no perfil `timeseries`; integração funcional ainda não necessária ao núcleo |
| Redis | IMPLEMENTADO / PENDENTE DE EXECUÇÃO NESTE RUNTIME | Pub/Sub e Compose |
| Kafka/RabbitMQ | IMPLEMENTADO ESTRUTURALMENTE | Redpanda/Kafka + transactional outbox relay |
| S3/CloudFront | S3/MinIO IMPLEMENTADO; CDN PENDENTE DE PROVEDOR | `ObjectStorageService`, Compose MinIO |
| API Gateway | IMPLEMENTADO ESTRUTURALMENTE | Traefik, TLS 1.3, rate limit |
| Prometheus/Grafana/Loki/Sentry | IMPLEMENTADO ESTRUTURALMENTE | `infra/observability`, `/metrics`, Sentry no bootstrap |
| CI/CD | IMPLEMENTADO ESTRUTURALMENTE | `.github/workflows/ci.yml` |
| API p95 <300 ms | TESTE LOCAL PASSOU; PRODUÇÃO NÃO COMPROVADA | `TEST_PERFORMANCE_LOCAL...json`, cenário k6 staging |
| 10.000 req/min | TESTE LOCAL PASSOU; STAGING NÃO COMPROVADO | 10.000 requests/100 concorrentes e k6 |
| painel <3s | mecanismo WebSocket/SSE implementado; SLA real PENDENTE | WebSocket/SSE E2E |
| 99,5%/99,9% disponibilidade | ALVO DE SRE, NÃO COMPROVADO | HPA/PDB/probes; requer observação em staging/produção |
| TLS 1.3 | CONFIGURADO; PENDENTE DE DEPLOY | Traefik `minVersion: VersionTLS13` |
| AES-256 em repouso | PENDENTE DE PROVEDOR/KMS/VOLUME CRIPTOGRAFADO | não é correto alegar criptografia física de volume sem infraestrutura real |
| RBAC | IMPLEMENTADO + TESTADO LOCALMENTE | guards + E2E de isolamento de campo/cidadão |
| OWASP Top 10 | controles parciais + scanner CI; auditoria completa PENDENTE | parâmetros SQL, RBAC, headers, Trivy; DAST/SAST completo não executado aqui |
| LGPD/anonimização | IMPLEMENTADO ESTRUTURALMENTE + testes de fluxo | painel público generalizado, privacy requests, policy draft |
| WCAG 2.1 AA | práticas iniciais; CERTIFICAÇÃO PENDENTE | labels/ARIA/responsividade; auditoria WCAG formal não executada |
| Cobertura ≥80% | ATENDIDO NO NÚCLEO TESTADO | cobertura de linhas 93,30%; branch 57,84% |
| Deploy staging | PIPELINE PREPARADO; DEPLOY REAL PENDENTE | CI + K8s; credenciais/cluster externos necessários |

## Regra de interpretação

Nenhum item marcado como pendente externo deve ser promovido a “validado em produção” sem evidência do ambiente correspondente. A versão preserva o princípio de não inventar dados oficiais, credenciais, SLAs legais, contratos, entidades responsáveis ou resultados de infraestrutura que não foram executados.
