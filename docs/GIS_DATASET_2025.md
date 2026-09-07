# Camada oficial de logradouros — Parauapebas 2025

## Ingestão
A fonte `Logradouros 2025 2.geojson` foi recebida pelo projeto como envelope JSON contendo a camada `ruas_cep_wgs` em CRS84/WGS84. O conteúdo foi preservado integralmente em `data/territorial/source/` e uma camada operacional foi gerada sem corrigir silenciosamente geometrias problemáticas.

## Auditoria objetiva
- registros na fonte: **11.079**;
- segmentos admitidos na camada operacional: **10.997**;
- quarentena: **82** registros;
- motivo da quarentena: **81 geometrias vazias** e **1 geometria inválida**;
- tipo geométrico operacional: `MultiLineString`;
- bairros distintos: **46**;
- zonas distintas: **6**;
- logradouros nominais distintos (`nom_novo`): **2.257**;
- CEPs válidos distintos presentes na geometria: **2.452**;
- extensão geométrica somada, projetada em SIRGAS 2000 / UTM 22S (EPSG:31982): **1.152,370 km**;
- bbox CRS84: `[-49.9181590862, -6.2130072599, -49.8267828321, -5.9382668405]`.

A extensão acima é uma **soma geométrica dos segmentos fornecidos**, não deve ser interpretada automaticamente como extensão única de malha viária sem análise de sobreposição/duplicidade.

## Cruzamento com a lista de CEPs
A base derivada do PDF `NOVOS CEPs DE PARAUAPEBAS.pdf` contém 2.541 CEPs de logradouro. O cruzamento por CEP exato com a camada vetorial confirmou **2.446 CEPs em comum**. Existem 6 CEPs válidos na geometria que não aparecem na base PDF e 95 CEPs do PDF sem geometria correspondente nesta camada.

Isso é tratado como divergência de fontes, não como erro a ser corrigido automaticamente.

## Atributos preservados
A camada inclui, entre outros: `cep`, `Zona`, `bairro`, `b_correio`, `nm_tip`, `nom_novo`, `nom_antig`, `entre_ruas`, `pavimentac`, `drenagem`, `meio_fio`, `iluminacao`, `agua`, `rede_energ`, `rede_esgot`, `coleta_lix`, `conservaca`, `dificil_ac`, `transporte`, `setor_fisc` e `setor_cole`.

Os valores codificados desses campos são preservados **sem interpretação semântica inventada**. Para converter, por exemplo, `pavimentac=3` em um rótulo de domínio, é necessário o dicionário oficial da base ou outra fonte documental equivalente.

## Artefatos
- `logradouros_parauapebas_2025.operational.geojson`: camada validada para uso operacional;
- `logradouros_parauapebas_2025.gpkg`: mesma camada em GeoPackage;
- `logradouros_parauapebas_2025.quarantine.json`: registros excluídos do uso operacional, preservados para auditoria;
- `logradouros_parauapebas_2025.metadata.json`: contagens, bbox, hashes e reconciliação com CEP;
- `logradouros_parauapebas_2025.index.csv`: índice tabular dos atributos sem geometria.

## PostGIS
A migration `004_street_segments.sql` cria `street_segments`, índices GiST e a função `urbis_nearest_street(lon,lat,limit)`. O importador `scripts/import_logradouros_postgis.py` executa carga transacional e associa a geometria ao dataset versionado.

## Achados adicionais de qualidade
A auditoria também encontrou **4 grupos de geometria exatamente duplicada (8 features)**. Eles foram mantidos porque uma duplicidade geométrica pode representar segmentação/cadastro repetido e não deve ser eliminada sem regra de negócio da fonte.

Foram identificadas ainda duas anomalias de atributo que permanecem intactas para rastreabilidade:

- `Travessa Santa Isabel`, CEP `68317-628`: `rede_esgot = -2147483643.0000002`, valor incompatível com o padrão 0/1 predominante no campo;
- `Travessa Limoeiro`, CEP `68320-220`: `nm_tip = "Travssa"`, provável erro de digitação.

Nenhuma dessas ocorrências foi “corrigida” automaticamente. O dado bruto é preservado e a aplicação deve usar uma camada de normalização versionada quando houver dicionário/retificação oficial.
