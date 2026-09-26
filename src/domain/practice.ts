// 判断层：练习登记、每日提交、调整留痕、漏交与回访判定，全部为纯函数
import type {
  DailyLog,
  LogStatus,
  PlanRevision,
  PlanSnapshot,
  PracticePlan,
  PracticeState,
} from "../data/types";
import { addDays, eachDay, isISODate, minISO, todayISO } from "./dates";

/** 难度达到该分值即进入待讨论 */
export const DIFFICULTY_FLAG = 4;
/** 连续漏交达到该天数即进入回访名单 */
export const MISS_STREAK_LIMIT = 2;

export type Result<T> =
  | { ok: true; state: PracticeState; value: T }
  | { ok: false; error: string };

function fail<T>(error: string): Result<T> {
  return { ok: false, error };
}

let idCounter = 0;
function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

// ---------- 判定规则 ----------

/** 未达目标分钟或难度达到 4 分 → 待讨论，不能算完成 */
export function judgeLog(
  actualMinutes: number,
  targetMinutes: number,
  difficulty: number
): LogStatus {
  return actualMinutes >= targetMinutes && difficulty < DIFFICULTY_FLAG
    ? "done"
    : "pending";
}

function validatePlanFields(s: PlanSnapshot): string | null {
  if (!s.description.trim()) return "请填写练习说明";
  if (!Number.isFinite(s.dailyTargetMinutes) || s.dailyTargetMinutes <= 0)
    return "每日目标分钟需大于 0";
  if (!isISODate(s.startDate) || !isISODate(s.checkDate)) return "日期格式不正确";
  if (s.startDate >= s.checkDate) return "核查日需晚于开始日";
  return null;
}

/** 同一个案的练习期 [开始日, 核查日) 不得重叠 */
function findOverlap(
  plans: PracticePlan[],
  caseId: string,
  s: PlanSnapshot,
  excludeId?: string
): PracticePlan | undefined {
  return plans.find(
    (p) =>
      p.caseId === caseId &&
      p.id !== excludeId &&
      s.startDate < p.checkDate &&
      p.startDate < s.checkDate
  );
}

function overlapError(clash: PracticePlan): string {
  return `与「${clash.description}」时间重叠：该练习核查日为 ${clash.checkDate}，核查日前不能重叠安排第二项`;
}

// ---------- 变更操作（返回新状态，不改原状态） ----------

export interface PlanInput extends PlanSnapshot {
  caseId: string;
}

export function registerPlan(
  state: PracticeState,
  input: PlanInput,
  now: Date
): Result<PracticePlan> {
  if (!state.cases.some((c) => c.id === input.caseId)) return fail("个案不存在");
  const invalid = validatePlanFields(input);
  if (invalid) return fail(invalid);
  const clash = findOverlap(state.plans, input.caseId, input);
  if (clash) return fail(overlapError(clash));

  const plan: PracticePlan = {
    id: newId("plan"),
    caseId: input.caseId,
    description: input.description.trim(),
    dailyTargetMinutes: Math.round(input.dailyTargetMinutes),
    startDate: input.startDate,
    checkDate: input.checkDate,
    createdAt: now.toISOString(),
    revisions: [],
  };
  return { ok: true, state: { ...state, plans: [...state.plans, plan] }, value: plan };
}

export interface LogInput {
  planId: string;
  date: string;
  actualMinutes: number;
  difficulty: number;
  stuckPoint: string;
}

export function submitLog(
  state: PracticeState,
  input: LogInput,
  now: Date
): Result<DailyLog> {
  const plan = state.plans.find((p) => p.id === input.planId);
  if (!plan) return fail("练习不存在");
  if (!isISODate(input.date)) return fail("日期格式不正确");
  const today = todayISO(now);
  if (input.date > today) return fail("不能提交未来日期");
  if (input.date < plan.startDate || input.date >= plan.checkDate)
    return fail(
      `练习期为 ${plan.startDate} 至 ${addDays(plan.checkDate, -1)}，该日期不在练习期内`
    );
  if (!Number.isFinite(input.actualMinutes) || input.actualMinutes < 0)
    return fail("实际分钟不能为负");
  if (
    !Number.isInteger(input.difficulty) ||
    input.difficulty < 1 ||
    input.difficulty > 5
  )
    return fail("难度需为 1-5 的整数");
  if (state.logs.some((l) => l.planId === plan.id && l.date === input.date))
    return fail("当日已提交过，无需重复登记");

  const log: DailyLog = {
    id: newId("log"),
    planId: plan.id,
    caseId: plan.caseId,
    date: input.date,
    actualMinutes: Math.round(input.actualMinutes),
    difficulty: input.difficulty,
    stuckPoint: input.stuckPoint.trim(),
    status: judgeLog(input.actualMinutes, plan.dailyTargetMinutes, input.difficulty),
    submittedAt: now.toISOString(),
  };
  return { ok: true, state: { ...state, logs: [...state.logs, log] }, value: log };
}

/** 调整练习：原内容与原因进入 revisions，永不覆盖历史 */
export function adjustPlan(
  state: PracticeState,
  planId: string,
  patch: Partial<PlanSnapshot>,
  reason: string,
  now: Date
): Result<PracticePlan> {
  const plan = state.plans.find((p) => p.id === planId);
  if (!plan) return fail("练习不存在");
  if (!reason.trim()) return fail("请填写调整原因");

  const next: PlanSnapshot = {
    description: (patch.description ?? plan.description).trim(),
    dailyTargetMinutes: patch.dailyTargetMinutes ?? plan.dailyTargetMinutes,
    startDate: patch.startDate ?? plan.startDate,
    checkDate: patch.checkDate ?? plan.checkDate,
  };
  const invalid = validatePlanFields(next);
  if (invalid) return fail(invalid);
  const clash = findOverlap(state.plans, plan.caseId, next, plan.id);
  if (clash) return fail(overlapError(clash));
  if (
    next.description === plan.description &&
    next.dailyTargetMinutes === plan.dailyTargetMinutes &&
    next.startDate === plan.startDate &&
    next.checkDate === plan.checkDate
  )
    return fail("内容没有变化，无需调整");

  const revision: PlanRevision = {
    revisedAt: now.toISOString(),
    reason: reason.trim(),
    previous: {
      description: plan.description,
      dailyTargetMinutes: plan.dailyTargetMinutes,
      startDate: plan.startDate,
      checkDate: plan.checkDate,
    },
  };
  const updated: PracticePlan = {
    ...plan,
    ...next,
    revisions: [...plan.revisions, revision],
  };
  return {
    ok: true,
    state: {
      ...state,
      plans: state.plans.map((p) => (p.id === plan.id ? updated : p)),
    },
    value: updated,
  };
}

/** 待讨论条目在会谈中讨论后标记结案 */
export function resolveDiscussion(
  state: PracticeState,
  logId: string,
  note: string,
  now: Date
): Result<DailyLog> {
  const log = state.logs.find((l) => l.id === logId);
  if (!log) return fail("记录不存在");
  if (log.status !== "pending") return fail("该记录不在待讨论中");
  if (log.resolvedAt) return fail("该记录已讨论过");

  const updated: DailyLog = {
    ...log,
    resolvedAt: now.toISOString(),
    resolveNote: note.trim(),
  };
  return {
    ok: true,
    state: {
      ...state,
      logs: state.logs.map((l) => (l.id === logId ? updated : l)),
    },
    value: updated,
  };
}

// ---------- 查询 / 统计 ----------

export function plansOfCase(state: PracticeState, caseId: string): PracticePlan[] {
  return state.plans
    .filter((p) => p.caseId === caseId)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function logsOfPlan(state: PracticeState, planId: string): DailyLog[] {
  return state.logs
    .filter((l) => l.planId === planId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** 到昨天为止应练未交的日子（今天还未结束，不算漏交） */
export function missedDays(
  state: PracticeState,
  plan: PracticePlan,
  today: string
): string[] {
  const due = eachDay(plan.startDate, minISO(plan.checkDate, today));
  const logged = new Set(
    state.logs.filter((l) => l.planId === plan.id).map((l) => l.date)
  );
  return due.filter((d) => !logged.has(d));
}

/** 从最近一个应练日往前数，连续漏交的天数 */
export function consecutiveMisses(
  state: PracticeState,
  plan: PracticePlan,
  today: string
): number {
  const due = eachDay(plan.startDate, minISO(plan.checkDate, today));
  const logged = new Set(
    state.logs.filter((l) => l.planId === plan.id).map((l) => l.date)
  );
  let n = 0;
  for (let i = due.length - 1; i >= 0 && !logged.has(due[i]); i -= 1) n += 1;
  return n;
}

export interface PlanStats {
  dueSoFar: number; // 到昨天为止的应练天数
  submitted: number; // 已提交（含今天）
  done: number;
  pending: number;
  missed: number;
  streak: number; // 连续漏交
  todayLog: DailyLog | undefined;
}

export function planStats(
  state: PracticeState,
  plan: PracticePlan,
  today: string
): PlanStats {
  const logs = logsOfPlan(state, plan.id);
  return {
    dueSoFar: eachDay(plan.startDate, minISO(plan.checkDate, today)).length,
    submitted: logs.length,
    done: logs.filter((l) => l.status === "done").length,
    pending: logs.filter((l) => l.status === "pending").length,
    missed: missedDays(state, plan, today).length,
    streak: consecutiveMisses(state, plan, today),
    todayLog: logs.find((l) => l.date === today),
  };
}

/** 未讨论结案的待讨论条目，新的在前 */
export function pendingDiscussions(state: PracticeState): DailyLog[] {
  return state.logs
    .filter((l) => l.status === "pending" && !l.resolvedAt)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export interface FollowUpEntry {
  caseId: string;
  plan: PracticePlan;
  streak: number;
}

/** 练习期内连续漏交达到上限的个案，进入回访名单 */
export function followUpList(
  state: PracticeState,
  today: string
): FollowUpEntry[] {
  return state.plans
    .filter((p) => p.startDate <= today && today < p.checkDate)
    .map((p) => ({ caseId: p.caseId, plan: p, streak: consecutiveMisses(state, p, today) }))
    .filter((e) => e.streak >= MISS_STREAK_LIMIT)
    .sort((a, b) => b.streak - a.streak);
}
