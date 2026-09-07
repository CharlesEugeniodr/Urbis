# URBIS v0.5.0-alpha.1 — Auditoria final da fase

**Produto:** URBIS — Cidades Inteligentes e Pessoas Ativas  
**Propriedade declarada do produto:** Sigma SIHF Soluções Analíticas S/A — CNPJ 01.851.824/0001-38  
**Versão auditada:** `0.5.0-alpha.1`  
**Natureza:** fechamento de fase alpha de engenharia; não equivale a certificação de produção.

## 1. Escopo fechado

A versão consolida, sem retirada dos blocos anteriores, os requisitos de participação cidadã, GIS territorial, operação central, evidência, identidade/RBAC, ICI-URBIS, triagem/duplicidade, despacho e ordens de serviço, equipe de campo, avaliação, pontuação/ranking, alertas geolocalizados, transparência pública, relatórios, observabilidade, mensageria/storage e infraestrutura declarativa.

O requisito mestre está rastreado em `docs/REQUIREMENTS_TRACEABILITY.md`. O OpenAPI consolidado está em `docs/openapi.json`.

## 2. Evidência de teste executada neste runtime

Execução final de `npm run test:all`:

- PLANCON: 6/6;
- território: 4/4;
- operação: 4/4;
- segurança/evidência/ICI: 5/5;
- regras de negócio: 9/9;
- reporting: 3/3;
- E2E local autenticado: 12/12;
- **total funcional: 43/43 aprovado**;
- validação de datasets: aprovada;
- release validator: aprovado.

A saída integral está em `TEST_REPORT_v0.5.0-alpha.1.txt`.

## 3. Cobertura

Execução de `npm run test:coverage` no núcleo testável:

- linhas: **93,30%**;
- funções: **89,38%**;
- branches: **57,84%**.

O requisito de cobertura >=80% está atendido para **linhas do núcleo medido**. Isso não deve ser interpretado como 80% de cobertura integral de Flutter, React, Next, NestJS e infraestrutura, que exigem seus respectivos toolchains/ambientes.

## 4. Integridade territorial/documental

Validação final:

- 2.541 registros CEP/endereço;
- 10.997 segmentos GIS operacionais;
- 82 registros GIS preservados em quarentena;
- regras PLANCON documentais íntegras e explicitamente versionadas como baseline 2023.

Nenhum dado PLANCON 2023 é promovido automaticamente a medição atual.

## 5. Prova local de carga

Execução final do teste local em memória:

- requisições: **10.000**;
- concorrência: **100**;
- erros: **0**;
- p95: **36,42 ms**;
- throughput observado: **4.422,84 req/s**;
- referência local de 10.000 req/min e p95 <300 ms: atendida.

Fonte: `TEST_PERFORMANCE_LOCAL_v0.5.0-alpha.1.json`.

**Limite probatório:** este ensaio é `LOCAL_IN_MEMORY_PROOF_NOT_PRODUCTION`. Ele não comprova p95 ou throughput com PostGIS, Redis, Kafka/Redpanda, MinIO/S3, gateway e rede de produção. O cenário k6 para staging está em `tests/performance/urbis-load.k6.js`.

## 6. Segurança e privacidade implementadas nesta fase

Foram implementados/configurados: scrypt, JWT, OIDC opcional, RBAC, separação de escopo do agente de campo, CPF representado por HMAC em vez de armazenamento em claro no fluxo implementado, hashes SHA-256 de mídia, storage privado, anonimização/generalização pública, trilha de eventos/auditoria, TLS 1.3 no gateway declarativo, CORS, consultas SQL parametrizadas e scanner Trivy no CI.

Não estão certificados nesta entrega: pentest/OWASP completo, WCAG 2.1 AA formal, MFA, attestation de dispositivo, criptografia física AES-256 de volume/bucket sem KMS/provedor configurado e conformidade LGPD jurídica final. Políticas nesta versão permanecem como drafts quando assim identificadas.

## 7. Componentes implementados mas pendentes de validação externa

O runtime da construção não dispõe de Docker, Flutter ou k6 e não concluiu instalação das dependências NestJS. Por isso não são declarados como executados aqui:

- build/execução NestJS completo;
- PostgreSQL/PostGIS real;
- Redis real;
- MinIO/S3 real;
- Redpanda/Kafka real;
- Keycloak/OIDC contra provedor real;
- FCM/APNs real;
- build/test Flutter Android/iOS;
- build final React/Next com dependências instaladas;
- staging Kubernetes;
- SLA 99,5%/99,9%;
- atualização end-to-end <3 s em infraestrutura real.

Esses itens são gates da próxima etapa de homologação, não falhas ocultadas como sucesso.

## 8. Higiene do pacote

O release final não contém `node_modules`, `.env` com segredo, diretórios de build, caches nem mídias geradas pelos testes E2E. Somente `.env.example` é distribuído como modelo. Os artefatos de prova permanecem nos relatórios de teste.

## 9. Critério de fechamento

A fase **v0.5.0-alpha.1 está fechada como entrega alpha de engenharia** porque:

1. requisitos recebidos foram rastreados;
2. lacunas identificadas nesta fase foram incorporadas estruturalmente ou marcadas com gate externo explícito;
3. 43/43 testes funcionais locais passaram;
4. datasets e release validator passaram;
5. cobertura de linhas do núcleo superou 80%;
6. prova local de 10.000 requisições passou sem erros;
7. limitações que dependem de ambiente real estão documentadas e não foram indevidamente declaradas como validadas.

O próximo ciclo deve ser tratado como **homologação integrada/produção**, e não como extensão silenciosa desta alpha.
