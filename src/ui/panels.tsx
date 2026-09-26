// 页面层：待讨论列表与回访名单
import { useState } from "react";
import type { FollowUpEntry } from "../domain/practice";
import type { CaseInfo, DailyLog, PracticeState } from "../data/types";

function DiscussionItem({
  state,
  log,
  onResolve,
}: {
  state: PracticeState;
  log: DailyLog;
  onResolve: (logId: string, note: string) => void;
}) {
  const [note, setNote] = useState("");
  const plan = state.plans.find((p) => p.id === log.planId);
  const target = plan?.dailyTargetMinutes ?? 0;
  const why: string[] = [];
  if (log.actualMinutes < target) why.push(`分钟未达标（${log.actualMinutes}/${target}）`);
  if (log.difficulty >= 4) why.push(`难度 ${log.difficulty} 分`);

  return (
    <div className="discussion-item">
      <div className="discussion-head">
        <strong>{log.caseId}</strong>
        <span>{log.date}</span>
      </div>
      <p className="discussion-why">{why.join(" · ")}</p>
      {log.stuckPoint && <p className="discussion-stuck">卡点：{log.stuckPoint}</p>}
      <div className="discussion-actions">
        <input
          value={note}
          placeholder="讨论结论（可选）"
          onChange={(e) => setNote(e.target.value)}
        />
        <button type="button" onClick={() => onResolve(log.id, note)}>
          标记已讨论
        </button>
      </div>
    </div>
  );
}

export function DiscussionPanel({
  state,
  logs,
  onResolve,
}: {
  state: PracticeState;
  logs: DailyLog[];
  onResolve: (logId: string, note: string) => void;
}) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>会谈前必看</p>
          <h2>待讨论（{logs.length}）</h2>
        </div>
      </div>
      {logs.length === 0 && <p className="empty-hint">没有待讨论的练习记录。</p>}
      {logs.map((log) => (
        <DiscussionItem key={log.id} state={state} log={log} onResolve={onResolve} />
      ))}
    </section>
  );
}

export function FollowUpPanel({
  entries,
  cases,
}: {
  entries: FollowUpEntry[];
  cases: CaseInfo[];
}) {
  const themeOf = (caseId: string) =>
    cases.find((c) => c.id === caseId)?.theme ?? "";

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>连续漏交 ≥ 2 天</p>
          <h2>回访名单（{entries.length}）</h2>
        </div>
      </div>
      {entries.length === 0 && <p className="empty-hint">目前没有需要回访的个案。</p>}
      {entries.map((entry) => (
        <div key={entry.plan.id} className="followup-item">
          <div>
            <strong>
              {entry.caseId} · {themeOf(entry.caseId)}
            </strong>
            <p>{entry.plan.description}</p>
          </div>
          <span className="badge badge-followup">连续漏交 {entry.streak} 天</span>
        </div>
      ))}
    </section>
  );
}
