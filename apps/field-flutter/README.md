# URBIS Campo Flutter — v0.5.0-alpha.1

Fluxo implementado em código: **login → OS atribuída → GPS → rota → evidência BEFORE → chegada/início com geofence → evidência AFTER → conclusão**.

A rota usa o endpoint do backend; em produção, quando `MAPBOX_ACCESS_TOKEN` estiver configurado, o backend consulta Mapbox Directions. Sem token, retorna apenas distância em linha reta explicitamente marcada como fallback.

O runtime desta entrega não possui Flutter SDK, então este aplicativo precisa ser compilado/validado em ambiente Flutter externo antes de distribuição.
