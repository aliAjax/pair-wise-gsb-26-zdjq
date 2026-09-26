export interface CaseInfo {
  id: string;
  alias: string; // 来访者代号
  topic: string; // 咨询主题
  risk: string; // 风险等级
  focus: string; // 当前干预目标
}

/** 练习的可调整内容，调整历史里保存的也是这一份快照 */
export interface PlanSnapshot {
  title: string; // 练习说明
  dailyTargetMinutes: number; // 每日目标分钟
  startDate: string; // 开始日 YYYY-MM-DD
  checkDate: string; // 核查日 YYYY-MM-DD
}

export interface Adjustment {
  adjustedAt: string; // 调整日期
  reason: string; // 调整原因
  previous: PlanSnapshot; // 调整前的原内容
}

export interface PracticePlan extends PlanSnapshot {
  id: string;
  caseId: string;
  adjustments: Adjustment[];
}

export interface DailyLog {
  id: string;
  planId: string;
  date: string; // 提交对应的那一天
  actualMinutes: number; // 实际分钟
  difficulty: number; // 难度 1-5
  blocker: string; // 卡点
}

export type LogVerdict = "done" | "discuss";
