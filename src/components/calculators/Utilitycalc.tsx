import { useState } from 'react';
import { FloatInput, ToggleGroup, ResultCard } from '../ui';
import CalcShell from '../CalcShell';
import type { CalcProps } from '../../utils/constants.ts';
import { useLang } from '../../context/LangContext.tsx';
import { shareWA, buildShare } from '../../utils/share.ts';

const A = '#f1c40f';

// Default residential electricity slab rates (BDT/kWh) — post June 2026 BERC tariff hike (approximate)
const ELEC_SLABS: [number, number][] = [
  [75, 5.26],
  [125, 8.50],   // 76-200
  [100, 9.10],   // 201-300
  [100, 9.62],   // 301-400
  [200, 15.01],  // 401-600
  [Infinity, 17.35], // 601+
];
const ELEC_VAT = 0.05;

const GAS_FLAT: Record<'single' | 'double', number> = { single: 990, double: 1080 };
const GAS_METERED_RATE = 12.60; // BDT per cubic metre (last confirmed rate)
const WATER_RATE = 18; // BDT per 1000L unit (approximate, varies by WASA authority)

type Row = { label: string; amount: number };

export default function UtilityCalc({ history, onAdd, onClear }: CalcProps) {
  const { t } = useLang();
  const u = t.utility;

  const [category, setCategory] = useState<'electricity' | 'gas' | 'water'>('electricity');

  // Electricity
  const [units, setUnits] = useState('');
  const [overrideRate, setOverrideRate] = useState('');

  // Gas
  const [gasMode, setGasMode] = useState<'flat' | 'metered'>('flat');
  const [burner, setBurner] = useState<'single' | 'double'>('single');
  const [gasUnits, setGasUnits] = useState('');
  const [gasRate, setGasRate] = useState(String(GAS_METERED_RATE));

  // Water
  const [waterUnits, setWaterUnits] = useState('');
  const [waterRate, setWaterRate] = useState(String(WATER_RATE));

  const [result, setResult] = useState<{ rows: Row[]; total: number; error?: string } | null>(null);

  const calcElectricity = () => {
    const kwh = parseFloat(units);
    if (!kwh || kwh <= 0) return { rows: [], total: 0, error: t.fillFields };

    const flatRate = parseFloat(overrideRate) || 0;
    const rows: Row[] = [];
    let subtotal = 0;

    if (flatRate > 0) {
      subtotal = kwh * flatRate;
      rows.push({ label: `${kwh} ${u.units} × ${flatRate}`, amount: subtotal });
    } else {
      let remaining = kwh;
      for (const [size, rate] of ELEC_SLABS) {
        if (remaining <= 0) break;
        const portion = Math.min(remaining, size);
        const amt = portion * rate;
        rows.push({ label: `${portion.toFixed(0)} ${u.units} × ${rate}`, amount: amt });
        subtotal += amt;
        remaining -= portion;
      }
    }
    const vat = subtotal * ELEC_VAT;
    rows.push({ label: `${u.vat} (5%)`, amount: vat });
    return { rows, total: subtotal + vat };
  };

  const calcGas = () => {
    const rows: Row[] = [];
    if (gasMode === 'flat') {
      const amt = GAS_FLAT[burner];
      rows.push({ label: burner === 'single' ? u.singleBurner : u.doubleBurner, amount: amt });
      return { rows, total: amt };
    } else {
      const gu = parseFloat(gasUnits);
      const rate = parseFloat(gasRate) || GAS_METERED_RATE;
      if (!gu || gu <= 0) return { rows: [], total: 0, error: t.fillFields };
      const amt = gu * rate;
      rows.push({ label: `${gu} m³ × ${rate}`, amount: amt });
      return { rows, total: amt };
    }
  };

  const calcWater = () => {
    const wu = parseFloat(waterUnits);
    const rate = parseFloat(waterRate) || WATER_RATE;
    if (!wu || wu <= 0) return { rows: [], total: 0, error: t.fillFields };
    const amt = wu * rate;
    return { rows: [{ label: `${wu} ${u.waterUnit} × ${rate}`, amount: amt }], total: amt };
  };

  const calc = () => {
    const res = category === 'electricity' ? calcElectricity() : category === 'gas' ? calcGas() : calcWater();
    setResult(res);
    if (!res.error) {
      onAdd('utility', `${u[category]} — ${u.total}: ${res.total.toFixed(2)}`);
    }
  };

  const share = result && !result.error && result.rows.length > 0
    ? buildShare(u[category], [...result.rows.map(r => `${r.label}: ${r.amount.toFixed(2)}`), `${u.total}: ${result.total.toFixed(2)}`])
    : null;

  return (
    <CalcShell
      accent={A}
      onCalc={calc}
      calcLabel={t.calculate}
      hasResult={!!(result && !result.error && result.rows.length > 0)}
      onShare={() => share && shareWA(share)}
      history={history}
      onClear={() => onClear?.('utility')}
      historyLabel={t.history}
      clearLabel={t.clearHistory}
    >
      <ToggleGroup
        options={[['electricity', u.electricity], ['gas', u.gas], ['water', u.water]]}
        value={category}
        onChange={(v: 'electricity' | 'gas' | 'water') => { setCategory(v); setResult(null); }}
        accent={A}
      />

      {category === 'electricity' && (
        <>
          <FloatInput
            label={u.unitsConsumed}
            accent={A}
            type="number"
            placeholder="250"
            value={units}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUnits(e.target.value)}
          />
          <FloatInput
            label={u.overrideRate}
            accent={A}
            type="number"
            placeholder="0"
            hint={u.overrideRateHint}
            value={overrideRate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOverrideRate(e.target.value)}
          />
        </>
      )}

      {category === 'gas' && (
        <>
          <ToggleGroup
            options={[['flat', u.nonMetered], ['metered', u.metered]]}
            value={gasMode}
            onChange={(v: 'flat' | 'metered') => setGasMode(v)}
            accent={A}
          />
          {gasMode === 'flat' ? (
            <ToggleGroup
              options={[['single', u.singleBurner], ['double', u.doubleBurner]]}
              value={burner}
              onChange={(v: 'single' | 'double') => setBurner(v)}
              accent={A}
            />
          ) : (
            <>
              <FloatInput
                label={u.unitsConsumed}
                accent={A}
                type="number"
                placeholder="10"
                value={gasUnits}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGasUnits(e.target.value)}
              />
              <FloatInput
                label={u.ratePerUnit}
                accent={A}
                type="number"
                placeholder={String(GAS_METERED_RATE)}
                value={gasRate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGasRate(e.target.value)}
              />
            </>
          )}
        </>
      )}

      {category === 'water' && (
        <>
          <FloatInput
            label={u.waterUnitsLabel}
            accent={A}
            type="number"
            placeholder="15"
            hint={u.waterUnitHint}
            value={waterUnits}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWaterUnits(e.target.value)}
          />
          <FloatInput
            label={u.ratePerUnit}
            accent={A}
            type="number"
            placeholder={String(WATER_RATE)}
            value={waterRate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWaterRate(e.target.value)}
          />
        </>
      )}

      {result && !result.error && result.rows.length > 0 && (
        <ResultCard accent={A}>
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>
              {u.totalBill}
            </div>
            <div style={{ fontSize: 'clamp(30px,7vw,40px)', fontWeight: 900, color: A, lineHeight: 1.2, wordBreak: 'break-word' }}>
              {result.total.toFixed(2)}
            </div>
          </div>
          {result.rows.map((r, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13,
            }}>
              <span style={{ color: 'var(--text2)' }}>{r.label}</span>
              <span style={{ fontWeight: 700, color: 'var(--text1)' }}>{r.amount.toFixed(2)}</span>
            </div>
          ))}
        </ResultCard>
      )}
      {result?.error && <div style={{ color: '#ef4444', fontSize: 14, marginTop: 10, fontWeight: 600 }}>{result.error}</div>}

      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.5 }}>
        {category === 'electricity' ? u.disclaimerElec : category === 'gas' ? u.disclaimerGas : u.disclaimerWater}
      </div>
    </CalcShell>
  );
}