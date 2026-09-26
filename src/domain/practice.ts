import type { DailyLog, LogVerdict, PlanSnapshot, PracticePlan } from "../data/types";

/** 难度达到该分值即进入待讨论 */
export const DISCUSS_DIFFICULTY = 4;
/** 连续漏交达到该天数即进入回访名单 */
export const FOLLOW_UP_MISS_STREAK = 2;

/* ---------- 日期工具（一律使用 YYYY-MM-DD 本地日期） ---------- */

export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function clampDate(date: string, lo: string, hi: string): string {
  if (date < lo) return lo;
  if (date > hi) return hi;
  return date;
}

/* ---------- 每日记录判定 ---------- */

/** 未达目标分钟或难度达到 4 分：进入待讨论，不能算完成 */
export function evaluateLog(log: DailyLog, plan: PracticePlan): LogVerdict {
  if (log.actualMinutes < plan.dailyTargetMinutes) return "discuss";
  if (log.difficulty >= DISCUSS_DIFFICULTY) return "discuss";
  return "done";
}

/* ---------- 排期规则 ---------- */

export function windowsOverlap(a: PlanSnapshot, b: PlanSnapshot): boolean {
  return a.startDate < b.checkDate && b.startDate < a.checkDate;
}

/** 同一个案在已有练习的核查日前，不能重叠安排第二项 */
export function findScheduleConflict(
  plans: PracticePlan[],
  draft: PlanSnapshot & { caseId: string }
): string | null {
  if (draft.checkDate <= draft.startDate) return "核查日必须晚于开始日";
  const clash = plans.find((p) => p.caseId === draft.caseId && windowsOverlap(p, draft));
  if (clash) {
    return `与「${clash.title}」（${clash.startDate} ~ ${clash.checkDate}）时间重叠，核查日前不能安排第二项`;
  }
  return null;
}

/* ---------- 调整（保留原内容与原因） ---------- */

export function adjustPlan(
  plan: PracticePlan,
  next: PlanSnapshot,
  reason: string,
  at: string
): PracticePlan {
  const previous: PlanSnapshot = {
    title: plan.title,
    dailyTargetMinutes: plan.dailyTargetMinutes,
    startDate: plan.startDate,
    checkDate: plan.checkDate,
  };
  return {
    ...plan,
    ...next,
    adjustments: [...plan.adjustments, { adjustedAt: at, reason, previous }],
  };
}

/* ---------- 漏交与回访 ---------- */

/** 从开始日到 min(核查日, 今天) 之间，往回数连续未提交的天数 */
export function missedStreak(plan: PracticePlan, logs: DailyLog[], today: string): number {
  const end = plan.checkDate < today ? plan.checkDate : today;
  if (plan.startDate > end) return 0;
  const logged = new Set(logs.filter((l) => l.planId === plan.id).map((l) => l.date));
  let streak = 0;
  for (let d = end; d >= plan.startDate; d = addDays(d, -1)) {
    if (logged.has(d)) break;
    streak += 1;
  }
  return streak;
}

/** 连续两次（天）漏交即进入回访名单 */
export function isFollowUp(plan: PracticePlan, logs: DailyLog[], today: string): boolean {
  return missedStreak(plan, logs, today) >= FOLLOW_UP_MISS_STREAK;
}

/* ---------- 汇总 ---------- */

export interface PlanSummary {
  expected: number; // 到今天为止应提交的天数
  submitted: number;
  done: number;
  discuss: number;
  missed: number; // 当前连续漏交天数
}

export function summarize(plan: PracticePlan, logs: DailyLog[], today: string): PlanSummary {
  const planLogs = logs.filter((l) => l.planId === plan.id);
  const end = plan.checkDate < today ? plan.checkDate : today;
  let expected = 0;
  for (let d = plan.startDate; d <= end; d = addDays(d, 1)) expected += 1;
  const done = planLogs.filter((l) => evaluateLog(l, plan) === "done").length;
  return {
    expected,
    submitted: planLogs.length,
    done,
    discuss: planLogs.length - done,
    missed: missedStreak(plan, logs, today),
  };
}
