# URBIS v0.4.0-alpha.1 — Identidade, Evidência e App Cidadão

## Entregas principais
- identidade local com senha derivada por scrypt e token HS256;
- RBAC `CITIZEN`, `OPERATOR`, `FIELD_AGENT`, `MANAGER`, `ADMIN`;
- evidência JPEG/PNG/WebP/MP4 com SHA-256 e armazenamento content-addressed;
- ICI-URBIS alpha.1, separado de prova jurídica/forense;
- prova web do cidadão e starter Flutter;
- Redis Pub/Sub opcional e abstração LOCAL/S3/MinIO;
- migration `010_identity_evidence_ici.sql`.

## Validação da época
A entrega v0.4 foi validada no núcleo local em memória. PostGIS/Redis/MinIO e Flutter não foram executados no runtime usado naquela etapa.
