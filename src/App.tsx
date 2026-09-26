// 页面层：组装资料、判断与本机保存，渲染练习跟进台
import { useMemo, useState } from "react";
import "./styles.css";
import type { PracticePlan, PracticeState } from "./data/types";
import {
  adjustPlan,
  followUpList,
  pendingDiscussions,
  registerPlan,
  resolveDiscussion,
  submitLog,
} from "./domain/practice";
import type { LogInput, PlanInput, Result } from "./domain/practice";
import { todayISO } from "./domain/dates";
import { loadState, resetState, saveState } from "./storage/localStore";
import { CaseCard } from "./ui/CaseCard";
import { AdjustForm, LogForm, Modal, PlanForm } from "./ui/forms";
import { DiscussionPanel, FollowUpPanel } from "./ui/panels";

const project = {
  id: "hxwl-12",
  port: 5112,
  title: "心理咨询个案记录 · 练习跟进台",
  subtitle:
    "替代纸卡的家庭练习跟进：登记练习说明与核查日，按天收集分钟数、难度和卡点，未达标自动进入待讨论，连续漏交进入回访名单。",
};

type FormRequest =
  | { kind: "log"; plan: PracticePlan; date?: string }
  | { kind: "plan"; caseId: string }
  | { kind: "adjust"; plan: PracticePlan };

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={tone} />
    </article>
  );
}

function App() {
  const [state, setState] = useState<PracticeState>(() => loadState());
  const [form, setForm] = useState<FormRequest | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const today = todayISO();

  const pending = useMemo(() => pendingDiscussions(state), [state]);
  const followUps = useMemo(() => followUpList(state, today), [state, today]);
  const activePlans = state.plans.filter(
    (p) => p.startDate <= today && today < p.checkDate
  );
  const submittedToday = state.logs.filter((l) => l.date === today).length;

  function apply<T>(result: Result<T>, success: string): boolean {
    if (!result.ok) {
      setFormError(result.error);
      return false;
    }
    setState(result.state);
    saveState(result.state);
    setForm(null);
    setFormError(null);
    setNotice(success);
    return true;
  }

  function openForm(next: FormRequest) {
    setFormError(null);
    setForm(next);
  }

  const metrics = [
    { label: "进行中练习", value: String(activePlans.length), tone: "status-ok" },
    { label: "待讨论", value: String(pending.length), tone: "status-watch" },
    { label: "回访名单", value: String(followUps.length), tone: "status-danger" },
    {
      label: "今日已提交",
      value: `${submittedToday}/${activePlans.length}`,
      tone: "status-ok",
    },
  ];

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">
            {project.id} · port {project.port}
          </p>
          <h1>{project.title}</h1>
          <p className="subtitle">{project.subtitle}</p>
        </div>
        <div className="stack-card">
          <span>本机保存</span>
          <strong>数据保存在本机浏览器（localStorage），刷新不丢失</strong>
          <button
            type="button"
            onClick={() => {
              setState(resetState());
              setNotice("已重置为演示数据");
            }}
          >
            重置演示数据
          </button>
        </div>
      </section>

      {notice && (
        <p className="notice" onClick={() => setNotice(null)}>
          {notice}（点击关闭）
        </p>
      )}

      <section className="metrics-grid">
        {metrics.map((m) => (
          <MetricCard key={m.label} label={m.label} value={m.value} tone={m.tone} />
        ))}
      </section>

      <section className="board-grid">
        <div className="case-list">
          {state.cases.map((caseInfo) => (
            <CaseCard
              key={caseInfo.id}
              state={state}
              caseInfo={caseInfo}
              today={today}
              onLog={(plan, date) => openForm({ kind: "log", plan, date })}
              onRegister={(caseId) => openForm({ kind: "plan", caseId })}
              onAdjust={(plan) => openForm({ kind: "adjust", plan })}
            />
          ))}
        </div>

        <aside className="side-panels">
          <DiscussionPanel
            state={state}
            logs={pending}
            onResolve={(logId, note) =>
              apply(resolveDiscussion(state, logId, note, new Date()), "已标记为已讨论")
            }
          />
          <FollowUpPanel entries={followUps} cases={state.cases} />
        </aside>
      </section>

      {form?.kind === "log" && (
        <Modal title={`提交练习 · ${form.plan.caseId}`} onClose={() => setForm(null)}>
          <LogForm
            plan={form.plan}
            initialDate={form.date}
            error={formError}
            onSubmit={(input: LogInput) =>
              apply(submitLog(state, input, new Date()), "已提交当日练习")
            }
          />
        </Modal>
      )}

      {form?.kind === "plan" && (
        <Modal title={`登记新练习 · ${form.caseId}`} onClose={() => setForm(null)}>
          <PlanForm
            caseId={form.caseId}
            error={formError}
            onSubmit={(input: PlanInput) =>
              apply(registerPlan(state, input, new Date()), "已登记新练习")
            }
          />
        </Modal>
      )}

      {form?.kind === "adjust" && (
        <Modal title={`调整练习 · ${form.plan.caseId}`} onClose={() => setForm(null)}>
          <AdjustForm
            plan={form.plan}
            error={formError}
            onSubmit={(patch, reason) =>
              apply(
                adjustPlan(state, form.plan.id, patch, reason, new Date()),
                "已保存调整，原内容与原因已留痕"
              )
            }
          />
        </Modal>
      )}
    </main>
  );
}

export default App;
