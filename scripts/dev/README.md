# Dev iteration scripts

Herramientas para iterar rápido sin correr el pipeline completo. El pipeline tarda ~5 min y usa créditos de DFS + Apify + Anthropic. La mayoría de cambios no lo necesitan.

## Árbol de decisión

```
¿Qué estoy cambiando?

├── HTML/CSS/layout, components, páginas .astro
│   └── npm run dev → localhost:4321 (HMR instantáneo, 0 €)
│
├── Lógica de scoring (profiles, thresholds, pesos, fórmulas)
│   └── recompute-score.ts <cliente> (~3s, 0 €)
│
├── Prompts del Growth Agent / QA
│   └── regenerate-agent.ts <cliente> (~4 min, ~€0.05)
│
└── Módulos de crawl / DFS / Apify / GEO / sector.ts classifier
    └── scripts/rerun-radar.ts (~5 min, ~€0.50)
```

## `npm run dev` con datos reales de producción

Tu `.env` ya tiene `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` apuntando a prod. Al lanzar el dev server, las páginas leen los snapshots reales.

```bash
npm run dev
# → http://localhost:4321/dashboard
```

Para ver el dashboard como un cliente específico: entra como superuser a `/admin/crm/clients` y pulsa el icono del ojo para hacer "switch" a ese cliente. Igual que en producción.

## `recompute-score.ts`

Recalcula SOLO el score del último snapshot del cliente usando la lógica actual de `src/lib/audit/modules/score.ts` + `src/lib/benchmarks/*`. No toca la narrativa, no llama al LLM, no re-crawlea. Escribe de vuelta en Supabase (pipeline_output.score + columnas materializadas).

```bash
node --env-file=.env --import tsx scripts/dev/recompute-score.ts kiko
node --env-file=.env --import tsx scripts/dev/recompute-score.ts eb99c62e-c54c-475f-9854-bc8c111e36a0
```

**Cuándo usarlo**: cambias un threshold en `profiles.ts`, un peso en `score.ts`, una fórmula en `score-with-profile.ts`, o un multiplicador geo. Ejecuta → refresca dashboard → ves el score nuevo.

**Cuándo NO usarlo**: si cambias `sector.ts` (clasificación del perfil) necesitas re-ejecutar al menos el módulo sector. Si cambias el prompt del agente, usa `regenerate-agent.ts`.

## `regenerate-agent.ts`

Regenera la narrativa (Sonnet draft + Opus QA + correcciones) usando el `pipeline_output` existente. No re-crawlea, no re-consulta SEO/GEO/social. Solo llama a la LLM con los datos que ya están en el snapshot.

```bash
node --env-file=.env --import tsx scripts/dev/regenerate-agent.ts kiko
```

**Cuándo usarlo**: cambias `growth-agent.ts` (system prompt, bloque PERFIL, reglas de coherencia), `growth-agent-qa.ts`, o quieres probar el efecto de un cambio en `profiles.ts` sobre cómo el agente redacta.

**Cuándo NO usarlo**: si cambias `sector.ts` necesitas re-clasificar → pipeline completo. Si cambias la estructura de `pipeline_output` (nuevos campos) necesitas que el pipeline los pueble primero.

## Pipeline completo (recurso raro)

Solo cuando cambias algo del pipeline de ingesta real:
- `src/lib/audit/modules/crawl.ts`, `seo.ts`, `geo.ts`, `reputation.ts`, `sector.ts`, `instagram.ts`, `linkedin.ts`...
- Integraciones con DataForSEO, Apify, Google Places, etc.

En esos casos sí merece la pena el full rerun. Usa el endpoint `/api/radar/run-client` en prod con `CRON_SECRET`, o localmente lanza `runRadarForClient` via un script como los que hemos usado antes.
