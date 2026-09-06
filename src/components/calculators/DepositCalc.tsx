import { useState } from 'react';
import { FloatInput, ToggleGroup, ResultCard, StatGrid } from '../ui';
import CalcShell from '../CalcShell';
import type { CalcProps } from '../../utils/constants.ts';
import { useLang } from '../../context/LangContext.tsx';
import { shareWA, buildShare } from '../../utils/share.ts';

const A = '#16a085';

export default function DepositCalc({ history, onAdd, onClear }: CalcProps) {
  const { t } = useLang();
  const d = t.deposit;

  const [mode, setMode]       = useState<'fdr' | 'dps'>('fdr');
  const [amount, setAmount]   = useState('');
  const [rate, setRate]       = useState('');
  const [years, setYears]     = useState('');
  const [result, setResult]   = useState<any>(null);

  const calc = () => {
    const A_ = parseFloat(amount);
    const r  = parseFloat(rate);
    const y  = parseFloat(years);

    if (!A_ || A_ <= 0 || !r || r < 0 || !y || y <= 0) {
      setResult({ error: t.fillFields });
      return;
    }

    let maturity: number, interest: number, deposited: number;

    if (mode === 'fdr') {
      // Lump-sum, compounded quarterly (standard bank FDR practice)
      const n = 4; // quarterly
      deposited = A_;
      maturity  = A_ * Math.pow(1 + r / 100 / n, n * y);
      interest  = maturity - deposited;
    } else {
      // DPS — fixed monthly deposit, monthly compounding (future value of annuity)
      const months = y * 12;
      const i = r / 100 / 12;
      deposited = A_ * months;
      maturity  = i === 0
        ? deposited
        : A_ * ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
      interest  = maturity - deposited;
    }

    setResult({
      deposited: deposited.toFixed(2),
      maturity:  maturity.toFixed(2),
      interest:  interest.toFixed(2),
    });

    onAdd('deposit', `${mode.toUpperCase()} ${amount} @ ${rate}% / ${years}yr -> Maturity ${maturity.toFixed(2)}`);
  };

  const pPct = result && !result.error
    ? Math.round(parseFloat(result.deposited) / parseFloat(result.maturity) * 100)
    : 0;

  const share = result && !result.error
    ? buildShare(mode === 'fdr' ? 'FDR' : 'DPS', [
        `${d.depositAmount}: ${amount}`,
        `${d.interestRate}: ${rate}%`,
        `${d.duration}: ${years}${d.years}`,
        `${d.maturityAmount}: ${result.maturity}`,
        `${d.totalInterest}: ${result.interest}`,
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
      onClear={() => onClear?.('deposit')}
      historyLabel={t.history}
      clearLabel={t.clearHistory}
    >
      <ToggleGroup
        options={[['fdr', d.fdr], ['dps', d.dps]]}
        value={mode}
        onChange={(v: 'fdr' | 'dps') => { setMode(v); setResult(null); }}
        accent={A}
      />

      <FloatInput
        label={mode === 'fdr' ? d.depositAmount : d.monthlyDeposit}
        accent={A}
        type="number"
        placeholder="100000"
        value={amount}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
      />
      <FloatInput
        label={d.interestRate}
        accent={A}
        type="number"
        placeholder="8.5"
        value={rate}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRate(e.target.value)}
      />
      <FloatInput
        label={d.duration}
        accent={A}
        type="number"
        placeholder="3"
        value={years}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setYears(e.target.value)}
      />

      {result && !result.error && (
        <ResultCard accent={A}>
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>
              {d.maturityAmount}
            </div>
            <div style={{ fontSize: 'clamp(30px,7vw,40px)', fontWeight: 900, color: A, lineHeight: 1.2, wordBreak: 'break-word' }}>
              {result.maturity}
            </div>
          </div>
          <StatGrid items={[
            [mode === 'fdr' ? d.depositAmount : d.totalDeposited, result.deposited, A],
            [d.totalInterest, result.interest, '#ef4444'],
            [d.maturityAmount, result.maturity, '#10b981'],
          ]} cols={3} />
          <div style={{ marginTop: 10, background: 'var(--surface2)', borderRadius: 8, height: 10, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: pPct + '%', background: A, borderRadius: '8px 0 0 8px' }} />
            <div style={{ flex: 1, background: '#7f1d1d' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
            <span>{d.principal} {pPct}%</span><span>{d.totalInterest} {100 - pPct}%</span>
          </div>
        </ResultCard>
      )}
      {result?.error && <div style={{ color: '#ef4444', fontSize: 14, marginTop: 10, fontWeight: 600 }}>{result.error}</div>}
    </CalcShell>
  );
}