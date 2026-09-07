# Arquitetura — URBIS v0.5.0-alpha.1

## Visão lógica

```text
[Cidadão Flutter/Web] ─┐
[Campo Flutter/Web] ───┼── HTTPS/TLS 1.3 ── [Traefik/API Gateway]
[Central React] ────────┤                              │
[Público Next] ─────────┘                              ▼
                                             [NestJS modular API]
                     ┌────────────┬──────────────┬──────────────┬───────────┐
                     ▼            ▼              ▼              ▼           ▼
                PostgreSQL     Redis          MinIO/S3      Redpanda      FCM
                 + PostGIS    Pub/Sub         evidência       Kafka       worker
                     │                           │              │
                     ├── território/CEP          └─ SHA-256     └─ event relay
                     ├── ocorrências/OS
                     ├── contratos/garantias
                     ├── regras PLANCON
                     ├── métricas de negócio
                     └── auditoria/LGPD

Central: WebSocket autenticado
Público: SSE anonimizado
Observabilidade: Prometheus + Grafana + Loki/Promtail + Sentry
```

## Modularidade

A API está organizada em módulos de identidade, ocorrências, evidência, território, despacho, requisitos/qualidade, resiliência, realtime, storage e métricas. A arquitetura é modular e pode ser separada em microsserviços quando volume/isolamento operacional justificar; a alpha evita decomposição prematura que aumentaria a complexidade sem prova de necessidade.

## Consistência e eventos

- mutações críticas usam transação PostgreSQL;
- `realtime_outbox`/outbox de domínio evita depender de publish não transacional;
- relay pode publicar em Kafka/Redpanda;
- Redis Pub/Sub propaga eventos entre múltiplas instâncias de API;
- WebSocket/SSE são canais de entrega, não fonte de verdade.

## GIS

PostGIS é a fonte espacial operacional. A malha de logradouros possui 10.997 segmentos operacionais; registros vazios/inválidos permanecem em quarentena. A associação GPS → segmento usa distância geográfica com raio parametrizado.

## Segurança

Identidade LOCAL e OIDC convergem em uma identidade interna e papéis RBAC. `FIELD_AGENT` é adicionalmente limitado à equipe atribuída. Dados públicos usam projeção/serialização específica sem autor/endereço exato.

## Resiliência

O provider NestJS carrega o ruleset ativo `PLANCON_PARAUAPEBAS` do banco e avalia parâmetros versionados. O ruleset é baseline documental; alertas oficiais exigem validação/autoridade conforme o processo administrativo aplicável.

## Escala

Kubernetes define 3–20 réplicas de API, HPA por CPU e PDB com mínimo 2. A arquitetura suporta escala horizontal; a capacidade real deve ser comprovada em staging com banco/cache/mensageria/storage reais.
