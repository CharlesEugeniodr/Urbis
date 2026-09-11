# Estratégia de testes — URBIS v0.5.0-alpha.1

## Camadas
1. **Núcleo puro:** PLANCON, segurança, evidência, ICI, regras de negócio, reporting;
2. **Território:** integridade do GeoJSON, bairros/zonas, quarentena, cruzamento CEP;
3. **E2E da prova local:** autenticação, RBAC, ocorrência, evidência, triagem, campo, transparência, WebSocket/SSE;
4. **Carga local:** 10.000 requisições contra prova em memória;
5. **Staging:** k6 contra API completa com PostGIS/Redis/storage reais;
6. **CI externo:** build NestJS, React/Next, Flutter e scanner de segurança.

## Cobertura executada nesta entrega
Cobertura do núcleo via Node test coverage: **93,30% de linhas**, **89,38% de funções** e **57,84% de branches**. O requisito >=80% é atendido para linhas do núcleo avaliado; não é alegada cobertura >=80% para todo o monorepo.

## Comandos
```bash
npm run test:all
npm run test:coverage
node tests/performance/local-load.mjs
npm run test:staging:gates
```

O cenário staging está em `tests/performance/urbis-load.k6.js`.
As validações de homologação integrada (API + WebSocket + SSE) estão em `tests/staging/staging-gates.test.mjs`.
