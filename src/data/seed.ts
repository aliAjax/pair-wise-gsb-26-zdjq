// 资料层：演示个案与练习数据（相对今天生成，首次启动或重置时使用）
import type { CaseInfo, DailyLog, PracticePlan, PracticeState } from "./types";
import { addDays, todayISO } from "../domain/dates";
import { judgeLog } from "../domain/practice";

export function buildSeedState(now: Date = new Date()): PracticeState {
  const today = todayISO(now);
  const d = (offset: number) => addDays(today, offset);
  const at = (offset: number) => new Date(now.getTime() + offset * 86400000).toISOString();

  const cases: CaseInfo[] = [
    { id: "C-042", theme: "焦虑", risk: "中风险", focus: "睡眠改善，练习呼吸放松" },
    { id: "C-119", theme: "亲密关系", risk: "稳定", focus: "识别沟通中的回避模式" },
    { id: "C-203", theme: "职业压力", risk: "关注", focus: "设定下周边界练习" },
  ];

  const mkPlan = (
    id: string,
    caseId: string,
    description: string,
    dailyTargetMinutes: number,
    startOffset: number,
    checkOffset: number
  ): PracticePlan => ({
    id,
    caseId,
    description,
    dailyTargetMinutes,
    startDate: d(startOffset),
    checkDate: d(checkOffset),
    createdAt: at(startOffset),
    revisions: [],
  });

  const mkLog = (
    id: string,
    plan: PracticePlan,
    dateOffset: number,
    actualMinutes: number,
    difficulty: number,
    stuckPoint: string,
    resolved?: string
  ): DailyLog => ({
    id,
    planId: plan.id,
    caseId: plan.caseId,
    date: d(dateOffset),
    actualMinutes,
    difficulty,
    stuckPoint,
    status: judgeLog(actualMinutes, plan.dailyTargetMinutes, difficulty),
    submittedAt: at(dateOffset),
    ...(resolved
      ? { resolvedAt: at(dateOffset + 1), resolveNote: resolved }
      : {}),
  });

  // C-042：近三天连续漏交 → 进入回访名单；另有一条未达目标的待讨论
  const p1 = mkPlan("plan-c042-1", "C-042", "4-7-8 呼吸放松练习（睡前一轮）", 15, -6, 4);
  // C-119：一条难度 4 分的待讨论
  const p2 = mkPlan("plan-c119-1", "C-119", "沟通观察记录：记下一次想回避的对话", 20, -3, 5);
  // C-203：第一轮已核查，第二轮紧接核查日开始（演示不重叠规则）
  const p3a = mkPlan("plan-c203-1", "C-203", "下周边界练习·第一轮（非紧急消息延迟回复）", 10, -12, -4);
  const p3b = mkPlan("plan-c203-2", "C-203", "下周边界练习·第二轮（午休不回工作消息）", 15, -4, 6);

  const logs: DailyLog[] = [
    mkLog("log-c042-1", p1, -6, 15, 2, "练完入睡快了些"),
    mkLog("log-c042-2", p1, -5, 10, 3, "睡前思绪停不下来，只练了一半"),
    mkLog("log-c042-3", p1, -4, 18, 2, ""),

    mkLog("log-c119-1", p2, -3, 20, 2, ""),
    mkLog("log-c119-2", p2, -2, 22, 4, "谈到家务分工时情绪上来，中断了记录"),
    mkLog("log-c119-3", p2, -1, 20, 3, "能注意到自己想转移话题"),

    mkLog("log-c203-1", p3a, -12, 10, 2, ""),
    mkLog("log-c203-2", p3a, -11, 12, 2, ""),
    mkLog("log-c203-3", p3a, -10, 10, 3, "延迟回复时有点心慌"),
    mkLog("log-c203-4", p3a, -9, 10, 2, ""),
    mkLog("log-c203-5", p3a, -8, 8, 4, "临时加班，没守住延迟回复", "会谈已讨论：改为先设一个固定延迟时段"),
    mkLog("log-c203-6", p3a, -7, 10, 2, ""),
    mkLog("log-c203-7", p3a, -6, 11, 2, ""),
    mkLog("log-c203-8", p3a, -5, 10, 3, ""),

    mkLog("log-c203-9", p3b, -4, 15, 2, "午休离开工位走了十分钟"),
    mkLog("log-c203-10", p3b, -3, 15, 3, ""),
    mkLog("log-c203-11", p3b, -2, 18, 2, ""),
    mkLog("log-c203-12", p3b, -1, 15, 3, "有同事来问，解释了一次"),
  ];

  return { version: 1, cases, plans: [p1, p2, p3a, p3b], logs };
}
