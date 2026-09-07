BEGIN;
INSERT INTO categories(code,name,default_urgency) VALUES
 ('LIGHTING','Iluminação pública','NORMAL'),
 ('TRAFFIC_SIGNAL','Semáforos e sinalização','HIGH'),
 ('WATER','Água e abastecimento','NORMAL'),
 ('ENERGY','Energia elétrica','HIGH'),
 ('PAVEMENT','Buracos e pavimentação','NORMAL'),
 ('RESILIENCE','Resiliência e alertas','HIGH'),
 ('PUBLIC_SERVICE_QUALITY','Qualidade dos serviços públicos','LOW')
ON CONFLICT (code) DO NOTHING;
COMMIT;
