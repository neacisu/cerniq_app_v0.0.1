{{/*
=============================================================================
OpenBao Agent Template: Dynamic PostgreSQL Password
=============================================================================
Reference: ADR-0033 OpenBao Secrets Management
Destination: /secrets/pg_password (raw password only)
Version: 1.0

This template outputs ONLY the password with no newline,
suitable for use as a file-based secret.
=============================================================================
*/}}
{{- with secret "database/creds/api-dynamic" -}}
{{ .Data.password }}
{{- end -}}