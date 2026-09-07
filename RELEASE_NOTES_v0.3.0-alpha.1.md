# URBIS v0.3.0-alpha.1 — Operational Core

## Entrega

Primeiro ciclo operacional completo do URBIS, executável do registro à resolução.

### Novidades
- persistência transacional de ocorrências no backend NestJS/PostGIS;
- protocolo concorrente;
- idempotência de requisições móveis;
- *snap* geográfico para a malha real 2025;
- snapshot de logradouro/CEP/bairro/zona;
- detecção de duplicidade espaço-temporal;
- triagem procedente/improcedente/duplicada;
- despacho configurável por papel institucional;
- ordem de serviço e ciclo de atendimento;
- WebSocket em tempo real;
- outbox durável;
- painel local operacional e interativo;
- prova E2E sem dependências externas.

### Controle de afirmações
Os SLAs da versão são parâmetros de engenharia e ficam marcados como provisórios. Os alvos de despacho, salvo `COMPDEC`, são papéis funcionais e não uma afirmação de organograma municipal vigente.

### Testes
17 testes automatizados aprovados + validação integral dos datasets.
