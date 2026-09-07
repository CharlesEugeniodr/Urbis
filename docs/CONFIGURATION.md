# Guia de configuração — URBIS v0.5.0-alpha.1

## Requisitos de desenvolvimento
- Node.js 20+ (testado no núcleo com Node 22);
- Python 3.12+ para preparação/validação territorial;
- Docker/Compose para PostGIS, Redis, MinIO, Redpanda, observabilidade e Keycloak;
- Flutter SDK 3.22+ para os aplicativos móveis.

## Variáveis
Copie `.env.example` para `.env` e substitua todos os valores de exemplo. Em staging/produção os segredos devem vir de secret manager/Kubernetes Secret; não devem ser versionados.

Variáveis críticas:
- `DATABASE_URL`;
- `URBIS_TOKEN_SECRET` e `URBIS_PII_HMAC_SECRET`, diferentes e com alta entropia;
- `REDIS_URL`;
- `URBIS_OBJECT_STORE_DRIVER` e credenciais S3;
- `MAPBOX_ACCESS_TOKEN`, quando rota/mapa Mapbox for usado;
- `FIREBASE_SERVICE_ACCOUNT_JSON` apenas no worker de notificação;
- `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_AUDIENCE` para OIDC;
- `SENTRY_DSN` opcional.

## Prova local sem dependências externas
No Windows: `START_URBIS_PANEL.bat` ou `START_URBIS_CITIZEN.bat`.

No shell:
```bash
node tools/local-probe-server.mjs
```

## Backend completo
```bash
cd infra
docker compose --profile full up -d --build
```

Antes de uso real, altere senhas do Compose e configure TLS/domínio/segredos.
