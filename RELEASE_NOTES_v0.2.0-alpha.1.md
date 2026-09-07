# URBIS v0.2.0-alpha.1 — GIS territorial

## Entrega
Integração da camada vetorial `Logradouros 2025 2.geojson` ao núcleo URBIS.

## Evidências de validação
- 11.079 features recebidas;
- 10.997 MultiLineStrings válidas e não vazias admitidas na camada operacional;
- 82 registros em quarentena: 81 vazios + 1 inválido;
- 2.257 nomes de logradouros;
- 46 bairros;
- 6 zonas;
- 2.452 CEPs válidos distintos na geometria;
- 2.446 CEPs também presentes na referência documental de CEPs;
- soma geométrica projetada: 1.152,370 km.

## Código
- schema `street_segments` PostGIS + GiST;
- função `urbis_nearest_street`;
- bootstrap automático da malha, CEPs e PLANCON para banco novo via Docker Compose;
- endpoints NestJS territoriais;
- servidor de prova local sem banco;
- painel cartográfico Canvas sem dependência de mapas externos;
- GeoPackage operacional;
- testes automatizados: 10 testes de núcleo/território + validação de datasets, todos aprovados.

## Limites mantidos
- 82 geometrias não foram corrigidas silenciosamente;
- códigos de infraestrutura não receberam rótulos inventados;
- autoridade emissora da fonte vetorial permanece marcada como não identificada no próprio arquivo;
- migrations PostGIS foram preparadas, mas não executadas neste ambiente porque Docker/PostgreSQL não estão disponíveis no runtime atual.

### Achados não ocultados
- 4 grupos de geometria exatamente duplicada (8 features), preservados;
- 1 valor anômalo em `rede_esgot` (`-2147483643.0000002`), preservado;
- 1 provável typo em `nm_tip` (`Travssa`), preservado;
- 67 valores de `id` de origem se repetem; por isso o URBIS usa `_source_index` + dataset como chave estável de ingestão.
