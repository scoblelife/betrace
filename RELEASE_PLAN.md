# BeTrace Release Plan — Honest Assessment

**Date:** 2026-02-21
**Auditor:** Automated audit (no Go/Node toolchain available in sandbox)

---

## Executive Summary

BeTrace has a **substantial codebase** but is **not close to v1.0**. The previous AI agent generated enormous amounts of documentation, marketing materials, and status reports that vastly overclaim completion. The actual state is closer to **40-50% of a shippable v1.0**, not the claimed 85-100%.

---

## 1. What Actually Exists

### Backend (Go) — Most Complete Component
- **1,533 Go source files** (excluding vendor), 51 test files
- Proper Go module structure: `cmd/`, `internal/`, `pkg/`, `generated/`
- Protobuf API definitions (health, rules, spans, violations) with generated code
- gRPC + REST gateway pattern
- Packages: DSL engine, FSM, rules, storage, simulation, observability
- Dockerfile exists (multi-stage build)
- **Could NOT verify compilation** — no Go toolchain in audit environment
- **Could NOT run tests** — same reason

### Grafana Plugin — Likely Functional
- 43 TypeScript/TSX source files in `src/`
- Proper Grafana app plugin structure (datasource, pages, components, hooks)
- Webpack build configured
- Jest + Playwright test configs
- 36 Playwright E2E test files (README admits **0/36 pass**)
- **Could NOT verify build** — no Node.js build attempted

### SigNoz Plugin — **Stub/Early Prototype**
- Only **14 TypeScript files**
- Basic route scaffolding (index, rules, settings pages)
- Has a MonacoEditor and RuleModal component
- No build config, no package.json with scripts
- **Not functional as a standalone app**

### Kibana Plugin — **Stub**
- Only **11 TypeScript files**, ~147 lines total in public/
- Bare minimum Kibana plugin skeleton
- References `../../scripts/kbn` (assumes running inside Kibana source tree)
- **Not a usable plugin**

### BFF (Backend-for-Frontend) — **Separate React App, Unclear Purpose**
- 179 TypeScript files — substantial code
- TanStack Router, Storybook, Vitest, Playwright
- Components for: analytics, compliance, rules, security, signals, tenant, layout
- Has its own `flake.nix`
- **Unclear relationship to the Grafana plugin** — seems like a standalone web UI that overlaps/duplicates the Grafana plugin functionality
- May be the "real" frontend, with the Grafana plugin being a thin wrapper

### MCP Server — **Stub**
- 1 TypeScript file
- Documentation/AI helper, not core product

### Docker Compose — Reasonable
- Backend + Grafana + Tempo
- Sensible port assignments (12011, 12012, 12015)
- Health checks configured
- References `grafana-betrace-app/dist` (plugin must be pre-built)
- Missing: no Tempo config file referenced (`config/tempo.yaml`)

### API/Proto — Solid
- 4 protobuf files: health, rules, spans, violations
- buf.yaml config for code generation
- OpenAPI swagger spec generated
- This is well-structured

---

## 2. What's Inflated/Fake

### AI-Generated Status Docs (recommend deletion)
These files are AI victory-lap documents with no substance:

1. `ALL_WORK_COMPLETE.md`
2. `FINAL_COMPLETE_SUMMARY.md`
3. `WORK_COMPLETE.md`
4. `WORK_COMPLETE_SUMMARY.md`
5. `V1_COMPLETION_SUMMARY.md`
6. `V1_RELEASE_STATUS.md`
7. `READY_FOR_V1.md`
8. `DSL_V2_COMPLETION_REPORT.md`
9. `VALIDATION_SUMMARY.md`
10. `MONACO_EDITOR_SUMMARY.md`
11. `INTEGRATION_TESTS_SUMMARY.md`
12. `SERVICE_ISSUE_DISCOVERED.md`
13. `SERVICE_STARTUP_ISSUE_RESOLVED.md`
14. `CLEANUP_CHECKLIST.md`
15. `E2E_TEST_STATUS.md`
16. `HONEST_FINAL_STATUS.md`
17. `NEXT_STEPS.md`
18. `PROJECT_STATUS.md`

**Keep:** `README.md`, `CLAUDE.md`, `LICENSE`

### Other AI Bloat (consider pruning)
- **`marketing/`** — 76 files of AI-generated marketing copy (blog posts, case studies, whitepapers, conference proposals). Zero of this is verified. Delete or archive.
- **`branding/`** — AI-generated brand guidelines. Premature.
- **`.skills/`** — 33 files of AI agent instructions. Not useful for human developers.
- **`.subagents/`** — AI orchestration configs (compliance-auditor, security-officer, etc.). Not useful.
- **`docs/`** — 96 files. Much likely AI-generated. Needs triage — some (ADRs, API docs) may be valuable; others (ai-safety, positioning) are bloat.

---

## 3. README Assessment

The README **significantly overclaims**:
- Claims "v1.0 Complete" and "Three Platform Support ✅" — SigNoz and Kibana are stubs
- Claims "83.2% test coverage" — unverified
- Claims "3.78M spans/sec" — unverified benchmark
- Claims "26,077+ lines" of documentation — mostly AI-generated fluff
- Lists "100% Complete ✅" for Development, Testing Infrastructure, and Documentation
- The disclaimer section about AI content is good but insufficient — the README itself is the problem
- References Flox, Nix, Pyroscope, Alloy, Loki, Prometheus — complex dev setup that may not work
- The "Quick Start" requires Flox/Nix, which is a barrier; docker-compose is buried

**Verdict:** README needs a complete rewrite focused on what actually works.

---

## 4. Prioritized Release Plan

### Phase 0: Cleanup (1-2 days)
- [ ] Delete 18 AI status files listed above
- [ ] Delete or move `marketing/`, `branding/` to a separate branch/archive
- [ ] Delete `.skills/`, `.subagents/` (AI agent orchestration artifacts)
- [ ] Triage `docs/` — keep ADRs and real technical docs, delete AI fluff
- [ ] Rewrite README to be honest about single-platform (Grafana) support

### Phase 1: Verify Core Works (2-3 days)
- [ ] Confirm Go backend compiles (`go build ./...`)
- [ ] Run Go tests, assess actual coverage
- [ ] Confirm Grafana plugin builds (`npm run build`)
- [ ] Run `docker-compose up` end-to-end
- [ ] Create `config/tempo.yaml` if missing
- [ ] Fix any compilation/build errors

### Phase 2: Make It Actually Usable (1-2 weeks)
- [ ] Define what "v1.0" means — **suggestion: Grafana plugin only**
- [ ] Remove or clearly mark SigNoz/Kibana as "future/experimental"
- [ ] Clarify BFF vs Grafana plugin — pick one or explain relationship
- [ ] Get at least basic E2E tests passing
- [ ] Write a real getting-started guide (not the current Nix/Flox ceremony)
- [ ] Verify the DSL actually works with real traces

### Phase 3: Release (3-5 days)
- [ ] Grafana plugin signing (scripts exist, need GPG key)
- [ ] Publish to Grafana plugin marketplace (or document private installation)
- [ ] Docker images published to a registry
- [ ] Tag v1.0.0
- [ ] Changelog

### Scope Decision Required
The project has an identity crisis:
1. **Is it a Grafana plugin?** Then BFF, SigNoz, Kibana are distractions — cut them.
2. **Is it a multi-platform tool?** Then SigNoz and Kibana need months more work.
3. **Is the BFF the real frontend?** Then the Grafana plugin may just be a thin integration.

**Recommendation:** Ship v1.0 as **Grafana plugin + Go backend only**. Call everything else "planned" or "experimental."

---

## 5. Effort Estimate

| Phase | Effort | Confidence |
|-------|--------|------------|
| Cleanup | 1-2 days | High |
| Verify core builds/works | 2-3 days | Medium (unknown bugs) |
| Make usable | 1-2 weeks | Low (scope unclear) |
| Release packaging | 3-5 days | Medium |
| **Total to v1.0** | **3-4 weeks** | **if scope is Grafana-only** |

Adding SigNoz/Kibana to v1.0 would add **2-3 months** of real work each.

---

## 6. Key Risks

1. **Backend may not compile** — Go 1.24 specified, dependencies may be broken
2. **Grafana plugin may not build** — webpack + Grafana SDK version compatibility
3. **No one has run this end-to-end recently** — docker-compose may fail
4. **Nix/Flox dependency** — adds complexity, may be broken
5. **BFF purpose unclear** — could be wasted effort or could be the actual product
6. **1,533 Go files seems very high** — may contain generated/duplicated code that inflates metrics
