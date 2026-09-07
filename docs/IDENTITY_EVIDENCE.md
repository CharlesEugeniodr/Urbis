# Identidade, Evidência e ICI — URBIS v0.5.0-alpha.1

## 1. Modelo de identidade

A identidade está separada da ocorrência. `users_account` representa a conta; `auth_identities` representa o provedor de autenticação; `user_roles` representa autorização.

A modelagem permite trocar `LOCAL` por OIDC/Gov.br/Keycloak sem reescrever a chave primária do usuário nem o histórico territorial.

### Papéis

| Papel | Escopo principal |
|---|---|
| CITIZEN | registrar e consultar suas ocorrências, enviar suas evidências |
| OPERATOR | leitura operacional, triagem e validação de evidência |
| FIELD_AGENT | ordens de serviço e evidência de campo |
| MANAGER | gestão operacional ampla |
| ADMIN | administração integral |

O servidor local inclui contas demo apenas para `127.0.0.1`. A API NestJS não cria automaticamente contas operacionais demo.

## 2. Cadeia técnica da evidência

Ao receber mídia:

1. valida tipo e tamanho;
2. decodifica os bytes recebidos;
3. calcula SHA-256;
4. grava por endereço de conteúdo;
5. registra tamanho, tipo, nome original, horário, coordenadas e usuário;
6. registra que o hash foi verificado contra o objeto gravado;
7. calcula o ICI;
8. em validação administrativa posterior, recalcula o ICI com o fator de autoridade.

O hash oferece **integridade pós-ingestão**, não autenticidade pré-ingestão.

## 3. ICI-URBIS alpha

\[
ICI = 100(0,25F_s+0,20F_g+0,20F_e+0,15F_t+0,10F_c+0,10F_v)
\]

Todos os fatores estão limitados a `[0,1]`.

- `F_s`: classe da fonte autenticada;
- `F_g`: distância entre o ponto da ocorrência e as coordenadas atribuídas à evidência;
- `F_e`: completude técnica: hash, tipo permitido, bytes, tempo e coordenadas;
- `F_t`: proximidade temporal entre captura declarada e registro;
- `F_c`: quantidade de ocorrências correlatas na janela de duplicidade;
- `F_v`: validação por agente autorizado.

### Faixas

- 85–100: `VERY_HIGH`
- 70–84,99: `HIGH`
- 50–69,99: `MODERATE`
- 30–49,99: `LOW`
- <30: `VERY_LOW`

Essas faixas e pesos são **parâmetros internos de engenharia do alpha**, ainda sem calibração estatística ou validação empírica. Não devem ser usados isoladamente para rejeitar denúncia, punir usuário, atribuir responsabilidade ou produzir conclusão pericial.

## 4. Armazenamento

`URBIS_OBJECT_STORE_DRIVER=LOCAL` grava localmente. `S3` usa endpoint compatível com S3, incluindo MinIO.

Nenhum objeto é publicado anonimamente pelo Compose. O bucket `urbis-evidence` é criado com acesso anônimo desabilitado.

## 5. Próximos controles necessários

- OIDC/Keycloak e federação institucional;
- MFA para perfis administrativos;
- refresh tokens e revogação;
- assinatura/attestation de captura no dispositivo;
- extração EXIF controlada e comparação com GPS do aparelho;
- política de retenção e descarte;
- antivírus/malware scanning de uploads;
- detecção de mídia duplicada/perceptual hash;
- criptografia por chave gerenciada no storage;
- trilha de custódia exportável.
