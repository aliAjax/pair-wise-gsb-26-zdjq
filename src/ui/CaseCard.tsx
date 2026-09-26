// 页面层：个案卡片（练习计划、每日记录、调整历史）
import type { CaseInfo, PracticePlan, PracticeState } from "../data/types";
import {
  MISS_STREAK_LIMIT,
  logsOfPlan,
  planStats,
  plansOfCase,
} from "../domain/practice";
import { addDays, eachDay, minISO } from "../domain/dates";

function planPhase(plan: PracticePlan, today: string): string {
  if (today < plan.startDate) return "未开始";
  if (today < plan.checkDate) return "进行中";
  return "已到核查日";
}

function PlanBlock({
  state,
  plan,
  today,
  onLog,
  onAdjust,
}: {
  state: PracticeState;
  plan: PracticePlan;
  today: string;
  onLog: (plan: PracticePlan, date?: string) => void;
  onAdjust: (plan: PracticePlan) => void;
}) {
  const stats = planStats(state, plan, today);
  const logs = logsOfPlan(state, plan.id);
  const logByDate = new Map(logs.map((l) => [l.date, l]));
  const days = eachDay(plan.startDate, minISO(plan.checkDate, addDays(today, 1)))
    .slice(-8)
    .reverse();
  const active = plan.startDate <= today && today < plan.checkDate;
  const doneRatio = stats.dueSoFar > 0 ? stats.done / stats.dueSoFar : 0;

  return (
    <div className="plan-block">
      <div className="plan-head">
        <div>
          <strong>{plan.description}</strong>
          <p className="plan-meta">
            目标 {plan.dailyTargetMinutes} 分钟/天 · 练习期 {plan.startDate} ~{" "}
            {addDays(plan.checkDate, -1)} · 核查日 {plan.checkDate}
          </p>
        </div>
        <span className={`chip phase-${active ? "active" : "idle"}`}>
          {planPhase(plan, today)}
        </span>
      </div>

      <div className="stat-chips">
        <span>已交 {stats.submitted}</span>
        <span>完成 {stats.done}</span>
        <span>待讨论 {stats.pending}</span>
        <span className={stats.missed > 0 ? "stat-warn" : ""}>
          漏交 {stats.missed}
        </span>
        {stats.streak >= MISS_STREAK_LIMIT && (
          <span className="stat-danger">连续漏交 {stats.streak} 天 · 待回访</span>
        )}
      </div>

      <div className="progress" title={`完成率按到昨天为止的应练天数计算`}>
        <i style={{ width: `${Math.round(doneRatio * 100)}%` }} />
      </div>

      <div className="plan-actions">
        {active && (
          <button
            type="button"
            className="primary-action"
            onClick={() => onLog(plan)}
            disabled={!!stats.todayLog}
          >
            {stats.todayLog ? "今日已提交" : "提交今日练习"}
          </button>
        )}
        <button type="button" onClick={() => onAdjust(plan)}>
          调整
        </button>
      </div>

      {days.length > 0 && (
        <div className="day-list">
          {days.map((day) => {
            const log = logByDate.get(day);
            if (log) {
              return (
                <div key={day} className="day-row">
                  <span className="day-date">{day}</span>
                  <span>{log.actualMinutes} 分钟</span>
                  <span>难度 {log.difficulty}</span>
                  {log.status === "done" ? (
                    <span className="badge badge-done">完成</span>
                  ) : log.resolvedAt ? (
                    <span className="badge badge-resolved">已讨论</span>
                  ) : (
                    <span className="badge badge-pending">待讨论</span>
                  )}
                  <span className="day-stuck">{log.stuckPoint || "—"}</span>
                </div>
              );
            }
            const isToday = day === today;
            return (
              <div key={day} className="day-row">
                <span className="day-date">{day}</span>
                <span className="day-empty">未提交</span>
                <span />
                {isToday ? (
                  <span className="badge">待提交</span>
                ) : (
                  <span className="badge badge-missed">漏交</span>
                )}
                <span className="day-stuck">
                  <button type="button" className="link-btn" onClick={() => onLog(plan, day)}>
                    {isToday ? "去提交" : "补交"}
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {plan.revisions.length > 0 && (
        <details className="revision-list">
          <summary>调整历史（{plan.revisions.length}）</summary>
          {plan.revisions.map((rev, i) => (
            <div key={rev.revisedAt} className="revision-item">
              <p>
                第 {i + 1} 次调整 · {rev.revisedAt.slice(0, 10)}
              </p>
              <p>
                原内容：{rev.previous.description} · {rev.previous.dailyTargetMinutes}{" "}
                分钟/天 · {rev.previous.startDate} ~ {rev.previous.checkDate}
              </p>
              <p>原因：{rev.reason}</p>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

export function CaseCard({
  state,
  caseInfo,
  today,
  onLog,
  onRegister,
  onAdjust,
}: {
  state: PracticeState;
  caseInfo: CaseInfo;
  today: string;
  onLog: (plan: PracticePlan, date?: string) => void;
  onRegister: (caseId: string) => void;
  onAdjust: (plan: PracticePlan) => void;
}) {
  const plans = plansOfCase(state, caseInfo.id);

  return (
    <article className="panel case-card">
      <div className="case-head">
        <div>
          <h3>{caseInfo.id}</h3>
          <p className="case-focus">{caseInfo.focus}</p>
        </div>
        <div className="chips">
          <span className="chip">{caseInfo.theme}</span>
          <span className="chip">{caseInfo.risk}</span>
        </div>
      </div>

      {plans.map((plan) => (
        <PlanBlock
          key={plan.id}
          state={state}
          plan={plan}
          today={today}
          onLog={onLog}
          onAdjust={onAdjust}
        />
      ))}

      {plans.length === 0 && <p className="empty-hint">尚未登记练习。</p>}

      <button type="button" onClick={() => onRegister(caseInfo.id)}>
        登记新练习
      </button>
    </article>
  );
}
