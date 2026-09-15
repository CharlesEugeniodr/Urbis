# Guia de deploy — URBIS v0.5.0-alpha.1

## Ambientes
- `develop`: desenvolvimento;
- `staging`: homologação e testes de carga/integração;
- `main`: candidato a produção após gates.

## Pipeline
O workflow `.github/workflows/ci.yml` executa testes do núcleo, cobertura, build da API e frontends, testes Flutter em runner com SDK, scanner Trivy e etapa de staging condicionada à branch `staging`.
Após rollout em `staging`, o pipeline executa gates de homologação de API/WebSocket/SSE (`npm run test:staging:gates`) e carga k6 (`tests/performance/urbis-load.k6.js`) usando variáveis/segredos do ambiente.

## Kubernetes
`infra/k8s` contém namespace, ConfigMap, Deployment, Service, HPA, PDB, worker e Ingress. As probes usam `/v1/health`.

## Gates obrigatórios antes de produção
1. build de todas as imagens sem erro;
2. `npm run test:all` aprovado;
3. cobertura de linhas do núcleo >=80%;
4. Trivy sem vulnerabilidade crítica não aceita;
5. PostGIS/Redis/MinIO/Redpanda reais operacionais;
6. k6 em staging com p95 <300 ms e 10.000 req/min;
7. WebSocket/SSE com atualização <3s no cenário-alvo;
8. teste real FCM;
9. auditoria de segurança, LGPD e WCAG;
10. rollout e observabilidade sem regressão.

## Plano por fases
Consulte `docs/EXECUTION_PLAN_PHASES.md` para o fluxo de execução em fases com critérios objetivos de go/no-go.

## SLA
99,5% do app e 99,9% do painel são **objetivos de serviço**, não resultados desta versão alpha. Para comprovação, usar SLI/SLO medidos em janela definida (por exemplo 30 dias), excluindo somente indisponibilidades formalmente previstas na política de SLO.
