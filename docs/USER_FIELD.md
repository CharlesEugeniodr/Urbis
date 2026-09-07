# Manual da equipe de campo — URBIS

1. autenticar com credencial individual `FIELD_AGENT`;
2. consultar apenas OS da equipe atribuída;
3. abrir rota; Mapbox é usado se configurado, caso contrário o sistema identifica explicitamente que a distância é apenas em linha reta;
4. registrar saída/rota/chegada/início;
5. capturar evidência `BEFORE`;
6. executar o serviço;
7. capturar evidência `AFTER`;
8. concluir dentro do geofence configurado, salvo procedimento administrativo de exceção futuro;
9. a conclusão atualiza a ocorrência e gera evento/notificação ao cidadão.

Não compartilhe credenciais e não use uma conta genérica em produção.
