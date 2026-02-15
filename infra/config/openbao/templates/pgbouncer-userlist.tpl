{{/*
=============================================================================
OpenBao Agent Template: PgBouncer userlist (auth_user only)
=============================================================================
Destination: /secrets/pgbouncer_userlist.txt
Notes:
- This file contains a plaintext password for PgBouncer's auth_user so PgBouncer
  can connect to PostgreSQL and execute auth_query.
- Source-of-truth is OpenBao (KV); file is rendered on host and should live on
  tmpfs (`/run/...`) in production/staging.
=============================================================================
*/}}
{{- with secret "secret/cerniq/infra/pgbouncer" -}}
"{{ .Data.auth_user }}" "{{ .Data.auth_password }}"
{{- end -}}

