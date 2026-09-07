# Segurança — URBIS v0.5.0-alpha.1

## Controles implementados/estruturados
- senha LOCAL com scrypt;
- JWT HS256 com `iss`, `aud`, `iat`, `exp` e segredo mínimo de 32 caracteres;
- OIDC/JWKS opcional;
- RBAC e isolamento de agente de campo por equipe;
- SQL parametrizado;
- CORS configurável;
- TLS 1.3 no gateway;
- headers de segurança e rate limiting;
- evidência com SHA-256;
- storage privado;
- secrets fora do código via ambiente/Kubernetes;
- Trivy no CI;
- Sentry com `sendDefaultPii:false`.

## Não alegado nesta versão
- criptografia AES-256 física de volume/bucket sem KMS/provedor configurado;
- pentest, SAST/DAST completo ou certificação OWASP;
- MFA/refresh token/revogação central;
- attestation do dispositivo ou assinatura forense de captura;
- antivírus/análise de conteúdo de upload.

Esses itens são gates de hardening antes de produção quando aplicáveis ao risco e ao ambiente contratado.
