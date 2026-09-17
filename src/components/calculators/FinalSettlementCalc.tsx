import { useState } from 'react';
import {
  FaBriefcase, FaCheckCircle, FaTimesCircle, FaInfoCircle, FaCalendarAlt,
  FaMoneyBillWave, FaChevronDown, FaChevronUp, FaUserTie, FaCoins,
  FaClipboardList, FaFileInvoiceDollar,
} from 'react-icons/fa';
import { FloatInput, ResultCard, StatGrid } from '../ui';
import type { CalcProps } from '../../utils/constants.ts';
import CalcShell from '../CalcShell';
import { useLang } from '../../context/LangContext.tsx';
import { shareWA, buildShare } from '../../utils/share.ts';

const A = '#0d9488';

/* ──────────────────────────────────────────────────────────────
   Bangladesh Labour Act 2006 — final settlement constants
   Basic = (gross − allowances) / 1.5 ; House rent = 50% of basic
   Daily basic = basic / 30 ; Daily gross = gross / 30
   Overtime hourly rate = (basic / 208) × 2
   Gratuity: 30 days/year (≤10 yrs), 45 days/year (>10 yrs) — Sec 2(10)
   ────────────────────────────────────────────────────────────── */
const BASIC_DIVISOR       = 1.5;
const HOUSE_RENT_PCT      = 0.5;
const OT_HOURS_PER_MONTH  = 208;
const OT_MULTIPLIER       = 2;
const DEFAULT_FOOD        = 1250;
const DEFAULT_MEDICAL     = 750;
const DEFAULT_TRANSPORT   = 450;

type TermType =
  | 'resign' | 'resign_absent' | 'retire'
  | 'death_natural' | 'death_accident'
  | 'discharge' | 'dismiss' | 'dismiss_severe' | 'removal'
  | 'termination' | 'retrench' | 'layoff' | '';

interface TermOption { id: TermType; label: { bn: string; en: string }; sec: string }

const TERM_OPTIONS: TermOption[] = [
  { id: 'resign',          label: { bn: 'ইস্তফা',                          en: 'Resignation' },                    sec: '২৭' },
  { id: 'resign_absent',   label: { bn: 'অনুপস্থিতির কারণে ইস্তফা',         en: 'Resignation (via absence)' },      sec: '২৭' },
  { id: 'retire',          label: { bn: 'অবসর',                            en: 'Retirement' },                     sec: '২৮' },
  { id: 'death_natural',   label: { bn: 'স্বাভাবিক মৃত্যু (কর্মরত অবস্থায়)', en: 'Natural death (in service)' },     sec: '১৯' },
  { id: 'death_accident',  label: { bn: 'দুর্ঘটনাজনিত মৃত্যু (কর্মকালীন)',   en: 'Accidental death (on duty)' },     sec: '১৯' },
  { id: 'discharge',       label: { bn: 'ডিসচার্জ',                        en: 'Discharge' },                      sec: '২২' },
  { id: 'dismiss',         label: { bn: 'বরখাস্ত',                         en: 'Dismissal' },                      sec: '২৩' },
  { id: 'dismiss_severe',  label: { bn: 'বরখাস্ত (গুরুতর অসদাচরণ)',        en: 'Dismissal (grave misconduct)' },   sec: '২৩.৪' },
  { id: 'removal',         label: { bn: 'অপসারণ',                          en: 'Removal (extenuating cause)' },    sec: '২৩.৩' },
  { id: 'termination',     label: { bn: 'চাকুরী অবসান',                    en: 'Termination by notice' },          sec: '২৬' },
  { id: 'retrench',        label: { bn: 'ছাঁটাই',                          en: 'Retrenchment' },                   sec: '২০' },
  { id: 'layoff',          label: { bn: 'লে-অফ',                          en: 'Lay-off' },                        sec: '১৬' },
];

const RESIGNATION_TYPES: TermType[] = ['resign', 'resign_absent'];
const THIRTY_DAYS_TYPES:  TermType[] = ['retire', 'termination', 'discharge', 'retrench'];
const FIFTEEN_DAYS_TYPES: TermType[] = ['removal'];
const ZERO_DAYS_TYPES:    TermType[] = ['dismiss', 'dismiss_severe', 'layoff'];
const DEATH_TYPES:        TermType[] = ['death_natural', 'death_accident'];
const NOTICE_PAY_TYPES:   TermType[] = ['termination', 'retrench'];
const NOTICE_DEDUCT_TYPES: TermType[] = RESIGNATION_TYPES;
const GRATUITY_NOT_ELIGIBLE: TermType[] = ['dismiss', 'dismiss_severe', 'layoff', ''];

const isGratuityEligible = (t: TermType) => !GRATUITY_NOT_ELIGIBLE.includes(t);

/* ── date / number helpers ────────────────────────────────────── */

const toBnDigits = (s: string) => s.replace(/[0-9]/g, n => '০১২৩৪৫৬৭৮৯'[+n]);
const NUM = (n: number | string, bn: boolean) => (bn ? toBnDigits(String(n)) : String(n));

function buildDate(dayStr: string, monthStr: string, yearStr: string): Date | null {
  if (!dayStr || !monthStr || !yearStr) return null;
  const day = parseInt(dayStr, 10), month = parseInt(monthStr, 10), year = parseInt(yearStr, 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1000) return null;
  const date = new Date(year, month - 1, day);
  if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) return null;
  return date;
}

function formatDate(date: Date, bn: boolean): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear().toString();
  const out = `${d}/${m}/${y}`;
  return bn ? toBnDigits(out) : out;
}

/** Years / months / days of continuous service between two dates. */
function serviceDuration(start: Date, end: Date): { years: number; months: number; days: number } {
  if (end < start) return { years: 0, months: 0, days: 0 };
  let years  = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days   = end.getDate() - start.getDate();
  if (days < 0) { months--; days += new Date(end.getFullYear(), end.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }
  return { years, months, days };
}

const MONTH_DAYS_BN: Record<string, number | ((y: number) => number)> = {
  'জানুয়ারি': 31,
  'ফেব্রুয়ারি': (y: number) => (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28),
  'মার্চ': 31, 'এপ্রিল': 30, 'মে': 31, 'জুন': 30, 'জুলাই': 31,
  'আগস্ট': 31, 'সেপ্টেম্বর': 30, 'অক্টোবর': 31, 'নভেম্বর': 30, 'ডিসেম্বর': 31,
};
const BN_MONTHS = Object.keys(MONTH_DAYS_BN);

function calendarDaysInMonth(monthIndex: number, year: number): number {
  const v = MONTH_DAYS_BN[BN_MONTHS[monthIndex]];
  return typeof v === 'function' ? v(year) : v;
}

/* ── formula layer (ported from FinalSettlementFormula.ts / sharedFormulas.ts,
      with two fixes applied — see review notes at the end of the chat) ──── */

function calcBenefitYears(serviceYears: number, totalDaysInPartialYear: number): number {
  // FIX: the original also checked `>= 365`, but totalDaysInPartialYear can
  // never reach 365 here (it's only the leftover months/days after full
  // years are already counted, max 11×30+29 = 359) — that branch was dead
  // code. Only the half-year rounding ever applied in practice, so it's the
  // only branch kept here.
  return totalDaysInPartialYear >= 182.5 ? serviceYears + 0.5 : serviceYears;
}

function calcWageComponents(gross: number, food: number, medical: number, transport: number) {
  if (gross <= 0) return { basic: 0, houseRent: 0, dailyBasic: 0, dailyGross: 0, hourlyOT: 0 };
  const allowances = (food || 0) + (medical || 0) + (transport || 0);
  const basic = (gross - allowances) / BASIC_DIVISOR;
  const houseRent = basic * HOUSE_RENT_PCT;
  const dailyBasic = basic / 30;
  const dailyGross = gross / 30;
  const hourlyOT = (basic / OT_HOURS_PER_MONTH) * OT_MULTIPLIER;
  return { basic, houseRent, dailyBasic, dailyGross, hourlyOT };
}

function serviceCompDaysPerYear(type: TermType, benefitYears: number): number {
  if (RESIGNATION_TYPES.includes(type)) {
    if (benefitYears === 3) return 7;
    if (benefitYears > 3 && benefitYears < 10) return 15;
    if (benefitYears >= 10) return 30;
    return 0;
  }
  if (THIRTY_DAYS_TYPES.includes(type) && benefitYears >= 1) return 30;
  if (FIFTEEN_DAYS_TYPES.includes(type) && benefitYears >= 1) return 15;
  return 0;
}

function calcServiceCompensation(type: TermType, benefitYears: number, dailyBasic: number): number {
  const rate = serviceCompDaysPerYear(type, benefitYears);
  return rate === 0 ? 0 : benefitYears * rate * dailyBasic;
}

function deathCompDaysPerYear(type: TermType): number {
  if (type === 'death_natural') return 30;
  if (type === 'death_accident') return 45;
  return 0;
}

function calcDeathCompensation(type: TermType, benefitYears: number, dailyBasic: number): number {
  // FIX: original used `benefitYears > 1` (strictly greater), which meant an
  // employee who died at exactly 1 completed year of service got ৳0 —
  // inconsistent with every other compensation type here, which use `>= 1`.
  // Corrected to `>= 1` for consistency.
  const rate = deathCompDaysPerYear(type);
  return rate === 0 || benefitYears < 1 ? 0 : benefitYears * rate * dailyBasic;
}

function gratuityDaysPerYear(benefitYears: number): number {
  if (benefitYears < 1) return 0;
  return benefitYears > 10 ? 45 : 30;
}

function calcGratuity(benefitYears: number, dailyBasic: number): number {
  const rate = gratuityDaysPerYear(benefitYears);
  return rate === 0 ? 0 : benefitYears * rate * dailyBasic;
}

function calcLayOffCompensation(layOffDays: number, dailyBasic: number, monthlyHouseRent: number): number {
  const perDay = 0.5 * dailyBasic + monthlyHouseRent / 30;
  return layOffDays * perDay;
}

function calcLastMonthSalary(gross: number, payableDays: number, monthIndex: number, year: number): number {
  const calDays = calendarDaysInMonth(monthIndex, year);
  if (!calDays) return 0;
  return (gross / calDays) * payableDays;
}

/* ── result shape ─────────────────────────────────────────────── */

interface Result {
  eligible: true;
  termType: TermType;
  benefitYears: number;
  duration: { years: number; months: number; days: number };
  dailyBasic: number;
  dailyGross: number;
  basic: number;
  houseRent: number;
  hourlyOT: number;
  lastMonthSalary: number;
  overtimeAmount: number;
  earnedLeaveAmount: number;
  usesGratuity: boolean;
  gratuityAmount: number;
  serviceCompAmount: number;
  deathCompAmount: number;
  layOffAmount: number;
  noticePayAmount: number;
  othersAmount: number;
  noticeDeductAmount: number;
  advanceDeductAmount: number;
  otherDeductAmount: number;
  totalReceivable: number;
  totalDeductions: number;
  netPayable: number;
  error?: undefined;
}
interface ErrorResult { eligible: false; error: string }

/* ── shared presentational pieces (same pattern as MaternityCalc) ────── */

function DateBox({ value, onChange, placeholder, max }: {
  value: string; onChange: (v: string) => void; placeholder: string; max: number;
}) {
  return (
    <input
      type="text" inputMode="numeric" value={value}
      onChange={e => {
        const v = e.target.value.replace(/[^\d]/g, '');
        if (v === '' || (v.length <= String(max).length && parseInt(v, 10) <= max)) onChange(v);
      }}
      placeholder={placeholder} maxLength={String(max).length}
      style={{
        flex: 1, minWidth: 0, padding: '12px 14px',
        background: 'var(--surface)', color: 'var(--text)',
        border: `1.5px solid var(--border)`, borderRadius: 12,
        fontSize: 14, fontFamily: 'inherit', outline: 'none', textAlign: 'left',
      }}
    />
  );
}

function DateFieldGroup({ label, day, month, year, onDay, onMonth, onYear, bn }: {
  label: string; day: string; month: string; year: string;
  onDay: (v: string) => void; onMonth: (v: string) => void; onYear: (v: string) => void; bn: boolean;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <DateBox value={day}   onChange={onDay}   placeholder={bn ? 'দিন' : 'Day'}   max={31} />
        <DateBox value={month} onChange={onMonth} placeholder={bn ? 'মাস' : 'Month'} max={12} />
        <DateBox value={year}  onChange={onYear}  placeholder={bn ? 'বছর' : 'Year'}  max={9999} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
        {bn ? 'দিন (১-৩১) | মাস (১-১২) | বছর' : 'Day (1-31) | Month (1-12) | Year'}
      </div>
    </div>
  );
}

function SectionCard({ icon, title, children, accent = A }: {
  icon: React.ReactNode; title: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <div style={{ marginTop: 14, background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ background: `${accent}18`, borderBottom: `1px solid ${accent}30`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <span style={{ fontWeight: 800, fontSize: 13, color: accent }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function AmountRow({ label, amount, note, color = 'var(--text)', last, FN }: {
  label: string; amount: number; note?: string; color?: string; last?: boolean; FN: (n: number) => string;
}) {
  return (
    <div style={{
      padding: '11px 14px', borderBottom: last ? 'none' : '1px solid var(--border)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text2)' }}>{label}</div>
        {note && <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5, marginTop: 3 }}>{note}</div>}
      </div>
      <div style={{ fontWeight: 800, fontSize: 13.5, color, fontFamily: 'monospace', flexShrink: 0, whiteSpace: 'nowrap' }}>
        {FN(amount)}
      </div>
    </div>
  );
}

/* ── main component ───────────────────────────────────────────── */

export default function FinalSettlementCalc({ history, onAdd, onClear }: CalcProps) {
  const { lang } = useLang();
  const bn = lang === 'bn';

  const [tab, setTab] = useState<'settlement' | 'breakdown' | 'conditions'>('settlement');

  // Joining date
  const [joinDay, setJoinDay] = useState(''); const [joinMonth, setJoinMonth] = useState(''); const [joinYear, setJoinYear] = useState('');
  // Last attendance / settlement date
  const [lastDay, setLastDay] = useState(''); const [lastMonth, setLastMonth] = useState(''); const [lastYear, setLastYear] = useState('');

  const [termType, setTermType] = useState<TermType>('');
  const [grossWage, setGrossWage] = useState('');
  const [showAllowances, setShowAllowances] = useState(false);
  const [food, setFood] = useState(String(DEFAULT_FOOD));
  const [medical, setMedical] = useState(String(DEFAULT_MEDICAL));
  const [transport, setTransport] = useState(String(DEFAULT_TRANSPORT));

  const [absentDays, setAbsentDays] = useState('0');
  const [elDays, setElDays] = useState('0');
  const [payableDays, setPayableDays] = useState('');
  const [otHours, setOtHours] = useState('0');
  const [noticePayDays, setNoticePayDays] = useState('0');
  const [noticeDeductDays, setNoticeDeductDays] = useState('0');
  const [layOffDays, setLayOffDays] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'compensation' | 'gratuity'>('compensation');
  const [othersAmt, setOthersAmt] = useState('0');
  const [advanceDeductAmt, setAdvanceDeductAmt] = useState('0');
  const [otherDeductAmt, setOtherDeductAmt] = useState('0');

  const [result, setResult] = useState<Result | ErrorResult | null>(null);
  const [openLine, setOpenLine] = useState<string | null>(null);

  const FN = (n: number) => {
    const s = Math.round(n).toLocaleString('en-BD');
    return '৳' + (bn ? toBnDigits(s) : s);
  };

  const termLabel = (t: TermType) => TERM_OPTIONS.find(o => o.id === t)?.label[bn ? 'bn' : 'en'] ?? '';

  const calc = () => {
    const joining = buildDate(joinDay, joinMonth, joinYear);
    const lastDate = buildDate(lastDay, lastMonth, lastYear);
    const gross = parseFloat(grossWage);

    if (!joining || !lastDate || !termType || isNaN(gross) || gross <= 0) {
      setResult({ eligible: false, error: bn ? 'সব প্রয়োজনীয় তথ্য সঠিকভাবে দিন।' : 'Please fill in all required fields correctly.' });
      return;
    }
    if (joining.getTime() > lastDate.getTime()) {
      setResult({ eligible: false, error: bn ? 'যোগদানের তারিখ শেষ উপস্থিতির তারিখের পরে হতে পারে না।' : 'Joining date cannot be after the last attendance date.' });
      return;
    }

    const dur = serviceDuration(joining, lastDate);
    const totalDaysPartial = Math.max(0, dur.months * 30 + dur.days - (parseInt(absentDays, 10) || 0));
    const benefitYears = calcBenefitYears(dur.years, totalDaysPartial);

    const { basic, houseRent, dailyBasic, dailyGross, hourlyOT } =
      calcWageComponents(gross, parseFloat(food) || 0, parseFloat(medical) || 0, parseFloat(transport) || 0);

    const payDays = payableDays ? parseFloat(payableDays) : lastDate.getDate();
    const lastMonthSalary = calcLastMonthSalary(gross, payDays, lastDate.getMonth(), lastDate.getFullYear());
    const overtimeAmount = hourlyOT * (parseFloat(otHours) || 0);
    const earnedLeaveAmount = (parseFloat(elDays) || 0) * dailyGross;

    const usesGratuity = paymentMethod === 'gratuity' && isGratuityEligible(termType);
    const gratuityAmount = usesGratuity ? calcGratuity(benefitYears, dailyBasic) : 0;
    const serviceCompAmount = usesGratuity ? 0 : calcServiceCompensation(termType, benefitYears, dailyBasic);
    const deathCompAmount = usesGratuity ? 0 : calcDeathCompensation(termType, benefitYears, dailyBasic);

    const layOffAmount = termType === 'layoff' ? calcLayOffCompensation(parseFloat(layOffDays) || 0, dailyBasic, houseRent) : 0;
    const noticePayAmount = NOTICE_PAY_TYPES.includes(termType) ? (parseFloat(noticePayDays) || 0) * dailyBasic : 0;
    const noticeDeductAmount = NOTICE_DEDUCT_TYPES.includes(termType) ? (parseFloat(noticeDeductDays) || 0) * dailyBasic : 0;
    const othersAmount = parseFloat(othersAmt) || 0;
    const advanceDeductAmount = parseFloat(advanceDeductAmt) || 0;
    const otherDeductAmount = parseFloat(otherDeductAmt) || 0;

    const totalReceivable = lastMonthSalary + overtimeAmount + earnedLeaveAmount + serviceCompAmount +
      deathCompAmount + gratuityAmount + layOffAmount + noticePayAmount + othersAmount;
    const totalDeductions = noticeDeductAmount + advanceDeductAmount + otherDeductAmount;
    const netPayable = totalReceivable - totalDeductions;

    const r: Result = {
      eligible: true, termType, benefitYears, duration: dur,
      dailyBasic, dailyGross, basic, houseRent, hourlyOT,
      lastMonthSalary, overtimeAmount, earnedLeaveAmount,
      usesGratuity, gratuityAmount, serviceCompAmount, deathCompAmount,
      layOffAmount, noticePayAmount, othersAmount,
      noticeDeductAmount, advanceDeductAmount, otherDeductAmount,
      totalReceivable, totalDeductions, netPayable,
    };
    setResult(r);
    onAdd('finalsettlement', `${bn ? 'নিট প্রদেয়' : 'Net payable'}: ৳${netPayable.toFixed(0)}`);
  };

  const share = result?.eligible
    ? buildShare(bn ? 'চূড়ান্ত পাওনা হিসাব' : 'Final Settlement', [
        `${bn ? 'মোট প্রাপ্য' : 'Total receivable'}: ${FN(result.totalReceivable)}`,
        `${bn ? 'মোট কর্তন' : 'Total deductions'}: ${FN(result.totalDeductions)}`,
        `${bn ? 'নিট প্রদেয়' : 'Net payable'}: ${FN(result.netPayable)}`,
      ])
    : null;

  const TABS: { id: typeof tab; label: string; icon: React.ReactNode }[] = [
    { id: 'settlement', label: bn ? 'নিষ্পত্তি'      : 'Settlement', icon: <FaCoins size={11} /> },
    { id: 'breakdown',  label: bn ? 'হিসাব বিবরণ'    : 'Breakdown',  icon: <FaFileInvoiceDollar size={11} /> },
    { id: 'conditions', label: bn ? 'শর্তাবলী'        : 'Conditions', icon: <FaClipboardList size={11} /> },
  ];

  const showNoticePay    = NOTICE_PAY_TYPES.includes(termType);
  const showNoticeDeduct = NOTICE_DEDUCT_TYPES.includes(termType);
  const showLayOff       = termType === 'layoff';
  const showGratuityToggle = isGratuityEligible(termType) && termType !== '';

  return (
    <CalcShell
      accent={A}
      onCalc={calc}
      calcLabel={bn ? 'হিসাব করুন' : 'Calculate'}
      hasResult={!!(result?.eligible)}
      onShare={() => share && shareWA(share)}
      history={history}
      onClear={() => onClear?.('finalsettlement')}
      historyLabel={bn ? 'ইতিহাস' : 'History'}
      clearLabel={bn ? 'মুছুন' : 'Clear'}
    >
      {/* ── Tab bar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, padding: 4, marginBottom: 14, background: 'var(--surface2)', border: `1px solid var(--border)`, borderRadius: 12 }}>
        {TABS.map(t => {
          const on = tab === t.id;
          return (
            <button
              key={t.id} onClick={() => setTab(t.id)}
              style={{
                flex: 1, minWidth: 0, padding: '9px 4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                background: on ? A : 'transparent', color: on ? '#fff' : 'var(--text2)',
                border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                cursor: 'pointer', transition: 'all 0.15s', boxShadow: on ? `0 2px 8px ${A}40` : 'none',
              }}
            >
              {t.icon}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════ TAB 1 — SETTLEMENT ══════════════════ */}
      {tab === 'settlement' && (
        <>
          <div style={{ background: `${A}15`, border: `1px solid ${A}35`, borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <FaInfoCircle size={15} color={A} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 11, color: A, lineHeight: 1.55 }}>
              {bn ? (
                <><strong>বাংলাদেশ শ্রম আইন ২০০৬ — অধ্যায় ৫</strong><br />চাকরি নিষ্পত্তির ধরন অনুযায়ী প্রাপ্য ক্ষতিপূরণ, গ্র্যাচুইটি, নোটিশ পে ও কর্তন হিসাব করুন।</>
              ) : (
                <><strong>Bangladesh Labour Act 2006 — Chapter V</strong><br />Estimate compensation, gratuity, notice pay, and deductions by separation type.</>
              )}
            </div>
          </div>

          <DateFieldGroup
            label={bn ? 'যোগদানের তারিখ' : 'Joining date'}
            day={joinDay} month={joinMonth} year={joinYear}
            onDay={setJoinDay} onMonth={setJoinMonth} onYear={setJoinYear} bn={bn}
          />
          <DateFieldGroup
            label={bn ? 'সর্বশেষ উপস্থিতির তারিখ' : 'Last attendance date'}
            day={lastDay} month={lastMonth} year={lastYear}
            onDay={setLastDay} onMonth={setLastMonth} onYear={setLastYear} bn={bn}
          />

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 6 }}>
              {bn ? 'চাকরি নিষ্পত্তির ধরন' : 'Type of separation'}
            </div>
            <select
              value={termType}
              onChange={e => setTermType(e.target.value as TermType)}
              style={{
                width: '100%', padding: '12px 14px', background: 'var(--surface)', color: 'var(--text)',
                border: `1.5px solid var(--border)`, borderRadius: 12, fontSize: 14, fontFamily: 'inherit', outline: 'none',
              }}
            >
              <option value="">{bn ? '-- নির্বাচন করুন --' : '-- Select --'}</option>
              {TERM_OPTIONS.map(o => (
                <option key={o.id} value={o.id}>{o.label[bn ? 'bn' : 'en']} ({bn ? o.sec : `Sec ${o.sec}`})</option>
              ))}
            </select>
          </div>

          <FloatInput
            label={bn ? 'মাসিক মোট মজুরি (BDT)' : 'Monthly gross wage (BDT)'}
            accent={A} type="number" placeholder="15000"
            value={grossWage}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGrossWage(e.target.value)}
            hint={bn ? 'মূল মজুরি = (মোট মজুরি − ভাতা) ÷ ১.৫' : 'Basic wage = (gross − allowances) ÷ 1.5'}
          />

          <button
            onClick={() => setShowAllowances(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
              color: A, fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', padding: '4px 0', marginBottom: 12,
            }}
          >
            {showAllowances ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
            {bn ? 'ভাতাসমূহ সম্পাদনা করুন (ডিফল্ট মান প্রযোজ্য)' : 'Edit allowances (defaults applied)'}
          </button>

          {showAllowances && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
              {[
                { l: bn ? 'খাদ্য ভাতা' : 'Food', v: food, s: setFood },
                { l: bn ? 'চিকিৎসা ভাতা' : 'Medical', v: medical, s: setMedical },
                { l: bn ? 'যাতায়াত ভাতা' : 'Transport', v: transport, s: setTransport },
              ].map((f, i) => (
                <div key={i}>
                  <div style={{ fontSize: 10.5, color: 'var(--text3)', marginBottom: 5, fontWeight: 700 }}>{f.l}</div>
                  <input
                    type="number" value={f.v} onChange={e => f.s(e.target.value)}
                    style={{ width: '100%', padding: '9px 10px', background: 'var(--surface)', color: 'var(--text)', border: `1.5px solid var(--border)`, borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                  />
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <FloatInput label={bn ? 'অনুপস্থিতির দিন' : 'Absent days'} accent={A} type="number" placeholder="0"
              value={absentDays} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAbsentDays(e.target.value)} />
            <FloatInput label={bn ? 'প্রাপ্য অর্জিত ছুটি (দিন)' : 'Earned leave (days)'} accent={A} type="number" placeholder="0"
              value={elDays} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setElDays(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <FloatInput
              label={bn ? 'সর্বশেষ মাসের প্রদেয় দিন' : 'Last month payable days'} accent={A} type="number"
              placeholder={String(lastDate_placeholder())}
              value={payableDays} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPayableDays(e.target.value)}
              hint={bn ? 'ফাঁকা রাখলে শেষ তারিখের দিন-সংখ্যা ব্যবহৃত হবে' : 'Defaults to the day-of-month of the last date'}
            />
            <FloatInput label={bn ? 'অতিরিক্ত কর্মঘণ্টা' : 'Overtime hours'} accent={A} type="number" placeholder="0"
              value={otHours} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtHours(e.target.value)} />
          </div>

          {showNoticePay && (
            <FloatInput
              label={bn ? 'নোটিশ পে (দিন)' : 'Notice pay (days)'} accent={A} type="number" placeholder="30"
              value={noticePayDays} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNoticePayDays(e.target.value)}
              hint={bn ? 'চাকুরী অবসান / ছাঁটাইয়ের ক্ষেত্রে প্রযোজ্য' : 'Applies to termination by notice / retrenchment'}
            />
          )}
          {showNoticeDeduct && (
            <FloatInput
              label={bn ? 'নোটিশ কর্তন (দিন)' : 'Notice deduction (days)'} accent={A} type="number" placeholder="0"
              value={noticeDeductDays} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNoticeDeductDays(e.target.value)}
              hint={bn ? 'পর্যাপ্ত নোটিশ ছাড়া ইস্তফার ক্ষেত্রে কর্তনযোগ্য' : 'Deducted for resigning without full notice'}
            />
          )}
          {showLayOff && (
            <FloatInput
              label={bn ? 'লে-অফের দিন' : 'Lay-off days'} accent={A} type="number" placeholder="0"
              value={layOffDays} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLayOffDays(e.target.value)}
              hint={bn ? 'হার = (০.৫ × দৈনিক মূল মজুরি) + দৈনিক বাড়ি ভাড়া' : 'Rate = (0.5 × daily basic) + daily house rent'}
            />
          )}

          {showGratuityToggle && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>
                {bn ? 'পেমেন্ট পদ্ধতি' : 'Payment method'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {([
                  { id: 'compensation' as const, t: bn ? 'বিধিবদ্ধ ক্ষতিপূরণ' : 'Statutory compensation' },
                  { id: 'gratuity' as const,     t: bn ? 'গ্র্যাচুইটি'         : 'Gratuity' },
                ]).map(o => {
                  const on = paymentMethod === o.id;
                  return (
                    <button
                      key={o.id} onClick={() => setPaymentMethod(o.id)}
                      style={{
                        padding: '11px 10px', textAlign: 'center',
                        background: on ? `${A}1f` : 'var(--surface)',
                        border: `1.5px solid ${on ? A : 'var(--border)'}`, borderRadius: 11,
                        cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: 12,
                        color: on ? A : 'var(--text2)', transition: 'all 0.15s',
                      }}
                    >{o.t}</button>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                {bn ? '* আইন অনুযায়ী যেটি বেশি, সেটি প্রদেয় — উভয় নয়' : '* Whichever is higher under the Act is paid — never both'}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 6 }}>
            <FloatInput label={bn ? 'অন্যান্য প্রাপ্য (৳)' : 'Other earnings (৳)'} accent={A} type="number" placeholder="0"
              value={othersAmt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOthersAmt(e.target.value)} />
            <FloatInput label={bn ? 'অগ্রিম কর্তন (৳)' : 'Advance deduction (৳)'} accent={A} type="number" placeholder="0"
              value={advanceDeductAmt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdvanceDeductAmt(e.target.value)} />
          </div>
          <FloatInput label={bn ? 'অন্যান্য কর্তন (৳)' : 'Other deductions (৳)'} accent={A} type="number" placeholder="0"
            value={otherDeductAmt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtherDeductAmt(e.target.value)} />

          {result && !result.eligible && (
            <div style={{ color: '#ef4444', fontSize: 14, fontWeight: 600, marginTop: 10 }}>
              ⚠️ {result.error}
            </div>
          )}

          {result?.eligible && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 14, background: '#0a2818', border: '2px solid #166534', borderRadius: 12, padding: '12px 16px' }}>
                <FaCheckCircle color="#4ade80" size={20} />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>
                  {bn ? `${termLabel(result.termType)} — হিসাব সম্পন্ন ✓` : `${termLabel(result.termType)} — calculated ✓`}
                </span>
              </div>

              <ResultCard accent={A}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4 }}>
                    {bn ? 'নিট প্রদেয়' : 'Net Payable'}
                  </div>
                  <div style={{ fontSize: 'clamp(28px, 8vw, 40px)', fontWeight: 900, color: A, lineHeight: 1.1 }}>
                    {FN(result.netPayable)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                    {bn
                      ? `সুবিধাপ্রাপ্ত সেবাকাল: ${toBnDigits(String(result.benefitYears))} বছর`
                      : `Benefit years of service: ${result.benefitYears}`}
                  </div>
                </div>
                <StatGrid
                  items={[
                    [bn ? 'মোট প্রাপ্য' : 'Total receivable', FN(result.totalReceivable), '#3b82f6'],
                    [bn ? 'মোট কর্তন'   : 'Total deductions', FN(result.totalDeductions), '#ef4444'],
                    [bn ? 'দৈনিক মূল মজুরি' : 'Daily basic', `৳${bn ? toBnDigits(result.dailyBasic.toFixed(2)) : result.dailyBasic.toFixed(2)}`, A],
                    [bn ? (result.usesGratuity ? 'গ্র্যাচুইটি' : 'ক্ষতিপূরণ') : (result.usesGratuity ? 'Gratuity' : 'Compensation'),
                     FN(result.usesGratuity ? result.gratuityAmount : (result.serviceCompAmount + result.deathCompAmount)), '#10b981'],
                  ]}
                  cols={2}
                />
              </ResultCard>

              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--surface2)', border: `1px solid var(--border)`, borderRadius: 12, fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
                {bn
                  ? 'পুরো হিসাবের লাইন-বাই-লাইন বিবরণ "হিসাব বিবরণ" ট্যাবে দেখুন।'
                  : 'See the full line-by-line calculation on the Breakdown tab.'}
              </div>
            </>
          )}
        </>
      )}

      {/* ══════════════════ TAB 2 — BREAKDOWN ══════════════════ */}
      {tab === 'breakdown' && (
        <>
          {!result?.eligible ? (
            <div style={{ background: 'var(--surface)', border: `1px dashed var(--border)`, borderRadius: 14, padding: '22px 16px', textAlign: 'center' }}>
              <FaFileInvoiceDollar size={26} color={A} style={{ opacity: 0.55, marginBottom: 10 }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>
                {bn ? 'আগে নিষ্পত্তি হিসাব করুন' : 'Calculate the settlement first'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
                {bn ? '"নিষ্পত্তি" ট্যাবে তথ্য দিয়ে হিসাব করলে এখানে সম্পূর্ণ বিবরণ দেখা যাবে।' : 'Fill in the Settlement tab, and the full itemized breakdown will appear here.'}
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 2 }}>
                {[
                  { l: bn ? 'সেবাকাল' : 'Service', v: bn ? `${toBnDigits(String(result.duration.years))}ব ${toBnDigits(String(result.duration.months))}ম` : `${result.duration.years}y ${result.duration.months}m`, c: '#3b82f6' },
                  { l: bn ? 'মূল মজুরি' : 'Basic wage', v: FN(result.basic), c: '#a78bfa' },
                  { l: bn ? 'বাড়ি ভাড়া' : 'House rent', v: FN(result.houseRent), c: A },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'var(--surface)', border: `1px solid ${s.c}40`, borderRadius: 11, padding: '10px 6px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 900, color: s.c, lineHeight: 1.2 }}>{s.v}</div>
                    <div style={{ fontSize: 9.5, color: 'var(--text3)', fontWeight: 700, marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>

              <SectionCard icon={<FaMoneyBillWave size={14} color={A} />} title={bn ? 'মোট প্রাপ্য (A)' : 'Total Receivable (A)'} accent="#3b82f6">
                <AmountRow FN={FN} color="#3b82f6" label={bn ? 'সর্বশেষ মাসের বেতন' : 'Last month salary'} amount={result.lastMonthSalary} />
                <AmountRow FN={FN} color="#3b82f6" label={bn ? 'অতিরিক্ত কর্মঘণ্টার ভাতা' : 'Overtime pay'} amount={result.overtimeAmount} />
                <AmountRow FN={FN} color="#3b82f6" label={bn ? 'প্রাপ্য অর্জিত ছুটি' : 'Earned leave encashment'} amount={result.earnedLeaveAmount} />
                {result.usesGratuity ? (
                  <AmountRow FN={FN} color="#3b82f6" label={bn ? 'গ্র্যাচুইটি (ধারা ২(১০))' : 'Gratuity (Sec 2(10))'} amount={result.gratuityAmount}
                    note={bn ? `${toBnDigits(String(result.benefitYears))} বছর × ${toBnDigits(String(gratuityDaysPerYear(result.benefitYears)))} দিন` : `${result.benefitYears} yrs × ${gratuityDaysPerYear(result.benefitYears)} days/yr`} />
                ) : (
                  <>
                    {DEATH_TYPES.includes(result.termType)
                      ? <AmountRow FN={FN} color="#3b82f6" label={bn ? 'মৃত্যুজনিত ক্ষতিপূরণ' : 'Death compensation'} amount={result.deathCompAmount}
                          note={bn ? `${toBnDigits(String(result.benefitYears))} বছর × ${toBnDigits(String(deathCompDaysPerYear(result.termType)))} দিন` : `${result.benefitYears} yrs × ${deathCompDaysPerYear(result.termType)} days/yr`} />
                      : <AmountRow FN={FN} color="#3b82f6" label={bn ? 'চাকরি অবসানজনিত ক্ষতিপূরণ' : 'Service compensation'} amount={result.serviceCompAmount}
                          note={bn ? `${toBnDigits(String(result.benefitYears))} বছর × ${toBnDigits(String(serviceCompDaysPerYear(result.termType, result.benefitYears)))} দিন` : `${result.benefitYears} yrs × ${serviceCompDaysPerYear(result.termType, result.benefitYears)} days/yr`} />}
                  </>
                )}
                {showLayOff && <AmountRow FN={FN} color="#3b82f6" label={bn ? 'লে-অফ ক্ষতিপূরণ' : 'Lay-off compensation'} amount={result.layOffAmount} />}
                {showNoticePay && <AmountRow FN={FN} color="#3b82f6" label={bn ? 'নোটিশ পে' : 'Notice pay'} amount={result.noticePayAmount} />}
                <AmountRow FN={FN} color="#3b82f6" label={bn ? 'অন্যান্য প্রাপ্য' : 'Other earnings'} amount={result.othersAmount} last />
              </SectionCard>

              <SectionCard icon={<FaTimesCircle size={14} color="#ef4444" />} title={bn ? 'মোট কর্তন (B)' : 'Total Deductions (B)'} accent="#ef4444">
                {showNoticeDeduct && <AmountRow FN={FN} color="#ef4444" label={bn ? 'নোটিশ কর্তন' : 'Notice deduction'} amount={result.noticeDeductAmount} />}
                <AmountRow FN={FN} color="#ef4444" label={bn ? 'অগ্রিম কর্তন' : 'Advance deduction'} amount={result.advanceDeductAmount} />
                <AmountRow FN={FN} color="#ef4444" label={bn ? 'অন্যান্য কর্তন' : 'Other deductions'} amount={result.otherDeductAmount} last />
              </SectionCard>

              <SectionCard icon={<FaCoins size={14} color={A} />} title={bn ? 'নিট প্রদেয় (A − B)' : 'Net Payable (A − B)'}>
                <AmountRow FN={FN} color={A} label={bn ? 'মোট প্রাপ্য (A)' : 'Total receivable (A)'} amount={result.totalReceivable} />
                <AmountRow FN={FN} color="#ef4444" label={bn ? 'মোট কর্তন (B)' : 'Total deductions (B)'} amount={result.totalDeductions} />
                <div style={{ padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: `${A}10` }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: A }}>{bn ? 'নিট প্রদেয়' : 'Net Payable'}</span>
                  <span style={{ fontWeight: 900, fontSize: 18, color: A, fontFamily: 'monospace' }}>{FN(result.netPayable)}</span>
                </div>
              </SectionCard>
            </>
          )}
        </>
      )}

      {/* ══════════════════ TAB 3 — CONDITIONS ══════════════════ */}
      {tab === 'conditions' && (
        <>
          <SectionCard icon={<FaUserTie size={14} color={A} />} title={bn ? 'ক্ষতিপূরণের হার (নিষ্পত্তির ধরন অনুযায়ী)' : 'Compensation rate by separation type'}>
            {[
              { t: bn ? 'ইস্তফা (২৭)' : 'Resignation (Sec 27)', d: bn ? '৩ বছরে ৭ দিন/বছর, ৩–১০ বছরে ১৫ দিন/বছর, ১০+ বছরে ৩০ দিন/বছর। ৩ বছরের কম সেবায় কোনো ক্ষতিপূরণ নেই।' : '7 days/yr at exactly 3 yrs, 15 days/yr between 3–10 yrs, 30 days/yr at 10+ yrs. No compensation under 3 years.' },
              { t: bn ? 'অবসর, চাকুরী অবসান, ডিসচার্জ, ছাঁটাই' : 'Retirement, Termination, Discharge, Retrenchment', d: bn ? 'ন্যূনতম ১ বছর সেবায় ৩০ দিন/বছর।' : '30 days/year of benefit-service, minimum 1 year.' },
              { t: bn ? 'অপসারণ (২৩.৩)' : 'Removal — extenuating cause (Sec 23.3)', d: bn ? 'ন্যূনতম ১ বছর সেবায় ১৫ দিন/বছর।' : '15 days/year of benefit-service, minimum 1 year.' },
              { t: bn ? 'বরখাস্ত, গুরুতর অসদাচরণ, লে-অফ' : 'Dismissal, grave misconduct, lay-off', d: bn ? 'সাধারণ ক্ষতিপূরণ প্রযোজ্য নয় (লে-অফের নিজস্ব দৈনিক হার ব্যতীত)।' : 'No standard compensation applies (lay-off uses its own per-day rate instead).' },
              { t: bn ? 'মৃত্যু (স্বাভাবিক / দুর্ঘটনাজনিত)' : 'Death (natural / accidental)', d: bn ? 'ন্যূনতম ১ বছর সেবায় যথাক্রমে ৩০ / ৪৫ দিন/বছর।' : '30 / 45 days per year respectively, minimum 1 year of benefit-service.' },
            ].map((row, i, arr) => (
              <div key={i} style={{ padding: '12px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{row.t}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text3)', lineHeight: 1.6 }}>{row.d}</div>
              </div>
            ))}
          </SectionCard>

          <SectionCard icon={<FaBriefcase size={14} color={A} />} title={bn ? 'গ্র্যাচুইটি যোগ্যতা (ধারা ২(১০))' : 'Gratuity eligibility (Sec 2(10))'}>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 8 }}>
                {bn
                  ? 'বরখাস্ত (২৩), গুরুতর অসদাচরণে বরখাস্ত (২৩.৪) এবং লে-অফ (১৬) ব্যতীত প্রায় সব ধরনের নিষ্পত্তিতে "ক্ষতিপূরণ অথবা গ্র্যাচুইটি, যেটি বেশি" — এই তুলনা প্রযোজ্য।'
                  : 'The "compensation or gratuity, whichever is higher" comparison applies to nearly every separation type — except Dismissal (23), grave-misconduct Dismissal (23.4), and Lay-off (16).'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
                {bn
                  ? 'হার: ১০ বছর পর্যন্ত সেবায় বছরে ৩০ দিন, ১০ বছরের বেশি সেবায় বছরে ৪৫ দিন।'
                  : 'Rate: 30 days per year of service up to 10 years, 45 days per year beyond 10 years.'}
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={<FaCalendarAlt size={14} color={A} />} title={bn ? 'নোটিশ পে ও কর্তন' : 'Notice pay & deduction'}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                {bn ? 'নোটিশ পে (ধারা ২৬, ২০)' : 'Notice pay (Sec 26, 20)'}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text3)', lineHeight: 1.6 }}>
                {bn ? 'চাকুরী অবসান বা ছাঁটাইয়ের ক্ষেত্রে পর্যাপ্ত নোটিশ না দিলে নোটিশকালের পরিবর্তে দৈনিক মূল মজুরির ভিত্তিতে অর্থ প্রদান করা হয়।' : 'Where termination-by-notice or retrenchment happens without full notice, pay is given in lieu, based on the daily basic rate.'}
              </div>
            </div>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                {bn ? 'নোটিশ কর্তন (ধারা ২৭)' : 'Notice deduction (Sec 27)'}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text3)', lineHeight: 1.6 }}>
                {bn ? 'ইস্তফার ক্ষেত্রে কর্মী পর্যাপ্ত নোটিশ না দিলে সংশ্লিষ্ট দিনের দৈনিক মূল মজুরি প্রাপ্য অর্থ থেকে কর্তন করা হয়।' : 'On resignation without sufficient notice, the equivalent daily-basic amount is deducted from what is receivable.'}
              </div>
            </div>
          </SectionCard>

          <div style={{ marginTop: 14, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--surface2)', border: `1px solid var(--border)`, borderRadius: 12 }}>
            <FaInfoCircle size={12} color={A} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
              {bn
                ? 'এই হিসাব বাংলাদেশ শ্রম আইন ২০০৬-এর সাধারণ বিধানের ভিত্তিতে আনুমানিক। প্রতিষ্ঠানের নীতি, সংশোধনী বা সংশ্লিষ্ট বিধি অনুযায়ী প্রকৃত হিসাব ভিন্ন হতে পারে — চূড়ান্ত পরিশোধের আগে শ্রম আইন বিশেষজ্ঞ বা এইচআর বিভাগের সাথে যাচাই করে নিন।'
                : 'This is an estimate based on the general provisions of the Bangladesh Labour Act 2006. Company policy, amendments, or specific rules may change the actual figures — verify with a labour law specialist or HR before final payment.'}
            </div>
          </div>
        </>
      )}
    </CalcShell>
  );

  function lastDate_placeholder(): number {
    const d = buildDate(lastDay, lastMonth, lastYear);
    return d ? d.getDate() : 30;
  }
}