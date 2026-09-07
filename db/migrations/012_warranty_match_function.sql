BEGIN;
CREATE OR REPLACE FUNCTION urbis_match_active_warranties(p_occurrence uuid, p_at timestamptz DEFAULT now())
RETURNS TABLE(contract_id uuid, contract_number text, contractor_name text, warranty_until date, match_basis text)
LANGUAGE sql STABLE AS $$
  SELECT c.id,c.contract_number,c.contractor_name,c.warranty_until,
         CASE WHEN c.geom IS NOT NULL THEN 'GEOMETRY' ELSE 'UNSPECIFIED' END
    FROM occurrences o
    JOIN public_contracts c ON c.warranty_until IS NULL OR c.warranty_until >= p_at::date
   WHERE o.id=p_occurrence
     AND c.geom IS NOT NULL
     AND ST_Intersects(c.geom,o.point)
$$;
COMMIT;
