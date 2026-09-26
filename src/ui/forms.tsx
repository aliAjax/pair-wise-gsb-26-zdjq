// 页面层：弹窗与三个表单（提交每日练习 / 登记新练习 / 调整练习）
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { PracticePlan } from "../data/types";
import type { LogInput, PlanInput } from "../domain/practice";
import { DIFFICULTY_FLAG } from "../domain/practice";
import { addDays, minISO, todayISO } from "../domain/dates";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="form-error">{message}</p>;
}

const DIFFICULTY_LABELS = ["1 很轻松", "2 较轻松", "3 一般", "4 吃力", "5 非常吃力"];

/** 来访者按天提交：实际分钟、难度、卡点 */
export function LogForm({
  plan,
  initialDate,
  error,
  onSubmit,
}: {
  plan: PracticePlan;
  initialDate?: string;
  error: string | null;
  onSubmit: (input: LogInput) => boolean;
}) {
  const today = todayISO();
  const lastDay = minISO(addDays(plan.checkDate, -1), today);
  const [date, setDate] = useState(initialDate ?? lastDay);
  const [minutes, setMinutes] = useState(String(plan.dailyTargetMinutes));
  const [difficulty, setDifficulty] = useState("3");
  const [stuck, setStuck] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      planId: plan.id,
      date,
      actualMinutes: Number(minutes),
      difficulty: Number(difficulty),
      stuckPoint: stuck,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <p className="form-hint">
        「{plan.description}」· 目标 {plan.dailyTargetMinutes} 分钟/天。
        未达目标或难度达到 {DIFFICULTY_FLAG} 分将进入待讨论，不算完成。
      </p>
      <label>
        <span>练习日期</span>
        <input
          type="date"
          value={date}
          min={plan.startDate}
          max={lastDay}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </label>
      <label>
        <span>实际分钟</span>
        <input
          type="number"
          min={0}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          required
        />
      </label>
      <label>
        <span>难度（1-5）</span>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          {DIFFICULTY_LABELS.map((label, i) => (
            <option key={label} value={String(i + 1)}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="span-2">
        <span>卡点（哪里卡住了）</span>
        <textarea
          rows={3}
          value={stuck}
          placeholder="例如：睡前思绪停不下来，只练了一半"
          onChange={(e) => setStuck(e.target.value)}
        />
      </label>
      <FormError message={error} />
      <div className="form-actions">
        <button type="submit" className="primary-action">
          提交
        </button>
      </div>
    </form>
  );
}

/** 登记练习：说明、每日目标分钟、开始日、核查日 */
export function PlanForm({
  caseId,
  error,
  onSubmit,
}: {
  caseId: string;
  error: string | null;
  onSubmit: (input: PlanInput) => boolean;
}) {
  const today = todayISO();
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("15");
  const [startDate, setStartDate] = useState(today);
  const [checkDate, setCheckDate] = useState(addDays(today, 7));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      caseId,
      description,
      dailyTargetMinutes: Number(target),
      startDate,
      checkDate,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <p className="form-hint">核查日前不能为同一个案重叠安排第二项练习。</p>
      <label className="span-2">
        <span>练习说明</span>
        <input
          value={description}
          placeholder="例如：4-7-8 呼吸放松练习（睡前一轮）"
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </label>
      <label>
        <span>每日目标分钟</span>
        <input
          type="number"
          min={1}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          required
        />
      </label>
      <label>
        <span>开始日</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
      </label>
      <label>
        <span>核查日</span>
        <input
          type="date"
          value={checkDate}
          min={startDate}
          onChange={(e) => setCheckDate(e.target.value)}
          required
        />
      </label>
      <FormError message={error} />
      <div className="form-actions">
        <button type="submit" className="primary-action">
          登记
        </button>
      </div>
    </form>
  );
}

/** 调整练习：原内容与原因自动留痕 */
export function AdjustForm({
  plan,
  error,
  onSubmit,
}: {
  plan: PracticePlan;
  error: string | null;
  onSubmit: (
    patch: {
      description: string;
      dailyTargetMinutes: number;
      startDate: string;
      checkDate: string;
    },
    reason: string
  ) => boolean;
}) {
  const [description, setDescription] = useState(plan.description);
  const [target, setTarget] = useState(String(plan.dailyTargetMinutes));
  const [startDate, setStartDate] = useState(plan.startDate);
  const [checkDate, setCheckDate] = useState(plan.checkDate);
  const [reason, setReason] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(
      {
        description,
        dailyTargetMinutes: Number(target),
        startDate,
        checkDate,
      },
      reason
    );
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <p className="form-hint">
        调整会保留原内容与原因，可在练习卡片的「调整历史」中查看。
      </p>
      <label className="span-2">
        <span>练习说明</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </label>
      <label>
        <span>每日目标分钟</span>
        <input
          type="number"
          min={1}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          required
        />
      </label>
      <label>
        <span>开始日</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
      </label>
      <label>
        <span>核查日</span>
        <input
          type="date"
          value={checkDate}
          min={startDate}
          onChange={(e) => setCheckDate(e.target.value)}
          required
        />
      </label>
      <label className="span-2">
        <span>调整原因（必填，随原内容一起留存）</span>
        <textarea
          rows={2}
          value={reason}
          placeholder="例如：来访者反映睡前练习难以坚持，改为午休时段"
          onChange={(e) => setReason(e.target.value)}
          required
        />
      </label>
      <FormError message={error} />
      <div className="form-actions">
        <button type="submit" className="primary-action">
          保存调整
        </button>
      </div>
    </form>
  );
}
