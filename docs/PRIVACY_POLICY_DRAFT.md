# Política de Privacidade — MINUTA TÉCNICA URBIS v0.5

**Status:** minuta para revisão jurídica, DPO/encarregado e controlador responsável antes da implantação pública.

## Dados tratados
Identificação de conta, fingerprint HMAC de CPF, contato, localização, evidências enviadas, dados técnicos do dispositivo, protocolos, histórico de interações, avaliações e registros operacionais.

## Finalidades
Registro e tratamento de ocorrências urbanas, prestação/monitoramento de serviços, comunicação com o usuário, segurança, auditoria, resiliência e produção de indicadores agregados.

## Princípios implementados
- minimização e separação de papéis;
- painel público sem autor/endereço exato e com localização generalizada;
- trilha de auditoria;
- armazenamento de CPF sem valor em claro na base principal, usando fingerprint HMAC;
- solicitações de acesso, correção, anonimização, eliminação e portabilidade entram em fluxo de análise;
- eliminação não é automática quando houver dever legal, interesse público ou necessidade de preservação de evidência administrativa.

## Retenção
A tabela `data_retention_policies` permite parametrizar retenção por classe. **Prazos definitivos não são fixados nesta minuta**, pois dependem da base legal, tabela de temporalidade, atos locais e orientação do controlador/DPO.

## Transparência e direitos
Antes da produção, publicar identidade do controlador, encarregado, canais de atendimento, bases legais, compartilhamentos, prazos e procedimento de exercício de direitos.
