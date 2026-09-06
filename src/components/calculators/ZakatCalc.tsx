import { useState } from 'react';
import { FloatInput, ToggleGroup, ResultCard, StatGrid } from '../ui';
import CalcShell from '../CalcShell';
import type { CalcProps } from '../../utils/constants.ts';
import { useLang } from '../../context/LangContext.tsx';
import { shareWA, buildShare } from '../../utils/share.ts';

const A = '#2f9e44';

// Standard Nisab weights (Islamic jurisprudence)
const NISAB_GOLD_GRAMS   = 87.48;  // ~7.5 tola
const NISAB_SILVER_GRAMS = 612.36; // ~52.5 tola
const ZAKAT_RATE = 0.025; // 2.5%

export default function ZakatCalc({ history, onAdd, onClear }: CalcProps) {
  const { t } = useLang();
  const z = t.zakat;

  const [standard, setStandard] = useState<'gold' | 'silver'>('gold');
  const [pricePerGram, setPricePerGram] = useState('');
  const [cash, setCash]               = useState('');
  const [goldValue, setGoldValue]     = useState('');
  const [silverValue, setSilverValue] = useState('');
  const [business, setBusiness]       = useState('');
  const [liabilities, setLiabilities] = useState('');
  const [result, setResult] = useState<any>(null);

  const calc = () => {
    const price = parseFloat(pricePerGram) || 0;
    const c  = parseFloat(cash) || 0;
    const g  = parseFloat(goldValue) || 0;
    const s  = parseFloat(silverValue) || 0;
    const b  = parseFloat(business) || 0;
    const l  = parseFloat(liabilities) || 0;

    if (price <= 0) { setResult({ error: t.fillFields }); return; }

    const totalAssets = c + g + s + b;
    const netWealth    = totalAssets - l;
    const nisabWeight  = standard === 'gold' ? NISAB_GOLD_GRAMS : NISAB_SILVER_GRAMS;
    const nisabValue   = price * nisabWeight;
    const eligible     = netWealth >= nisabValue;
    const zakat        = eligible && netWealth > 0 ? netWealth * ZAKAT_RATE : 0;

    setResult({
      netWealth:  netWealth.toFixed(2),
      nisabValue: nisabValue.toFixed(2),
      zakat:      zakat.toFixed(2),
      eligible,
    });

    onAdd('zakat', eligible
      ? `${standard.toUpperCase()} Nisab — Net ${netWealth.toFixed(2)} -> Zakat ${zakat.toFixed(2)}`
      : `${standard.toUpperCase()} Nisab — Below threshold (${netWealth.toFixed(2)} < ${nisabValue.toFixed(2)})`);
  };

  const share = result && !result.error
    ? buildShare(z.title, [
        `${z.netWealth}: ${result.netWealth}`,
        `${z.nisabValue}: ${result.nisabValue}`,
        `${z.zakatPayable}: ${result.zakat}`,
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
      onClear={() => onClear?.('zakat')}
      historyLabel={t.history}
      clearLabel={t.clearHistory}
    >
      <ToggleGroup
        options={[['gold', z.goldStandard], ['silver', z.silverStandard]]}
        value={standard}
        onChange={(v: 'gold' | 'silver') => { setStandard(v); setResult(null); }}
        accent={A}
      />

      <FloatInput
        label={standard === 'gold' ? z.goldPricePerGram : z.silverPricePerGram}
        accent={A}
        type="number"
        placeholder="8500"
        hint={z.nisabHint}
        value={pricePerGram}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPricePerGram(e.target.value)}
      />
      <FloatInput
        label={z.cash}
        accent={A}
        type="number"
        placeholder="50000"
        value={cash}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCash(e.target.value)}
      />
      <FloatInput
        label={z.goldValue}
        accent={A}
        type="number"
        placeholder="0"
        value={goldValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGoldValue(e.target.value)}
      />
      <FloatInput
        label={z.silverValue}
        accent={A}
        type="number"
        placeholder="0"
        value={silverValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSilverValue(e.target.value)}
      />
      <FloatInput
        label={z.businessAssets}
        accent={A}
        type="number"
        placeholder="0"
        value={business}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBusiness(e.target.value)}
      />
      <FloatInput
        label={z.liabilities}
        accent={A}
        type="number"
        placeholder="0"
        value={liabilities}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLiabilities(e.target.value)}
      />

      {result && !result.error && (
        <ResultCard accent={A}>
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>
              {result.eligible ? z.zakatPayable : z.notObligatory}
            </div>
            <div style={{
              fontSize: 'clamp(30px,7vw,40px)', fontWeight: 900,
              color: result.eligible ? A : 'var(--text3)',
              lineHeight: 1.2, wordBreak: 'break-word',
            }}>
              {result.eligible ? result.zakat : '0.00'}
            </div>
          </div>
          <StatGrid items={[
            [z.netWealth,  result.netWealth,  A],
            [z.nisabValue, result.nisabValue, '#f39c12'],
            [z.zakatPayable, result.eligible ? result.zakat : '0.00', '#10b981'],
          ]} cols={3} />
          {!result.eligible && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.5 }}>
              {z.belowNisabNote}
            </div>
          )}
        </ResultCard>
      )}
      {result?.error && <div style={{ color: '#ef4444', fontSize: 14, marginTop: 10, fontWeight: 600 }}>{result.error}</div>}
    </CalcShell>
  );
}