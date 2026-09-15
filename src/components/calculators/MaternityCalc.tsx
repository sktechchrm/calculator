import { useState } from 'react';
import { FaBaby, FaCheckCircle, FaTimesCircle, FaInfoCircle, FaCalendarAlt, FaMoneyBillWave } from 'react-icons/fa';
import { FloatInput, ResultCard, StatGrid } from '../ui';
import type { CalcProps } from '../../utils/constants.ts';
import CalcShell from '../CalcShell';
import { useLang } from '../../context/LangContext.tsx';
import { shareWA, buildShare } from '../../utils/share.ts';

const A = '#ec4899';

// BD Labour Act 2006, Section 46
// Leave: 60 days before + 60 days after = 120 days total
const PRE_DELIVERY_DAYS   = 60;
const POST_DELIVERY_DAYS  = 60;
const TOTAL_DAYS          = PRE_DELIVERY_DAYS + POST_DELIVERY_DAYS; // 120
const MIN_SERVICE_MONTHS  = 6;  // Must have worked 6 months before delivery
const MAX_SURVIVING_CHILDREN = 1; // No benefit if 2+ surviving children already
const WAGE_DAYS_DIVISOR   = 26; // Sec 48(2): average daily wage = monthly wage / 26

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Full calendar months between two dates (join date -> delivery date)
function monthsBetween(start: Date, end: Date): number {
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months--;
  return Math.max(0, months);
}

function formatDate(date: Date, bn: boolean): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear().toString();
  if (bn) {
    // Convert to Bangla digits
    const toBn = (s: string) => s.replace(/[0-9]/g, n => '০১২৩৪৫৬৭৮৯'[+n]);
    return `${toBn(d)}/${toBn(m)}/${toBn(y)}`;
  }
  return `${d}/${m}/${y}`;
}

// Build a validated Date from separate day/month/year strings.
// Returns null if any part is missing/out of range, or the date doesn't exist (e.g. 31 Feb).
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

interface Result {
  eligible: boolean;
  reason?: 'service' | 'children';
  leaveStart: Date;
  deliveryDate: Date;
  leaveEnd: Date;
  totalDays: number;
  totalBenefit: number;
  preWage: number;
  postWage: number;
  avgDailyWage: number;
  preDays: number;
  postDays: number;
  serviceMonths?: number;
  error?: string;
}

// A single numeric box within a day/month/year date group.
function DateBox({
  value, onChange, placeholder, max,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  max: number;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={e => {
        const v = e.target.value.replace(/[^\d]/g, '');
        if (v === '' || (v.length <= String(max).length && parseInt(v, 10) <= max)) {
          onChange(v);
        }
      }}
      placeholder={placeholder}
      maxLength={String(max).length}
      style={{
        flex: 1, minWidth: 0, padding: '12px 14px',
        background: 'var(--surface)', color: 'var(--text)',
        border: `1.5px solid var(--border)`, borderRadius: 12,
        fontSize: 14, fontFamily: 'inherit',
        outline: 'none', textAlign: 'left',
      }}
    />
  );
}

// A day / month / year date entry group, styled as three boxes in a row.
function DateFieldGroup({
  label, day, month, year, onDay, onMonth, onYear, bn,
}: {
  label: string;
  day: string; month: string; year: string;
  onDay: (v: string) => void; onMonth: (v: string) => void; onYear: (v: string) => void;
  bn: boolean;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <DateBox value={day}   onChange={onDay}   placeholder={bn ? 'দিন'  : 'Day'}   max={31} />
        <DateBox value={month} onChange={onMonth} placeholder={bn ? 'মাস'  : 'Month'} max={12} />
        <DateBox value={year}  onChange={onYear}  placeholder={bn ? 'বছর' : 'Year'}  max={9999} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
        {bn ? 'দিন (১-৩১) | মাস (১-১২) | বছর' : 'Day (1-31) | Month (1-12) | Year'}
      </div>
    </div>
  );
}

export default function MaternityCalc({ history, onAdd, onClear }: CalcProps) {
  const { lang } = useLang();
  const bn = lang === 'bn';

  // Joining date (day / month / year)
  const [joinDay,   setJoinDay]   = useState('');
  const [joinMonth, setJoinMonth] = useState('');
  const [joinYear,  setJoinYear]  = useState('');

  // Delivery date (day / month / year)
  const [delivDay,   setDelivDay]   = useState('');
  const [delivMonth, setDelivMonth] = useState('');
  const [delivYear,  setDelivYear]  = useState('');

  const [monthlyWage,   setMonthlyWage]   = useState('');
  const [survivingKids, setSurvivingKids] = useState('0');
  const [result, setResult] = useState<Result | null>(null);

  const calc = () => {
    if (!joinDay || !joinMonth || !joinYear || !delivDay || !delivMonth || !delivYear || !monthlyWage) {
      setResult({ eligible: false, error: bn ? 'সব তথ্য পূরণ করুন।' : 'Please fill in all fields.' } as any);
      return;
    }

    const joining  = buildDate(joinDay, joinMonth, joinYear);
    const delivery = buildDate(delivDay, delivMonth, delivYear);
    const wage      = parseFloat(monthlyWage);
    const kids      = parseInt(survivingKids, 10);

    if (!joining || !delivery || isNaN(wage) || wage <= 0) {
      setResult({ eligible: false, error: bn ? 'সঠিক তারিখ ও তথ্য দিন।' : 'Enter valid dates and values.' } as any);
      return;
    }

    if (joining.getTime() > delivery.getTime()) {
      setResult({ eligible: false, error: bn ? 'যোগদানের তারিখ প্রসবের তারিখের পরে হতে পারে না।' : 'Joining date cannot be after the delivery date.' } as any);
      return;
    }

    // Section 46(1): service length = joining date -> delivery date, must be >= 6 months
    const months = monthsBetween(joining, delivery);

    if (months < MIN_SERVICE_MONTHS) {
      setResult({
        eligible: false,
        reason: 'service',
        leaveStart: delivery,
        deliveryDate: delivery,
        leaveEnd: delivery,
        totalDays: 0,
        totalBenefit: 0,
        preWage: 0,
        postWage: 0,
        avgDailyWage: 0,
        preDays: 0,
        postDays: 0,
        serviceMonths: months,
      });
      return;
    }

    // Section 46(2): No benefit if 2 or more surviving children
    if (kids > MAX_SURVIVING_CHILDREN) {
      setResult({
        eligible: false,
        reason: 'children',
        leaveStart: delivery,
        deliveryDate: delivery,
        leaveEnd: delivery,
        totalDays: 0,
        totalBenefit: 0,
        preWage: 0,
        postWage: 0,
        avgDailyWage: 0,
        preDays: 0,
        postDays: 0,
        serviceMonths: months,
      });
      return;
    }

    // Section 46(1): 60 days before + 60 days after = 120 days total
    const leaveStart = addDays(delivery, -PRE_DELIVERY_DAYS);
    const leaveEnd   = addDays(delivery,  POST_DELIVERY_DAYS);
    const totalDays  = TOTAL_DAYS; // 120 days

    // Section 48(2): Average daily wage = monthly wage / 26
    const avgDailyWage  = wage / WAGE_DAYS_DIVISOR;
    const preWage       = avgDailyWage * PRE_DELIVERY_DAYS;
    const postWage      = avgDailyWage * POST_DELIVERY_DAYS;
    const totalBenefit  = preWage + postWage;

    setResult({
      eligible: true,
      leaveStart,
      deliveryDate: delivery,
      leaveEnd,
      totalDays,
      totalBenefit,
      preWage,
      postWage,
      avgDailyWage,
      preDays: PRE_DELIVERY_DAYS,
      postDays: POST_DELIVERY_DAYS,
      serviceMonths: months,
    });

    onAdd('maternity', `${bn ? 'মোট সুবিধা' : 'Total benefit'}: ৳${totalBenefit.toFixed(0)}, ${totalDays} ${bn ? 'দিন' : 'days'}`);
  };

  const share = result?.eligible
    ? buildShare(bn ? 'মাতৃত্বকালীন সুবিধা' : 'Maternity Benefit', [
        `${bn ? 'মোট ছুটি' : 'Total leave'}: ${result.totalDays} ${bn ? 'দিন' : 'days'}`,
        `${bn ? 'ছুটি শুরু' : 'Leave start'}: ${formatDate(result.leaveStart, bn)}`,
        `${bn ? 'ছুটি শেষ' : 'Leave end'}: ${formatDate(result.leaveEnd, bn)}`,
        `${bn ? 'মোট সুবিধা' : 'Total benefit'}: ৳${result.totalBenefit.toFixed(0)}`,
      ])
    : null;

  const FN = (n: number) => '৳' + Math.round(n).toLocaleString('en-BD');

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
      {/* Law reference banner */}
      <div style={{
        background: `${A}15`, border: `1px solid ${A}35`,
        borderRadius: 12, padding: '10px 14px', marginBottom: 16,
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <FaInfoCircle size={15} color={A} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
            <div style={{ fontSize: 11, color: A, lineHeight: 1.5 }}>
                {bn ? (
                    <>
                    <strong>বাংলাদেশ শ্রম আইন ২০০৬ — অধ্যায় ৪ (ধারা ৪৬)</strong><br />
                    <strong>প্রসূতি কল্যাণ সুবিধা:</strong> প্রসবের পূর্বে ৬০ দিন ও পরে ৬০ দিন (মোট ১২০ দিন) সুবিধা প্রদেয়।<br />
                    <strong>শর্তাবলী:</strong> (১) প্রসবের পূর্বে নুন্যতম ৬ মাস ধারাবাহিক চাকরি সম্পন্ন হতে হবে। (২) ২টির বেশি সন্তান জীবিত থাকলে এই সুবিধা প্রযোজ্য নয় (তবে সাধারণ ছুটি পাবেন)।
                    </>
                ) : (
                    <>
                    <strong>Bangladesh Labour Act 2006 — Chapter IV (Sec 46)</strong><br />
                    <strong>Maternity Benefit:</strong> Entitled to 60 days pre-delivery and 60 days post-delivery benefit.<br />
                    <strong>Conditions:</strong> (1) Requires min. 6 months service before delivery. (2) Not applicable if 2 or more children survive (standard leave applies).
                    </>
                )}
            </div>
        </div>
      </div>

      {/* Joining date (shown first) */}
      <DateFieldGroup
        label={bn ? 'এই নিয়োগকর্তার অধীনে যোগদানের তারিখ' : 'Joining date under this employer'}
        day={joinDay} month={joinMonth} year={joinYear}
        onDay={setJoinDay} onMonth={setJoinMonth} onYear={setJoinYear}
        bn={bn}
      />

      {/* Delivery date (shown second) */}
      <DateFieldGroup
        label={bn ? 'প্রসবের তারিখ (বা প্রত্যাশিত তারিখ)' : 'Delivery date (or expected date)'}
        day={delivDay} month={delivMonth} year={delivYear}
        onDay={setDelivDay} onMonth={setDelivMonth} onYear={setDelivYear}
        bn={bn}
      />

      {/* Monthly wage */}
      <FloatInput
        label={bn ? 'মাসিক মজুরি (BDT)' : 'Monthly wage (BDT)'}
        accent={A} type="number" placeholder="15000"
        value={monthlyWage}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMonthlyWage(e.target.value)}
        hint={bn ? 'দৈনিক মজুরি = মাসিক মজুরি ÷ ২৬ (ধারা ৪৮)' : 'Daily wage = monthly wage ÷ 26 (Sec 48)'}
      />

      {/* Surviving children */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>
          {bn ? 'বর্তমানে জীবিত সন্তানের সংখ্যা (প্রসবের আগে)' : 'Number of surviving children (before this delivery)'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {['0', '1', '2', '3+'].map(v => (
            <button
              key={v}
              onClick={() => setSurvivingKids(v === '3+' ? '3' : v)}
              style={{
                padding: '12px 6px',
                background: survivingKids === (v === '3+' ? '3' : v) ? A : 'var(--surface)',
                color:      survivingKids === (v === '3+' ? '3' : v) ? '#fff' : 'var(--text2)',
                border:     `1.5px solid ${survivingKids === (v === '3+' ? '3' : v) ? A : 'var(--border)'}`,
                borderRadius: 10, fontWeight: 700, fontSize: 14,
                fontFamily: 'inherit', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >{v}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
          {bn
            ? '* ২ বা তার বেশি জীবিত সন্তান থাকলে সুবিধা প্রযোজ্য নয় (ধারা ৪৬-২)'
            : '* No benefit if 2 or more surviving children (Sec 46-2)'}
        </div>
      </div>

      {/* Results */}
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
              {bn ? 'মাতৃত্বকালীন সুবিধার যোগ্য নন' : 'Not eligible for maternity benefit'}
            </span>
          </div>

          {result.reason === 'service' && (
            <div style={{ fontSize: 13, color: '#fca5a5', lineHeight: 1.7 }}>
              {bn
                ? `যোগদানের তারিখ অনুযায়ী আপনি এই নিয়োগকর্তার অধীনে প্রসবের আগ পর্যন্ত ${result.serviceMonths} মাস কাজ করেছেন। মাতৃত্বকালীন সুবিধা পেতে প্রসবের আগে কমপক্ষে ৬ মাস কাজ করা আবশ্যক। (বাংলাদেশ শ্রম আইন ২০০৬, ধারা ৪৬-১)`
                : `Based on your joining date, you will have worked ${result.serviceMonths} month(s) under this employer before delivery. At least 6 months of service before delivery is required for maternity benefit. (Bangladesh Labour Act 2006, Sec 46-1)`}
            </div>
          )}
          {result.reason === 'children' && (
            <div style={{ fontSize: 13, color: '#fca5a5', lineHeight: 1.7 }}>
              {bn
                ? 'প্রসবের সময় ২ বা তার বেশি জীবিত সন্তান থাকলে মাতৃত্বকালীন আর্থিক সুবিধা প্রযোজ্য নয়, তবে প্রাপ্য ছুটি ভোগ করতে পারবেন। (বাংলাদেশ শ্রম আইন ২০০৬, ধারা ৪৬-২)'
                : 'No cash maternity benefit is payable when 2 or more surviving children already exist at the time of delivery. However, any leave due may still be enjoyed. (Bangladesh Labour Act 2006, Sec 46-2)'}
            </div>
          )}
        </div>
      )}

      {result?.eligible && (
        <>
          {/* Eligibility badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
            background: '#0a2818', border: '2px solid #166534',
            borderRadius: 12, padding: '12px 16px',
          }}>
            <FaCheckCircle color="#4ade80" size={20} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>
              {bn ? 'মাতৃত্বকালীন সুবিধার যোগ্য ✓' : 'Eligible for maternity benefit ✓'}
            </span>
          </div>

          {/* Total benefit */}
          <ResultCard accent={A}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4 }}>
                {bn ? 'মোট মাতৃত্বকালীন সুবিধা' : 'Total Maternity Benefit'}
              </div>
              <div style={{
                fontSize: 'clamp(28px, 8vw, 40px)', fontWeight: 900, color: A, lineHeight: 1.1,
              }}>
                {FN(result.totalBenefit)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                {bn ? `মোট ${result.totalDays} দিনের জন্য` : `For ${result.totalDays} days total`}
              </div>
            </div>

            <StatGrid
              items={[
                [bn ? 'দৈনিক মজুরি'     : 'Daily wage',        `৳${result.avgDailyWage.toFixed(2)}`,   A],
                [bn ? 'প্রসব পূর্ববর্তী' : 'Pre-delivery',      FN(result.preWage),                     '#3b82f6'],
                [bn ? 'প্রসব পরবর্তী'   : 'Post-delivery',     FN(result.postWage),                    '#10b981'],
                [bn ? 'মোট ছুটি'         : 'Total leave',       `${result.totalDays} ${bn ? 'দিন' : 'days'}`, A],
              ]}
              cols={2}
            />
          </ResultCard>

          {/* Leave timeline */}
          <div style={{
            marginTop: 14, background: 'var(--surface)',
            border: `1px solid var(--border)`, borderRadius: 14,
            overflow: 'hidden',
          }}>
            <div style={{
              background: `${A}18`, borderBottom: `1px solid ${A}30`,
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <FaCalendarAlt size={14} color={A} />
              <span style={{ fontWeight: 800, fontSize: 13, color: A }}>
                {bn ? 'ছুটির সময়সূচি' : 'Leave Schedule'}
              </span>
            </div>
            {[
              {
                icon: '🔵',
                label: bn ? `প্রসব পূর্ববর্তী ছুটি শুরু (${result.preDays} দিন)` : `Pre-delivery leave starts (${result.preDays} days)`,
                date: result.leaveStart,
                color: '#3b82f6',
              },
              {
                icon: '🩷',
                label: bn ? 'প্রত্যাশিত প্রসবের তারিখ' : 'Expected delivery date',
                date: result.deliveryDate,
                color: A,
              },
              {
                icon: '🟢',
                label: bn ? `প্রসব পরবর্তী ছুটি শেষ (${result.postDays} দিন)` : `Post-delivery leave ends (${result.postDays} days)`,
                date: result.leaveEnd,
                color: '#10b981',
              },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 14px',
                borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ fontSize: 13, color: row.color, fontWeight: 600 }}>
                  {row.icon} {row.label}
                </div>
                <div style={{
                  fontWeight: 800, fontSize: 13, color: row.color,
                  fontFamily: 'monospace', flexShrink: 0, marginLeft: 8,
                }}>
                  {formatDate(row.date, bn)}
                </div>
              </div>
            ))}
          </div>

          {/* Payment rules */}
          <div style={{
            marginTop: 14, background: 'var(--surface)',
            border: `1px solid var(--border)`, borderRadius: 14,
            overflow: 'hidden',
          }}>
            <div style={{
              background: `${A}18`, borderBottom: `1px solid ${A}30`,
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <FaMoneyBillWave size={14} color={A} />
              <span style={{ fontWeight: 800, fontSize: 13, color: A }}>
                {bn ? 'পেমেন্ট পদ্ধতি (ধারা ৪৭)' : 'Payment Options (Sec 47)'}
              </span>
            </div>
            {[
              {
                opt: bn ? 'বিকল্প ক' : 'Option A',
                desc: bn
                  ? 'ডাক্তারি সনদ দিলে প্রসব পূর্ববর্তী ৬০ দিনের বেতন ৩ কার্যদিবসের মধ্যে। বাকি অংশ প্রসব প্রমাণের ৩ দিনের মধ্যে।'
                  : 'On doctor\'s certificate: pre-delivery 60-day benefit within 3 working days. Remaining within 3 days of birth proof.',
              },
              {
                opt: bn ? 'বিকল্প খ' : 'Option B',
                desc: bn
                  ? 'প্রসব প্রমাণের ৩ কার্যদিবসের মধ্যে প্রসব পর্যন্ত ৬০ দিনের বেতন। বাকি ৬০ দিন পরে।'
                  : 'Within 3 working days of birth proof: pay up to delivery. Remaining 60 days later.',
              },
              {
                opt: bn ? 'বিকল্প গ' : 'Option C',
                desc: bn
                  ? 'পুরো মেয়াদের সম্পূর্ণ বেতন প্রসব প্রমাণের ৩ কার্যদিবসের মধ্যে একসাথে।'
                  : 'Full benefit for the entire period paid within 3 working days of birth proof.',
              },
            ].map((row, i) => (
              <div key={i} style={{
                padding: '12px 14px',
                borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <div style={{
                  background: `${A}20`, color: A, borderRadius: 6,
                  padding: '2px 8px', fontSize: 10, fontWeight: 800,
                  flexShrink: 0, marginTop: 2,
                }}>
                  {row.opt}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
                  {row.desc}
                </div>
              </div>
            ))}
            <div style={{
              padding: '10px 14px', background: 'var(--surface2)',
              fontSize: 11, color: 'var(--text3)', lineHeight: 1.6,
            }}>
              <FaBaby size={11} color={A} style={{ marginRight: 5 }} />
              {bn
                ? 'প্রসবের ৩ মাসের মধ্যে প্রমাণ দাখিল না করলে সুবিধা পাওয়া যাবে না। (ধারা ৪৭-৪)'
                : 'Proof of birth must be submitted within 3 months of delivery. (Sec 47-4)'}
            </div>
          </div>

          {/* Termination protection */}
          <div style={{
            marginTop: 14, background: '#1a0a05',
            border: '1px solid #7c2d12', borderRadius: 12,
            padding: '12px 14px',
          }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#fb923c', marginBottom: 6 }}>
              🛡️ {bn ? 'চাকরি সুরক্ষা (ধারা ৫০)' : 'Job Protection (Sec 50)'}
            </div>
            <div style={{ fontSize: 12, color: '#fed7aa', lineHeight: 1.7 }}>
              {bn
                ? 'প্রসবের ৬ মাস আগে থেকে এবং ৮ সপ্তাহ পরে পর্যন্ত — যথাযথ কারণ ছাড়া ছাঁটাই, বরখাস্ত বা চাকরি থেকে অপসারণ করা হলে — নিয়োগকর্তা মাতৃত্বকালীন সুবিধা থেকে বঞ্চিত করতে পারবেন না।'
                : 'During 6 months before delivery and 8 weeks after — if employer discharges, dismisses or removes the worker without sufficient cause — she remains entitled to full maternity benefit.'}
            </div>
          </div>
        </>
      )}
    </CalcShell>
  );
}