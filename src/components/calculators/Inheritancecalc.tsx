import { useState } from 'react';
import { FloatInput, ToggleGroup, ResultCard } from '../ui';
import CalcShell from '../CalcShell';
import type { CalcProps } from '../../utils/constants.ts';
import { useLang } from '../../context/LangContext.tsx';
import { shareWA, buildShare } from '../../utils/share.ts';

const A = '#6c5ce7';

type Row = { label: string; amount: number; note?: string };

export default function InheritanceCalc({ history, onAdd, onClear }: CalcProps) {
  const { t } = useLang();
  const h = t.inheritance;

  const [religion, setReligion] = useState<'muslim' | 'hindu'>('muslim');
  const [property, setProperty] = useState('');

  // Muslim fields
  const [spouseType, setSpouseType] = useState<'none' | 'husband' | 'wife'>('none');
  const [wivesCount, setWivesCount] = useState('1');
  const [sons, setSons] = useState('');
  const [daughters, setDaughters] = useState('');
  const [fatherAlive, setFatherAlive] = useState<'yes' | 'no'>('no');
  const [motherAlive, setMotherAlive] = useState<'yes' | 'no'>('no');

  // Hindu fields
  const [hSons, setHSons] = useState('');
  const [hDaughters, setHDaughters] = useState('');
  const [widowAlive, setWidowAlive] = useState<'yes' | 'no'>('no');

  const [result, setResult] = useState<{ rows: Row[]; note?: string; error?: string } | null>(null);

  const calcMuslim = (P: number) => {
    const sonsN = parseInt(sons) || 0;
    const daughtersN = parseInt(daughters) || 0;
    const wives = Math.max(1, parseInt(wivesCount) || 1);
    const father = fatherAlive === 'yes';
    const mother = motherAlive === 'yes';
    const hasChildren = sonsN > 0 || daughtersN > 0;

    const spouseFrac =
      spouseType === 'husband' ? (hasChildren ? 0.25 : 0.5) :
      spouseType === 'wife'    ? (hasChildren ? 0.125 : 0.25) : 0;

    const rows: Row[] = [];
    let note: string | undefined;

    if (spouseType !== 'none') {
      const amt = spouseFrac * P;
      if (spouseType === 'husband') rows.push({ label: h.husband, amount: amt });
      else rows.push({ label: `${h.wife} (${wives})`, amount: amt, note: `${h.each}: ${(amt / wives).toFixed(2)}` });
    }

    if (sonsN > 0) {
      // Sons present -> residuary; father/mother get fixed 1/6 only
      const fatherFixed = father ? P / 6 : 0;
      const motherFixed = mother ? P / 6 : 0;
      const fixedTotal = spouseFrac * P + fatherFixed + motherFixed;
      const residue = Math.max(0, P - fixedTotal);
      const units = sonsN * 2 + daughtersN;
      const perUnit = units > 0 ? residue / units : 0;

      if (father) rows.push({ label: h.father, amount: fatherFixed });
      if (mother) rows.push({ label: h.mother, amount: motherFixed });
      rows.push({ label: `${h.son} (${sonsN})`, amount: perUnit * 2 * sonsN, note: `${h.each}: ${(perUnit * 2).toFixed(2)}` });
      if (daughtersN > 0) rows.push({ label: `${h.daughter} (${daughtersN})`, amount: perUnit * daughtersN, note: `${h.each}: ${perUnit.toFixed(2)}` });

    } else if (daughtersN > 0) {
      // Daughters only -> fixed Quranic share (1/2 or 2/3), father is residuary if alive
      const daughtersFrac = daughtersN === 1 ? 0.5 : (2 / 3);
      const fatherFixedFrac = father ? (1 / 6) : 0;
      const motherFrac = mother ? (1 / 6) : 0;
      const sumFixed = spouseFrac + fatherFixedFrac + motherFrac + daughtersFrac;

      let spouseAmt = spouseFrac * P, fatherAmt = 0, motherAmt = 0, daughtersTotal = 0;

      if (sumFixed >= 1) {
        // AWL — proportionally scale all fixed shares down
        const scale = 1 / sumFixed;
        spouseAmt = spouseFrac * scale * P;
        fatherAmt = fatherFixedFrac * scale * P;
        motherAmt = motherFrac * scale * P;
        daughtersTotal = daughtersFrac * scale * P;
        note = h.awlNote;
      } else {
        const residueFrac = 1 - sumFixed;
        if (father) {
          fatherAmt = fatherFixedFrac * P + residueFrac * P; // father absorbs residue
          motherAmt = motherFrac * P;
          daughtersTotal = daughtersFrac * P;
        } else {
          // RADD among mother & daughters (spouse excluded from radd)
          const nonSpouseSum = motherFrac + daughtersFrac;
          const addFactor = nonSpouseSum > 0 ? residueFrac / nonSpouseSum : 0;
          motherAmt = motherFrac * (1 + addFactor) * P;
          daughtersTotal = daughtersFrac * (1 + addFactor) * P;
          if (residueFrac > 0.0001) note = h.raddNote;
        }
      }

      if (spouseType !== 'none') rows[0].amount = spouseAmt; // update with possible awl-scaled value
      if (father) rows.push({ label: h.father, amount: fatherAmt });
      if (mother) rows.push({ label: h.mother, amount: motherAmt });
      rows.push({ label: `${h.daughter} (${daughtersN})`, amount: daughtersTotal, note: `${h.each}: ${(daughtersTotal / daughtersN).toFixed(2)}` });

    } else {
      // No children at all
      const spouseAmt = spouseFrac * P;
      let fatherAmt = 0, motherAmt = 0;

      if (father && mother) {
        // Umariyyatain: mother = 1/3 of remainder after spouse, father = rest
        const remainder = P - spouseAmt;
        motherAmt = remainder / 3;
        fatherAmt = remainder - motherAmt;
      } else if (mother) {
        const remainder = P - spouseAmt;
        motherAmt = remainder; // sole sharer left absorbs all via radd
      } else if (father) {
        fatherAmt = P - spouseAmt; // sole residuary absorbs everything left
      } else if (spouseType !== 'none') {
        const remainder = P - spouseAmt;
        if (remainder > 0.0001) note = h.moreHeirsNote;
      } else {
        note = h.noHeirsNote;
      }

      if (father) rows.push({ label: h.father, amount: fatherAmt });
      if (mother) rows.push({ label: h.mother, amount: motherAmt });
    }

    return { rows, note };
  };

  const calcHindu = (P: number) => {
    const sonsN = parseInt(hSons) || 0;
    const daughtersN = parseInt(hDaughters) || 0;
    const widow = widowAlive === 'yes';
    const rows: Row[] = [];
    let note: string | undefined = h.hinduDisclaimer;

    if (sonsN > 0) {
      const each = P / sonsN;
      rows.push({ label: `${h.son} (${sonsN})`, amount: P, note: `${h.each}: ${each.toFixed(2)}` });
    } else if (widow) {
      rows.push({ label: h.widow, amount: P });
    } else if (daughtersN > 0) {
      const each = P / daughtersN;
      rows.push({ label: `${h.daughter} (${daughtersN})`, amount: P, note: `${h.each}: ${each.toFixed(2)}` });
    } else {
      note = h.noHeirsNote;
    }

    return { rows, note };
  };

  const calc = () => {
    const P = parseFloat(property);
    if (!P || P <= 0) { setResult({ rows: [], error: t.fillFields }); return; }

    const res = religion === 'muslim' ? calcMuslim(P) : calcHindu(P);
    setResult(res);

    const summary = res.rows.map(r => `${r.label}: ${r.amount.toFixed(2)}`).join(', ');
    onAdd('inheritance', `${religion === 'muslim' ? h.muslimLaw : h.hinduLaw} — ${h.propertyValue} ${P} -> ${summary}`);
  };

  const share = result && !result.error && result.rows.length > 0
    ? buildShare(h.title, result.rows.map(r => `${r.label}: ${r.amount.toFixed(2)}`))
    : null;

  return (
    <CalcShell
      accent={A}
      onCalc={calc}
      calcLabel={t.calculate}
      hasResult={!!(result && !result.error && result.rows.length > 0)}
      onShare={() => share && shareWA(share)}
      history={history}
      onClear={() => onClear?.('inheritance')}
      historyLabel={t.history}
      clearLabel={t.clearHistory}
    >
      <ToggleGroup
        options={[['muslim', h.muslimLaw], ['hindu', h.hinduLaw]]}
        value={religion}
        onChange={(v: 'muslim' | 'hindu') => { setReligion(v); setResult(null); }}
        accent={A}
      />

      <FloatInput
        label={h.propertyValue}
        accent={A}
        type="number"
        placeholder="1000000"
        value={property}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProperty(e.target.value)}
      />

      {religion === 'muslim' ? (
        <>
          <ToggleGroup
            options={[['none', h.none], ['husband', h.husband], ['wife', h.wife]]}
            value={spouseType}
            onChange={(v: 'none' | 'husband' | 'wife') => setSpouseType(v)}
            accent={A}
          />
          {spouseType === 'wife' && (
            <FloatInput
              label={h.wivesCount}
              accent={A}
              type="number"
              placeholder="1"
              value={wivesCount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWivesCount(e.target.value)}
            />
          )}
          <FloatInput
            label={h.sons}
            accent={A}
            type="number"
            placeholder="0"
            value={sons}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSons(e.target.value)}
          />
          <FloatInput
            label={h.daughters}
            accent={A}
            type="number"
            placeholder="0"
            value={daughters}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDaughters(e.target.value)}
          />
          <ToggleGroup
            options={[['no', h.fatherAlive + ': ' + h.no], ['yes', h.fatherAlive + ': ' + h.yes]]}
            value={fatherAlive}
            onChange={(v: 'yes' | 'no') => setFatherAlive(v)}
            accent={A}
          />
          <ToggleGroup
            options={[['no', h.motherAlive + ': ' + h.no], ['yes', h.motherAlive + ': ' + h.yes]]}
            value={motherAlive}
            onChange={(v: 'yes' | 'no') => setMotherAlive(v)}
            accent={A}
          />
        </>
      ) : (
        <>
          <FloatInput
            label={h.sons}
            accent={A}
            type="number"
            placeholder="0"
            value={hSons}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHSons(e.target.value)}
          />
          <FloatInput
            label={h.daughters}
            accent={A}
            type="number"
            placeholder="0"
            value={hDaughters}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHDaughters(e.target.value)}
          />
          <ToggleGroup
            options={[['no', h.widowAlive + ': ' + h.no], ['yes', h.widowAlive + ': ' + h.yes]]}
            value={widowAlive}
            onChange={(v: 'yes' | 'no') => setWidowAlive(v)}
            accent={A}
          />
        </>
      )}

      {result && !result.error && result.rows.length > 0 && (
        <ResultCard accent={A}>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 10, textAlign: 'center' }}>
            {h.distribution}
          </div>
          {result.rows.map((r, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              padding: '8px 0', borderBottom: i < result.rows.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{r.label}</div>
                {r.note && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.note}</div>}
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: A }}>{r.amount.toFixed(2)}</div>
            </div>
          ))}
          {result.note && (
            <div style={{ marginTop: 12, fontSize: 12, color: '#f39c12', textAlign: 'center', lineHeight: 1.5 }}>
              {result.note}
            </div>
          )}
        </ResultCard>
      )}
      {result?.error && <div style={{ color: '#ef4444', fontSize: 14, marginTop: 10, fontWeight: 600 }}>{result.error}</div>}

      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.5 }}>
        {h.disclaimer}
      </div>
    </CalcShell>
  );
}