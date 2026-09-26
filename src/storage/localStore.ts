// 本机保存层：localStorage 读写，损坏或缺失时回退到演示数据
import { buildSeedState } from "../data/seed";
import type { PracticeState } from "../data/types";

const STORAGE_KEY = "hxwl12.practice.v1";

function isValidState(parsed: unknown): parsed is PracticeState {
  const s = parsed as PracticeState;
  return (
    !!s &&
    s.version === 1 &&
    Array.isArray(s.cases) &&
    Array.isArray(s.plans) &&
    Array.isArray(s.logs)
  );
}

export function loadState(): PracticeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isValidState(parsed)) return parsed;
    }
  } catch {
    // 读取失败时落到演示数据
  }
  const fresh = buildSeedState();
  saveState(fresh);
  return fresh;
}

export function saveState(state: PracticeState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储被禁用或已满时静默失败，页面仍可用
  }
}

export function resetState(): PracticeState {
  const fresh = buildSeedState();
  saveState(fresh);
  return fresh;
}
