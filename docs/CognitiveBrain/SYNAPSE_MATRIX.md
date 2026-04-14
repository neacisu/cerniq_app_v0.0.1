# SYNAPSE_MATRIX

Generat de `docs/CognitiveBrain/scripts/build_synapse_matrix.py`. Un rând per fișier contract sinapsă (fără `synapses/README.md`).

**Termeni:** **areal sinaptic** = director de nivel 1 (agregare funcțională); **traseu sinaptic** = subdirector al unui areal (contracte cu același stem canonic). `graph-plan/` = sinapse de topologie plan exportat.

- Contracte sinapsă indexate: **2305** (așteptat **2305**).
- **Areale sinaptice** (nivel 1 sub `synapses/`): **10**.
- **Trasee sinaptice** distincte: **318**.

## Structură directoare (contracte)

| Zonă | Semnificație |
| --- | --- |
| `contracts/synapses/<areal>/` | **Areal sinaptic** — regiune de grupare a traseelor; mapare în `synaptic_areal_pathway_map.py`. |
| `contracts/synapses/<areal>/<traseu>/` | **Traseu sinaptic** — slug = numele directorului; reper: fișier manifest `*-family.md` (convenție nume istorică). |
| `contracts/synapses/graph-plan/stage/` | Sinapse `-stage` (registru §7 / plan exportat). |
| `contracts/synapses/graph-plan/familyflow/` | Sinapse `-familyflow`. |
| `contracts/synapses/graph-plan/cross/` | Sinapse `-cross`. |

**Migrare:** `python3 docs/CognitiveBrain/scripts/migrate_synapse_contracts_to_family_dirs.py` apoi `python3 docs/CognitiveBrain/scripts/migrate_synapse_areal_layout.py`.

## Rezumat pe areal sinaptic (`areal_dir`)

| areal_dir | fișiere |
| --- | --- |
| `ai-agent` | 319 |
| `alerts` | 126 |
| `channels-outreach` | 239 |
| `credit-contracts` | 295 |
| `enrich-data` | 461 |
| `graph-plan` | 106 |
| `hitl-human` | 34 |
| `lifecycle-growth` | 382 |
| `pipeline-monitor` | 105 |
| `stock-logistics` | 238 |

## Rezumat pe bucket (`bucket`)

| bucket | fișiere |
| --- | --- |
| `graph_cross` | 9 |
| `graph_familyflow` | 46 |
| `graph_stage` | 51 |
| `pathway` | 2199 |

## Integritate traseu (manifest)

- Trasee fără fișier manifest `*-family.md`: **0**.

## Catalog trasee sinaptice (rezumat)

| areal_dir | pathway_slug | md_count | has_pathway_manifest |
| --- | --- | --- | --- |
| `ai-agent` | `ai-agent-generate` | 5 | yes |
| `ai-agent` | `ai-agent-orchestrate` | 5 | yes |
| `ai-agent` | `ai-agent-response-generate` | 5 | yes |
| `ai-agent` | `ai-context-build` | 5 | yes |
| `ai-agent` | `ai-feedback-collect` | 5 | yes |
| `ai-agent` | `ai-intent-classify` | 13 | yes |
| `ai-agent` | `ai-prompt-optimize` | 5 | yes |
| `ai-agent` | `ai-response-generate` | 9 | yes |
| `ai-agent` | `ai-sentiment-analyze` | 9 | yes |
| `ai-agent` | `ai-tool-execute` | 5 | yes |
| `alerts` | `alert-bounce-high` | 5 | yes |
| `alerts` | `alert-client-account-blocked` | 4 | yes |
| `alerts` | `alert-client-contract-pending` | 4 | yes |
| `alerts` | `alert-client-credit-insufficient` | 4 | yes |
| `alerts` | `alert-client-delivered` | 4 | yes |
| `alerts` | `alert-client-delivery-failed` | 4 | yes |
| `alerts` | `alert-client-out-for-delivery` | 4 | yes |
| `alerts` | `alert-client-payment-received` | 4 | yes |
| `alerts` | `alert-client-payment-reminder` | 4 | yes |
| `alerts` | `alert-client-referral-reward` | 5 | yes |
| `alerts` | `alert-client-return-created` | 4 | yes |
| `alerts` | `alert-client-shipped` | 4 | yes |
| `alerts` | `alert-client-welcome` | 5 | yes |
| `alerts` | `alert-internal-campaign-launched` | 5 | yes |
| `alerts` | `alert-internal-churn-daily` | 5 | yes |
| `alerts` | `alert-internal-competitor-price` | 5 | yes |
| `alerts` | `alert-internal-compliance-issue` | 4 | yes |
| `alerts` | `alert-internal-contract-signed` | 4 | yes |
| `alerts` | `alert-internal-credit-blocked` | 4 | yes |
| `alerts` | `alert-internal-daily-summary` | 4 | yes |
| `alerts` | `alert-internal-delivery-cluster` | 5 | yes |
| `alerts` | `alert-internal-insolvency-detected` | 4 | yes |
| `alerts` | `alert-internal-nps-drop` | 5 | yes |
| `alerts` | `alert-internal-oblio-sync-failed` | 4 | yes |
| `alerts` | `alert-internal-return-received` | 4 | yes |
| `alerts` | `alert-internal-stock-insufficient` | 4 | yes |
| `alerts` | `alert-internal-storno-failed` | 4 | yes |
| `alerts` | `alert-phone-banned` | 5 | yes |
| `alerts` | `alert-phone-offline` | 5 | yes |
| `enrich-data` | `association-enrich-termene` | 6 | yes |
| `enrich-data` | `association-members-link` | 6 | yes |
| `enrich-data` | `association-pdf-ingest` | 6 | yes |
| `enrich-data` | `association-sync-schedule` | 6 | yes |
| `enrich-data` | `association-territory-infer` | 6 | yes |
| `pipeline-monitor` | `audit-compliance-check` | 10 | yes |
| `pipeline-monitor` | `audit-data-anonymize` | 10 | yes |
| `pipeline-monitor` | `audit-log-write` | 10 | yes |
| `pipeline-monitor` | `backup-conversations-export` | 1 | yes |
| `enrich-data` | `bronze-dedup-hash-checker` | 5 | yes |
| `enrich-data` | `bronze-ingest-csv-parser` | 5 | yes |
| `enrich-data` | `bronze-ingest-html-scraper` | 5 | yes |
| `enrich-data` | `bronze-ingest-json-parser` | 5 | yes |
| `enrich-data` | `bronze-ingest-pdf-extractor` | 21 | yes |
| `channels-outreach` | `campaign-cluster-launch` | 8 | yes |
| `ai-agent` | `channel-email-send` | 3 | yes |
| `ai-agent` | `channel-routing-decide` | 3 | yes |
| `ai-agent` | `channel-whatsapp-send` | 3 | yes |
| `lifecycle-growth` | `churn-alert-escalate` | 11 | yes |
| `lifecycle-growth` | `churn-behavior-detect` | 11 | yes |
| `lifecycle-growth` | `churn-recovery-attempt` | 11 | yes |
| `lifecycle-growth` | `churn-recovery-check` | 11 | yes |
| `lifecycle-growth` | `churn-sentiment-analyze` | 11 | yes |
| `lifecycle-growth` | `churn-signal-create` | 11 | yes |
| `lifecycle-growth` | `compliance-audit-generate` | 5 | yes |
| `lifecycle-growth` | `compliance-consent-check` | 5 | yes |
| `lifecycle-growth` | `compliance-data-anonymize` | 5 | yes |
| `lifecycle-growth` | `compliance-optout-process` | 5 | yes |
| `lifecycle-growth` | `content-drip-schedule` | 9 | yes |
| `lifecycle-growth` | `content-drip-send` | 9 | yes |
| `lifecycle-growth` | `content-personalize-ai` | 9 | yes |
| `lifecycle-growth` | `content-seasonal-generate` | 9 | yes |
| `credit-contracts` | `contract-archive-store` | 13 | yes |
| `credit-contracts` | `contract-clause-assemble` | 13 | yes |
| `credit-contracts` | `contract-generate-docx` | 13 | yes |
| `credit-contracts` | `contract-generate-notice` | 13 | yes |
| `credit-contracts` | `contract-sign-check-expiry` | 13 | yes |
| `credit-contracts` | `contract-sign-complete` | 13 | yes |
| `credit-contracts` | `contract-sign-request` | 13 | yes |
| `credit-contracts` | `contract-template-select` | 13 | yes |
| `credit-contracts` | `credit-check-order` | 9 | yes |
| `credit-contracts` | `credit-data-fetch-anaf` | 9 | yes |
| `credit-contracts` | `credit-data-fetch-bilant` | 9 | yes |
| `credit-contracts` | `credit-data-fetch-dosare` | 9 | yes |
| `credit-contracts` | `credit-data-fetch-insolventa` | 9 | yes |
| `credit-contracts` | `credit-limit-calculate` | 9 | yes |
| `credit-contracts` | `credit-profile-create` | 9 | yes |
| `credit-contracts` | `credit-release-order` | 9 | yes |
| `credit-contracts` | `credit-reserve-expire` | 9 | yes |
| `credit-contracts` | `credit-reserve-hold` | 9 | yes |
| `credit-contracts` | `credit-score-calculate` | 9 | yes |
| `ai-agent` | `document-email-send` | 4 | yes |
| `ai-agent` | `document-pdf-generate` | 4 | yes |
| `ai-agent` | `document-template-compile` | 4 | yes |
| `ai-agent` | `document-whatsapp-send` | 4 | yes |
| `credit-contracts` | `einvoice-archive-download` | 4 | yes |
| `channels-outreach` | `email-cold-add-to-campaign` | 12 | yes |
| `channels-outreach` | `email-cold-analytics-fetch` | 4 | yes |
| `channels-outreach` | `email-cold-campaign-create` | 4 | yes |
| `channels-outreach` | `email-cold-campaign-pause` | 4 | yes |
| `channels-outreach` | `email-cold-lead-status` | 4 | yes |
| `channels-outreach` | `email-warm-document` | 4 | yes |
| `channels-outreach` | `email-warm-proforma` | 4 | yes |
| `channels-outreach` | `email-warm-send` | 4 | yes |
| `enrich-data` | `enrich-ai-contact-parse` | 3 | yes |
| `enrich-data` | `enrich-ai-industry-classify` | 3 | yes |
| `enrich-data` | `enrich-ai-text-structure` | 3 | yes |
| `enrich-data` | `enrich-anaf-address` | 4 | yes |
| `enrich-data` | `enrich-anaf-caen` | 4 | yes |
| `enrich-data` | `enrich-anaf-efactura` | 4 | yes |
| `enrich-data` | `enrich-anaf-fiscal-status` | 4 | yes |
| `enrich-data` | `enrich-anaf-tva-status` | 4 | yes |
| `enrich-data` | `enrich-anif-ouai-lookup` | 4 | yes |
| `enrich-data` | `enrich-apia-farmer-lookup` | 4 | yes |
| `enrich-data` | `enrich-apia-subsidies` | 4 | yes |
| `enrich-data` | `enrich-email-discovery` | 4 | yes |
| `enrich-data` | `enrich-email-mx-check` | 4 | yes |
| `enrich-data` | `enrich-email-provider-detect` | 4 | yes |
| `enrich-data` | `enrich-email-role-check` | 4 | yes |
| `enrich-data` | `enrich-email-smtp-verify` | 4 | yes |
| `enrich-data` | `enrich-geo-geocode` | 4 | yes |
| `enrich-data` | `enrich-geo-siruta-lookup` | 4 | yes |
| `enrich-data` | `enrich-madr-cooperative` | 4 | yes |
| `enrich-data` | `enrich-madr-producer-groups` | 4 | yes |
| `enrich-data` | `enrich-onrc-capital` | 4 | yes |
| `enrich-data` | `enrich-onrc-registration` | 4 | yes |
| `enrich-data` | `enrich-phone-carrier-detect` | 4 | yes |
| `enrich-data` | `enrich-phone-hlr-lookup` | 4 | yes |
| `enrich-data` | `enrich-phone-type-detect` | 4 | yes |
| `enrich-data` | `enrich-phone-whatsapp-check` | 4 | yes |
| `enrich-data` | `enrich-termene-anaf-debts` | 4 | yes |
| `enrich-data` | `enrich-termene-balance-sheet` | 4 | yes |
| `enrich-data` | `enrich-termene-company-base` | 4 | yes |
| `enrich-data` | `enrich-termene-court-cases` | 4 | yes |
| `enrich-data` | `enrich-termene-financials` | 4 | yes |
| `enrich-data` | `enrich-termene-insolvency` | 4 | yes |
| `enrich-data` | `enrich-termene-risk-score` | 4 | yes |
| `enrich-data` | `enrich-termene-shareholders` | 4 | yes |
| `enrich-data` | `enrich-web-contact-extract` | 4 | yes |
| `enrich-data` | `enrich-web-fetch` | 4 | yes |
| `enrich-data` | `enrich-web-meta-extract` | 4 | yes |
| `enrich-data` | `enrich-web-social-links` | 4 | yes |
| `enrich-data` | `enrich-web-tech-detect` | 4 | yes |
| `lifecycle-growth` | `feedback-competitor-log` | 7 | yes |
| `lifecycle-growth` | `feedback-conversation-analyze` | 7 | yes |
| `lifecycle-growth` | `feedback-entity-store` | 7 | yes |
| `lifecycle-growth` | `feedback-nps-aggregate` | 7 | yes |
| `lifecycle-growth` | `feedback-sentiment-analyze` | 7 | yes |
| `lifecycle-growth` | `feedback-writeback-crm` | 7 | yes |
| `lifecycle-growth` | `geo-cluster-analyze` | 10 | yes |
| `lifecycle-growth` | `geo-delivery-optimize` | 10 | yes |
| `lifecycle-growth` | `geo-neighbor-find` | 10 | yes |
| `lifecycle-growth` | `geo-territory-map` | 10 | yes |
| `lifecycle-growth` | `geo-weather-correlate` | 10 | yes |
| `enrich-data` | `graph-build-full` | 6 | yes |
| `enrich-data` | `graph-centrality-calculate` | 6 | yes |
| `enrich-data` | `graph-communities-latest` | 6 | yes |
| `enrich-data` | `graph-community-detect` | 6 | yes |
| `enrich-data` | `graph-full-built-at` | 6 | yes |
| `enrich-data` | `graph-full-latest` | 6 | yes |
| `enrich-data` | `graph-full-metrics` | 6 | yes |
| `enrich-data` | `graph-kol-identify` | 6 | yes |
| `enrich-data` | `graph-path-find` | 6 | yes |
| `enrich-data` | `graph-relationship-create` | 6 | yes |
| `enrich-data` | `graph-relationship-infer` | 6 | yes |
| `ai-agent` | `guardrail-discount-check` | 11 | yes |
| `ai-agent` | `guardrail-log-analyze` | 11 | yes |
| `ai-agent` | `guardrail-price-check` | 11 | yes |
| `ai-agent` | `guardrail-stock-check` | 11 | yes |
| `ai-agent` | `guardrail-stock-verify` | 11 | yes |
| `hitl-human` | `hitl-approval-contract-clause` | 1 | yes |
| `hitl-human` | `hitl-approval-credit-limit` | 1 | yes |
| `hitl-human` | `hitl-approval-credit-override` | 1 | yes |
| `hitl-human` | `hitl-approval-refund-large` | 1 | yes |
| `hitl-human` | `hitl-approval-return` | 1 | yes |
| `hitl-human` | `hitl-dashboard-metrics` | 1 | yes |
| `hitl-human` | `hitl-dashboard-sync` | 1 | yes |
| `hitl-human` | `hitl-escalation-overdue` | 1 | yes |
| `hitl-human` | `hitl-investigation-payment` | 1 | yes |
| `hitl-human` | `hitl-task-call-client` | 1 | yes |
| `hitl-human` | `hitl-task-create` | 1 | yes |
| `hitl-human` | `hitl-task-expire-check` | 1 | yes |
| `hitl-human` | `hitl-task-nps-followup` | 1 | yes |
| `hitl-human` | `hitl-task-resolve` | 1 | yes |
| `hitl-human` | `human-approve-message` | 1 | yes |
| `hitl-human` | `human-notification-send` | 8 | yes |
| `hitl-human` | `human-queue-prioritize` | 8 | yes |
| `hitl-human` | `human-review-queue` | 1 | yes |
| `hitl-human` | `human-takeover-complete` | 1 | yes |
| `hitl-human` | `human-takeover-initiate` | 1 | yes |
| `channels-outreach` | `lead-assign-user` | 4 | yes |
| `channels-outreach` | `lead-state-transition` | 4 | yes |
| `ai-agent` | `mcp-resource-load` | 5 | yes |
| `ai-agent` | `mcp-session-manage` | 5 | yes |
| `ai-agent` | `mcp-tool-register` | 5 | yes |
| `pipeline-monitor` | `metrics-llm-usage-aggregate` | 1 | yes |
| `pipeline-monitor` | `monitor-email-deliverability` | 5 | yes |
| `pipeline-monitor` | `monitor-phone-health` | 5 | yes |
| `pipeline-monitor` | `monitor-quota-usage` | 5 | yes |
| `ai-agent` | `negotiation-expire-check` | 4 | yes |
| `ai-agent` | `negotiation-reminder-send` | 4 | yes |
| `ai-agent` | `negotiation-state-transition` | 4 | yes |
| `ai-agent` | `negotiation-summary-generate` | 4 | yes |
| `lifecycle-growth` | `nurturing-engagement-track` | 7 | yes |
| `lifecycle-growth` | `nurturing-loyalty-achieved` | 7 | yes |
| `lifecycle-growth` | `nurturing-loyalty-check` | 7 | yes |
| `lifecycle-growth` | `nurturing-nps-process` | 7 | yes |
| `lifecycle-growth` | `nurturing-nps-send` | 7 | yes |
| `lifecycle-growth` | `nurturing-onboarding-complete` | 7 | yes |
| `lifecycle-growth` | `nurturing-onboarding-start` | 7 | yes |
| `lifecycle-growth` | `nurturing-onboarding-step` | 7 | yes |
| `lifecycle-growth` | `nurturing-state-transition` | 7 | yes |
| `stock-logistics` | `oblio-invoice-cancel` | 4 | yes |
| `stock-logistics` | `oblio-invoice-create` | 4 | yes |
| `stock-logistics` | `oblio-proforma-create` | 4 | yes |
| `stock-logistics` | `oblio-stock-sync` | 4 | yes |
| `stock-logistics` | `oblio-webhook-process` | 4 | yes |
| `channels-outreach` | `outreach-channel-selector` | 2 | yes |
| `channels-outreach` | `outreach-orchestrator-dispatch` | 2 | yes |
| `channels-outreach` | `outreach-orchestrator-router` | 2 | yes |
| `channels-outreach` | `outreach-phone-allocator` | 2 | yes |
| `channels-outreach` | `outreach-wa-delay` | 2 | yes |
| `channels-outreach` | `outreach-wa-reschedule` | 2 | yes |
| `channels-outreach` | `outreach-wa-send` | 2 | yes |
| `credit-contracts` | `payment-reconcile-auto` | 12 | yes |
| `credit-contracts` | `payment-refund-process` | 12 | yes |
| `pipeline-monitor` | `pipeline-ai-sales-cleanup` | 1 | yes |
| `pipeline-monitor` | `pipeline-ai-sales-health` | 1 | yes |
| `pipeline-monitor` | `pipeline-ai-sales-metrics` | 1 | yes |
| `pipeline-monitor` | `pipeline-approval-pending` | 1 | yes |
| `pipeline-monitor` | `pipeline-monitor-health` | 2 | yes |
| `pipeline-monitor` | `pipeline-monitor-rate-sync` | 2 | yes |
| `pipeline-monitor` | `pipeline-orchestrator-advance` | 3 | yes |
| `pipeline-monitor` | `pipeline-orchestrator-start` | 3 | yes |
| `pipeline-monitor` | `pipeline-outreach-health` | 5 | yes |
| `pipeline-monitor` | `pipeline-outreach-metrics` | 5 | yes |
| `ai-agent` | `pricing-competitor-check` | 4 | yes |
| `ai-agent` | `pricing-discount-calculate` | 4 | yes |
| `ai-agent` | `pricing-margin-check` | 4 | yes |
| `ai-agent` | `product-category-sync` | 13 | yes |
| `ai-agent` | `product-chunk-create` | 13 | yes |
| `ai-agent` | `product-embedding-generate` | 13 | yes |
| `ai-agent` | `product-stock-realtime-check` | 13 | yes |
| `ai-agent` | `product-sync-shopify` | 13 | yes |
| `ai-agent` | `product-variant-process` | 13 | yes |
| `channels-outreach` | `q-email-cold` | 4 | yes |
| `channels-outreach` | `q-email-warm` | 4 | yes |
| `channels-outreach` | `q-wa-phone` | 8 | yes |
| `channels-outreach` | `q-wa-phone-01` | 8 | yes |
| `channels-outreach` | `q-wa-phone-02` | 8 | yes |
| `channels-outreach` | `q-wa-phone-20` | 8 | yes |
| `channels-outreach` | `q-wa-phone-xx` | 8 | yes |
| `channels-outreach` | `q-wa-reply` | 8 | yes |
| `pipeline-monitor` | `quota-business-hours-check` | 8 | yes |
| `pipeline-monitor` | `quota-guardian-check` | 8 | yes |
| `pipeline-monitor` | `quota-guardian-increment` | 8 | yes |
| `pipeline-monitor` | `quota-guardian-reset` | 8 | yes |
| `credit-contracts` | `reconcile-daily-unmatched` | 12 | yes |
| `credit-contracts` | `reconcile-overdue-check` | 12 | yes |
| `lifecycle-growth` | `referral-consent-expire` | 8 | yes |
| `lifecycle-growth` | `referral-consent-request` | 8 | yes |
| `lifecycle-growth` | `referral-eligibility-check` | 8 | yes |
| `lifecycle-growth` | `referral-neighbor-approach` | 8 | yes |
| `lifecycle-growth` | `referral-potential-tag` | 8 | yes |
| `lifecycle-growth` | `referral-request-prepare` | 8 | yes |
| `lifecycle-growth` | `referral-request-send` | 8 | yes |
| `lifecycle-growth` | `referral-response-process` | 8 | yes |
| `lifecycle-growth` | `referral-reward-process` | 8 | yes |
| `pipeline-monitor` | `report-conversion-analyze` | 1 | yes |
| `pipeline-monitor` | `report-daily-generate` | 1 | yes |
| `credit-contracts` | `return-process-stock` | 20 | yes |
| `credit-contracts` | `return-request-create` | 20 | yes |
| `stock-logistics` | `sameday-awb-create` | 20 | yes |
| `stock-logistics` | `sameday-cod-process` | 20 | yes |
| `stock-logistics` | `sameday-pickup-schedule` | 20 | yes |
| `stock-logistics` | `sameday-return-initiate` | 20 | yes |
| `stock-logistics` | `sameday-status-poll` | 20 | yes |
| `stock-logistics` | `sameday-status-process` | 20 | yes |
| `ai-agent` | `search-hybrid-execute` | 13 | yes |
| `ai-agent` | `search-index-rebuild` | 13 | yes |
| `ai-agent` | `search-query-understand` | 13 | yes |
| `ai-agent` | `search-rerank-cross-encoder` | 13 | yes |
| `channels-outreach` | `sentiment-trend-analyze` | 5 | yes |
| `channels-outreach` | `sequence-schedule-followup` | 1 | yes |
| `enrich-data` | `silver-dedup-entity-resolve` | 3 | yes |
| `enrich-data` | `silver-dedup-fuzzy-match` | 3 | yes |
| `enrich-data` | `silver-merge-company` | 4 | yes |
| `enrich-data` | `silver-merge-contact` | 4 | yes |
| `enrich-data` | `silver-norm-address` | 37 | yes |
| `enrich-data` | `silver-norm-company-name` | 37 | yes |
| `enrich-data` | `silver-norm-email` | 37 | yes |
| `enrich-data` | `silver-norm-phone-e164` | 37 | yes |
| `enrich-data` | `silver-quality-completeness` | 3 | yes |
| `enrich-data` | `silver-quality-tier-assign` | 3 | yes |
| `enrich-data` | `silver-quality-validation-sum` | 3 | yes |
| `stock-logistics` | `stock-deduct-delivered` | 20 | yes |
| `stock-logistics` | `stock-release-order` | 20 | yes |
| `stock-logistics` | `stock-reserve-create` | 6 | yes |
| `stock-logistics` | `stock-reserve-order` | 20 | yes |
| `stock-logistics` | `stock-reserve-release` | 6 | yes |
| `stock-logistics` | `stock-sync-erp` | 6 | yes |
| `stock-logistics` | `stock-sync-oblio` | 20 | yes |
| `channels-outreach` | `template-spintax-process` | 14 | yes |
| `lifecycle-growth` | `trigger-subsidy-calendar` | 5 | yes |
| `channels-outreach` | `wa-chat-history-fetch` | 8 | yes |
| `channels-outreach` | `wa-media-send` | 8 | yes |
| `channels-outreach` | `wa-message-retry` | 8 | yes |
| `channels-outreach` | `wa-send-followup` | 8 | yes |
| `channels-outreach` | `wa-send-initial` | 16 | yes |
| `channels-outreach` | `wa-send-reply` | 16 | yes |
| `channels-outreach` | `wa-status-sync` | 8 | yes |
| `channels-outreach` | `webhook-instantly-ingest` | 3 | yes |
| `channels-outreach` | `webhook-resend-ingest` | 3 | yes |
| `channels-outreach` | `webhook-revolut-ingest` | 12 | yes |
| `channels-outreach` | `webhook-timelinesai-ingest` | 3 | yes |
| `lifecycle-growth` | `winback-campaign-enroll` | 7 | yes |
| `lifecycle-growth` | `winback-step-execute` | 7 | yes |
| `lifecycle-growth` | `winback-trigger-subsidy` | 7 | yes |
| `lifecycle-growth` | `winback-trigger-weather` | 7 | yes |

## Coloane (CSV)

| Coloană | Semnificație |
| --- | --- |
| synapse_id | Stem fișier (identificator sinapsă în contract). |
| bucket | `pathway` (sub areal/traseu) sau `graph_stage` / `graph_familyflow` / `graph_cross`. |
| areal_dir | Director de nivel 1 sub `synapses/` (inclusiv `graph-plan` pentru topologie plan). |
| pathway_slug | Pentru `pathway`, directorul traseului; gol pentru bucket-uri graph. |
| contract_path | Cale relativă la root repo. |

## Excerpt (primele 20 rânduri)

| synapse_id | bucket | areal_dir | pathway_slug | contract_path |
| --- | --- | --- | --- | --- |
| `ai-agent-generate-family` | `pathway` | `ai-agent` | `ai-agent-generate` | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-generate/ai-agent-generate-family.md` |
| `ai-agent-generate-negotiation-expire-check` | `pathway` | `ai-agent` | `ai-agent-generate` | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-generate/ai-agent-generate-negotiation-expire-check.md` |
| `ai-agent-generate-negotiation-reminder-send` | `pathway` | `ai-agent` | `ai-agent-generate` | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-generate/ai-agent-generate-negotiation-reminder-send.md` |
| `ai-agent-generate-negotiation-state-transition` | `pathway` | `ai-agent` | `ai-agent-generate` | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-generate/ai-agent-generate-negotiation-state-transition.md` |
| `ai-agent-generate-negotiation-summary-generate` | `pathway` | `ai-agent` | `ai-agent-generate` | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-generate/ai-agent-generate-negotiation-summary-generate.md` |
| `ai-agent-orchestrate-family` | `pathway` | `ai-agent` | `ai-agent-orchestrate` | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-orchestrate/ai-agent-orchestrate-family.md` |
| `ai-agent-orchestrate-negotiation-expire-check` | `pathway` | `ai-agent` | `ai-agent-orchestrate` | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-orchestrate/ai-agent-orchestrate-negotiation-expire-check.md` |
| `ai-agent-orchestrate-negotiation-reminder-send` | `pathway` | `ai-agent` | `ai-agent-orchestrate` | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-orchestrate/ai-agent-orchestrate-negotiation-reminder-send.md` |
| `ai-agent-orchestrate-negotiation-state-transition` | `pathway` | `ai-agent` | `ai-agent-orchestrate` | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-orchestrate/ai-agent-orchestrate-negotiation-state-transition.md` |
| `ai-agent-orchestrate-negotiation-summary-generate` | `pathway` | `ai-agent` | `ai-agent-orchestrate` | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-orchestrate/ai-agent-orchestrate-negotiation-summary-generate.md` |
| `ai-agent-response-generate-family` | `pathway` | `ai-agent` | `ai-agent-response-generate` | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-response-generate/ai-agent-response-generate-family.md` |
| `ai-agent-response-generate-negotiation-expire-check` | `pathway` | `ai-agent` | `ai-agent-response-generate` | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-response-generate/ai-agent-response-generate-negotiation-expire-check.md` |
| `ai-agent-response-generate-negotiation-reminder-send` | `pathway` | `ai-agent` | `ai-agent-response-generate` | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-response-generate/ai-agent-response-generate-negotiation-reminder-send.md` |
| `ai-agent-response-generate-negotiation-state-transition` | `pathway` | `ai-agent` | `ai-agent-response-generate` | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-response-generate/ai-agent-response-generate-negotiation-state-transition.md` |
| `ai-agent-response-generate-negotiation-summary-generate` | `pathway` | `ai-agent` | `ai-agent-response-generate` | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-response-generate/ai-agent-response-generate-negotiation-summary-generate.md` |
| `ai-context-build-family` | `pathway` | `ai-agent` | `ai-context-build` | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-context-build/ai-context-build-family.md` |
| `ai-context-build-negotiation-expire-check` | `pathway` | `ai-agent` | `ai-context-build` | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-context-build/ai-context-build-negotiation-expire-check.md` |
| `ai-context-build-negotiation-reminder-send` | `pathway` | `ai-agent` | `ai-context-build` | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-context-build/ai-context-build-negotiation-reminder-send.md` |
| `ai-context-build-negotiation-state-transition` | `pathway` | `ai-agent` | `ai-context-build` | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-context-build/ai-context-build-negotiation-state-transition.md` |
| `ai-context-build-negotiation-summary-generate` | `pathway` | `ai-agent` | `ai-context-build` | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-context-build/ai-context-build-negotiation-summary-generate.md` |

Fișier complet: [`SYNAPSE_MATRIX.csv`](SYNAPSE_MATRIX.csv).
