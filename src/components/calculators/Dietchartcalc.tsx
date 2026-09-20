import { useState } from 'react';
import {
  FaAppleAlt, FaCheckCircle, FaInfoCircle, FaUtensils,
  FaClipboardList, FaChartPie, FaTint, FaExclamationTriangle,
} from 'react-icons/fa';
import { FloatInput, ResultCard, StatGrid } from '../ui';
import type { CalcProps } from '../../utils/constants.ts';
import CalcShell from '../CalcShell';
import { useLang } from '../../context/LangContext.tsx';
import { shareWA, buildShare } from '../../utils/share.ts';

const A = '#65a30d';

/* ──────────────────────────────────────────────────────────────
   Mifflin-St Jeor BMR, activity-scaled TDEE, goal-adjusted target.
   Safety floors (1200 kcal women / 1500 kcal men) follow common
   general nutrition guidance for a minimum sustainable intake —
   not personalised medical advice. See disclaimer in Guidelines tab.
   ────────────────────────────────────────────────────────────── */
const CM_PER_INCH = 2.54;
const KCAL_PER_KG_FAT = 7700; // standard rough approximation
const FLOOR_MALE = 1500;
const FLOOR_FEMALE = 1200;

type Gender = 'male' | 'female';
type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';
type Goal = 'lose' | 'maintain' | 'gain';
type MealCount = '3' | '5';
type DietPref = 'mixed' | 'veg';

const ACTIVITY_MULT: Record<Activity, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryActive: 1.9,
};

const MACRO_SPLIT: Record<Goal, { protein: number; carb: number; fat: number }> = {
  lose:     { protein: 0.30, carb: 0.40, fat: 0.30 },
  maintain: { protein: 0.20, carb: 0.50, fat: 0.30 },
  gain:     { protein: 0.25, carb: 0.50, fat: 0.25 },
};

interface MealSlot { key: string; label: { bn: string; en: string }; pct: number }

const MEALS_3: MealSlot[] = [
  { key: 'breakfast', label: { bn: 'সকালের নাস্তা', en: 'Breakfast' }, pct: 0.30 },
  { key: 'lunch',      label: { bn: 'দুপুরের খাবার', en: 'Lunch' },      pct: 0.40 },
  { key: 'dinner',     label: { bn: 'রাতের খাবার',   en: 'Dinner' },     pct: 0.30 },
];
const MEALS_5: MealSlot[] = [
  { key: 'breakfast', label: { bn: 'সকালের নাস্তা',  en: 'Breakfast' },      pct: 0.25 },
  { key: 'amSnack',   label: { bn: 'সকালের নাস্তা (মধ্য)', en: 'Morning snack' }, pct: 0.10 },
  { key: 'lunch',      label: { bn: 'দুপুরের খাবার',  en: 'Lunch' },          pct: 0.30 },
  { key: 'pmSnack',   label: { bn: 'বিকেলের নাস্তা',  en: 'Afternoon snack' }, pct: 0.10 },
  { key: 'dinner',     label: { bn: 'রাতের খাবার',    en: 'Dinner' },         pct: 0.25 },
];

// Illustrative example items per meal slot — not gram-exact prescriptions.
// Portions should be adjusted to fit the calorie budget shown for that meal.
interface FoodItem { food: { bn: string; en: string }; qty: { bn: string; en: string } }
interface MealOption { items: FoodItem[] }

const FOOD_SUGGESTIONS: Record<string, Record<DietPref, MealOption[]>> = {
  breakfast: {
    mixed: [
      { items: [
        { food: { bn: 'রুটি (মাঝারি, ~৬ ইঞ্চি)', en: 'Roti (medium, ~6")' }, qty: { bn: '২টি', en: '2 pieces' } },
        { food: { bn: 'ডিম',                      en: 'Egg' },                qty: { bn: '১টি', en: '1 piece' } },
      ]},
      { items: [
        { food: { bn: 'ওটস', en: 'Oats' }, qty: { bn: '১ কাপ', en: '1 cup' } },
        { food: { bn: 'দুধ',  en: 'Milk' }, qty: { bn: '১ কাপ', en: '1 cup' } },
        { food: { bn: 'কলা',  en: 'Banana' }, qty: { bn: '১টি', en: '1 piece' } },
      ]},
      { items: [
        { food: { bn: 'চিড়া/মুড়ি', en: 'Flattened / puffed rice' }, qty: { bn: '১ কাপ', en: '1 cup' } },
        { food: { bn: 'দই',         en: 'Yogurt' },                   qty: { bn: '১ কাপ', en: '1 cup' } },
      ]},
    ],
    veg: [
      { items: [
        { food: { bn: 'রুটি (মাঝারি)', en: 'Roti (medium)' }, qty: { bn: '২টি', en: '2 pieces' } },
        { food: { bn: 'সবজি ভাজি',     en: 'Sautéed vegetables' }, qty: { bn: 'আধা কাপ', en: '1/2 cup' } },
      ]},
      { items: [
        { food: { bn: 'ওটস',          en: 'Oats' },              qty: { bn: '১ কাপ', en: '1 cup' } },
        { food: { bn: 'দুধ/সয়া দুধ', en: 'Milk or soy milk' }, qty: { bn: '১ কাপ', en: '1 cup' } },
        { food: { bn: 'বাদাম',        en: 'Nuts' },              qty: { bn: '১ মুঠো (~২৮ গ্রাম)', en: '1 handful (~28g)' } },
      ]},
      { items: [
        { food: { bn: 'ছোলা/মুগ ডালের চিলা', en: 'Chickpea / moong dal chilla' }, qty: { bn: '২টি', en: '2 pieces' } },
      ]},
    ],
  },
  amSnack: {
    mixed: [
      { items: [ { food: { bn: 'মৌসুমি ফল', en: 'Seasonal fruit' }, qty: { bn: '১টি (~১০০ গ্রাম)', en: '1 piece (~100g)' } } ] },
      { items: [ { food: { bn: 'বাদাম',      en: 'Nuts' },          qty: { bn: '১ মুঠো (~২৮ গ্রাম)', en: '1 handful (~28g)' } } ] },
    ],
    veg: [
      { items: [ { food: { bn: 'মৌসুমি ফল', en: 'Seasonal fruit' }, qty: { bn: '১টি (~১০০ গ্রাম)', en: '1 piece (~100g)' } } ] },
      { items: [ { food: { bn: 'বাদাম',      en: 'Nuts' },          qty: { bn: '১ মুঠো (~২৮ গ্রাম)', en: '1 handful (~28g)' } } ] },
    ],
  },
  lunch: {
    mixed: [
      { items: [
        { food: { bn: 'ভাত',        en: 'Rice' },          qty: { bn: '১-১.৫ কাপ', en: '1-1.5 cups' } },
        { food: { bn: 'মাছ/মুরগি',  en: 'Fish / chicken' }, qty: { bn: '১০০-১৫০ গ্রাম', en: '100-150g' } },
        { food: { bn: 'ডাল',        en: 'Dal' },            qty: { bn: '১ বাটি', en: '1 bowl' } },
        { food: { bn: 'সবজি',       en: 'Vegetables' },     qty: { bn: '১ কাপ', en: '1 cup' } },
        { food: { bn: 'সালাদ',      en: 'Salad' },          qty: { bn: 'ইচ্ছেমতো', en: 'as desired' } },
      ]},
      { items: [
        { food: { bn: 'ব্রাউন রাইস', en: 'Brown rice' },  qty: { bn: '১ কাপ', en: '1 cup' } },
        { food: { bn: 'মাছ ভুনা',    en: 'Fish curry' },   qty: { bn: '১৫০ গ্রাম', en: '150g' } },
        { food: { bn: 'শাক',         en: 'Leafy greens' }, qty: { bn: '১ কাপ', en: '1 cup' } },
      ]},
    ],
    veg: [
      { items: [
        { food: { bn: 'ভাত',        en: 'Rice' },      qty: { bn: '১-১.৫ কাপ', en: '1-1.5 cups' } },
        { food: { bn: 'ডাল',        en: 'Dal' },        qty: { bn: '১ বাটি', en: '1 bowl' } },
        { food: { bn: 'মিশ্র সবজি', en: 'Mixed vegetables' }, qty: { bn: '১ কাপ', en: '1 cup' } },
        { food: { bn: 'সালাদ',      en: 'Salad' },      qty: { bn: 'ইচ্ছেমতো', en: 'as desired' } },
      ]},
      { items: [
        { food: { bn: 'ব্রাউন রাইস',    en: 'Brown rice' },       qty: { bn: '১ কাপ', en: '1 cup' } },
        { food: { bn: 'পনির/টফু ভুনা', en: 'Paneer / tofu curry' }, qty: { bn: '১০০ গ্রাম', en: '100g' } },
        { food: { bn: 'শাক',            en: 'Leafy greens' },      qty: { bn: '১ কাপ', en: '1 cup' } },
      ]},
    ],
  },
  pmSnack: {
    mixed: [
      { items: [ { food: { bn: 'দই / দুধ', en: 'Yogurt / milk' }, qty: { bn: '১ কাপ / ১ গ্লাস (~২৫০ মিলি)', en: '1 cup / 1 glass (~250ml)' } } ] },
      { items: [ { food: { bn: 'ছোলা সিদ্ধ', en: 'Boiled chickpeas' }, qty: { bn: 'আধা কাপ', en: '1/2 cup' } } ] },
    ],
    veg: [
      { items: [ { food: { bn: 'দই / দুধ', en: 'Yogurt / milk' }, qty: { bn: '১ কাপ / ১ গ্লাস (~২৫০ মিলি)', en: '1 cup / 1 glass (~250ml)' } } ] },
      { items: [ { food: { bn: 'ছোলা সিদ্ধ', en: 'Boiled chickpeas' }, qty: { bn: 'আধা কাপ', en: '1/2 cup' } } ] },
    ],
  },
  dinner: {
    mixed: [
      { items: [
        { food: { bn: 'রুটি',              en: 'Roti' },                    qty: { bn: '১-২টি', en: '1-2 pieces' } },
        { food: { bn: 'সবজি',              en: 'Vegetables' },              qty: { bn: '১ কাপ', en: '1 cup' } },
        { food: { bn: 'মুরগি/মাছ (হালকা)', en: 'Light-cooked fish/chicken' }, qty: { bn: '৮০-১০০ গ্রাম', en: '80-100g' } },
      ]},
      { items: [
        { food: { bn: 'ভাত',  en: 'Rice' },        qty: { bn: 'আধা কাপ', en: '1/2 cup' } },
        { food: { bn: 'ডাল',  en: 'Dal' },          qty: { bn: '১ বাটি', en: '1 bowl' } },
        { food: { bn: 'সবজি', en: 'Vegetables' },   qty: { bn: '১ কাপ', en: '1 cup' } },
      ]},
    ],
    veg: [
      { items: [
        { food: { bn: 'রুটি',        en: 'Roti' },         qty: { bn: '১-২টি', en: '1-2 pieces' } },
        { food: { bn: 'সবজি',        en: 'Vegetables' },   qty: { bn: '১ কাপ', en: '1 cup' } },
        { food: { bn: 'ডাল (হালকা)', en: 'Light dal' },    qty: { bn: 'আধা বাটি', en: '1/2 bowl' } },
      ]},
      { items: [
        { food: { bn: 'ভাত',  en: 'Rice' },      qty: { bn: 'আধা কাপ', en: '1/2 cup' } },
        { food: { bn: 'ডাল',  en: 'Dal' },        qty: { bn: '১ বাটি', en: '1 bowl' } },
        { food: { bn: 'সবজি', en: 'Vegetables' }, qty: { bn: '১ কাপ', en: '1 cup' } },
      ]},
    ],
  },
};

interface Result {
  eligible: true;
  bmr: number;
  tdee: number;
  rawTarget: number;
  targetCalories: number;
  flooredNote: boolean;
  protein: number; carb: number; fat: number;
  weeklyChangeKg: number;
  meals: MealSlot[];
}
interface ErrorResult { eligible: false; error: string }

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

function PillRow<T extends string>({ options, value, onChange }: {
  options: { id: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: 8 }}>
      {options.map(o => {
        const on = value === o.id;
        return (
          <button
            key={o.id} onClick={() => onChange(o.id)}
            style={{
              padding: '11px 8px', textAlign: 'center',
              background: on ? `${A}1f` : 'var(--surface)',
              border: `1.5px solid ${on ? A : 'var(--border)'}`, borderRadius: 11,
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5,
              color: on ? A : 'var(--text2)', transition: 'all 0.15s',
            }}
          >{o.label}</button>
        );
      })}
    </div>
  );
}

export default function DietChartCalc({ history, onAdd, onClear }: CalcProps) {
  const { lang } = useLang();
  const bn = lang === 'bn';

  const [tab, setTab] = useState<'chart' | 'menu' | 'guide'>('chart');

  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [activity, setActivity] = useState<Activity>('moderate');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [mealCount, setMealCount] = useState<MealCount>('3');
  const [dietPref, setDietPref] = useState<DietPref>('mixed');

  const [result, setResult] = useState<Result | ErrorResult | null>(null);

  const FN = (n: number) => Math.round(n).toLocaleString(bn ? 'bn-BD' : 'en-US');
  const G = (n: number) => `${Math.round(n)}${bn ? ' গ্রাম' : 'g'}`;
  const KCAL = (n: number) => `${FN(n)} kcal`;

  const calc = () => {
    const ageN = parseFloat(age), weightN = parseFloat(weight), heightN = parseFloat(height);
    if (!ageN || !weightN || !heightN || ageN <= 0 || weightN <= 0 || heightN <= 0) {
      setResult({ eligible: false, error: bn ? 'বয়স, ওজন ও উচ্চতা সঠিকভাবে দিন।' : 'Enter valid age, weight, and height.' });
      return;
    }
    if (ageN < 15 || ageN > 90) {
      setResult({ eligible: false, error: bn ? 'এই ক্যালকুলেটর ১৫-৯০ বছর বয়সীদের জন্য প্রযোজ্য।' : 'This calculator is intended for ages 15-90.' });
      return;
    }

    const heightCm = heightN * CM_PER_INCH;
    const bmr = gender === 'male'
      ? 10 * weightN + 6.25 * heightCm - 5 * ageN + 5
      : 10 * weightN + 6.25 * heightCm - 5 * ageN - 161;

    const tdee = bmr * ACTIVITY_MULT[activity];
    const rawTarget = goal === 'lose' ? tdee - 500 : goal === 'gain' ? tdee + 500 : tdee;
    const floor = gender === 'male' ? FLOOR_MALE : FLOOR_FEMALE;
    const targetCalories = Math.max(floor, rawTarget);
    const flooredNote = rawTarget < floor;

    const split = MACRO_SPLIT[goal];
    const protein = (targetCalories * split.protein) / 4;
    const carb    = (targetCalories * split.carb) / 4;
    const fat     = (targetCalories * split.fat) / 9;

    const appliedDelta = targetCalories - tdee; // reflects the floor if it kicked in
    const weeklyChangeKg = (appliedDelta * 7) / KCAL_PER_KG_FAT;

    const meals = mealCount === '3' ? MEALS_3 : MEALS_5;

    const r: Result = { eligible: true, bmr, tdee, rawTarget, targetCalories, flooredNote, protein, carb, fat, weeklyChangeKg, meals };
    setResult(r);
    onAdd('dietchart', `${bn ? 'দৈনিক লক্ষ্য' : 'Daily target'}: ${FN(targetCalories)} kcal`);
  };

  const share = result?.eligible
    ? buildShare(bn ? 'ডায়েট চার্ট' : 'Diet Chart', [
        `${bn ? 'BMR' : 'BMR'}: ${KCAL(result.bmr)}`,
        `${bn ? 'দৈনিক প্রয়োজন (TDEE)' : 'Daily need (TDEE)'}: ${KCAL(result.tdee)}`,
        `${bn ? 'দৈনিক লক্ষ্য' : 'Daily target'}: ${KCAL(result.targetCalories)}`,
        `${bn ? 'প্রোটিন/কার্ব/ফ্যাট' : 'Protein/Carb/Fat'}: ${G(result.protein)} / ${G(result.carb)} / ${G(result.fat)}`,
      ])
    : null;

  const TABS: { id: typeof tab; label: string; icon: React.ReactNode }[] = [
    { id: 'chart', label: bn ? 'চার্ট'         : 'Chart',      icon: <FaChartPie size={11} /> },
    { id: 'menu',  label: bn ? 'খাবার পরামর্শ' : 'Food Ideas', icon: <FaUtensils size={11} /> },
    { id: 'guide', label: bn ? 'নির্দেশনা'      : 'Guidelines', icon: <FaClipboardList size={11} /> },
  ];

  return (
    <CalcShell
      accent={A}
      onCalc={calc}
      calcLabel={bn ? 'হিসাব করুন' : 'Calculate'}
      hasResult={!!(result?.eligible)}
      onShare={() => share && shareWA(share)}
      history={history}
      onClear={() => onClear?.('dietchart')}
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

      {/* ══════════════════ TAB 1 — CHART ══════════════════ */}
      {tab === 'chart' && (
        <>
          <div style={{ background: `${A}15`, border: `1px solid ${A}35`, borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <FaInfoCircle size={15} color={A} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 11, color: A, lineHeight: 1.55 }}>
              {bn
                ? 'Mifflin-St Jeor সূত্র দিয়ে BMR ও কার্যকলাপ অনুযায়ী দৈনিক ক্যালরি প্রয়োজন হিসাব করে, লক্ষ্য অনুযায়ী খাবার চার্ট তৈরি করুন।'
                : 'Calculates BMR (Mifflin-St Jeor) and activity-scaled daily calorie need, then builds a goal-based meal chart.'}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>
              {bn ? 'লিঙ্গ' : 'Gender'}
            </div>
            <PillRow
              options={[
                { id: 'male' as Gender,   label: bn ? 'পুরুষ' : 'Male' },
                { id: 'female' as Gender, label: bn ? 'নারী'  : 'Female' },
              ]}
              value={gender} onChange={setGender}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <FloatInput label={bn ? 'বয়স' : 'Age'} accent={A} type="number" placeholder="28"
              value={age} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAge(e.target.value)} />
            <FloatInput label={bn ? 'ওজন (কেজি)' : 'Weight (kg)'} accent={A} type="number" placeholder="65"
              value={weight} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeight(e.target.value)} />
            <FloatInput label={bn ? 'উচ্চতা (ইঞ্চি)' : 'Height (in)'} accent={A} type="number" placeholder="66"
              value={height} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHeight(e.target.value)} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>
              {bn ? 'কার্যকলাপ স্তর' : 'Activity level'}
            </div>
            <select
              value={activity} onChange={e => setActivity(e.target.value as Activity)}
              style={{ width: '100%', padding: '12px 14px', background: 'var(--surface)', color: 'var(--text)', border: `1.5px solid var(--border)`, borderRadius: 12, fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
            >
              <option value="sedentary">{bn ? 'নিষ্ক্রিয় (ব্যায়াম নেই)' : 'Sedentary (little/no exercise)'}</option>
              <option value="light">{bn ? 'হালকা সক্রিয় (সপ্তাহে ১-৩ দিন)' : 'Lightly active (1-3 days/week)'}</option>
              <option value="moderate">{bn ? 'মাঝারি সক্রিয় (সপ্তাহে ৩-৫ দিন)' : 'Moderately active (3-5 days/week)'}</option>
              <option value="active">{bn ? 'অধিক সক্রিয় (সপ্তাহে ৬-৭ দিন)' : 'Very active (6-7 days/week)'}</option>
              <option value="veryActive">{bn ? 'অত্যধিক সক্রিয় (কায়িক শ্রমের কাজ)' : 'Extra active (physical job/training)'}</option>
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>
              {bn ? 'লক্ষ্য' : 'Goal'}
            </div>
            <PillRow
              options={[
                { id: 'lose' as Goal,     label: bn ? 'ওজন কমানো'  : 'Lose weight' },
                { id: 'maintain' as Goal, label: bn ? 'ধরে রাখা'    : 'Maintain' },
                { id: 'gain' as Goal,     label: bn ? 'ওজন বাড়ানো' : 'Gain weight' },
              ]}
              value={goal} onChange={setGoal}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>
              {bn ? 'দৈনিক খাবারের সংখ্যা' : 'Meals per day'}
            </div>
            <PillRow
              options={[
                { id: '3' as MealCount, label: bn ? '৩ বেলা' : '3 meals' },
                { id: '5' as MealCount, label: bn ? '৫ বেলা (স্ন্যাকসহ)' : '5 meals (with snacks)' },
              ]}
              value={mealCount} onChange={setMealCount}
            />
          </div>

          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>
              {bn ? 'খাদ্যাভ্যাস' : 'Diet preference'}
            </div>
            <PillRow
              options={[
                { id: 'mixed' as DietPref, label: bn ? 'মিশ্র (আমিষ+নিরামিষ)' : 'Mixed' },
                { id: 'veg' as DietPref,   label: bn ? 'নিরামিষ' : 'Vegetarian' },
              ]}
              value={dietPref} onChange={setDietPref}
            />
          </div>

          {result && !result.eligible && (
            <div style={{ color: '#ef4444', fontSize: 14, fontWeight: 600, marginTop: 12 }}>
              ⚠️ {result.error}
            </div>
          )}

          {result?.eligible && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 14, background: '#0a2818', border: '2px solid #166534', borderRadius: 12, padding: '12px 16px' }}>
                <FaCheckCircle color="#4ade80" size={20} />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>
                  {bn ? 'ডায়েট চার্ট তৈরি হয়েছে ✓' : 'Diet chart ready ✓'}
                </span>
              </div>

              <ResultCard accent={A}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4 }}>
                    {bn ? 'দৈনিক ক্যালরি লক্ষ্য' : 'Daily Calorie Target'}
                  </div>
                  <div style={{ fontSize: 'clamp(28px, 8vw, 40px)', fontWeight: 900, color: A, lineHeight: 1.1 }}>
                    {FN(result.targetCalories)} <span style={{ fontSize: '0.4em', fontWeight: 700, color: 'var(--text3)' }}>kcal</span>
                  </div>
                  {goal !== 'maintain' && (
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                      {bn
                        ? `আনুমানিক সাপ্তাহিক পরিবর্তন: ${result.weeklyChangeKg >= 0 ? '+' : ''}${result.weeklyChangeKg.toFixed(2)} কেজি`
                        : `Estimated weekly change: ${result.weeklyChangeKg >= 0 ? '+' : ''}${result.weeklyChangeKg.toFixed(2)} kg`}
                    </div>
                  )}
                </div>

                <StatGrid
                  items={[
                    [bn ? 'BMR' : 'BMR', KCAL(result.bmr), '#3b82f6'],
                    [bn ? 'দৈনিক প্রয়োজন (TDEE)' : 'Daily need (TDEE)', KCAL(result.tdee), '#a78bfa'],
                    [bn ? 'প্রোটিন' : 'Protein', G(result.protein), '#10b981'],
                    [bn ? 'কার্বোহাইড্রেট' : 'Carbs', G(result.carb), '#f59e0b'],
                  ]}
                  cols={2}
                />
                <div style={{ marginTop: 10 }}>
                  <StatGrid items={[[bn ? 'ফ্যাট' : 'Fat', G(result.fat), '#ef4444']]} cols={1} />
                </div>
              </ResultCard>

              {result.flooredNote && (
                <div style={{ marginTop: 12, background: '#2a1c05', border: '1px solid #92400e', borderRadius: 12, padding: '11px 13px', display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <FaExclamationTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 11.5, color: '#fde68a', lineHeight: 1.6 }}>
                    {bn
                      ? `হিসাব করা লক্ষ্য নিরাপদ সর্বনিম্ন সীমার (${gender === 'male' ? '১৫০০' : '১২০০'} kcal) নিচে ছিল, তাই সর্বনিম্ন সীমা ব্যবহার করা হয়েছে। বড় ক্যালরি ঘাটতির আগে একজন পুষ্টিবিদের পরামর্শ নিন।`
                      : `The calculated target was below the general safe minimum (${gender === 'male' ? '1500' : '1200'} kcal), so that floor was used instead. Consult a dietitian before pursuing a larger deficit.`}
                  </div>
                </div>
              )}

              <SectionCard icon={<FaChartPie size={14} color={A} />} title={bn ? 'বেলাভিত্তিক ক্যালরি বণ্টন' : 'Meal-wise Calorie Split'}>
                {result.meals.map((m, i) => {
                  const kcal = result.targetCalories * m.pct;
                  return (
                    <div key={m.key} style={{
                      padding: '12px 14px', borderBottom: i < result.meals.length - 1 ? '1px solid var(--border)' : 'none',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{m.label[bn ? 'bn' : 'en']}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{Math.round(m.pct * 100)}%</div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: A, fontFamily: 'monospace' }}>{FN(kcal)} kcal</div>
                    </div>
                  );
                })}
              </SectionCard>
            </>
          )}
        </>
      )}

      {/* ══════════════════ TAB 2 — FOOD IDEAS ══════════════════ */}
      {tab === 'menu' && (
        <>
          {!result?.eligible ? (
            <div style={{ background: 'var(--surface)', border: `1px dashed var(--border)`, borderRadius: 14, padding: '22px 16px', textAlign: 'center' }}>
              <FaUtensils size={26} color={A} style={{ opacity: 0.55, marginBottom: 10 }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>
                {bn ? 'আগে চার্ট তৈরি করুন' : 'Build the chart first'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
                {bn ? '"চার্ট" ট্যাবে তথ্য দিয়ে হিসাব করলে এখানে বেলাভিত্তিক খাবার পরামর্শ দেখা যাবে।' : 'Fill in the Chart tab, and meal-by-meal food ideas will appear here.'}
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11.5, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 4, padding: '0 2px' }}>
                {bn
                  ? 'যেকোনো একটি অপশন বেছে নিন — পরিমাণ আনুমানিক, প্রয়োজনে বেলার ক্যালরি বাজেট অনুযায়ী সমন্বয় করুন।'
                  : 'Pick any one option — quantities are approximate, adjust to fit the calorie budget shown for that meal.'}
              </div>
              {result.meals.map(m => {
                const kcal = result.targetCalories * m.pct;
                const options = FOOD_SUGGESTIONS[m.key]?.[dietPref] || [];
                return (
                  <SectionCard key={m.key} icon={<FaUtensils size={14} color={A} />} title={`${m.label[bn ? 'bn' : 'en']} — ${FN(kcal)} kcal`}>
                    {options.map((opt, oi) => (
                      <div key={oi} style={{ borderBottom: oi < options.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <div style={{ padding: '9px 14px 2px', fontSize: 10.5, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                          {bn ? `অপশন ${['১','২','৩'][oi] ?? oi + 1}` : `Option ${oi + 1}`}
                        </div>
                        {opt.items.map((item, ii) => (
                          <div key={ii} style={{
                            padding: '6px 14px', display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', gap: 10,
                          }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
                              <span style={{ color: A, flexShrink: 0, fontSize: 11 }}>•</span>
                              <span style={{ fontSize: 12.5, color: 'var(--text2)' }}>{item.food[bn ? 'bn' : 'en']}</span>
                            </div>
                            <span style={{
                              fontSize: 11.5, fontWeight: 700, color: A, flexShrink: 0, whiteSpace: 'nowrap',
                              background: `${A}15`, padding: '2px 8px', borderRadius: 999,
                            }}>{item.qty[bn ? 'bn' : 'en']}</span>
                          </div>
                        ))}
                        <div style={{ height: 8 }} />
                      </div>
                    ))}
                  </SectionCard>
                );
              })}
            </>
          )}
        </>
      )}

      {/* ══════════════════ TAB 3 — GUIDELINES ══════════════════ */}
      {tab === 'guide' && (
        <>
          <SectionCard icon={<FaUtensils size={14} color={A} />} title={bn ? 'ঘরোয়া মাপ নির্দেশিকা' : 'Household measurement guide'}>
            <div style={{ padding: '10px 14px 12px', fontSize: 11.5, color: 'var(--text3)', lineHeight: 1.6 }}>
              {bn
                ? '"খাবার পরামর্শ" ট্যাবের কাপ/বাটি/মুঠো বোঝার জন্য আনুমানিক মাপ:'
                : 'Approximate equivalents for the cup/bowl/handful units used on the Food Ideas tab:'}
            </div>
            {[
              { u: bn ? '১ কাপ (রান্না করা ভাত)' : '1 cup (cooked rice)', v: bn ? '≈ ১৫০-২০০ গ্রাম' : '≈ 150-200g' },
              { u: bn ? '১ বাটি ডাল'               : '1 bowl dal',        v: bn ? '≈ ১৫০ মিলি (১ কাপ)' : '≈ 150ml (1 cup)' },
              { u: bn ? '১টি মাঝারি রুটি (~৬ ইঞ্চি)' : '1 medium roti (~6")', v: bn ? '≈ ২৫-৩০ গ্রাম' : '≈ 25-30g' },
              { u: bn ? '১ গ্লাস দুধ/পানি'          : '1 glass milk/water', v: '≈ 250ml' },
              { u: bn ? '১ মুঠো বাদাম'              : '1 handful nuts',    v: '≈ 28g' },
              { u: bn ? '১ কাপ কাটা সবজি/শাক'       : '1 cup chopped vegetables', v: bn ? '≈ ১০০ গ্রাম' : '≈ 100g' },
              { u: bn ? '১০০ গ্রাম মাছ/মুরগি (রান্না)' : '100g fish/chicken (cooked)', v: bn ? 'হাতের তালুর সমান, ~আঙুল ছাড়া' : 'about the size of your palm, fingers excluded' },
            ].map((row, i, arr) => (
              <div key={i} style={{
                padding: '10px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 12.5, color: 'var(--text2)' }}>{row.u}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: A, whiteSpace: 'nowrap' }}>{row.v}</span>
              </div>
            ))}
            <div style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text3)', lineHeight: 1.55, borderTop: '1px solid var(--border)' }}>
              {bn
                ? 'সঠিক পরিমাপের জন্য রান্নাঘরের মেজারিং কাপ বা রান্নার আগে কিচেন স্কেল ব্যবহার করা ভালো — এগুলো হাতের কাছাকাছি অনুমান।'
                : 'For accuracy, use a kitchen measuring cup or a food scale before cooking — these are close hand-estimates, not exact.'}
            </div>
          </SectionCard>

          <SectionCard icon={<FaTint size={14} color="#3b82f6" />} title={bn ? 'হাইড্রেশন ও সাধারণ অভ্যাস' : 'Hydration & general habits'} accent="#3b82f6">
            {[
              { t: bn ? 'পানি' : 'Water', d: bn ? 'দিনে অন্তত ৮-১০ গ্লাস পানি পান করুন, বিশেষত সক্রিয় দিনগুলোতে বেশি।' : 'Aim for at least 8-10 glasses of water daily, more on active days.' },
              { t: bn ? 'আঁশযুক্ত খাবার' : 'Fiber', d: bn ? 'শাকসবজি, ফল ও গোটা শস্য প্রতিদিনের খাবারে রাখুন — হজম ও তৃপ্তির জন্য সহায়ক।' : 'Include vegetables, fruit, and whole grains daily — helps digestion and satiety.' },
              { t: bn ? 'চিনিযুক্ত পানীয়' : 'Sugary drinks', d: bn ? 'কোমল পানীয় ও অতিরিক্ত চিনিযুক্ত পানীয় এড়িয়ে চলুন।' : 'Limit soft drinks and other sugar-sweetened beverages.' },
              { t: bn ? 'নিয়মিততা' : 'Consistency', d: bn ? 'নির্দিষ্ট সময়ে খাবার খাওয়ার চেষ্টা করুন, বেলা বাদ না দেওয়াই ভালো।' : 'Try to eat at consistent times; avoid regularly skipping meals.' },
            ].map((row, i, arr) => (
              <div key={i} style={{ padding: '12px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{row.t}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text3)', lineHeight: 1.6 }}>{row.d}</div>
              </div>
            ))}
          </SectionCard>

          <SectionCard icon={<FaChartPie size={14} color={A} />} title={bn ? 'ম্যাক্রো লক্ষ্য কেন এমন' : 'Why these macro targets'}>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 8 }}>
                {bn
                  ? 'ওজন কমানোর লক্ষ্যে প্রোটিনের অনুপাত বেশি রাখা হয়েছে (৩০%) যাতে পেশি সংরক্ষণে সহায়ক হয়। ধরে রাখার ক্ষেত্রে সুষম অনুপাত (২০/৫০/৩০) এবং ওজন বাড়ানোর ক্ষেত্রে পর্যাপ্ত কার্বোহাইড্রেট (৫০%) রাখা হয়েছে শক্তি সরবরাহের জন্য।'
                  : 'Weight loss uses a higher protein share (30%) to help preserve muscle. Maintenance uses a balanced split (20/50/30). Weight gain keeps carbs high (50%) to support extra energy needs.'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
                {bn ? 'এগুলো সাধারণ নির্দেশিকা — ব্যক্তিভেদে প্রয়োজন ভিন্ন হতে পারে।' : 'These are general guidelines — individual needs can vary.'}
              </div>
            </div>
          </SectionCard>

          <div style={{ marginTop: 14, background: '#1a0a05', border: '1px solid #7c2d12', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <FaExclamationTriangle size={15} color="#fb923c" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 12, color: '#fb923c', marginBottom: 5 }}>
                {bn ? 'গুরুত্বপূর্ণ সতর্কতা' : 'Important note'}
              </div>
              <div style={{ fontSize: 12, color: '#fed7aa', lineHeight: 1.65 }}>
                {bn
                  ? 'এই ক্যালকুলেটরের ফলাফল সাধারণ সূত্রনির্ভর আনুমানিক হিসাব — এটি চিকিৎসা বা পুষ্টি বিশেষজ্ঞের পরামর্শের বিকল্প নয়। গর্ভাবস্থা, স্তন্যদান, কোনো রোগ, বা খাওয়া নিয়ে দুশ্চিন্তা থাকলে ডায়েট পরিবর্তনের আগে অবশ্যই একজন চিকিৎসক বা নিবন্ধিত পুষ্টিবিদের সাথে কথা বলুন। কোনো বেলা বাদ না দিয়ে সুষম ও টেকসই খাদ্যাভ্যাস বজায় রাখাই ভালো।'
                  : 'These results are a general formula-based estimate — not a substitute for medical or dietitian advice. If pregnant, breastfeeding, managing a health condition, or if eating feels stressful, speak with a doctor or registered dietitian before changing your diet. A balanced, sustainable approach that doesn\u2019t involve skipping meals is best.'}
              </div>
            </div>
          </div>
        </>
      )}
    </CalcShell>
  );
}