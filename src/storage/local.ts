import type { DailyLog, PracticePlan } from "../data/types";

const KEY = "hxwl12.practice.v1";

export interface PersistedState {
  plans: PracticePlan[];
  logs: DailyLog[];
}

export function loadState(fallback: PersistedState): PersistedState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!Array.isArray(parsed.plans) || !Array.isArray(parsed.logs)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 存储不可用（隐私模式等）时静默失败，页面仍可运行
  }
}
