# Modelagem de dados — URBIS v0.5.0-alpha.1

## Domínios centrais

### Identidade
- `users_account`: conta lógica, e-mail, fingerprint HMAC de CPF, nome de exibição, estado ativo/anônimo;
- `auth_identities`: identidade LOCAL/OIDC; senha derivada somente para LOCAL;
- `user_roles`: RBAC;
- `auth_audit`: trilha de autenticação;
- `push_devices`: tokens FCM por plataforma.

### Ocorrência
- `categories`: taxonomia e parâmetros padrão;
- `occurrences`: protocolo, autor, categoria, status, prioridade, ponto PostGIS, CEP, endereço, snapshot territorial, flags de duplicidade e ICI;
- `occurrence_events`: timeline imutável de eventos operacionais;
- `occurrence_duplicate_candidates`: candidatos por proximidade/tempo/categoria;
- `occurrence_media`: evidências e integridade SHA-256;
- `occurrence_evidence_assessments`: avaliações ICI versionadas.

### Operação de campo
- `teams`, `team_members`;
- `work_orders`: ordem, equipe, órgão funcional, SLA parametrizado, estado;
- `field_work_events`: checkpoints GPS/geofence e resultado de campo;
- `dispatch_rules`: roteamento funcional parametrizado.

### Participação e qualidade
- `service_evaluations`: nota/comentário após resolução;
- `citizen_scores`: pontos somente após validação humana;
- `notification_outbox`: entrega assíncrona de notificações;
- `privacy_requests`: solicitações LGPD.

### Território e contratos
- `street_segments`: malha de logradouros PostGIS;
- `postal_addresses`: referência CEP/logradouro;
- `neighborhoods`;
- `public_contracts`: contratos/obras cadastrados;
- `occurrence_contract_matches`: cruzamentos rastreáveis.

### Resiliência
- `resilience_rulesets`: regras documentais versionadas;
- `resilience_alerts`: alertas emitidos;
- `sensor_observations`: medições com fonte/timestamp;
- `data_sources` e `source_datasets`: proveniência.

## Relações principais

```text
users_account 1─N occurrences 1─N occurrence_events
                       │  ├─N occurrence_media
                       │  ├─N duplicate_candidates
                       │  ├─N work_orders N─1 teams
                       │  ├─0..1 service_evaluations
                       │  └─0..1 citizen_scores
                       └──── spatial ─── street_segments / contracts
```

## Estados

Ocorrência: `OPEN → TRIAGE → DISPATCHED → IN_SERVICE → RESOLVED`, com terminais alternativos `REJECTED` e `DUPLICATE`.

OS: `DISPATCHED → ACCEPTED → EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED`, com `CANCELLED` quando aplicável.

Prioridade: `NORMAL`, `MEDIUM`, `HIGH`, `CRITICAL`.

## Migrações

A versão inclui `001` a `013`. Em banco novo, o Compose pode usar `docker-entrypoint-initdb.d`. Em upgrades, deve-se aplicar um mecanismo formal de migrations; não se deve reutilizar o initdb como mecanismo de atualização.
