import { useEffect, useState } from "react";
import "./styles.css";
import { CASES, seedLogs, seedPlans } from "./data/seed";
import type { DailyLog, PlanSnapshot, PracticePlan } from "./data/types";
import {
  DISCUSS_DIFFICULTY,
  addDays,
  adjustPlan,
  clampDate,
  evaluateLog,
  findScheduleConflict,
  isFollowUp,
  missedStreak,
  summarize,
  todayISO,
} from "./domain/practice";
import { loadState, saveState, type PersistedState } from "./storage/local";

const today = todayISO();

const statusColors = ["status-ok", "status-watch", "status-danger"];

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function MetricCard({ label, value, index }: { label: string; value: number; index: number }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={statusColors[index % statusColors.length]} />
    </article>
  );
}

/* ---------- 登记新练习 ---------- */

function PlanForm({
  caseId,
  plans,
  onAdd,
}: {
  caseId: string;
  plans: PracticePlan[];
  onAdd: (snap: PlanSnapshot) => void;
}) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("15");
  const [start, setStart] = useState(today);
  const [check, setCheck] = useState(addDays(today, 7));
  const [error, setError] = useState("");

  function submit() {
    const minutes = Number(target);
    if (!title.trim()) return setError("请填写练习说明");
    if (!Number.isFinite(minutes) || minutes <= 0) return setError("每日目标分钟需大于 0");
    const draft: PlanSnapshot = {
      title: title.trim(),
      dailyTargetMinutes: minutes,
      startDate: start,
      checkDate: check,
    };
    const conflict = findScheduleConflict(plans, { ...draft, caseId });
    if (conflict) return setError(conflict);
    onAdd(draft);
    setTitle("");
    setError("");
  }

  return (
    <div className="sub-panel">
      <h3>登记新练习</h3>
      <div className="form-grid">
        <label>
          <span>练习说明</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：4-7-8 呼吸放松练习" />
        </label>
        <label>
          <span>每日目标（分钟）</span>
          <input type="number" min={1} value={target} onChange={(e) => setTarget(e.target.value)} />
        </label>
        <label>
          <span>开始日</span>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          <span>核查日</span>
          <input type="date" value={check} onChange={(e) => setCheck(e.target.value)} />
        </label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-action" onClick={submit}>
        登记练习
      </button>
    </div>
  );
}

/* ---------- 调整练习（保留原内容与原因） ---------- */

function AdjustForm({
  plan,
  plans,
  onAdjust,
}: {
  plan: PracticePlan;
  plans: PracticePlan[];
  onAdjust: (next: PlanSnapshot, reason: string) => void;
}) {
  const [title, setTitle] = useState(plan.title);
  const [target, setTarget] = useState(String(plan.dailyTargetMinutes));
  const [check, setCheck] = useState(plan.checkDate);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function submit() {
    const minutes = Number(target);
    if (!title.trim()) return setError("请填写练习说明");
    if (!Number.isFinite(minutes) || minutes <= 0) return setError("每日目标分钟需大于 0");
    if (!reason.trim()) return setError("请填写调整原因，原因会与原内容一起保留");
    const next: PlanSnapshot = {
      title: title.trim(),
      dailyTargetMinutes: minutes,
      startDate: plan.startDate,
      checkDate: check,
    };
    const others = plans.filter((p) => p.id !== plan.id);
    const conflict = findScheduleConflict(others, { ...next, caseId: plan.caseId });
    if (conflict) return setError(conflict);
    onAdjust(next, reason.trim());
    setReason("");
    setError("");
  }

  return (
    <div className="sub-panel">
      <h4>调整练习</h4>
      <div className="form-grid">
        <label>
          <span>练习说明</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          <span>每日目标（分钟）</span>
          <input type="number" min={1} value={target} onChange={(e) => setTarget(e.target.value)} />
        </label>
        <label>
          <span>核查日</span>
          <input type="date" value={check} onChange={(e) => setCheck(e.target.value)} />
        </label>
        <label>
          <span>调整原因（必填，随原内容保留）</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="如：加班季，先降低目标建立习惯"
          />
        </label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-action" onClick={submit}>
        保存调整
      </button>
    </div>
  );
}

/* ---------- 每日提交 ---------- */

function LogForm({
  plan,
  onSubmit,
}: {
  plan: PracticePlan;
  onSubmit: (log: Omit<DailyLog, "id" | "planId">) => void;
}) {
  const [date, setDate] = useState(clampDate(today, plan.startDate, plan.checkDate));
  const [minutes, setMinutes] = useState("");
  const [difficulty, setDifficulty] = useState("3");
  const [blocker, setBlocker] = useState("");
  const [error, setError] = useState("");

  function submit() {
    const actual = Number(minutes);
    if (date < plan.startDate || date > plan.checkDate) {
      return setError(`提交日期需在练习周期内（${plan.startDate} ~ ${plan.checkDate}）`);
    }
    if (!Number.isFinite(actual) || actual < 0) return setError("请填写实际分钟数");
    onSubmit({ date, actualMinutes: actual, difficulty: Number(difficulty), blocker: blocker.trim() });
    setMinutes("");
    setBlocker("");
    setError("");
  }

  return (
    <div className="sub-panel">
      <h4>每日提交</h4>
      <p className="hint">
        未达目标 {plan.dailyTargetMinutes} 分钟或难度 ≥ {DISCUSS_DIFFICULTY} 的记录进入待讨论，不计入完成；同日重复提交会覆盖旧记录。
      </p>
      <div className="form-grid">
        <label>
          <span>日期</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          <span>实际分钟</span>
          <input type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="如：12" />
        </label>
        <label>
          <span>难度（1 轻松 ~ 5 非常困难）</span>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>卡点</span>
          <input value={blocker} onChange={(e) => setBlocker(e.target.value)} placeholder="练到哪里卡住了" />
        </label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-action" onClick={submit}>
        提交记录
      </button>
    </div>
  );
}

/* ---------- 记录列表 ---------- */

function LogList({ plan, logs }: { plan: PracticePlan; logs: DailyLog[] }) {
  const rows = [...logs].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (rows.length === 0) return <p className="hint">还没有提交记录。</p>;
  return (
    <div className="log-list">
      {rows.map((log) => {
        const verdict = evaluateLog(log, plan);
        return (
          <div className="log-row" key={log.id}>
            <strong>{log.date}</strong>
            <span className="log-detail">
              实际 {log.actualMinutes} 分钟 · 难度 {log.difficulty}/5
              {log.blocker && ` · 卡点：${log.blocker}`}
            </span>
            <span className={`badge ${verdict === "done" ? "badge-done" : "badge-discuss"}`}>
              {verdict === "done" ? "完成" : "待讨论"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- 练习卡片 ---------- */

function PlanCard({
  plan,
  logs,
  plans,
  onAdjust,
  onSubmitLog,
}: {
  plan: PracticePlan;
  logs: DailyLog[];
  plans: PracticePlan[];
  onAdjust: (planId: string, next: PlanSnapshot, reason: string) => void;
  onSubmitLog: (planId: string, log: Omit<DailyLog, "id" | "planId">) => void;
}) {
  const [showAdjust, setShowAdjust] = useState(false);
  const planLogs = logs.filter((l) => l.planId === plan.id);
  const stats = summarize(plan, logs, today);
  const streak = missedStreak(plan, logs, today);
  const active = plan.checkDate >= today;

  return (
    <article className="plan-card">
      <div className="plan-head">
        <div>
          <h3>{plan.title}</h3>
          <p className="hint">
            目标 {plan.dailyTargetMinutes} 分钟/天 · {plan.startDate} 开始 · {plan.checkDate} 核查
          </p>
        </div>
        <div className="plan-badges">
          <span className={`badge ${active ? "badge-active" : "badge-closed"}`}>
            {active ? "进行中" : "已到核查日"}
          </span>
          {streak >= 2 && <span className="badge badge-miss">连续漏交 {streak} 天 · 待回访</span>}
        </div>
      </div>

      <div className="plan-meta">
        <div>
          <span>应提交</span>
          <strong>{stats.expected} 天</strong>
        </div>
        <div>
          <span>已提交</span>
          <strong>{stats.submitted} 天</strong>
        </div>
        <div>
          <span>完成</span>
          <strong>{stats.done} 天</strong>
        </div>
        <div>
          <span>待讨论</span>
          <strong>{stats.discuss} 天</strong>
        </div>
      </div>

      {plan.adjustments.length > 0 && (
        <div className="history">
          <h4>调整历史（原内容与原因）</h4>
          {plan.adjustments.map((a, i) => (
            <p key={i}>
              <strong>{a.adjustedAt}</strong> 原「{a.previous.title} · {a.previous.dailyTargetMinutes} 分钟/天 ·{" "}
              {a.previous.startDate} ~ {a.previous.checkDate}」
              <br />
              原因：{a.reason}
            </p>
          ))}
        </div>
      )}

      <div>
        <button onClick={() => setShowAdjust((v) => !v)}>{showAdjust ? "收起调整" : "调整练习"}</button>
      </div>
      {showAdjust && (
        <AdjustForm
          plan={plan}
          plans={plans}
          onAdjust={(next, reason) => {
            onAdjust(plan.id, next, reason);
            setShowAdjust(false);
          }}
        />
      )}

      <LogForm key={plan.id} plan={plan} onSubmit={(draft) => onSubmitLog(plan.id, draft)} />
      <LogList plan={plan} logs={planLogs} />
    </article>
  );
}

/* ---------- 页面 ---------- */

function App() {
  const [state, setState] = useState<PersistedState>(() =>
    loadState({ plans: seedPlans, logs: seedLogs })
  );
  const [caseId, setCaseId] = useState(CASES[0].id);

  useEffect(() => saveState(state), [state]);

  const { plans, logs } = state;
  const currentCase = CASES.find((c) => c.id === caseId) ?? CASES[0];
  const casePlans = plans.filter((p) => p.caseId === currentCase.id);
  const followUps = plans.filter((p) => isFollowUp(p, logs, today));
  const discussCount = logs.filter((l) => {
    const plan = plans.find((p) => p.id === l.planId);
    return plan ? evaluateLog(l, plan) === "discuss" : false;
  }).length;

  const metrics = [
    { label: "进行中练习", value: plans.filter((p) => p.checkDate >= today).length },
    { label: "待讨论记录", value: discussCount },
    { label: "回访名单", value: followUps.length },
    { label: "今日已提交", value: logs.filter((l) => l.date === today).length },
  ];

  function addPlan(snap: PlanSnapshot) {
    setState((prev) => ({
      ...prev,
      plans: [...prev.plans, { ...snap, id: uid("plan"), caseId, adjustments: [] }],
    }));
  }

  function applyAdjust(planId: string, next: PlanSnapshot, reason: string) {
    setState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) => (p.id === planId ? adjustPlan(p, next, reason, today) : p)),
    }));
  }

  function submitLog(planId: string, draft: Omit<DailyLog, "id" | "planId">) {
    setState((prev) => ({
      ...prev,
      logs: [
        ...prev.logs.filter((l) => !(l.planId === planId && l.date === draft.date)),
        { ...draft, id: uid("log"), planId },
      ],
    }));
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-12 · port 5112</p>
          <h1>心理咨询个案练习跟进台</h1>
          <p className="subtitle">
            为每个个案登记家庭练习，按天跟进实际分钟、难度与卡点；未达标或难度偏高自动进入待讨论，连续漏交进入回访名单，会谈前一屏看清练了几天、卡在哪里。
          </p>
        </div>
        <div className="stack-card">
          <span>分层</span>
          <strong>资料 data → 判断 domain → 本机保存 storage → 页面</strong>
          <span>数据保存在本机浏览器 localStorage</span>
        </div>
      </section>

      <section className="metrics-grid">
        {metrics.map((m, i) => (
          <MetricCard key={m.label} label={m.label} value={m.value} index={i} />
        ))}
      </section>

      <section className="workspace">
        <aside className="panel narrow">
          <h2>个案</h2>
          <div className="case-list">
            {CASES.map((c) => (
              <button
                key={c.id}
                className={`case-item ${c.id === caseId ? "active" : ""}`}
                onClick={() => setCaseId(c.id)}
              >
                <strong>
                  {c.alias} · {c.topic}
                </strong>
                <span>
                  {c.risk} · {c.focus}
                </span>
              </button>
            ))}
          </div>

          <h2>回访名单</h2>
          <div className="followup-list">
            {followUps.length === 0 && <p className="hint">暂无连续漏交的练习。</p>}
            {followUps.map((p) => {
              const c = CASES.find((x) => x.id === p.caseId);
              return (
                <div className="followup-item" key={p.id}>
                  <strong>
                    {c?.alias} · {p.title}
                  </strong>
                  <br />
                  连续漏交 {missedStreak(p, logs, today)} 天，建议会谈前联系。
                </div>
              );
            })}
          </div>
        </aside>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p>
                {currentCase.alias} · {currentCase.topic}
              </p>
              <h2>练习安排</h2>
            </div>
          </div>

          <PlanForm caseId={currentCase.id} plans={plans} onAdd={addPlan} />

          <div className="plan-list">
            {casePlans.length === 0 && <p className="hint">该个案还没有登记练习。</p>}
            {casePlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                logs={logs}
                plans={plans}
                onAdjust={applyAdjust}
                onSubmitLog={submitLog}
              />
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
