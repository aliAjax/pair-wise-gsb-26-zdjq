import type { CaseInfo, DailyLog, PracticePlan } from "./types";

export const CASES: CaseInfo[] = [
  { id: "case-042", alias: "C-042", topic: "焦虑", risk: "中风险", focus: "睡眠改善，练习呼吸放松" },
  { id: "case-119", alias: "C-119", topic: "亲密关系", risk: "稳定", focus: "识别沟通中的回避模式" },
  { id: "case-203", alias: "C-203", topic: "职业压力", risk: "关注", focus: "设定下周边界练习" },
];

export const seedPlans: PracticePlan[] = [
  {
    id: "plan-breath",
    caseId: "case-042",
    title: "4-7-8 呼吸放松练习",
    dailyTargetMinutes: 15,
    startDate: "2026-09-20",
    checkDate: "2026-09-30",
    adjustments: [],
  },
  {
    id: "plan-comm",
    caseId: "case-119",
    title: "沟通回避观察记录",
    dailyTargetMinutes: 10,
    startDate: "2026-09-24",
    checkDate: "2026-10-01",
    adjustments: [],
  },
  {
    id: "plan-boundary",
    caseId: "case-203",
    title: "下班边界仪式",
    dailyTargetMinutes: 15,
    startDate: "2026-09-12",
    checkDate: "2026-09-26",
    adjustments: [
      {
        adjustedAt: "2026-09-15",
        reason: "来访者进入加班季，20 分钟难以坚持，先降到 15 分钟建立习惯",
        previous: {
          title: "下班边界仪式",
          dailyTargetMinutes: 20,
          startDate: "2026-09-12",
          checkDate: "2026-09-26",
        },
      },
    ],
  },
];

export const seedLogs: DailyLog[] = [
  { id: "log-01", planId: "plan-breath", date: "2026-09-20", actualMinutes: 15, difficulty: 2, blocker: "" },
  { id: "log-02", planId: "plan-breath", date: "2026-09-21", actualMinutes: 10, difficulty: 3, blocker: "睡前刷手机，忘记练习" },
  { id: "log-03", planId: "plan-breath", date: "2026-09-22", actualMinutes: 15, difficulty: 4, blocker: "练习时心慌加重" },
  { id: "log-04", planId: "plan-breath", date: "2026-09-23", actualMinutes: 15, difficulty: 2, blocker: "" },
  { id: "log-05", planId: "plan-comm", date: "2026-09-24", actualMinutes: 10, difficulty: 2, blocker: "" },
  { id: "log-06", planId: "plan-comm", date: "2026-09-25", actualMinutes: 8, difficulty: 3, blocker: "对话中难以开口表达需求" },
  { id: "log-07", planId: "plan-boundary", date: "2026-09-24", actualMinutes: 15, difficulty: 2, blocker: "" },
  { id: "log-08", planId: "plan-boundary", date: "2026-09-25", actualMinutes: 15, difficulty: 3, blocker: "下班消息仍忍不住回复" },
];
