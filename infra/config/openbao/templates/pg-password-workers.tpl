{{/*
=============================================================================
OpenBao Agent Template: Dynamic PostgreSQL Password (Workers)
=============================================================================
Destination: /secrets/pg_password (raw password only)
Version: 1.0

This template outputs ONLY the password with no newline,
suitable for use as a file-based secret.
=============================================================================
*/}}
{{- with secret "cerniq-db/creds/workers-dynamic" -}}
{{ .Data.password }}
{{- end -}}

