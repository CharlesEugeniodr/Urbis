# URBIS v0.5.0-alpha.1 — Consolidação de Requisitos, Campo e Transparência

## Escopo

Fechamento da fase solicitada após auditoria do que havia sido construído e incorporação dos itens faltantes do prompt técnico, sem remoção dos blocos anteriores.

## Novidades

### Negócio
- prioridade `NORMAL/MEDIUM/HIGH/CRITICAL`;
- avaliação após resolução;
- pontuação 1–4 + bônus, apenas por validação humana;
- ranking trimestral;
- alertas geolocalizados;
- indicadores avançados de SLA, resolução, reincidência e satisfação;
- cruzamento espacial de garantia de obra.

### Campo
- equipes e membros;
- OS atribuídas ao agente;
- rota Mapbox quando configurada e fallback explicitamente não viário;
- geofence parametrizado;
- evidência antes/depois;
- timeline/realtime/notificação do status de campo;
- app web de prova e app Flutter.

### Transparência
- mapa público anonimizado/generalizado;
- indicadores agregados;
- consulta por protocolo;
- ranking/alertas públicos;
- SSE público.

### Plataforma
- OIDC/JWKS/Keycloak opcional;
- Redis Pub/Sub;
- Redpanda/Kafka + event relay/outbox;
- FCM worker e registro de devices nos apps Flutter;
- MinIO/S3;
- relatórios CSV/PDF/XLSX;
- Prometheus/Grafana/Loki/Promtail/Sentry;
- Traefik TLS 1.3 e rate limit;
- Kubernetes HPA/PDB;
- React Central (Mapbox GL + ECharts);
- Next Público (Leaflet);
- CI/CD com builds, Flutter, cobertura e Trivy;
- OpenAPI ampliada;
- documentação de arquitetura, dados, deploy, usuários, segurança, LGPD e rastreabilidade.

### Correções do fechamento
- `HealthController` corrigido para a versão 0.5;
- probe Kubernetes corrigida para `/v1/health`;
- endpoint NestJS de resiliência deixou de ser stub e passou a carregar/avaliar o ruleset ativo no banco;
- status de campo passou a gerar timeline, outbox, realtime e notificação ao cidadão;
- app de campo deixou de conter senha demo hardcoded no Flutter;
- estrutura React/Next deixou de ser apenas placeholder e passou a conter painéis funcionais de integração;
- arquivos temporários `.tmp/.prev` removidos do release final.

## Testes finais executados

**43/43 testes funcionais aprovados**, datasets validados e release validator aprovado.

Cobertura do núcleo: **93,30% linhas**, **89,38% funções**, **57,84% branches**.

Carga local final: **10.000 requisições**, concorrência 100, **0 erros**, **p95 36,42 ms** e throughput observado de **4.422,84 req/s**. É uma prova local em memória, não uma medição de produção.

## Limites de validação

Docker/PostGIS/Redis/MinIO/Redpanda/Keycloak, FCM real, Flutter SDK, build NestJS e staging Kubernetes não estão disponíveis no runtime desta construção. O código/configuração é entregue, mas a validação desses ambientes permanece gate externo e está registrada na matriz de rastreabilidade.
