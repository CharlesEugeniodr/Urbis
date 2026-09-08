# 🏙️ URBIS — Plataforma Digital Municipal

[![License](https://img.shields.io/badge/license-Proprietary-blue)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.5.0--alpha.1-orange)]()
[![Tests](https://img.shields.io/badge/tests-43%20passing-brightgreen)]()

> Plataforma de gestão urbana georreferenciada para Parauapebas, PA — Brasil

**URBIS** transforma o cidadão em agente ativo da gestão urbana. Permite o registro georreferenciado de ocorrências (iluminação, buracos, água, energia, trânsito, resiliência), com acompanhamento em tempo real pela prefeitura.

## 🚀 Portal de Acesso

👉 **[Acessar URBIS](https://charleseugeniodr.github.io/Urbis/)** — Portal principal com downloads e links

## 📱 Downloads

| App | Plataforma | Download |
|-----|-----------|----------|
| URBIS Cidadão | Android | [⬇️ APK](https://github.com/CharlesEugeniodr/Urbis/releases/latest/download/URBIS-Cidadao-v0.5.0.apk) |
| URBIS Campo | Android | [⬇️ APK](https://github.com/CharlesEugeniodr/Urbis/releases/latest/download/URBIS-Campo-v0.5.0.apk) |
| iOS | Em breve | Requer compilação em macOS |

## 🖥️ Módulos Web

| Módulo | Descrição |
|--------|-----------|
| **Painel Central GIS** | Dashboard com mapa interativo, indicadores e despacho de equipes |
| **App Cidadão** | Interface web para registro de ocorrências |
| **App Campo** | Interface para equipes de campo |
| **Portal Público** | Transparência: indicadores abertos para a sociedade |

## 📋 Categorias de Ocorrência

| Código | Categoria | Ícone |
|--------|-----------|-------|
| `LIGHTING` | Iluminação pública | 💡 |
| `TRAFFIC_SIGNAL` | Sinalização de trânsito | 🚦 |
| `WATER` | Rede de água/esgoto | 💧 |
| `ENERGY` | Rede elétrica | ⚡ |
| `PAVEMENT` | Pavimentação | ⚠️ |
| `RESILIENCE` | Resiliência climática | 🛡️ |

## 🛠️ Stack Tecnológico

```
Backend:    Node.js 24 · NestJS 11 · PostgreSQL + PostGIS · Redis · Kafka
Frontend:   React 19 · Next.js 15 · Mapbox GL · ECharts
Mobile:     Flutter 3.32 · Dart 3.8 · flutter_map · OpenStreetMap
Segurança:  Keycloak OIDC · LGPD compliance · SHA-256 evidence
Infra:      Docker · Kubernetes · Firebase FCM · nginx
```

## 🗄️ Estrutura do Repositório

```
Urbis/
├── apps/
│   ├── api/                    # NestJS API (50+ endpoints)
│   ├── citizen-flutter/        # App cidadão (Android/iOS)
│   ├── field-flutter/          # App equipe de campo
│   ├── web-central-react/      # Painel central GIS (React)
│   └── web-public-next/        # Portal público (Next.js)
├── core/                       # Módulos compartilhados
│   ├── business-core.mjs       # Regras de negócio
│   ├── evidence-core.mjs       # ICI + evidências
│   ├── operation-core.mjs      # Ordens de serviço
│   ├── risk-engine.mjs         # Motor de risco/resiliência
│   ├── security-core.mjs       # Auth + LGPD
│   └── reporting-core.mjs      # CSV/XLSX/PDF
├── data/territorial/           # 10.997 segmentos GIS
├── docs/                       # Documentação + landing page
├── services/
│   ├── event-relay/            # WebSocket relay
│   └── notification-worker/    # Push notifications
├── scripts/                    # Validação e CI
└── tools/                      # Probe server local
```

## 🧪 Testes

```bash
npm test:all    # 43 testes (risk-engine, territory, operation, security, business, reporting, e2e)
```

## 🔑 Credenciais de Demonstração (ambiente local)

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Cidadão | `citizen@urbis.local` | `UrbisLocal!2026` |
| Operador | `operator@urbis.local` | `UrbisLocal!2026` |
| Campo | `field@urbis.local` | `UrbisLocal!2026` |
| Gestor | `manager@urbis.local` | `UrbisLocal!2026` |

## 📊 Dados Territoriais

- **10.997** segmentos viários de Parauapebas
- **2.541** CEPs mapeados
- **100%** cobertura operacional do município

## 📄 Licença

Proprietário — **Sigma SIHF Soluções Analíticas S/A** (CNPJ 01.851.824/0001-38)

---

<p align="center">Prefeitura Municipal de Parauapebas, Pará, Brasil 🇧🇷</p>
