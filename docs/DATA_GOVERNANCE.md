# Governança de dados — URBIS v0.5.0-alpha.1

## Classes de origem
- `CITIZEN_REPORT`: informação submetida pelo cidadão;
- `FIELD_VALIDATION`: informação de equipe/servidor autorizado;
- `OFFICIAL_SENSOR`: medição de sensor oficial/credenciado;
- `OFFICIAL_DATASET`: base/documento versionado;
- `INTEGRATION`: dado recebido de sistema externo autenticado.

## Estados de evidência
`RECEIVED → GEO_VALIDATED → EVIDENCE_VALIDATED → CORROBORATED → AUTHORITY_VALIDATED → CLOSED`, com estados administrativos de rejeição/duplicidade quando aplicáveis.

## Regras
1. fonte, versão e timestamp não são apagados para “parecer atual”;
2. uma base histórica/documental não é promovida a dado em tempo real;
3. geometrias inválidas não são corrigidas silenciosamente;
4. mídia mantém SHA-256 dos bytes recebidos;
5. painel público não expõe autor, descrição privada, endereço ou ponto exato;
6. mudanças administrativas relevantes geram evento/auditoria;
7. políticas de retenção são parametrizadas por classe e dependem de revisão jurídica/tabela de temporalidade;
8. solicitações de direitos LGPD entram em fluxo auditável, sem destruição automática de evidência que possa ter dever legal de preservação.
