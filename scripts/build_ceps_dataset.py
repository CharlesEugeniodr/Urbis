#!/usr/bin/env python3
import csv, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT.parent / 'NOVOS CEPs DE PARAUAPEBAS.pdf'
OUT = ROOT / 'data' / 'territorial' / 'ceps_parauapebas_2025.csv'
TXT = ROOT / 'data' / 'territorial' / '_ceps_raw.txt'

if not PDF.exists():
    raise SystemExit(f'Arquivo fonte ausente: {PDF}')
subprocess.run(['pdftotext','-raw',str(PDF),str(TXT)], check=True)
lines = TXT.read_text(encoding='utf-8').splitlines()
try:
    start = lines.index('Logradouros') + 1
except ValueError:
    raise SystemExit('Marcador Logradouros não encontrado')

rx = re.compile(r'^(\d{5}-\d{3})\s+(.+?)\s+-\s+([A-Za-z. ]+)\s+-\s+(.+)$')
rows=[]
for raw in lines[start:]:
    raw=raw.strip()
    m=rx.match(raw)
    if not m:
        continue
    cep, street, kind, neighborhood = m.groups()
    rows.append({
        'cep': cep,
        'street_name': street.strip(),
        'street_type_source': kind.strip(),
        'neighborhood_source': neighborhood.strip(),
        'raw_line': raw,
        'source_reference': 'NOVOS CEPs DE PARAUAPEBAS.pdf',
        'source_generation': '2025-11-26 17:57'
    })

OUT.parent.mkdir(parents=True, exist_ok=True)
with OUT.open('w',encoding='utf-8',newline='') as f:
    w=csv.DictWriter(f,fieldnames=rows[0].keys())
    w.writeheader(); w.writerows(rows)
TXT.unlink(missing_ok=True)
print(f'{len(rows)} registros gravados em {OUT}')
