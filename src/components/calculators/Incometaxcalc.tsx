import { useState } from 'react';
import { FloatInput, ToggleGroup, ResultCard } from '../ui';
import CalcShell from '../CalcShell';
import type { CalcProps } from '../../utils/constants.ts';
import { useLang } from '../../context/LangContext.tsx';
import { shareWA, buildShare } from '../../utils/share.ts';

const A = '#2980b9';

// FY2026-27 tax-free thresholds (per NBR / national budget, June 2026)
const FREE_LIMITS: Record<string, number> = {
  general: 375000,
  womenSenior: 425000,
  thirdGenderDisabled: 500000,
  freedomFighter: 525000,
};

// FY2026-27 slab structure (5% bracket abolished)
const BRACKETS: [number, number][] = [
  [300000, 0.10],
  [400000, 0.15],
  [500000, 0.20],
  [2000000, 0.25],
  [Infinity, 0.30],
];

const MIN_TAX: Record<string, number> = {
  metro: 5000,
  otherCity: 4000,
  outside: 3000,
};

type Row = { label: string; base: number; amount: number };

export default function IncomeTaxCalc({ history, onAdd, onClear }: CalcProps) {
  const { t } = useLang();
  const x = t.incometax;

  const [category, setCategory] = useState<'general' | 'womenSenior' | 'thirdGenderDisabled' | 'freedomFighter'>('general');
  const [location, setLocation] = useState<'metro' | 'otherCity' | 'outside'>('metro');
  const [income, setIncome] = useState('');
  const [investment, setInvestment] = useState('');
  const [result, setResult] = useState<any>(null);

  const calc = () => {
    const P = parseFloat(income);
    if (!P || P < 0) { setResult({ error: t.fillFields }); return; }

    const free = FREE_LIMITS[category];
    const excess = Math.max(0, P - free);
    const rows: Row[] = [];
    let grossTax = 0;
    let remaining = excess;

    for (const [size, rate] of BRACKETS) {
      if (remaining <= 0) break;
      const portion = Math.min(remaining, size);
      const amt = portion * rate;
      grossTax += amt;
      if (portion > 0) rows.push({ label: `${(rate * 100).toFixed(0)}%`, base: portion, amount: amt });
      remaining -= portion;
    }

    const inv = parseFloat(investment) || 0;
    const rebateBase = Math.min(inv, P * 0.03, 1000000);
    const rebate = rebateBase * 0.15;

    let netTax = Math.max(0, grossTax - rebate);
    let minApplied = false;
    if (P > free) {
      const floor = MIN_TAX[location];
      if (netTax < floor) { netTax = floor; minApplied = true; }
    }

    setResult({ free, excess, rows, grossTax, rebate, netTax, minApplied });
    onAdd('incometax', `${x.title} — ${x.income} ${P} -> ${x.netPayable} ${netTax.toFixed(2)}`);
  };

  const share = result && !result.error
    ? buildShare(x.title, [
        `${x.taxFreeLimit}: ${result.free}`,
        `${x.grossTax}: ${result.grossTax.toFixed(2)}`,
        `${x.rebate}: ${result.rebate.toFixed(2)}`,
        `${x.netPayable}: ${result.netTax.toFixed(2)}`,
      ])
    : null;

  return (
    <CalcShell
      accent={A}
      onCalc={calc}
      calcLabel={t.calculate}
      hasResult={!!(result && !result.error)}
      onShare={() => share && shareWA(share)}
      history={history}
      onClear={() => onClear?.('incometax')}
      historyLabel={t.history}
      clearLabel={t.clearHistory}
    >
      <ToggleGroup
        options={[
          ['general', x.general],
          ['womenSenior', x.womenSenior],
          ['thirdGenderDisabled', x.thirdGenderDisabled],
          ['freedomFighter', x.freedomFighter],
        ]}
        value={category}
        onChange={(v: any) => setCategory(v)}
        accent={A}
      />

      <FloatInput
        label={x.income}
        accent={A}
        type="number"
        placeholder="800000"
        value={income}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIncome(e.target.value)}
      />

      <FloatInput
        label={x.investment}
        accent={A}
        type="number"
        placeholder="0"
        hint={x.investmentHint}
        value={investment}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInvestment(e.target.value)}
      />

      <ToggleGroup
        options={[
          ['metro', x.metro],
          ['otherCity', x.otherCity],
          ['outside', x.outside],
        ]}
        value={location}
        onChange={(v: any) => setLocation(v)}
        accent={A}
      />

      {result && !result.error && (
        <ResultCard accent={A}>
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>
              {x.netPayable}
            </div>
            <div style={{ fontSize: 'clamp(30px,7vw,40px)', fontWeight: 900, color: A, lineHeight: 1.2, wordBreak: 'break-word' }}>
              {result.netTax.toFixed(2)}
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 8 }}>
            {x.taxFreeLimit}: {result.free.toLocaleString()} | {x.taxableIncome}: {result.excess.toLocaleString()}
          </div>

          {result.rows.map((r: Row, i: number) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13,
            }}>
              <span style={{ color: 'var(--text2)' }}>{r.label} {x.of} {r.base.toLocaleString()}</span>
              <span style={{ fontWeight: 700, color: 'var(--text1)' }}>{r.amount.toFixed(2)}</span>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 2px', fontSize: 13, fontWeight: 700 }}>
            <span style={{ color: 'var(--text2)' }}>{x.grossTax}</span>
            <span style={{ color: 'var(--text1)' }}>{result.grossTax.toFixed(2)}</span>
          </div>
          {result.rebate > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 13, fontWeight: 700 }}>
              <span style={{ color: '#10b981' }}>{x.rebate} ({x.approx})</span>
              <span style={{ color: '#10b981' }}>-{result.rebate.toFixed(2)}</span>
            </div>
          )}
          {result.minApplied && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#f39c12', textAlign: 'center' }}>
              {x.minTaxNote}
            </div>
          )}
        </ResultCard>
      )}
      {result?.error && <div style={{ color: '#ef4444', fontSize: 14, marginTop: 10, fontWeight: 600 }}>{result.error}</div>}

      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.5 }}>
        {x.disclaimer}
      </div>
    </CalcShell>
  );
}