BEGIN;

INSERT INTO data_sources(code,name,kind,authority)
VALUES ('URBIS_CITIZEN_APP','URBIS — Aplicativo do Cidadão','CITIZEN_REPORT','Sigma SIHF Soluções Analíticas S/A / implantação municipal')
ON CONFLICT(code) DO NOTHING;

-- Alvos funcionais. Estes códigos NÃO afirmam a secretaria/concessionária vigente;
-- a vinculação institucional concreta deve ser parametrizada na implantação municipal.
INSERT INTO integration_targets(code,display_name,target_type) VALUES
 ('MUNICIPAL_LIGHTING_AUTHORITY','Responsável municipal por iluminação pública','ROLE'),
 ('MUNICIPAL_TRAFFIC_AUTHORITY','Responsável municipal por trânsito e sinalização','ROLE'),
 ('WATER_SERVICE_PROVIDER','Prestador responsável por água e saneamento','ROLE'),
 ('ELECTRICITY_CONCESSIONAIRE','Concessionária responsável por energia elétrica','ROLE'),
 ('MUNICIPAL_PUBLIC_WORKS','Responsável municipal por obras e pavimentação','ROLE'),
 ('COMPDEC','Coordenadoria Municipal de Proteção e Defesa Civil','ROLE'),
 ('URBIS_CENTRAL','Central operacional URBIS','ROLE')
ON CONFLICT(code) DO NOTHING;

-- SLAs abaixo são defaults de engenharia do protótipo, explicitamente provisórios.
-- Eles NÃO substituem SLA legal, contratual ou administrativo do Município.
INSERT INTO dispatch_rules(category_code,responsible_org_code,sla_minutes,routing_mode,provisional,source_note) VALUES
 ('LIGHTING','MUNICIPAL_LIGHTING_AUTHORITY',2880,'ROLE_TARGET',true,'ENGINEERING_DEFAULT_NOT_OFFICIAL_SLA'),
 ('TRAFFIC_SIGNAL','MUNICIPAL_TRAFFIC_AUTHORITY',240,'ROLE_TARGET',true,'ENGINEERING_DEFAULT_NOT_OFFICIAL_SLA'),
 ('WATER','WATER_SERVICE_PROVIDER',720,'ROLE_TARGET',true,'ENGINEERING_DEFAULT_NOT_OFFICIAL_SLA'),
 ('ENERGY','ELECTRICITY_CONCESSIONAIRE',240,'ROLE_TARGET',true,'ENGINEERING_DEFAULT_NOT_OFFICIAL_SLA'),
 ('PAVEMENT','MUNICIPAL_PUBLIC_WORKS',4320,'ROLE_TARGET',true,'ENGINEERING_DEFAULT_NOT_OFFICIAL_SLA'),
 ('RESILIENCE','COMPDEC',60,'ROLE_TARGET',true,'ENGINEERING_DEFAULT_NOT_OFFICIAL_SLA'),
 ('PUBLIC_SERVICE_QUALITY','URBIS_CENTRAL',7200,'ROLE_TARGET',true,'ENGINEERING_DEFAULT_NOT_OFFICIAL_SLA')
ON CONFLICT(category_code) DO UPDATE SET
 responsible_org_code=excluded.responsible_org_code,
 sla_minutes=excluded.sla_minutes,
 routing_mode=excluded.routing_mode,
 provisional=excluded.provisional,
 source_note=excluded.source_note,
 active=true,
 updated_at=now();

COMMIT;
