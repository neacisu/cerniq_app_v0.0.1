-- Adaugă valoarea STOPPED la enum-ul de status pentru înrolări în secvențe (plan R1-A10).
ALTER TYPE outreach.sequence_status_enum ADD VALUE IF NOT EXISTS 'STOPPED';
