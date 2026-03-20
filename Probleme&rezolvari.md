# Workeri Etapa 1 - Audit & Gap Analysis

I'll start by thoroughly exploring the documentation and the actual worker implementations in parallel.

Explore Etapa 1 documentation

Read [](file:///var/www/CerniqAPP/docs/specifications)

Read [](file:///var/www/CerniqAPP/docs/adr)

Read [](file:///var/www/CerniqAPP/docs/deployment)

Read [](file:///var/www/CerniqAPP/docs/diagrams)

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201)

Read [](file:///var/www/CerniqAPP/docs/adr/ADR%20Etapa%201)

Read [](file:///var/www/CerniqAPP/docs/architecture/architecture.md#1-1), lines 1 to 500

Read [](file:///var/www/CerniqAPP/docs/architecture/architecture.md#500-500), lines 500 to 1000

Searched for files matching `**/etapa1-workers-overview.md`, 1 match

Searched for files matching `**/ADR-0033-Arhitectura-Medallion*.md`, 1 match

Searched for files matching `**/etapa1-plan-gap-audit*.md`, 1 match

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-workers-overview.md)

Read [](file:///var/www/CerniqAPP/docs/adr/ADR%20Etapa%201/ADR-0033-Arhitectura-Medallion-Bronze-Silver-Gold.md)

Read [](file:///var/www/CerniqAPP/docs/audits/etapa1-plan-gap-audit-2026-02-27.md)

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-workers-overview.md#248-248), lines 248 to 248

Read [](file:///var/www/CerniqAPP/docs/adr/ADR%20Etapa%201/ADR-0033-Arhitectura-Medallion-Bronze-Silver-Gold.md)

Read [](file:///var/www/CerniqAPP/docs/deployment/etapa1-deployment-checklist.md)

Read [](file:///var/www/CerniqAPP/docs/deployment/etapa1-runbook.md#1-1), lines 1 to 300

Searched for files matching `**/etapa1-workers-*.md`, 8 matches

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-schema-bronze.md)

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-schema-silver.md#1-1), lines 1 to 600

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-workers-A-ingestie.md#1-1), lines 1 to 500

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-workers-B-C-normalizare-validare.md#1-1), lines 1 to 500

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-schema-gold.md#1-1), lines 1 to 500

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-workers-D-E-anaf-termene.md#1-1), lines 1 to 600

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-workers-F-H-onrc-email-phone.md#1-1), lines 1 to 600

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-workers-I-L-scraping-ai-geo-agri.md#1-1), lines 1 to 600

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-workers-M-P-dedup-score-pipeline.md#1-1), lines 1 to 600

Read [](file:///var/www/CerniqAPP/docs/adr/ADR%20Etapa%201/ADR-0041-Quality-Scoring-Algorithm.md)

Read [](file:///var/www/CerniqAPP/docs/adr/ADR%20Etapa%201/ADR-0042-Pipeline-Orchestration.md)

Explore actual worker implementations

Read [](file:///var/www/CerniqAPP/workers)

Read [](file:///var/www/CerniqAPP/workers/README.md)

Read [](file:///var/www/CerniqAPP/workers/enrichment)

Read [](file:///var/www/CerniqAPP/workers/shared)

Read [](file:///var/www/CerniqAPP/workers/ai)

Read [](file:///var/www/CerniqAPP/workers/outreach)

Read [](file:///var/www/CerniqAPP/workers/monitoring)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src)

Read [](file:///var/www/CerniqAPP/workers/shared/src)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/lib)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/bootstrap.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/main.ts#1-1), lines 1 to 100

Read [](file:///var/www/CerniqAPP/workers/shared/src/queue-registry.ts#1-1), lines 1 to 150

Read [](file:///var/www/CerniqAPP/workers/shared/src/queue-registry.ts#150-150), lines 150 to 180

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/a1-csv-parser.ts#1-1), lines 1 to 150

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/b1-name-normalizer.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/c1-cui-modulo11-validator.ts#1-1), lines 1 to 100

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/d1-anaf-fiscal.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/j1-grok-structuring.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/hitl-escalation.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/p1-orchestrate.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/m1-dedup-exact-hash.ts#1-1), lines 1 to 150

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/p2-promote-to-gold.ts#1-1), lines 1 to 120

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/promotion-bronze-silver.ts#1-1), lines 1 to 120

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/n1-score-completeness.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/g1-hunter-email-finder.ts#1-1), lines 1 to 100

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/h2-hlr-lookup.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/k1-nominatim-geocoding.ts#1-1), lines 1 to 100

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/o1-daily-stats.ts#1-1), lines 1 to 100

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/g2-hunter-verifier.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/i1-daj-scraper.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/l1-apia-data.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/m2-dedup-fuzzy-match.ts#1-1), lines 1 to 100

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/f1-onrc-data.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/p3-pipeline-monitor.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/d2-anaf-tva.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/e1-termene-balance.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/j2-ai-data-merger.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/hitl-resume-after-approval.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/o2-quality-rollup.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/p4-error-handler.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/e2-termene-risk.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/d3-anaf-efactura.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/g3-email-enricher.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/i3-website-finder.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/d4-anaf-datorii.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/d5-anaf-caen.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/e4-termene-associates.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/e3-termene-dosare.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/f2-onrc-administratori.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/f3-onrc-sedii.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/h3-carrier-detection.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/h1-phone-normalizer.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/i2-anif-scraper.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/i4-contact-page-scraper.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/j3-ai-confidence-scorer.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/j4-ai-fallback.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/k2-postgis-zones.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/l2-ouai-membership.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/k3-proximity-calculator.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/l3-cooperative-membership.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/l4-culturi-classifier.ts#1-1), lines 1 to 80

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/l5-animale-classifier.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/n2-score-accuracy.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/n3-score-freshness.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/a2-excel-parser.ts#1-1), lines 1 to 100

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/g2-zerobounce-validation.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/g4-email-pattern.ts#1-1), lines 1 to 100

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/a3-webhook-receiver.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/a4-api-poller.ts#1-1), lines 1 to 100

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/a5-manual-entry.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/c2-cui-anaf-validator.ts#1-1), lines 1 to 100

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/g5-email-generator.ts#1-1), lines 1 to 100

Read [](file:///root/.vscode-server-insiders/data/User/workspaceStorage/232821343415f7bf439b43e22b8c6115/GitHub.copilot-chat/chat-session-resources/4ca2a32f-d39e-443b-a530-6f7646afb71f/toolu_vrtx_01Jp8AwNPTPXLShYecpoNoB2__vscode-1773512106929/content.txt#1-1), lines 1 to 300

Read [](file:///root/.vscode-server-insiders/data/User/workspaceStorage/232821343415f7bf439b43e22b8c6115/GitHub.copilot-chat/chat-session-resources/4ca2a32f-d39e-443b-a530-6f7646afb71f/toolu_vrtx_019eWyjkGBqVYK1qTQeujQ9Y__vscode-1773512106962/content.txt#1-1), lines 1 to 300

Read [](file:///root/.vscode-server-insiders/data/User/workspaceStorage/232821343415f7bf439b43e22b8c6115/GitHub.copilot-chat/chat-session-resources/4ca2a32f-d39e-443b-a530-6f7646afb71f/toolu_vrtx_01Jp8AwNPTPXLShYecpoNoB2__vscode-1773512106929/content.txt#300-300), lines 300 to 500

Now let me do a deep-dive into the actual bronze worker implementations to find specific gaps.  

Deep audit bronze workers A+B

Deep audit bronze workers C+promotion

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/c2-cui-anaf-validator.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/c1-cui-modulo11-validator.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/promotion-bronze-silver.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/pipeline-utils.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/company-enrichment-utils.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/bootstrap.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/main.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/a2-excel-parser.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/a3-webhook-receiver.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/a4-api-poller.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/a5-manual-entry.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/a1-csv-parser.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/b2-email-normalizer.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/b1-name-normalizer.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/b3-phone-normalizer.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/b4-address-normalizer.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/ingest-utils.ts)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/normalization-utils.ts)

Searched for files matching `**/enrichment-completion.ts`, 1 match

Searched for files matching `**/queue-registry.ts`, 1 match

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers)

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/lib/enrichment-completion.ts)

Read [](file:///var/www/CerniqAPP/workers/shared/src/queue-registry.ts)

Searched for regex `bronze.*silver.*promote|promotion.*criteria|quality.*score.*70` (`**/docs/**`), 11 results

Searched for regex `CUI.*validation|modulo.*11|ANAF.*validator` (`**/docs/**`), 20 results

Searched for files matching `**/cui-validation.ts`, 1 match

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/lib/cui-validation.ts)

Searched for files matching `**/docs/adr/**/*Modulo*.md`, 1 match

Searched for files matching `**/docs/specifications/**/*workers-triggers*.md`, 5 matches

Read [](file:///var/www/CerniqAPP/docs/adr/ADR%20Etapa%201/ADR-0035-Validare-CUI-cu-Modulo-11.md)

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-workers-triggers.md#290-290), lines 290 to 360

Searched for regex `bronze.*silver.*promote|promotion.*flow|bronze.*ready|promote.*criteria` (`**/docs/specifications/**`), no results

Searched for regex `promote.*bronze.*silver|bronze.*contact.*ready|promotion.*trigger`, 18 results

Read [](file:///var/www/CerniqAPP/workers/enrichment/src/workers/normalization-utils.ts)

Read [](file:///root/.vscode-server-insiders/data/User/workspaceStorage/232821343415f7bf439b43e22b8c6115/GitHub.copilot-chat/chat-session-resources/4ca2a32f-d39e-443b-a530-6f7646afb71f/toolu_vrtx_01FLZh1DKwkMpnUKwn4EayGJ__vscode-1773512107040/content.txt#1-1), lines 1 to 500

Read [](file:///root/.vscode-server-insiders/data/User/workspaceStorage/232821343415f7bf439b43e22b8c6115/GitHub.copilot-chat/chat-session-resources/4ca2a32f-d39e-443b-a530-6f7646afb71f/toolu_vrtx_013nbPqJ9T8KNGoP3L4wvwnD__vscode-1773512107041/content.txt#1-1), lines 1 to 500

Read [](file:///root/.vscode-server-insiders/data/User/workspaceStorage/232821343415f7bf439b43e22b8c6115/GitHub.copilot-chat/chat-session-resources/4ca2a32f-d39e-443b-a530-6f7646afb71f/toolu_vrtx_01FLZh1DKwkMpnUKwn4EayGJ__vscode-1773512107040/content.txt#500-500), lines 500 to 800

Read [](file:///root/.vscode-server-insiders/data/User/workspaceStorage/232821343415f7bf439b43e22b8c6115/GitHub.copilot-chat/chat-session-resources/4ca2a32f-d39e-443b-a530-6f7646afb71f/toolu_vrtx_01FLZh1DKwkMpnUKwn4EayGJ__vscode-1773512107040/content.txt#800-800), lines 800 to 950

Now let me read the remaining part of the documentation exploration to see the specification files.

Read specifications and ADR files

Read [](file:///var/www/CerniqAPP/docs/specifications)

Read [](file:///var/www/CerniqAPP/docs/adr)

Read [](file:///var/www/CerniqAPP/docs/developer-guide)

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201)

Read [](file:///var/www/CerniqAPP/docs/adr/ADR%20Etapa%201)

Read [](file:///var/www/CerniqAPP/docs/developer-guide/patterns)

Read [](file:///var/www/CerniqAPP/docs/architecture)

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-workers-overview.md)

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-workers-A-ingestie.md#1-1), lines 1 to 300

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-schema-bronze.md#1-1), lines 1 to 300

Read [](file:///var/www/CerniqAPP/docs/adr/ADR%20Etapa%201/ADR-0033-Arhitectura-Medallion-Bronze-Silver-Gold.md)

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-testing-strategy.md#1-1), lines 1 to 300

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-workers-B-C-normalizare-validare.md#1-1), lines 1 to 400

Read [](file:///var/www/CerniqAPP/docs/adr/ADR%20Etapa%201/ADR-0044-Bronze-Layer-Immutability.md)

Read [](file:///var/www/CerniqAPP/docs/adr/ADR%20Etapa%201/ADR-0042-Pipeline-Orchestration.md)

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-runbook-monitoring.md#1-1), lines 1 to 400

Read [](file:///var/www/CerniqAPP/docs/adr/ADR%20Etapa%201/ADR-0052-Observability-Stack-Etapa-1.md)

Read [](file:///var/www/CerniqAPP/docs/adr/ADR%20Etapa%201/ADR-0046-Event-Sourcing-pentru-Enrichment.md)

Read [](file:///var/www/CerniqAPP/docs/adr/ADR%20Etapa%201/ADR-0045-Multi-Tenant-Data-Isolation.md)

Read [](file:///var/www/CerniqAPP/docs/adr/ADR%20Etapa%201/ADR-0034-Strategie-Ingestie-Multi-Source.md)

Read [](file:///var/www/CerniqAPP/docs/adr/ADR%20Etapa%201/ADR-0050-Enrichment-Priority-Queue.md)

Read [](file:///var/www/CerniqAPP/docs/architecture/risks-and-technical-debt.md#1-1), lines 1 to 300

Read [](file:///var/www/CerniqAPP/docs/architecture/technical-debt-board.md)

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-schema-silver.md#1-1), lines 1 to 300

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-schema-gold.md#1-1), lines 1 to 300

Read [](file:///var/www/CerniqAPP/docs/developer-guide/patterns/worker-pool-sizing.md)

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-workers-D-E-anaf-termene.md#1-1), lines 1 to 500

Read [](file:///var/www/CerniqAPP/docs/adr/ADR%20Etapa%201/ADR-0047-Rate-Limiting-Architecture.md)

Read [](file:///var/www/CerniqAPP/docs/adr/ADR%20Etapa%201/ADR-0035-Validare-CUI-cu-Modulo-11.md)

Read [](file:///var/www/CerniqAPP/docs/specifications/Etapa%201/etapa1-workers-M-P-dedup-score-pipeline.md#1-1), lines 1 to 300

Created memory file [](file:///root/.vscode-server-insiders/data/User/workspaceStorage/232821343415f7bf439b43e22b8c6115/GitHub.copilot-chat/memory-tool/memories/NGNhMmEzMmYtZDM5ZS00NDNiLWE1MzAtNmY3NjQ2YWZiNzFm/etapa1-exploration.md)

Read [](file:///root/.vscode-server-insiders/data/User/workspaceStorage/232821343415f7bf439b43e22b8c6115/GitHub.copilot-chat/chat-session-resources/4ca2a32f-d39e-443b-a530-6f7646afb71f/toolu_vrtx_01Uggo1oCwmFAaSr66noZgkX__vscode-1773512107085/content.txt#1-1), lines 1 to 500

I have extensive context from all the research. Let me save the comprehensive plan now before context clears.

Created memory file [](file:///root/.vscode-server-insiders/data/User/workspaceStorage/232821343415f7bf439b43e22b8c6115/GitHub.copilot-chat/memory-tool/memories/NGNhMmEzMmYtZDM5ZS00NDNiLWE1MzAtNmY3NjQ2YWZiNzFm/plan.md)

Deleted memory [](file:///root/.vscode-server-insiders/data/User/workspaceStorage/232821343415f7bf439b43e22b8c6115/GitHub.copilot-chat/memory-tool/memories/NGNhMmEzMmYtZDM5ZS00NDNiLWE1MzAtNmY3NjQ2YWZiNzFm/plan.md)

Let me save the plan now before context clears.

Created memory file [](file:///root/.vscode-server-insiders/data/User/workspaceStorage/232821343415f7bf439b43e22b8c6115/GitHub.copilot-chat/memory-tool/memories/NGNhMmEzMmYtZDM5ZS00NDNiLWE1MzAtNmY3NjQ2YWZiNzFm/plan.md)

---

## Plan: Audit & Gap Analysis — Workeri Bronze Etapa 1

Audit complet al documentației și implementării curente. Am identificat **62 workeri implementați** (vs 58 documentați) structurați pe cele 3 nivele medalion, și **21 gap-uri** specifice workerilor bronze.

---

### 1. INVENTAR COMPLET WORKERI ETAPA 1

#### BRONZE LAYER — 9 workeri

>**Stage A: Ingestie (5 workeri)**

| ID | Worker | Queue | Fișier | Status |
| --- | --- | --- | --- | --- |
| A.1 | CSV Parser | `ingest:csv` | a1-csv-parser.ts | ✅ |
| A.2 | Excel Parser | `ingest:excel` | a2-excel-parser.ts | ✅ |
| A.3 | Webhook Receiver | `ingest:webhook` | a3-webhook-receiver.ts | ✅ |
| A.4 | API Poller | `ingest:api` | a4-api-poller.ts | ✅ |
| A.5 | Manual Entry | `ingest:manual` | a5-manual-entry.ts | ✅ |

>**Stage B: Normalizare (4 workeri)**

| ID | Worker | Queue | Fișier | Status |
| --- | --- | --- | --- | --- |
| B.1 | Name Normalizer | `normalize:name` | b1-name-normalizer.ts | ✅ |
| B.2 | Email Normalizer | `normalize:email` | b2-email-normalizer.ts | ✅ |
| B.3 | Phone Normalizer | `normalize:phone` | b3-phone-normalizer.ts | ✅ |
| B.4 | Address Normalizer | `normalize:address` | b4-address-normalizer.ts | ✅ |

#### SILVER LAYER — 46 workeri

| Stage | Workeri | Status |
| --- | --- | --- |
| **C: Validare** (2) | C.1 CUI Modulo-11, C.2 CUI ANAF | ✅ |
| **D: ANAF** (5) | D.1-D.5 fiscal/tva/efactura/datorii/caen | ✅ |
| **E: Termene** (4) | E.1-E.4 balance/risk/dosare/actionari | ✅ |
| **F: ONRC** (3) | F.1-F.3 data/administratori/sedii | ✅ |
| **G: Email** (6) | G.1-G.5 + G.2b hunter/zerobounce/enricher/pattern/generator | ✅ |
| **H: Phone** (3) | H.1-H.3 normalizer/hlr/carrier | ✅ |
| **I: Scraping** (4) | I.1-I.4 daj/anif/website/contact | ✅ |
| **J: AI** (4) | J.1-J.4 structuring/merger/confidence/fallback | ✅ |
| **K: Geo** (3) | K.1-K.3 nominatim/postgis/proximity | ✅ |
| **L: Agriculture** (5) | L.1-L.5 apia/ouai/cooperative/culturi/animale | ✅ |
| **M: Dedup** (2) | M.1-M.2 exact hash/fuzzy match | ✅ |
| **N: Scoring** (3) | N.1-N.3 completeness/accuracy/freshness | ✅ |
| **O: Aggregation** (2) | O.1-O.2 daily-stats/quality-rollup | ✅ |

#### GOLD LAYER — 7 workeri

| ID | Worker | Queue | Status |
| --- | --- | --- | --- |
| P.1 | Orchestrator | `pipeline:orchestrate` | ✅ |
| P.BS | Bronze→Silver Promotion | `pipeline:promote:bronze-silver` | ✅ |
| P.2 | Silver→Gold Promotion | `pipeline:promote:gold` | ✅ |
| P.3 | Pipeline Monitor | `pipeline:monitor` | ✅ |
| P.4 | Error Handler | `pipeline:error-handler` | ✅ |
| HITL.E | HITL Escalation | `hitl:escalate` | ✅ |
| HITL.R | HITL Resume | `hitl:resume` | ✅ |

---

### 2. AUDIT APROFUNDAT — 21 GAP-URI BRONZE

#### RED — CRITICE (5 gap-uri)

1. **GAP-B1: Lipsă validare CUI la promovare Bronze→Silver**

   - promotion-bronze-silver.ts — promovarea NU verifică dacă CUI a trecut prin C1/C2 validator. Doar verifică `extractedCui` non-null.
   - Documentația cere explicit: *"CUI passes Modulo-11 (C.1) OR passes ANAF validation (D.1)"*
   - **Fix**: Check `metadata.cuiValidation.status === "valid"` sau `cuiValidated === true` înainte de silver insert

2. **GAP-B2: Quality score check — inconsistență documentație**

   - Documentația zice quality >= 70 pentru promovare Bronze→Silver, dar quality scoring (Stage N) rulează DUPĂ enrichment, deci e prematur la Bronze→Silver
   - **Fix**: Clarifică documentația — quality >= 70 se aplică doar la Silver→Gold (P.2), NU la Bronze→Silver

3. **GAP-B3: NrRegCom-only promotion fără validare**

   - normalization-utils.ts linia 36 — dacă un record are doar NrRegCom fără CUI, se promovează direct la Silver fără nicio validare
   - **Fix**: Flag explicit `cuiValidated = false` + quality score penalizare. Pe termen lung: ONRC reverse-lookup (NrRegCom → CUI)

4. **GAP-B4: ANAF "not_found" nu updatează Silver**

   - c2-cui-anaf-validator.ts — pe ANAF "not_found", doar `bronzeContacts` e updatat cu metadata. `silverCompanies` nu primește nicio notificare
   - **Fix**: Adaugă write la `silverCompanies.metadata` cu `{ anafValidation: { status: "not_found", timestamp } }`

5. **GAP-B5: Race condition la single promotion**

   - promotion-bronze-silver.ts — `persistSilverCompany()` are retry logic doar în batch mode. Single promotion poate fail pe unique constraint violation fără retry
   - **Fix**: Aplică aceeași logică `withBatchMetadataRetry` și pentru single promotion

#### YELLOW — HIGH (9 gap-uri)

| ID | Fișier | Problema | Fix |
| --- | --- | --- | --- |
| **GAP-B6** | a4-api-poller.ts | `fetch()` fără timeout, circuit breaker, 429 handling | Adaugă `AbortSignal.timeout(15s)` + `createCircuitBreaker` + 429 backoff |
| **GAP-B7** | a3-webhook-receiver.ts | Lipsă protecție replay attack — HMAC ok dar no timestamp/nonce | Adaugă timestamp validation (reject > 5min) + nonce tracking Redis |
| **GAP-B8** | a3-webhook-receiver.ts | Lipsă max payload size | Adaugă limit 10MB |
| **GAP-B9** | b4-address-normalizer.ts | `countyMap` fără suport diacritice (ă,ș,ț) | Adaugă NFD decompose + strip combining marks |
| **GAP-B10** | b1-name-normalizer.ts | Noise words hardcodate fără variante cu diacritice | Normalize diacritice pe input înainte de matching |
| **GAP-B11** | b2-email-normalizer.ts | Lipsă RFC 5321 length limits (254 total, 64 local) | Adaugă length checks înainte de regex |
| **GAP-B12** | b3-phone-normalizer.ts | Country code hardcodat "RO" — numere internaționale broken | Accept country code din job data, default "RO" |
| **GAP-B13** | ingest-utils.ts | Column mapping collision silențioasă — 2 coloane pe același target, ultima câștigă | Detectează și loghează collisions, păstrează prima non-null |
| **GAP-B14** | normalization-utils.ts | CUI validation se trigger DOAR din B1 (name normalizer), nu post-all-B-completion | Mută trigger post-ALL B1-B4, pattern "completion counter" Redis |

#### ORANGE — MEDIUM (7 gap-uri)

| ID | Problema | Fix |
| --- | --- | --- |
| **GAP-B15** | Lipsă OpenTelemetry metrics în A+B workers | Adaugă spans + counters (`etapa1.contacts.ingested_total` etc.) |
| **GAP-B16** | Lipsă `job.updateProgress()` în webhook/api/manual | Adaugă progress updates |
| **GAP-B17** | Queue names hardcodate ca string literals, nu constante | Export din `queue-registry.ts` |
| **GAP-B18** | Lipsă DLQ config — failed jobs nu rutate la error-handler | Configurează BullMQ DLQ routing |
| **GAP-B19** | B1-B4 fără try/catch propriu + error classification | Adaugă error handling cu clasificare |
| **GAP-B20** | CSV Parser fără auto-detect delimiter (";", "\t") | Adaugă detection pe primele 5 linii |
| **GAP-B21** | Inconsistență queue names: doc zice `bronze:ingest:csv-parser`, cod zice `ingest:csv` | Actualizează documentația |

---

### 3. PLAN DE REZOLVARE — 3 FAZE

#### Faza 1: Critice (imediat) — 5 steps

| Step | Gap | Acțiune | Depinde de |
| --- | --- | --- | --- |
| 1.1 | B1 | Adaugă check `cuiValidated` în `promotion-bronze-silver.ts` | — |
| 1.2 | B4 | Adaugă `silverCompanies.metadata` update pe ANAF "not_found" | — |
| 1.3 | B5 | Aplică retry în single promotion | *Step 1.1* |
| 1.4 | B3 | Flag `cuiValidated = false` la NrRegCom-only | *Step 1.1* |
| 1.5 | B2 | Actualizează documentația quality check | — |

#### Faza 2: High (robustețe) — 9 steps, *paralel cu Faza 1*

| Step | Gap | Acțiune | Depinde de |
| --- | --- | --- | --- |
| 2.1 | B6 | Timeout + circuit breaker în API poller | — |
| 2.2 | B7 | Timestamp validation (5min) în webhook | — |
| 2.3 | B8 | Max payload 10MB în webhook | *paralel cu 2.2* |
| 2.4 | B9 | Diacritics stripping în address normalizer | — |
| 2.5 | B10 | Diacritics normalization în name normalizer | *paralel cu 2.4* |
| 2.6 | B11 | RFC 5321 length checks în email normalizer | — |
| 2.7 | B12 | Country code din job data în phone normalizer | — |
| 2.8 | B13 | Column collision detection în ingest-utils | — |
| 2.9 | B14 | CUI validation post-all-B-completion (completion counter Redis) | *complex* |

#### Faza 3: Medium (calitate) — 7 steps, *după Faza 1+2*

| Step | Gap | Acțiune | Depinde de |
| --- | --- | --- | --- |
| 3.1 | B15 | OpenTelemetry spans + counters | — |
| 3.2 | B16 | `job.updateProgress()` în A3-A5 | — |
| 3.3 | B17 | Export constante queue names din registry | — |
| 3.4 | B18 | DLQ routing config | *Step 3.3* |
| 3.5 | B19 | try/catch + error classification B1-B4 | — |
| 3.6 | B20 | Delimiter auto-detection CSV parser | — |
| 3.7 | B21 | Actualizare documentație queue names | *Step 3.3* |

**Verificare:**

1. Unit tests: `pnpm vitest run --filter workers`
2. Integration tests: sprint2/3/4.integration.test.ts
3. Manual: Import CSV COFACE → verifică flow complet Bronze→Silver→Gold
4. Error path: Import cu CUI invalid → verifică NU se promovează la Silver
5. Metrics: Check OpenTelemetry spans în SigNoz/Grafana
6. SonarQube: `analyze_file_list` pe fișierele modificate

**Decizii:**

- Quality check >= 70 se aplică **doar la Silver→Gold**, NU la Bronze→Silver (corecție documentație)
- NrRegCom-only promotion permisă cu `cuiValidated = false` explicit
- Diacritics normalization ca utility shared (reutilizabilă B1+B4)
- **GAP-B14** cel mai complex — recomandat pattern "completion counter" Redis per `bronzeContactId`, decrementat de fiecare B worker la finalizare; când counter = 0, trigger CUI validation

**Considerări:**

1. **GAP-B14** (normalization orchestration): Alternativ la completion counter, se pot folosi BullMQ flow dependencies (parent-child jobs). Recomandat completion counter pentru simplitate.
2. **GAP-B3** (NrRegCom → CUI reverse lookup): ONRC reverse-lookup e feature pe termen lung. Pe termen scurt, flag explicit + penalizare quality e suficient.
3. **GAP-B6** (API Poller circuit breaker): Poate reutiliza `createCircuitBreaker` din shared (deja folosit de C2).
