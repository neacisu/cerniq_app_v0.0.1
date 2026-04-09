-- message_status_enum: BLOCKED — mesaje WA respinse de utilizator / platformă (reputație telefon).
-- PostgreSQL: ADD VALUE nu poate rula în interiorul unui bloc de tranzacție în unele versiuni;
-- migrarea drizzle rulează fișierul ca atare.

ALTER TYPE message_status_enum ADD VALUE 'BLOCKED';
