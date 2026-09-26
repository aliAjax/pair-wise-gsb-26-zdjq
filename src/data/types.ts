// 资料层：个案、练习、每日提交的数据结构

export interface CaseInfo {
  id: string; // 来访者代号，如 C-042
  theme: string; // 咨询主题
  risk: string; // 风险等级
  focus: string; // 当前干预目标
}

/** 练习登记的四项核心内容（也是调整时留存的快照） */
export interface PlanSnapshot {
  description: string; // 练习说明
  dailyTargetMinutes: number; // 每日目标分钟
  startDate: string; // 开始日 YYYY-MM-DD
  checkDate: string; // 核查日 YYYY-MM-DD（练习期为 [开始日, 核查日)）
}

/** 一次调整留下的痕迹：原内容 + 原因 + 时间 */
export interface PlanRevision {
  revisedAt: string;
  reason: string;
  previous: PlanSnapshot;
}

export interface PracticePlan extends PlanSnapshot {
  id: string;
  caseId: string;
  createdAt: string;
  revisions: PlanRevision[];
}

/** done=完成；pending=待讨论（未达目标或难度≥4，不算完成） */
export type LogStatus = "done" | "pending";

export interface DailyLog {
  id: string;
  planId: string;
  caseId: string;
  date: string; // 练习日 YYYY-MM-DD
  actualMinutes: number; // 实际分钟
  difficulty: number; // 难度 1-5
  stuckPoint: string; // 卡点
  status: LogStatus;
  submittedAt: string;
  resolvedAt?: string; // 会谈中已讨论的时间
  resolveNote?: string; // 讨论结论
}

export interface PracticeState {
  version: 1;
  cases: CaseInfo[];
  plans: PracticePlan[];
  logs: DailyLog[];
}
