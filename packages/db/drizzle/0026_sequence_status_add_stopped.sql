-- Adaugă valoarea STOPPED la enum-ul de status pentru înrolări în secvențe (plan R1-A10).
-- Enum-ul sequence_status_enum este definit în schema public (fără prefix de schema în pgEnum),
-- nu în outreach. Prefixul outreach. era incorect și provoca eșec la fiecare pornire.
ALTER TYPE public.sequence_status_enum ADD VALUE IF NOT EXISTS 'STOPPED';
