import { useState } from 'react';
import {
  FaBaby, FaCheckCircle, FaTimesCircle, FaInfoCircle, FaCalendarAlt,
  FaMoneyBillWave, FaExclamationTriangle, FaChevronDown, FaChevronUp,
  FaUserCheck, FaShieldAlt, FaCoins, FaClipboardList, FaMagic,
} from 'react-icons/fa';
import { FloatInput, ResultCard, StatGrid } from '../ui';
import type { CalcProps } from '../../utils/constants.ts';
import CalcShell from '../CalcShell';
import { useLang } from '../../context/LangContext.tsx';
import { shareWA, buildShare } from '../../utils/share.ts';

const A = '#ec4899';

/* ──────────────────────────────────────────────────────────────
   Bangladesh Labour Act 2006 — Chapter IV
   Sec 46: 60 days before + 60 days after delivery = 120 days
   Sec 47: notice paths, payment methods, 3-month proof deadline
   Sec 48(2): average daily wage = monthly wage / 26
   ────────────────────────────────────────────────────────────── */
const PRE_DELIVERY_DAYS      = 60;
const POST_DELIVERY_DAYS     = 60;
const TOTAL_DAYS             = PRE_DELIVERY_DAYS + POST_DELIVERY_DAYS; // 120
const MIN_SERVICE_MONTHS     = 6;
const MAX_SURVIVING_CHILDREN = 1;   // 2+ surviving children → no cash benefit
const WAGE_DAYS_DIVISOR      = 26;
const POST_NOTICE_WINDOW     = 7;   // Sec 47: notice within 7 days of birth
const PROOF_DEADLINE_MONTHS  = 3;   // Sec 47(4)

type NoticePath = 'pre' | 'post';

/* ── date helpers ─────────────────────────────────────────────── */

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const target = d.getMonth() + months;
  d.setMonth(target);
  if (d.getMonth() !== ((target % 12) + 12) % 12) d.setDate(0);
  return d;
}

function monthsBetween(start: Date, end: Date): number {
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months--;
  return Math.max(0, months);
}

/** Whole days from a → b (b - a). */
function daysBetween(a: Date, b: Date): number {
  const MS = 86400000;
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / MS);
}

const inRange = (d: Date, from: Date, to: Date) =>
  daysBetween(from, d) >= 0 && daysBetween(d, to) >= 0;

const toBnDigits = (s: string) => s.replace(/[0-9]/g, n => '০১২৩৪৫৬৭৮৯'[+n]);

function formatDate(date: Date, bn: boolean): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear().toString();
  const out = `${d}/${m}/${y}`;
  return bn ? toBnDigits(out) : out;
}

const NUM = (n: number, bn: boolean) => (bn ? toBnDigits(String(n)) : String(n));

/** Validated Date from day/month/year strings. Rejects non-existent dates (31 Feb etc). */
function buildDate(dayStr: string, monthStr: string, yearStr: string): Date | null {
  if (!dayStr || !monthStr || !yearStr) return null;
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1000) return null;
  const date = new Date(year, month - 1, day);
  if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) return null;
  return date;
}

/* ── schedule model ───────────────────────────────────────────── */

interface Schedule {
  noticeDate: Date;
  noticeDeadline?: Date;   // 'post' path: last lawful day to serve notice
  block1Start: Date;       // 1st 60-day period (1st installment)
  block1End: Date;
  block2Start: Date;       // 2nd 60-day period (2nd installment)
  block2End: Date;
  leaveStart: Date;
  leaveEnd: Date;
  proofDeadline: Date;
  totalDays: number;       // always 120
  deliveryInBlock: 1 | 2 | null;  // null = delivery falls outside the leave window
  noticeLate: boolean;     // 'post' path: notice served after the 7-day window
}

/**
 * Builds the 120-day schedule as two consecutive 60-day blocks.
 *
 * 'pre'  — notice served before birth. Leave runs from the day after the notice.
 *          The delivery day falls inside the FIRST 60-day block.
 * 'post' — no prior notice. The delivery day opens the SECOND 60-day block,
 *          so the first block is the 60 days immediately preceding delivery.
 */
function buildSchedule(delivery: Date, path: NoticePath, notice: Date): Schedule {
  const proofDeadline = addMonths(delivery, PROOF_DEADLINE_MONTHS);

  if (path === 'pre') {
    const block1Start = addDays(notice, 1);
    const block1End   = addDays(block1Start, PRE_DELIVERY_DAYS - 1);
    const block2Start = addDays(block1End, 1);
    const block2End   = addDays(block2Start, POST_DELIVERY_DAYS - 1);
    return {
      noticeDate: notice,
      block1Start, block1End, block2Start, block2End,
      leaveStart: block1Start,
      leaveEnd: block2End,
      proofDeadline,
      totalDays: TOTAL_DAYS,
      deliveryInBlock: inRange(delivery, block1Start, block1End) ? 1
                     : inRange(delivery, block2Start, block2End) ? 2 : null,
      noticeLate: false,
    };
  }

  // 'post' — delivery day is the first day of the second block
  const block2Start = delivery;
  const block2End   = addDays(block2Start, POST_DELIVERY_DAYS - 1);
  const block1End   = addDays(delivery, -1);
  const block1Start = addDays(block1End, -(PRE_DELIVERY_DAYS - 1));
  return {
    noticeDate: notice,
    noticeDeadline: addDays(delivery, POST_NOTICE_WINDOW),
    block1Start, block1End, block2Start, block2End,
    leaveStart: block1Start,
    leaveEnd: block2End,
    proofDeadline,
    totalDays: TOTAL_DAYS,
    deliveryInBlock: 2,
    noticeLate: daysBetween(delivery, notice) > POST_NOTICE_WINDOW,
  };
}

/* ── result shape ─────────────────────────────────────────────── */

interface Result {
  eligible: boolean;
  reason?: 'service' | 'children';
  deliveryDate: Date;
  totalBenefit: number;
  firstInstallment: number;
  secondInstallment: number;
  avgDailyWage: number;
  serviceMonths: number;
  error?: string;
}

/* ── presentational pieces ────────────────────────────────────── */

function DateBox({
  value, onChange, placeholder, max,
}: {
  value: string; onChange: (v: string) => void; placeholder: string; max: number;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={e => {
        const v = e.target.value.replace(/[^\d]/g, '');
        if (v === '' || (v.length <= String(max).length && parseInt(v, 10) <= max)) onChange(v);
      }}
      placeholder={placeholder}
      maxLength={String(max).length}
      style={{
        flex: 1, minWidth: 0, padding: '12px 14px',
        background: 'var(--surface)', color: 'var(--text)',
        border: `1.5px solid var(--border)`, borderRadius: 12,
        fontSize: 14, fontFamily: 'inherit', outline: 'none', textAlign: 'left',
      }}
    />
  );
}

function DateFieldGroup({
  label, day, month, year, onDay, onMonth, onYear, bn, hint, action,
}: {
  label: string;
  day: string; month: string; year: string;
  onDay: (v: string) => void; onMonth: (v: string) => void; onYear: (v: string) => void;
  bn: boolean;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, marginBottom: 6,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)' }}>{label}</div>
        {action}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <DateBox value={day}   onChange={onDay}   placeholder={bn ? 'দিন' : 'Day'}   max={31} />
        <DateBox value={month} onChange={onMonth} placeholder={bn ? 'মাস' : 'Month'} max={12} />
        <DateBox value={year}  onChange={onYear}  placeholder={bn ? 'বছর' : 'Year'}  max={9999} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, lineHeight: 1.5 }}>
        {hint ?? (bn ? 'দিন (১-৩১) | মাস (১-১২) | বছর' : 'Day (1-31) | Month (1-12) | Year')}
      </div>
    </div>
  );
}

function SectionCard({
  icon, title, children, accent = A,
}: {
  icon: React.ReactNode; title: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <div style={{
      marginTop: 14, background: 'var(--surface)',
      border: `1px solid var(--border)`, borderRadius: 14, overflow: 'hidden',
    }}>
      <div style={{
        background: `${accent}18`, borderBottom: `1px solid ${accent}30`,
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {icon}
        <span style={{ fontWeight: 800, fontSize: 13, color: accent }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function TimelineRow({
  label, date, color, note, last, bn, badge,
}: {
  label: string; date: Date; color: string; note?: string; last?: boolean; bn: boolean; badge?: string;
}) {
  return (
    <div style={{
      padding: '11px 14px',
      borderBottom: last ? 'none' : '1px solid var(--border)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color, fontWeight: 700 }}>{label}</span>
          {badge && (
            <span style={{
              background: `${color}22`, color, border: `1px solid ${color}55`,
              borderRadius: 5, padding: '1px 6px', fontSize: 9, fontWeight: 900,
            }}>{badge}</span>
          )}
        </div>
        {note && (
          <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5, marginTop: 3 }}>{note}</div>
        )}
      </div>
      <div style={{
        fontWeight: 800, fontSize: 13, color,
        fontFamily: 'monospace', flexShrink: 0, whiteSpace: 'nowrap',
      }}>
        {formatDate(date, bn)}
      </div>
    </div>
  );
}

/* ── main component ───────────────────────────────────────────── */

export default function MaternityCalc({ history, onAdd, onClear }: CalcProps) {
  const { lang } = useLang();
  const bn = lang === 'bn';

  const [tab, setTab] = useState<'benefit' | 'leave' | 'conditions'>('benefit');

  // Joining date
  const [joinDay,   setJoinDay]   = useState('');
  const [joinMonth, setJoinMonth] = useState('');
  const [joinYear,  setJoinYear]  = useState('');

  // Delivery date
  const [delivDay,   setDelivDay]   = useState('');
  const [delivMonth, setDelivMonth] = useState('');
  const [delivYear,  setDelivYear]  = useState('');

  // Notice date — user editable
  const [notDay,   setNotDay]   = useState('');
  const [notMonth, setNotMonth] = useState('');
  const [notYear,  setNotYear]  = useState('');

  const [monthlyWage,   setMonthlyWage]   = useState('');
  const [survivingKids, setSurvivingKids] = useState('0');
  const [noticePath,    setNoticePath]    = useState<NoticePath>('pre');
  const [openMethod,    setOpenMethod]    = useState<string | null>('a');
  const [result, setResult] = useState<Result | null>(null);

  const FN = (n: number) => {
    const s = Math.round(n).toLocaleString('en-BD');
    return '৳' + (bn ? toBnDigits(s) : s);
  };

  const setNoticeDate = (d: Date) => {
    setNotDay(String(d.getDate()).padStart(2, '0'));
    setNotMonth(String(d.getMonth() + 1).padStart(2, '0'));
    setNotYear(String(d.getFullYear()));
  };

  /** Statutory default notice date for a path. */
  const defaultNotice = (delivery: Date, path: NoticePath) =>
    path === 'pre' ? addDays(delivery, -PRE_DELIVERY_DAYS) : delivery;

  const fail = (msg: string) => setResult({ error: msg } as any);

  const calc = () => {
    if (!joinDay || !joinMonth || !joinYear || !delivDay || !delivMonth || !delivYear || !monthlyWage) {
      fail(bn ? 'সব তথ্য পূরণ করুন।' : 'Please fill in all fields.');
      return;
    }

    const joining  = buildDate(joinDay, joinMonth, joinYear);
    const delivery = buildDate(delivDay, delivMonth, delivYear);
    const wage     = parseFloat(monthlyWage);
    const kids     = parseInt(survivingKids, 10);

    if (!joining || !delivery || isNaN(wage) || wage <= 0) {
      fail(bn ? 'সঠিক তারিখ ও তথ্য দিন।' : 'Enter valid dates and values.');
      return;
    }
    if (joining.getTime() > delivery.getTime()) {
      fail(bn ? 'যোগদানের তারিখ প্রসবের তারিখের পরে হতে পারে না।' : 'Joining date cannot be after the delivery date.');
      return;
    }

    // Seed the notice date if the user hasn't set one yet
    if (!buildDate(notDay, notMonth, notYear)) setNoticeDate(defaultNotice(delivery, noticePath));

    const months = monthsBetween(joining, delivery);
    const base = { deliveryDate: delivery, serviceMonths: months };

    if (months < MIN_SERVICE_MONTHS) {
      setResult({ ...base, eligible: false, reason: 'service', totalBenefit: 0, firstInstallment: 0, secondInstallment: 0, avgDailyWage: 0 });
      setTab('benefit');
      return;
    }
    if (kids > MAX_SURVIVING_CHILDREN) {
      setResult({ ...base, eligible: false, reason: 'children', totalBenefit: 0, firstInstallment: 0, secondInstallment: 0, avgDailyWage: 0 });
      setTab('benefit');
      return;
    }

    const avgDailyWage      = wage / WAGE_DAYS_DIVISOR;
    const firstInstallment  = avgDailyWage * PRE_DELIVERY_DAYS;
    const secondInstallment = avgDailyWage * POST_DELIVERY_DAYS;

    setResult({
      ...base,
      eligible: true,
      totalBenefit: firstInstallment + secondInstallment,
      firstInstallment,
      secondInstallment,
      avgDailyWage,
    });

    onAdd('maternity', `${bn ? 'মোট সুবিধা' : 'Total benefit'}: ৳${(firstInstallment + secondInstallment).toFixed(0)}, ${TOTAL_DAYS} ${bn ? 'দিন' : 'days'}`);
  };

  /* Schedule is derived live from the notice date + path, so editing
     either updates the timeline without needing to recalculate. */
  const noticeDate = buildDate(notDay, notMonth, notYear);
  const sched = result?.eligible
    ? buildSchedule(result.deliveryDate, noticePath, noticeDate ?? defaultNotice(result.deliveryDate, noticePath))
    : null;

  const switchPath = (p: NoticePath) => {
    setNoticePath(p);
    if (result?.eligible) setNoticeDate(defaultNotice(result.deliveryDate, p));
  };

  const share = result?.eligible
    ? buildShare(bn ? 'মাতৃত্বকালীন সুবিধা' : 'Maternity Benefit', [
        `${bn ? 'প্রথম কিস্তি' : '1st installment'}: ${FN(result.firstInstallment)}`,
        `${bn ? 'দ্বিতীয় কিস্তি' : '2nd installment'}: ${FN(result.secondInstallment)}`,
        `${bn ? 'মোট টাকা' : 'Total Taka'}: ${FN(result.totalBenefit)}`,
        `${bn ? 'মোট ছুটি' : 'Total Leave'}: ${NUM(TOTAL_DAYS, bn)} ${bn ? 'দিন' : 'days'}`,
      ])
    : null;

  const TABS: { id: typeof tab; label: string; icon: React.ReactNode }[] = [
    { id: 'benefit',    label: bn ? 'সুবিধা'     : 'Benefit',      icon: <FaCoins size={11} /> },
    { id: 'leave',      label: bn ? 'ছুটির মেয়াদ' : 'Leave Period', icon: <FaCalendarAlt size={11} /> },
    { id: 'conditions', label: bn ? 'শর্তাবলী'    : 'Conditions',   icon: <FaClipboardList size={11} /> },
  ];

  const METHODS = [
    {
      id: 'a',
      title: bn ? 'পদ্ধতি (ক): ডাক্তারি সনদ পেশের মাধ্যমে' : 'Method (A): via doctor\'s certificate',
      desc:  bn ? 'নিবন্ধিত ডাক্তারের সনদের ভিত্তিতে দুই কিস্তিতে প্রদান।' : 'Paid in two installments on a registered doctor\'s certificate.',
      part1: bn ? 'ডাক্তার প্রসবের সম্ভাবনা জানালে ৩ কর্মদিবসের মধ্যে প্রসব-পূর্ব ৬০ দিনের অর্থ।' : 'Within 3 working days of the certificate: the pre-delivery 60 days.',
      part2: bn ? 'সন্তান প্রসবের প্রমাণ পেশের ৩ কর্মদিবসের মধ্যে অবশিষ্ট ৬০ দিনের অর্থ।' : 'Within 3 working days of birth proof: the remaining 60 days.',
    },
    {
      id: 'b',
      title: bn ? 'পদ্ধতি (খ): প্রমাণ পেশের পর দুই কিস্তিতে' : 'Method (B): two installments after proof',
      desc:  bn ? 'প্রসবের প্রমাণ পেশ সাপেক্ষে দুই কিস্তিতে পরিশোধ।' : 'Two installments, conditional on submitting birth proof.',
      part1: bn ? 'প্রসবের প্রমাণ পেশের ৩ কর্মদিবসের মধ্যে প্রসব-পূর্ব ৬০ দিনের অর্থ।' : 'Within 3 working days of birth proof: the pre-delivery 60 days.',
      part2: bn ? 'প্রমাণ পেশের পরবর্তী ৬০ দিনের মধ্যে অবশিষ্ট ৬০ দিনের অর্থ।' : 'Within the following 60 days: the remaining 60 days.',
    },
    {
      id: 'c',
      title: bn ? 'পদ্ধতি (গ): প্রমাণ পেশের পর এককালীন' : 'Method (C): single lump sum after proof',
      desc:  bn ? 'এক সাথে পুরো সুবিধার অর্থ প্রদান।' : 'The entire benefit paid at once.',
      part1: '—',
      part2: bn ? 'প্রমাণ পেশের ৩ কর্মদিবসের মধ্যে সম্পূর্ণ ১২০ দিনের অর্থ একসাথে।' : 'Within 3 working days of proof: the full 120 days together.',
    },
    {
      id: 'd',
      title: bn ? 'পদ্ধতি (ঘ): পূর্ব নোটিশ ছাড়া প্রসবের ক্ষেত্রে' : 'Method (D): delivery without prior notice',
      desc:  bn ? 'নোটিশ না দিয়ে প্রসব হলে পরবর্তী আবেদন সাপেক্ষে সুবিধা।' : 'Where birth occurred without notice, subject to later application.',
      part1: '—',
      part2: bn ? 'প্রমাণ পেশের ৩ কর্মদিবসের মধ্যে সম্পূর্ণ সুবিধা ও প্রসব-পরবর্তী ৬০ দিনের ছুটি।' : 'Within 3 working days of proof: the full benefit plus 60 days post-delivery leave.',
    },
  ];

  return (
    <CalcShell
      accent={A}
      onCalc={calc}
      calcLabel={bn ? 'হিসাব করুন' : 'Calculate'}
      hasResult={!!(result?.eligible)}
      onShare={() => share && shareWA(share)}
      history={history}
      onClear={() => onClear?.('maternity')}
      historyLabel={bn ? 'ইতিহাস' : 'History'}
      clearLabel={bn ? 'মুছুন' : 'Clear'}
    >
      {/* ── Tab bar ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 4, padding: 4, marginBottom: 14,
        background: 'var(--surface2)', border: `1px solid var(--border)`, borderRadius: 12,
      }}>
        {TABS.map(t => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, minWidth: 0, padding: '9px 4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                background: on ? A : 'transparent',
                color: on ? '#fff' : 'var(--text2)',
                border: 'none', borderRadius: 9,
                fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: on ? `0 2px 8px ${A}40` : 'none',
              }}
            >
              {t.icon}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════ TAB 1 — BENEFIT ══════════════════ */}
      {tab === 'benefit' && (
        <>
          <div style={{
            background: `${A}15`, border: `1px solid ${A}35`, borderRadius: 12,
            padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <FaInfoCircle size={15} color={A} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 11, color: A, lineHeight: 1.55 }}>
              {bn ? (
                <>
                  <strong>বাংলাদেশ শ্রম আইন ২০০৬ — ধারা ৪৬ ও ৪৮</strong><br />
                  প্রসবের পূর্বে ৬০ দিন ও পরে ৬০ দিন — মোট ১২০ দিনের প্রসূতি কল্যাণ সুবিধা।
                  দৈনিক মজুরি = মাসিক মজুরি ÷ ২৬।
                </>
              ) : (
                <>
                  <strong>Bangladesh Labour Act 2006 — Sec 46 &amp; 48</strong><br />
                  60 days before and 60 days after delivery — 120 days of maternity benefit in total.
                  Daily wage = monthly wage ÷ 26.
                </>
              )}
            </div>
          </div>

          <DateFieldGroup
            label={bn ? 'এই নিয়োগকর্তার অধীনে যোগদানের তারিখ' : 'Joining date under this employer'}
            day={joinDay} month={joinMonth} year={joinYear}
            onDay={setJoinDay} onMonth={setJoinMonth} onYear={setJoinYear}
            bn={bn}
          />

          <DateFieldGroup
            label={bn ? 'প্রসবের তারিখ (বা প্রত্যাশিত তারিখ)' : 'Delivery date (or expected date)'}
            day={delivDay} month={delivMonth} year={delivYear}
            onDay={setDelivDay} onMonth={setDelivMonth} onYear={setDelivYear}
            bn={bn}
          />

          <FloatInput
            label={bn ? 'মাসিক মজুরি (BDT)' : 'Monthly wage (BDT)'}
            accent={A} type="number" placeholder="15000"
            value={monthlyWage}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMonthlyWage(e.target.value)}
            hint={bn ? 'দৈনিক মজুরি = মাসিক মজুরি ÷ ২৬ (ধারা ৪৮)' : 'Daily wage = monthly wage ÷ 26 (Sec 48)'}
          />

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>
              {bn ? 'বর্তমানে জীবিত সন্তানের সংখ্যা (প্রসবের আগে)' : 'Number of surviving children (before this delivery)'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {['0', '1', '2', '3+'].map(v => {
                const val = v === '3+' ? '3' : v;
                const on = survivingKids === val;
                return (
                  <button
                    key={v}
                    onClick={() => setSurvivingKids(val)}
                    style={{
                      padding: '12px 6px',
                      background: on ? A : 'var(--surface)',
                      color:      on ? '#fff' : 'var(--text2)',
                      border:     `1.5px solid ${on ? A : 'var(--border)'}`,
                      borderRadius: 10, fontWeight: 700, fontSize: 14,
                      fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >{bn ? toBnDigits(v) : v}</button>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
              {bn
                ? '* ২ বা তার বেশি জীবিত সন্তান থাকলে আর্থিক সুবিধা প্রযোজ্য নয় (ধারা ৪৬-২)'
                : '* No cash benefit if 2 or more surviving children (Sec 46-2)'}
            </div>
          </div>

          {result && (result as any).error && (
            <div style={{ color: '#ef4444', fontSize: 14, fontWeight: 600, marginTop: 10 }}>
              ⚠️ {(result as any).error}
            </div>
          )}

          {result && !result.eligible && !((result as any).error) && (
            <div style={{
              background: '#2a0a0a', border: '2px solid #7f1d1d',
              borderRadius: 14, padding: 16, marginTop: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <FaTimesCircle color="#ef4444" size={20} />
                <span style={{ fontSize: 15, fontWeight: 800, color: '#fca5a5' }}>
                  {bn ? 'আর্থিক সুবিধার যোগ্য নন' : 'Not eligible for cash benefit'}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#fca5a5', lineHeight: 1.7 }}>
                {result.reason === 'service'
                  ? (bn
                      ? `যোগদানের তারিখ অনুযায়ী প্রসবের আগ পর্যন্ত আপনার চাকরির মেয়াদ ${toBnDigits(String(result.serviceMonths))} মাস। সুবিধা পেতে কমপক্ষে ৬ মাস আবশ্যক। (ধারা ৪৬-১)`
                      : `Based on the joining date, your service before delivery is ${result.serviceMonths} month(s). At least 6 months is required. (Sec 46-1)`)
                  : (bn
                      ? 'প্রসবের সময় ২ বা তার বেশি জীবিত সন্তান থাকলে আর্থিক সুবিধা প্রযোজ্য নয়, তবে প্রাপ্য ছুটি ভোগ করা যাবে। (ধারা ৪৬-২)'
                      : 'No cash benefit is payable when 2 or more children already survive at the time of delivery, though any leave due may still be taken. (Sec 46-2)')}
              </div>
            </div>
          )}

          {result?.eligible && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
                background: '#0a2818', border: '2px solid #166534',
                borderRadius: 12, padding: '12px 16px',
              }}>
                <FaCheckCircle color="#4ade80" size={20} />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>
                  {bn ? 'প্রসূতি কল্যাণ সুবিধার যোগ্য ✓' : 'Eligible for maternity benefit ✓'}
                </span>
              </div>

              <ResultCard accent={A}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4 }}>
                    {bn ? 'মোট প্রসূতি কল্যাণ সুবিধা' : 'Total Maternity Benefit'}
                  </div>
                  <div style={{ fontSize: 'clamp(28px, 8vw, 40px)', fontWeight: 900, color: A, lineHeight: 1.1 }}>
                    {FN(result.totalBenefit)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                    {bn
                      ? `মোট ${toBnDigits(String(TOTAL_DAYS))} দিনের জন্য`
                      : `For ${TOTAL_DAYS} days total`}
                  </div>
                </div>

                <StatGrid
                  items={[
                    [bn ? 'দৈনিক মজুরি'   : 'Daily wage',          `৳${bn ? toBnDigits(result.avgDailyWage.toFixed(2)) : result.avgDailyWage.toFixed(2)}`, A],
                    [bn ? 'প্রথম কিস্তি'   : 'First installment',   FN(result.firstInstallment),  '#3b82f6'],
                    [bn ? 'দ্বিতীয় কিস্তি' : 'Second installment',  FN(result.secondInstallment), '#10b981'],
                    [bn ? 'মোট ছুটি'      : 'Total leave',         `${NUM(TOTAL_DAYS, bn)} ${bn ? 'দিন' : 'days'}`, A],
                  ]}
                  cols={2}
                />
              </ResultCard>

              <div style={{
                marginTop: 12, padding: '10px 14px',
                background: 'var(--surface2)', border: `1px solid var(--border)`,
                borderRadius: 12, fontSize: 11, color: 'var(--text3)', lineHeight: 1.6,
              }}>
                {bn
                  ? 'প্রতিটি কিস্তি = দৈনিক মজুরি × ৬০ দিন। নোটিশের তারিখ ও ছুটির পূর্ণ সময়সূচি "ছুটির মেয়াদ" ট্যাবে সম্পাদনা করা যাবে।'
                  : 'Each installment = daily wage × 60 days. The notice date and the full leave schedule can be adjusted on the Leave Period tab.'}
              </div>
            </>
          )}
        </>
      )}

      {/* ══════════════════ TAB 2 — LEAVE PERIOD ══════════════════ */}
      {tab === 'leave' && (
        <>
          {!result?.eligible || !sched ? (
            <div style={{
              background: 'var(--surface)', border: `1px dashed var(--border)`,
              borderRadius: 14, padding: '22px 16px', textAlign: 'center',
            }}>
              <FaCalendarAlt size={26} color={A} style={{ opacity: 0.55, marginBottom: 10 }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>
                {bn ? 'আগে সুবিধা হিসাব করুন' : 'Calculate the benefit first'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
                {bn
                  ? '"সুবিধা" ট্যাবে তারিখ ও মজুরি দিয়ে হিসাব করলে এখানে ছুটির পূর্ণ সময়সূচি দেখা যাবে।'
                  : 'Enter the dates and wage on the Benefit tab, and the full leave schedule will appear here.'}
              </div>
            </div>
          ) : (
            <>
              {/* Notice path selector */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>
                  {bn ? 'নোটিশ প্রদানের পথ (ধারা ৪৭)' : 'Notice path (Sec 47)'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {([
                    { id: 'pre'  as NoticePath, t: bn ? 'প্রসবের পূর্বে নোটিশ' : 'Notice before birth', s: bn ? 'প্রসবের দিন ১ম ৬০ দিনে গণ্য' : 'Delivery day falls in the 1st 60 days' },
                    { id: 'post' as NoticePath, t: bn ? 'প্রসবের পরে নোটিশ'  : 'Notice after birth',  s: bn ? 'প্রসবের দিন ২য় ৬০ দিনে গণ্য' : 'Delivery day opens the 2nd 60 days' },
                  ]).map(o => {
                    const on = noticePath === o.id;
                    return (
                      <button
                        key={o.id}
                        onClick={() => switchPath(o.id)}
                        style={{
                          padding: '11px 10px', textAlign: 'left',
                          background: on ? `${A}1f` : 'var(--surface)',
                          border: `1.5px solid ${on ? A : 'var(--border)'}`,
                          borderRadius: 11, cursor: 'pointer',
                          fontFamily: 'inherit', transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 800, color: on ? A : 'var(--text2)', marginBottom: 3 }}>
                          {o.t}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.45 }}>{o.s}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editable notice date */}
              <DateFieldGroup
                label={bn ? 'নোটিশ প্রদানের তারিখ' : 'Notice date'}
                day={notDay} month={notMonth} year={notYear}
                onDay={setNotDay} onMonth={setNotMonth} onYear={setNotYear}
                bn={bn}
                hint={noticePath === 'pre'
                  ? (bn
                      ? 'ছুটি গণনা শুরু হবে নোটিশের পরের দিন থেকে। আইনানুগ তারিখ: প্রত্যাশিত প্রসবের ৬০ দিন পূর্বে।'
                      : 'Leave is counted from the day after the notice. Statutory date: 60 days before the expected delivery.')
                  : (bn
                      ? 'প্রসবের ৭ দিনের মধ্যে নোটিশ দিতে হবে। ছুটির ২য় ৬০ দিন প্রসবের দিন থেকে শুরু।'
                      : 'Notice must be served within 7 days of the birth. The 2nd 60-day block starts on the delivery day.')}
                action={
                  <button
                    onClick={() => setNoticeDate(defaultNotice(result.deliveryDate, noticePath))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: `${A}18`, color: A, border: `1px solid ${A}40`,
                      borderRadius: 8, padding: '4px 9px', cursor: 'pointer',
                      fontSize: 10.5, fontWeight: 800, fontFamily: 'inherit', flexShrink: 0,
                    }}
                  >
                    <FaMagic size={9} />
                    {bn ? 'আইনানুগ তারিখ' : 'Statutory date'}
                  </button>
                }
              />

              {/* Validity notices */}
              {noticePath === 'pre' && sched.deliveryInBlock !== 1 && (
                <div style={{
                  marginBottom: 14, background: '#2a1c05', border: '1px solid #92400e',
                  borderRadius: 12, padding: '11px 13px', display: 'flex', gap: 9, alignItems: 'flex-start',
                }}>
                  <FaExclamationTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 11.5, color: '#fde68a', lineHeight: 1.6 }}>
                    {bn
                      ? 'এই নোটিশের তারিখে প্রসবের দিনটি প্রথম ৬০ দিনের মধ্যে পড়ছে না। "আইনানুগ তারিখ" চাপলে সঠিক তারিখ বসে যাবে।'
                      : 'With this notice date the delivery day does not fall inside the first 60-day block. Tap "Statutory date" to snap it back.'}
                  </div>
                </div>
              )}
              {noticePath === 'post' && sched.noticeLate && (
                <div style={{
                  marginBottom: 14, background: '#2a0a0a', border: '1px solid #7f1d1d',
                  borderRadius: 12, padding: '11px 13px', display: 'flex', gap: 9, alignItems: 'flex-start',
                }}>
                  <FaExclamationTriangle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 11.5, color: '#fecaca', lineHeight: 1.6 }}>
                    {bn
                      ? `নোটিশ প্রসবের ৭ দিনের পরে দেওয়া হয়েছে। আইনানুগ শেষ দিন ছিল ${formatDate(sched.noticeDeadline!, bn)}।`
                      : `The notice falls later than 7 days after the birth. The lawful deadline was ${formatDate(sched.noticeDeadline!, bn)}.`}
                  </div>
                </div>
              )}

              {/* Total leave summary */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 2,
              }}>
                {[
                  { l: bn ? '১ম ৬০ দিন' : '1st 60 days', v: NUM(PRE_DELIVERY_DAYS, bn),  c: '#3b82f6' },
                  { l: bn ? '২য় ৬০ দিন' : '2nd 60 days', v: NUM(POST_DELIVERY_DAYS, bn), c: '#10b981' },
                  { l: bn ? 'মোট ছুটি'   : 'Total leave', v: NUM(TOTAL_DAYS, bn),         c: A },
                ].map((s, i) => (
                  <div key={i} style={{
                    background: 'var(--surface)', border: `1px solid ${s.c}40`,
                    borderRadius: 11, padding: '10px 8px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 17, fontWeight: 900, color: s.c, lineHeight: 1.2 }}>{s.v}</div>
                    <div style={{ fontSize: 9.5, color: 'var(--text3)', fontWeight: 700, marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              <SectionCard icon={<FaCalendarAlt size={14} color={A} />} title={bn ? 'ছুটির সময়সূচি' : 'Leave Schedule'}>
                <TimelineRow
                  bn={bn} color="#a78bfa"
                  label={bn ? 'নোটিশ প্রদানের তারিখ' : 'Notice date'}
                  note={noticePath === 'pre'
                    ? (bn ? 'ছুটির গণনা পরের দিন থেকে শুরু' : 'The leave count starts the following day')
                    : (bn ? `শেষ দিন: ${formatDate(sched.noticeDeadline!, bn)} (প্রসবের ৭ দিনের মধ্যে)` : `Deadline: ${formatDate(sched.noticeDeadline!, bn)} (within 7 days of birth)`)}
                  date={sched.noticeDate}
                />
                <TimelineRow
                  bn={bn} color="#3b82f6"
                  badge={bn ? '১ম ৬০ দিন' : '1st 60'}
                  label={bn ? 'প্রথম ৬০ দিন শুরু' : 'First 60 days begin'}
                  note={bn ? 'প্রথম কিস্তির মেয়াদ' : 'Period covered by the 1st installment'}
                  date={sched.block1Start}
                />
                {noticePath === 'pre' ? (
                  <>
                    <TimelineRow
                      bn={bn} color={A}
                      badge={bn ? '১ম ৬০ দিনে' : 'in 1st 60'}
                      label={bn ? 'প্রত্যাশিত প্রসবের তারিখ' : 'Expected delivery date'}
                      note={bn
                        ? `প্রথম ৬০ দিনের ${toBnDigits(String(daysBetween(sched.block1Start, result.deliveryDate) + 1))} তম দিন`
                        : `Day ${daysBetween(sched.block1Start, result.deliveryDate) + 1} of the first 60`}
                      date={result.deliveryDate}
                    />
                    <TimelineRow
                      bn={bn} color="#3b82f6"
                      label={bn ? 'প্রথম ৬০ দিন শেষ' : 'First 60 days end'}
                      date={sched.block1End}
                    />
                    <TimelineRow
                      bn={bn} color="#10b981"
                      badge={bn ? '২য় ৬০ দিন' : '2nd 60'}
                      label={bn ? 'দ্বিতীয় ৬০ দিন শুরু' : 'Second 60 days begin'}
                      note={bn ? 'দ্বিতীয় কিস্তির মেয়াদ' : 'Period covered by the 2nd installment'}
                      date={sched.block2Start}
                    />
                  </>
                ) : (
                  <>
                    <TimelineRow
                      bn={bn} color="#3b82f6"
                      label={bn ? 'প্রথম ৬০ দিন শেষ' : 'First 60 days end'}
                      note={bn ? 'প্রসবের ঠিক পূর্ববর্তী দিন' : 'The day immediately before delivery'}
                      date={sched.block1End}
                    />
                    <TimelineRow
                      bn={bn} color={A}
                      badge={bn ? '২য় ৬০ দিনে' : 'in 2nd 60'}
                      label={bn ? 'সন্তান প্রসবের তারিখ' : 'Date of delivery'}
                      note={bn ? 'দ্বিতীয় ৬০ দিনের প্রথম দিন' : 'The first day of the second 60-day block'}
                      date={result.deliveryDate}
                    />
                  </>
                )}
                <TimelineRow
                  bn={bn} color="#10b981"
                  label={bn ? 'ছুটি শেষ' : 'Leave ends'}
                  note={bn ? `মোট ${toBnDigits(String(TOTAL_DAYS))} দিন পূর্ণ` : `Completing all ${TOTAL_DAYS} days`}
                  date={sched.block2End}
                />
                <TimelineRow
                  bn={bn} color="#f59e0b" last
                  label={bn ? 'প্রসবের প্রমাণ পেশের শেষ দিন' : 'Deadline for proof of birth'}
                  note={bn ? 'প্রসবের ৩ মাসের মধ্যে (ধারা ৪৭-৪)' : 'Within 3 months of birth (Sec 47-4)'}
                  date={sched.proofDeadline}
                />
              </SectionCard>

              {/* Proof deadline warning */}
              <div style={{
                marginTop: 14, background: '#2a1c05', border: '1px solid #92400e',
                borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <FaExclamationTriangle size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 12, color: '#fbbf24', marginBottom: 5 }}>
                    {bn ? 'জরুরি সময়সীমা (ধারা ৪৭-৪)' : 'Critical deadline (Sec 47-4)'}
                  </div>
                  <div style={{ fontSize: 12, color: '#fde68a', lineHeight: 1.65 }}>
                    {bn
                      ? `সন্তান প্রসবের ৩ মাসের মধ্যে প্রমাণপত্র পেশ করতে হবে — অর্থাৎ ${formatDate(sched.proofDeadline, bn)} তারিখের মধ্যে। সময়সীমা অতিক্রম করলে সুবিধার অধিকার বাতিল হয়ে যাবে।`
                      : `Proof of birth must be submitted within 3 months of delivery — that is, by ${formatDate(sched.proofDeadline, bn)}. Missing this deadline forfeits the right to the benefit entirely.`}
                  </div>
                </div>
              </div>

              {/* Payment methods */}
              <SectionCard icon={<FaMoneyBillWave size={14} color={A} />} title={bn ? 'পরিশোধ পদ্ধতি (ধারা ৪৭)' : 'Payment Methods (Sec 47)'}>
                {METHODS.map((m, i) => {
                  const open = openMethod === m.id;
                  return (
                    <div key={m.id} style={{ borderBottom: i < METHODS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <button
                        onClick={() => setOpenMethod(open ? null : m.id)}
                        style={{
                          width: '100%', padding: '12px 14px', textAlign: 'left',
                          background: open ? 'var(--surface2)' : 'transparent',
                          border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', gap: 10,
                        }}
                      >
                        <div style={{
                          width: 26, height: 26, flexShrink: 0, borderRadius: 7,
                          background: `${A}20`, border: `1px solid ${A}45`, color: A,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 900,
                        }}>
                          {m.id.toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', lineHeight: 1.4 }}>{m.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, lineHeight: 1.45 }}>{m.desc}</div>
                        </div>
                        {open
                          ? <FaChevronUp size={12} color="var(--text3)" style={{ flexShrink: 0 }} />
                          : <FaChevronDown size={12} color="var(--text3)" style={{ flexShrink: 0 }} />}
                      </button>

                      {open && (
                        <div style={{ padding: '0 14px 12px', display: 'grid', gap: 8 }}>
                          <div style={{
                            background: 'var(--surface2)', border: '1px solid #1e3a8a55',
                            borderRadius: 9, padding: '9px 11px',
                          }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: '#60a5fa', marginBottom: 4 }}>
                              {bn ? '১ম কিস্তি / ধাপ' : '1st installment / stage'}
                              {m.part1 !== '—' && ` — ${FN(result.firstInstallment)}`}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--text2)', lineHeight: 1.6 }}>{m.part1}</div>
                          </div>
                          <div style={{
                            background: 'var(--surface2)', border: '1px solid #14532d55',
                            borderRadius: 9, padding: '9px 11px',
                          }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: '#4ade80', marginBottom: 4 }}>
                              {bn ? '২য় কিস্তি / চূড়ান্ত ধাপ' : '2nd installment / final stage'}
                              {' — '}
                              {m.part1 === '—' ? FN(result.totalBenefit) : FN(result.secondInstallment)}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--text2)', lineHeight: 1.6 }}>{m.part2}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </SectionCard>
            </>
          )}
        </>
      )}

      {/* ══════════════════ TAB 3 — CONDITIONS ══════════════════ */}
      {tab === 'conditions' && (
        <>
          <SectionCard icon={<FaUserCheck size={14} color={A} />} title={bn ? 'যোগ্যতা যাচাই (ধারা ৪৬)' : 'Eligibility checks (Sec 46)'}>
            {[
              {
                t: bn ? 'চাকরির মেয়াদ' : 'Length of service',
                d: bn ? 'সন্তান প্রসবের পূর্বে একই প্রতিষ্ঠানের অধীনে ন্যূনতম ৬ মাস কাজ করা আবশ্যক।'
                      : 'At least 6 months of work under the same employer immediately before delivery.',
                ok: result ? result.serviceMonths >= MIN_SERVICE_MONTHS : null,
                v: result
                  ? (bn ? `আপনার মেয়াদ: ${toBnDigits(String(result.serviceMonths))} মাস` : `Your service: ${result.serviceMonths} month(s)`)
                  : undefined,
              },
              {
                t: bn ? 'জীবিত সন্তানের সংখ্যা' : 'Surviving children',
                d: bn ? 'প্রসবের সময় ২ বা তার বেশি সন্তান জীবিত থাকলে আর্থিক সুবিধা প্রদেয় নয়।'
                      : 'No cash benefit is payable if 2 or more children are already living at the time of delivery.',
                ok: parseInt(survivingKids, 10) <= MAX_SURVIVING_CHILDREN,
                v: bn ? `নির্বাচিত: ${toBnDigits(survivingKids)}` : `Selected: ${survivingKids}`,
              },
              {
                t: bn ? 'প্রসবের প্রমাণ' : 'Proof of birth',
                d: bn ? 'প্রসবের ৩ মাসের মধ্যে হাসপাতালের ছাড়পত্র বা সনদ পেশ করতে হবে, অন্যথায় অধিকার বাতিল।'
                      : 'Hospital discharge or certificate must be submitted within 3 months of birth, or the right lapses.',
                ok: null,
              },
            ].map((row, i, arr) => (
              <div key={i} style={{
                padding: '12px 14px',
                borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  {row.ok === null
                    ? <FaInfoCircle size={14} color="#f59e0b" />
                    : row.ok
                      ? <FaCheckCircle size={14} color="#4ade80" />
                      : <FaTimesCircle size={14} color="#ef4444" />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text)', marginBottom: 3 }}>{row.t}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text3)', lineHeight: 1.6 }}>{row.d}</div>
                  {row.v && (
                    <div style={{
                      display: 'inline-block', marginTop: 6, padding: '2px 8px',
                      background: 'var(--surface2)', border: `1px solid var(--border)`,
                      borderRadius: 6, fontSize: 10.5, fontWeight: 700, color: 'var(--text2)',
                    }}>{row.v}</div>
                  )}
                </div>
              </div>
            ))}
          </SectionCard>

          <div style={{
            marginTop: 14, background: '#2a0a0a', border: '1px solid #7f1d1d',
            borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <FaTimesCircle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 12, color: '#fca5a5', marginBottom: 5 }}>
                {bn ? 'ব্যতিক্রমসমূহ' : 'Exceptions'}
              </div>
              <div style={{ fontSize: 12, color: '#fecaca', lineHeight: 1.65 }}>
                {bn
                  ? '২ বা ততোধিক সন্তান জীবিত থাকলে কোনো আর্থিক প্রসূতি সুবিধা পাওয়া যাবে না — তবে অর্জিত বা সাধারণ ছুটি পাইবার অধিকারী হইলে তাহা ভোগ করা যাবে। (ধারা ৪৬-২)'
                  : 'With 2 or more surviving children no cash maternity benefit is payable — but any earned or ordinary leave she is entitled to may still be taken. (Sec 46-2)'}
              </div>
            </div>
          </div>

          <SectionCard icon={<FaCalendarAlt size={14} color={A} />} title={bn ? 'নোটিশ প্রদানের নিয়ম (ধারা ৪৭)' : 'Notice obligations (Sec 47)'}>
            {[
              {
                tag: bn ? 'পথ ১' : 'Path 1',
                t: bn ? 'প্রসবের পূর্বে নোটিশ' : 'Notice before delivery',
                d: bn ? 'প্রত্যাশিত প্রসবের ৬০ দিন পূর্বে নিয়োগকর্তাকে নোটিশ দিতে হবে। নোটিশের পরের দিন থেকে ছুটির গণনা শুরু এবং প্রসবের দিনটি প্রথম ৬০ দিনের মধ্যে গণ্য হয়।'
                      : 'Serve notice on the employer 60 days before the expected delivery. The leave is counted from the day after the notice, and the delivery day falls inside the first 60-day block.',
                c: '#3b82f6',
              },
              {
                tag: bn ? 'পথ ২' : 'Path 2',
                t: bn ? 'প্রসবের পরে নোটিশ' : 'Notice after delivery',
                d: bn ? 'পূর্বে নোটিশ না দিলে সন্তান প্রসবের ৭ দিনের মধ্যে নোটিশ দিতে হবে। প্রসবের দিনটি দ্বিতীয় ৬০ দিনের প্রথম দিন হিসেবে গণ্য হয়।'
                      : 'If no prior notice was given, serve it within 7 days of the birth. The delivery day counts as the first day of the second 60-day block.',
                c: '#a78bfa',
              },
            ].map((row, i, arr) => (
              <div key={i} style={{
                padding: '12px 14px',
                borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{
                    background: `${row.c}22`, color: row.c, border: `1px solid ${row.c}55`,
                    borderRadius: 5, padding: '2px 7px', fontSize: 9.5, fontWeight: 900,
                    letterSpacing: 0.4, textTransform: 'uppercase',
                  }}>{row.tag}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text)' }}>{row.t}</span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text3)', lineHeight: 1.65 }}>{row.d}</div>
              </div>
            ))}
          </SectionCard>

          <div style={{
            marginTop: 14, background: '#1a0a05', border: '1px solid #7c2d12',
            borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <FaShieldAlt size={15} color="#fb923c" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 12, color: '#fb923c', marginBottom: 5 }}>
                {bn ? 'চাকরি সুরক্ষা (ধারা ৫০)' : 'Job Protection (Sec 50)'}
              </div>
              <div style={{ fontSize: 12, color: '#fed7aa', lineHeight: 1.65 }}>
                {bn
                  ? 'প্রসবের পূর্ববর্তী ৬ মাস ও পরবর্তী ৬০ দিনের মধ্যে যুক্তিসংগত কারণ ছাড়া ডিসচার্জ, বরখাস্ত বা অপসারণ অথবা চাকুরী অন্যভাবে অবসানের কোন নোটিশ বা আদেশ প্রদান করা হলেও প্রসূতি কল্যাণ সুবিধা প্রদান বাধ্যতামূলক।'
                  : 'Payment of maternity benefits is mandatory even if a notice or order of discharge, dismissal, removal, or termination of employment by any other means is issued — without reasonable cause — during the six months preceding childbirth or the sixty days following it.'}
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 14, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start',
            background: 'var(--surface2)', border: `1px solid var(--border)`, borderRadius: 12,
          }}>
            <FaBaby size={12} color={A} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
              {bn
                ? 'এই হিসাব বাংলাদেশ শ্রম আইন ২০০৬-এর ধারা ৪৬, ৪৭, ৪৮ ও ৫০-এর ভিত্তিতে আনুমানিক। প্রতিষ্ঠানের নিজস্ব নীতি বা সংশোধনীর কারণে প্রকৃত হিসাব ভিন্ন হতে পারে — প্রয়োজনে শ্রম আইন বিশেষজ্ঞের পরামর্শ নিন।'
                : 'This is an estimate based on Sections 46, 47, 48 and 50 of the Bangladesh Labour Act 2006. Company policy or amendments may change the actual figures — consult a labour law specialist where it matters.'}
            </div>
          </div>
        </>
      )}
    </CalcShell>
  );
}