export const prerender = false;

import type { APIRoute } from 'astro';
import { getAuditPage, saveModuleResult, savePhaseResults, markAuditError } from '../../../../lib/audit/supabase-storage';
import { updateLeadStatus } from '../../../../lib/db';
import { sendPostAuditEmail } from '../../../../lib/email/post-audit';
import { executeStep, executePhase, PHASE_ENTRY_STEPS } from '../../../../lib/audit/runner';
import { evaluateCoverage } from '../../../../lib/audit/coverage';
import { logAuditRun } from '../../../../lib/audit/audit-logger';
import { STEP_PROGRESS } from '../../../../lib/audit/types';
import type { AuditStep } from '../../../../lib/audit/types';
import { validateApiKey, mapResultsForPlatform } from '../../../../lib/api-auth';

// Progress values reported after each phase completes (shown as the next phase entry's progress)
const PHASE_COMPLETE_PROGRESS: Record<string, number> = {
  sector: 35,             // phase 1 done
  instagram: 50,          // phase 2 done
  competitor_traffic: 70, // phase 3 done (social)
  score: 87,              // phase 4 done (competitors)
};

export const GET: APIRoute = async ({ params, request }) => {
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing audit ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const auth = validateApiKey(request);

  if (!auth.valid) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const isPlatform = auth.source === 'platform' || auth.source === 'dev';

  try {
    const audit = await getAuditPage(id);

    // Already completed
    if (audit.status === 'completed' || audit.currentStep === 'done') {
      const completedModules = Object.keys(audit.results);
      const mappedResults = isPlatform ? mapResultsForPlatform(audit.results) : audit.results;

      if (isPlatform) {
        return new Response(
          JSON.stringify({
            status: 'completed',
            currentModule: 'done',
            completedModules,
            results: mappedResults,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({
          status: 'completed',
          progress: 100,
          results: audit.results,
          score: audit.score,
          sector: audit.sector,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Error state
    if (audit.status === 'error') {
      if (isPlatform) {
        return new Response(
          JSON.stringify({ status: 'failed', error: 'Audit processing failed' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({ status: 'error', progress: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const currentStep = audit.currentStep as AuditStep;

    // ── Phase execution (parallel steps) ─────────────────────────
    if (PHASE_ENTRY_STEPS.has(currentStep)) {
      const { moduleResults, nextStep, extraProps } = await executePhase(currentStep, audit);

      // Cross-poll retry for phases: if ANY module in this phase timed out
      // or hit a transient error AND we haven't exhausted phase-level retries,
      // save the successful results but DON'T advance — next poll re-runs
      // the phase, and modules that already have good data will skip fast.
      const MAX_PHASE_RETRIES = 2;
      const transientFailures = moduleResults.filter((r) => {
        const reason = (r.result as any)?.reason || (r.result as any)?.error || '';
        return ((r.result as any)?.skipped || (r.result as any)?.error) &&
          /timed out|timeout|aborted|econn|enotfound|network|fetch failed/i.test(reason);
      });
      const phaseRetryKey = `_phase_retry_${currentStep}`;
      const prevPhaseRetries = Number((audit.results as any)?.[phaseRetryKey] || 0);

      if (transientFailures.length > 0 && prevPhaseRetries < MAX_PHASE_RETRIES) {
        // Persist the successful results so we don't redo them, but stay on
        // the same phase so the next poll retries the failed ones.
        // Inject the retry counter into the successful results save so we
        // know how many attempts we've made.
        const successfulResults = moduleResults.filter((r) => !transientFailures.includes(r));
        // Tag all transient failures with a poll retry marker so executeStepWithTimeout
        // or the runStep logic can see the previous failure.
        const trackedResults = [
          ...successfulResults,
          ...transientFailures.map((r) => ({
            moduleKey: r.moduleKey,
            result: { ...(r.result as any), _poll_retry: prevPhaseRetries + 1 },
          })),
          // Store the phase retry counter as a pseudo-module
          { moduleKey: phaseRetryKey, result: { _count: prevPhaseRetries + 1 } as any },
        ];
        await savePhaseResults(id, trackedResults, currentStep, extraProps);
        console.log(`[audit:phase ${currentStep}] ${prevPhaseRetries + 1}/${MAX_PHASE_RETRIES} phase-retry — ${transientFailures.length} modules failed: ${transientFailures.map(f => f.moduleKey).join(',')}`);

        const retryProgress = STEP_PROGRESS[currentStep as AuditStep] ?? 50;
        if (isPlatform) {
          return new Response(
            JSON.stringify({
              status: 'running',
              currentModule: currentStep,
              completedModules: [...Object.keys(audit.results), ...successfulResults.map(r => r.moduleKey)],
              retrying: true,
              retryAttempt: prevPhaseRetries + 1,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify({
            status: 'processing',
            progress: retryProgress,
            module_completed: successfulResults.map(r => r.moduleKey).join(','),
            currentStep: currentStep,
            retrying: true,
            retryAttempt: prevPhaseRetries + 1,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      await savePhaseResults(id, moduleResults, nextStep, extraProps);

      const isCompleted = nextStep === 'done';
      const completedModuleKeys = moduleResults.map((r) => r.moduleKey);
      const progress = isCompleted
        ? 100
        : PHASE_COMPLETE_PROGRESS[nextStep as string] ?? STEP_PROGRESS[nextStep as AuditStep] ?? 50;

      if (isPlatform) {
        return new Response(
          JSON.stringify({
            status: isCompleted ? 'completed' : 'running',
            currentModule: isCompleted ? 'done' : (nextStep as string),
            completedModules: [...Object.keys(audit.results), ...completedModuleKeys],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({
          status: isCompleted ? 'completed' : 'processing',
          progress,
          module_completed: completedModuleKeys.join(','),
          currentStep: nextStep,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // ── Single step execution (crawl + score + growth_agent) ────────
    const { result, moduleKey, nextStep } = await executeStep(currentStep, audit);

    const extraProps: { score?: number; sector?: string; url?: string } = {};
    if (moduleKey === 'score' && (result as any).total !== undefined) {
      extraProps.score = (result as any).total;
    }
    if (moduleKey === 'sector' && (result as any).sector) {
      extraProps.sector = (result as any).sector;
    }
    // Persist canonical URL when crawl detects a cross-domain redirect.
    // Without this, every subsequent HTTP poll re-reads the original URL
    // from Supabase and downstream modules query the wrong domain.
    if (moduleKey === 'crawl' && (result as any)?.finalUrl && (result as any).finalUrl !== audit.url) {
      extraProps.url = (result as any).finalUrl;
    }

    // ── Cross-poll retry on timeout/transient errors ─────────────────
    // If the step timed out or hit a transient network error, do NOT advance
    // current_step. Save the failed attempt with a poll-retry counter and let
    // the next HTTP poll re-run the step with a fresh Vercel 300s budget.
    // This way there is never an "audit dies because single step exceeded
    // function budget" scenario — each retry gets its own full budget.
    const MAX_POLL_RETRIES = 3;
    const resultReason = (result as any)?.reason || (result as any)?.error || '';
    const isTransientFailure = (
      (result as any)?.skipped === true || (result as any)?.error
    ) && /timed out|timeout|aborted|econn|enotfound|network|fetch failed/i.test(resultReason);
    const prevPollRetries = Number(
      ((audit.results as any)?.[moduleKey] as any)?._poll_retry || 0,
    );

    if (isTransientFailure && prevPollRetries < MAX_POLL_RETRIES) {
      const retryMarked: any = { ...result, _poll_retry: prevPollRetries + 1 };
      // Keep current_step unchanged so the next poll re-runs this step
      await saveModuleResult(id, moduleKey, retryMarked, currentStep, extraProps);
      console.log(`[audit:${moduleKey}] ${prevPollRetries + 1}/${MAX_POLL_RETRIES} poll-retry scheduled (reason: ${resultReason.slice(0, 80)})`);

      const retryProgress = STEP_PROGRESS[currentStep as AuditStep] ?? 99;
      if (isPlatform) {
        return new Response(
          JSON.stringify({
            status: 'running',
            currentModule: currentStep,
            completedModules: Object.keys(audit.results),
            retrying: true,
            retryAttempt: prevPollRetries + 1,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({
          status: 'processing',
          progress: retryProgress,
          module_completed: null,
          currentStep: currentStep,
          retrying: true,
          retryAttempt: prevPollRetries + 1,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    await saveModuleResult(id, moduleKey, result, nextStep, extraProps);

    const isCompleted = nextStep === 'done';

    // Log coverage on completion (no retry in this request to avoid timeout)
    if (isCompleted) {
      const finalResults = { ...audit.results, [moduleKey]: result } as Record<string, any>;
      const coverage = evaluateCoverage(finalResults);
      console.log(`[audit:coverage] ${coverage.coveragePct}% (${coverage.successfulPoints}/${coverage.totalPoints}) | critical missing: ${coverage.criticalMissing.join(',') || 'none'}`);
      // Log to Supabase (non-blocking)
      logAuditRun(audit.url, id, finalResults, Date.now()).catch(() => {});
      // Update lead status (non-blocking)
      if (audit.email) {
        updateLeadStatus(audit.email, audit.url, 'audit_completed', id).catch(() => {});

        // Send post-audit email with score summary (non-blocking).
        // topInsight now comes from growth_analysis.executiveSummary.headline
        // (the unified Growth Agent output) instead of the old insights.summary.
        const scoreResult = finalResults.score || {};
        const growthAgent = finalResults.growth_agent || {};
        const headline = growthAgent?.executiveSummary?.headline || '';
        sendPostAuditEmail({
          to: audit.email,
          domain: new URL(audit.url).hostname.replace(/^www\./, ''),
          score: scoreResult.total ?? 0,
          auditId: id,
          scoreBreakdown: scoreResult.breakdown,
          topInsight: headline.slice(0, 200),
        }).catch(() => {});
      }
    }

    const progress = isCompleted
      ? 100
      : PHASE_COMPLETE_PROGRESS[nextStep as string] ?? STEP_PROGRESS[nextStep as AuditStep] ?? 99;
    const allResults = isCompleted ? { ...audit.results, [moduleKey]: result } : null;

    if (isPlatform) {
      const completedModules = [...Object.keys(audit.results), moduleKey];
      return new Response(
        JSON.stringify({
          status: isCompleted ? 'completed' : 'running',
          currentModule: isCompleted ? 'done' : (nextStep as string),
          completedModules,
          ...(isCompleted && allResults ? { results: mapResultsForPlatform(allResults) } : {}),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        status: isCompleted ? 'completed' : 'processing',
        progress,
        module_completed: moduleKey,
        currentStep: nextStep,
        results: allResults,
        score: isCompleted ? extraProps.score ?? audit.score : undefined,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('Audit status error:', err);

    // If a single-step executeStep threw (likely transient — network, LLM
    // abort, Vercel edge error), try to bump the poll-retry counter so the
    // next frontend poll tries again with a fresh function budget. Only if
    // we exhaust MAX_POLL_RETRIES do we surface the failure.
    try {
      const audit = await getAuditPage(id);
      const currentStep = audit.currentStep as string;
      const MAX_POLL_RETRIES = 3;
      const existing = (audit.results as any)?.[currentStep];
      const prevPollRetries = Number(existing?._poll_retry || 0);

      if (prevPollRetries < MAX_POLL_RETRIES) {
        const retryMarked = {
          ...(existing || {}),
          skipped: true,
          reason: `thrown: ${err?.message?.slice(0, 80) || 'unknown'}`,
          _poll_retry: prevPollRetries + 1,
        };
        await saveModuleResult(id, currentStep as any, retryMarked, currentStep as any, {});
        console.log(`[audit:${currentStep}] outer catch — poll-retry ${prevPollRetries + 1}/${MAX_POLL_RETRIES} scheduled`);

        return new Response(
          JSON.stringify({
            status: isPlatform ? 'running' : 'processing',
            currentStep,
            retrying: true,
            retryAttempt: prevPollRetries + 1,
            progress: STEP_PROGRESS[currentStep as AuditStep] ?? 99,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      // Exhausted retries. For growth_agent specifically, gracefully complete
      // the audit with a skipped growth_agent block so the rest of the report
      // still renders — the deterministic fallback in growth-agent.ts produces
      // usable (if generic) recommendations from the real pipeline data.
      if (currentStep === 'growth_agent') {
        console.log(`[audit] growth_agent exhausted ${MAX_POLL_RETRIES} retries for ${id} — completing with fallback`);
        await saveModuleResult(id, 'growth_agent', { skipped: true, reason: `exhausted ${MAX_POLL_RETRIES} retries` }, 'done', {});

        if (audit.email) {
          const { sendPostAuditEmail } = await import('../../../../lib/email/post-audit');
          const { updateLeadStatus } = await import('../../../../lib/db');
          const scoreResult = (audit.results.score || {}) as Record<string, any>;
          sendPostAuditEmail({
            to: audit.email,
            domain: new URL(audit.url).hostname.replace(/^www\./, ''),
            score: scoreResult.total ?? 0,
            auditId: id,
            scoreBreakdown: scoreResult.breakdown,
            topInsight: '',
          }).catch(() => {});
          updateLeadStatus(audit.email, audit.url, 'audit_completed', id).catch(() => {});
        }

        return new Response(
          JSON.stringify({ status: 'completed', progress: 100 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
    } catch { /* ignore fallback error */ }

    try {
      await markAuditError(id);
    } catch {
      // ignore secondary error
    }

    if (isPlatform) {
      return new Response(
        JSON.stringify({ status: 'failed', error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(
      JSON.stringify({ status: 'error', error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
