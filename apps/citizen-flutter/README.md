# URBIS Citizen Flutter — v0.5.0-alpha.1

Starter funcional para o aplicativo do cidadão. Fluxo implementado em código:

`login → GPS → categoria/descrição → câmera → ocorrência → evidência base64 → protocolo → ICI`

## Execução

É necessário Flutter SDK instalado. O runtime usado na construção do pacote não possui Flutter, portanto este app **não foi compilado neste ambiente**.

Android Emulator:

```bash
flutter pub get
flutter run --dart-define=URBIS_API_URL=http://10.0.2.2:3100
```

Dispositivo físico na mesma rede: substitua o host pelo IP local da máquina que executa a API e configure a API para escutar explicitamente em interface de rede apenas em ambiente controlado, com `URBIS_TOKEN_SECRET` próprio e sem credenciais demo.

A senha padrão exibida no app web existe apenas na prova local (`127.0.0.1`). Não deve ser incorporada em builds de distribuição.
