# URBIS — Núcleo Operacional v0.3.0-alpha.1

## Escopo implementado

Este bloco transforma a malha territorial já validada em um fluxo operacional executável:

`registro → protocolo → enriquecimento territorial → duplicidade → triagem → despacho → ordem de serviço → atendimento → resolução → evento em tempo real`

## 1. Registro e protocolo

`POST /v1/occurrences`

Entrada mínima:

```json
{
  "categoryCode": "PAVEMENT",
  "description": "Buraco na via",
  "latitude": -6.03548,
  "longitude": -49.89574,
  "gpsAccuracyM": 8.4,
  "clientRequestId": "UUID-gerado-no-dispositivo"
}
```

O banco gera protocolo concorrente por `urbis_next_protocol()` no formato:

`URB-AAAAMMDD-0000001`

`clientRequestId` atua como chave de idempotência para impedir que retries de rede produzam protocolos duplicados.

## 2. Enriquecimento territorial

A ocorrência é comparada à malha `street_segments` por distância geodésica PostGIS. O limite inicial de *snap* é configurável em `TERRITORY_SNAP_MAX_M` (default técnico: 120 m).

Quando há correspondência, a ocorrência grava um snapshot imutável com:

- segmento;
- logradouro;
- tipo;
- CEP;
- bairro;
- zona;
- distância entre o ponto informado e a geometria;
- referência da fonte territorial.

O snapshot é preservado mesmo se a camada territorial for atualizada posteriormente.

## 3. Duplicidade espaço-temporal

O motor procura ocorrências ativas da mesma categoria em uma janela de tempo e raio configuráveis:

- `DUPLICATE_RADIUS_M`: 35 m por default de engenharia;
- `DUPLICATE_WINDOW_HOURS`: 24 h por default de engenharia.

A pontuação de similaridade usada neste alpha é:

`score = 0,70 × proximidade_espacial + 0,30 × proximidade_temporal`

O algoritmo **não encerra automaticamente** a ocorrência. Ele marca `duplicate_suspected` e grava os candidatos. A decisão final pertence à triagem.

## 4. Triagem

`POST /v1/occurrences/:id/triage`

Decisões válidas:

- `PROCEDENT` → cria ordem de serviço e despacha;
- `IMPROCEDENT` → status `REJECTED`;
- `DUPLICATE` → status `DUPLICATE`, vinculado à ocorrência original.

Toda mudança grava `occurrence_events`, além de evento no `realtime_outbox`.

## 5. Despacho

`dispatch_rules` desacopla categoria da estrutura administrativa concreta. Os alvos iniciais são **papéis funcionais**, por exemplo:

- `MUNICIPAL_PUBLIC_WORKS`;
- `WATER_SERVICE_PROVIDER`;
- `ELECTRICITY_CONCESSIONAIRE`;
- `MUNICIPAL_TRAFFIC_AUTHORITY`;
- `COMPDEC`.

Isso evita afirmar, sem ato administrativo atualizado, qual secretaria/concessionária é a responsável vigente. Na implantação, `integration_targets` é parametrizado com o órgão real e sua API/fila.

Os SLAs incluídos nesta versão são marcados no banco como `provisional=true` e `ENGINEERING_DEFAULT_NOT_OFFICIAL_SLA`. Não são apresentados como prazos legais ou contratuais.

## 6. Ordem de serviço

`POST /v1/work-orders/:id/status`

Estados operacionais aceitos:

- `ACCEPTED`;
- `EN_ROUTE`;
- `ARRIVED`;
- `IN_PROGRESS`;
- `COMPLETED`;
- `CANCELLED`.

`IN_PROGRESS` promove a ocorrência para `IN_SERVICE`; `COMPLETED` promove para `RESOLVED` e grava `resolved_at`.

## 7. Tempo real

O backend NestJS possui gateway WebSocket nativo em:

`ws://host/ws/occurrences`

Eventos principais:

- `occurrence.created`;
- `occurrence.triaged`;
- `work_order.status`.

O banco também possui `realtime_outbox`, preservando uma trilha durável para futura publicação multi-instância via Redis/Kafka. Nesta versão, o gateway em processo já entrega o fluxo ao painel.

## 8. Painel operacional local

`npm run probe` inicia um servidor de prova sem PostgreSQL e sem dependências externas. O painel permite:

1. visualizar os 10.997 segmentos reais;
2. capturar GPS do navegador ou marcar coordenada no mapa;
3. registrar uma ocorrência;
4. receber protocolo;
5. visualizar o ponto por status;
6. executar triagem;
7. gerar ordem de serviço;
8. iniciar atendimento;
9. concluir a ordem;
10. receber atualização por WebSocket.

O estado do servidor local é intencionalmente volátil e zerado a cada reinício. A persistência oficial do produto é a implementação PostgreSQL/PostGIS.

## 9. Integridade

Este bloco não inventa:

- geometria inexistente;
- significado dos códigos 0/1/2/3/4 da camada territorial;
- SLA municipal oficial;
- secretaria vigente quando a fonte fornecida não estabelece a vinculação operacional atual.

