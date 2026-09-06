import { useState, useCallback } from 'react';
import {
  FaCalculator, FaUniversity, FaBirthdayCake, FaWeight,
  FaFire, FaReceipt, FaChartLine, FaTshirt, FaRuler,
  FaExchangeAlt, FaRulerCombined, FaMapMarkedAlt,
  FaBalanceScale, FaQuestionCircle, FaPiggyBank, FaMosque,
} from 'react-icons/fa';

import { LangProvider, useLang } from './context/LangContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { useHistory } from './hooks/useHistory.ts';
import { APPS } from './utils/constants.ts';

import HomeScreen from './components/HomeScreen.tsx';
import Header     from './components/Header.tsx';
import BottomNav  from './components/BottomNav.tsx';
import SupportScreen from './components/SupportScreen.tsx';

import GeneralCalc    from './components/calculators/GeneralCalc.tsx';
import EmiCalc        from './components/calculators/EmiCalc.tsx';
import AgeCalc        from './components/calculators/AgeCalc.tsx';
import BmiCalc        from './components/calculators/BmiCalc.tsx';
import CalorieCalc    from './components/calculators/CalorieCalc.tsx';
import VatCalc        from './components/calculators/VatCalc.tsx';
import SmvCalc        from './components/calculators/SmvCalc.tsx';
import GarmentsCalc   from './components/calculators/GarmentsCalc.tsx';
import GarmentsPattern from './components/calculators/GarmentsPattern.tsx';
import GSizeCalc      from './components/calculators/GSizeCalc.tsx';
import UnitCalc       from './components/calculators/UnitCalc.tsx';
import BdLandCalc     from './components/calculators/BdLandCalc.tsx';
import BdWeightCalc   from './components/calculators/BdWeightCalc.tsx';
import DepositCalc    from './components/calculators/DepositCalc.tsx';
import ZakatCalc      from './components/calculators/ZakatCalc.tsx';

const SCREENS: Record<string, React.ComponentType<any>> = {
  general:  GeneralCalc,
  emi:      EmiCalc,
  age:      AgeCalc,
  bmi:      BmiCalc,
  calorie:  CalorieCalc,
  vat:      VatCalc,
  smv:      SmvCalc,
  garments: GarmentsCalc,
  gpattern: GarmentsPattern,
  gsize:    GSizeCalc,
  unit:     UnitCalc,
  bdland:   BdLandCalc,
  bdweight: BdWeightCalc,
  deposit:  DepositCalc,
  zakat:    ZakatCalc,
};

const ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  FaCalculator, FaUniversity, FaBirthdayCake, FaWeight,
  FaFire, FaReceipt, FaChartLine, FaTshirt, FaRuler,
  FaExchangeAlt, FaRulerCombined, FaMapMarkedAlt, FaBalanceScale,
  FaPiggyBank, FaMosque,
};

const APP_LABELS: Record<string, { en: string; bn: string }> = {
  general:  { en: 'Calculator',   bn: 'ক্যালকুলেটর' },
  emi:      { en: 'EMI Calc',     bn: 'ইএমআই' },
  age:      { en: 'Age Calc',     bn: 'বয়স' },
  bmi:      { en: 'BMI',          bn: 'বিএমআই' },
  calorie:  { en: 'Calorie',      bn: 'ক্যালরি' },
  vat:      { en: 'VAT',          bn: 'ভ্যাট' },
  smv:      { en: 'Stock Market', bn: 'শেয়ার বাজার' },
  garments: { en: 'Measurement',  bn: 'মেজারমেন্ট' },
  gpattern: { en: 'Pattern',      bn: 'প্যাটার্ন' },
  gsize:    { en: 'Size Chart',   bn: 'সাইজ চার্ট' },
  unit:     { en: 'Unit Convert', bn: 'ইউনিট' },
  bdland:   { en: 'Land',         bn: 'ভূমির মাপ' },
  bdweight: { en: 'Goods Weight', bn: 'পণ্যের ওজন' },
  deposit:  { en: 'Deposit',      bn: 'ডিপোজিট' },
  zakat:    { en: 'Zakat',        bn: 'যাকাত' },
  support:  { en: 'Support',      bn: 'সাপোর্ট' },
};

// One tooltip text per calculator — shown in Header ⓘ button
const APP_INFO: Record<string, { en: string; bn: string }> = {
  general:  { en: 'Use the keypad to enter numbers.\nPress operators (+, -, x, /) then = for result.',
               bn: 'কীপ্যাড দিয়ে সংখ্যা দিন।\nঅপারেটর চাপুন তারপর = চাপুন।' },
  emi:      { en: 'Enter loan amount, annual interest rate %, and tenure in years.\nPress Calculate.',
               bn: 'ঋণের পরিমাণ, বার্ষিক সুদের হার ও মেয়াদ বছরে দিন।\nহিসাব চাপুন।' },
  age:      { en: 'Enter your birth date (day / month / year).\nPress Calculate to see age and next birthday.',
               bn: 'জন্ম তারিখ দিন (দিন / মাস / বছর)।\nহিসাব চাপুন — বয়স ও পরের জন্মদিন দেখুন।' },
  bmi:      { en: 'Enter weight in kg and height in inches.\n5 feet 6 inches = 66 inches.\nPress Calculate.',
               bn: 'ওজন কেজিতে ও উচ্চতা ইঞ্চিতে দিন।\n৫ ফুট ৬ ইঞ্চি = ৬৬ ইঞ্চি।\nহিসাব চাপুন।' },
  calorie:  { en: 'Enter gender, age, weight (kg), height (inches) and activity level.\nPress Calculate for daily calorie needs.',
               bn: 'লিঙ্গ, বয়স, ওজন, উচ্চতা ও কার্যকলাপ স্তর দিন।\nহিসাব চাপুন।' },
  vat:      { en: 'Select BD or International mode.\nChoose Add or Remove VAT.\nEnter amount and rate, then Calculate.',
               bn: 'BD বা আন্তর্জাতিক মোড বেছে নিন।\nVAT যোগ বা বিয়োগ মোড বেছে নিন।\nপরিমাণ ও হার দিয়ে হিসাব চাপুন।' },
  smv:      { en: 'Enter number of shares, buy price, current price and brokerage %.\nPress Calculate for profit/loss.',
               bn: 'শেয়ার সংখ্যা, ক্রয় মূল্য, বর্তমান মূল্য ও ব্রোকারেজ দিন।\nহিসাব চাপুন।' },
  garments: { en: `Measuring Guide:
- Stand straight
- Keep tape snug against body
- Chest: at fullest part of chest
- Waist: at narrowest part of abdomen
- Hip: at widest part
- All measurements in inches
- Press Calculate for recommended size.`,
               bn: `মাপ নেওয়ার নিয়ম:
- সোজা হয়ে দাঁড়ান
- ফিতা শরীরের সাথে আটসাট রাখুন
- বুকের মাপ: বুকের সবচেয়ে চওড়া অংশে
- কোমরের মাপ: পেটের সবচেয়ে সরু অংশে
- নিতম্বের মাপ: সবচেয়ে চওড়া অংশে
- সব মাপ ইঞ্চিতে
- হিসাব চাপুন।` },
  gpattern: { en: 'Select garment type, enter all measurements in inches.\nPress Generate Pattern.\nA,B,C = measurement points. Add 0.5" seam allowance.',
               bn: 'পোশাকের ধরন বেছে মাপ ইঞ্চিতে দিন।\nপ্যাটার্ন তৈরি চাপুন।\nA,B,C = মেজারমেন্ট পয়েন্ট। ০.৫" সেলাই ভাতা যোগ করুন।' },
  gsize:    { en: 'Select gender and category (shirt / pants / shoes).\nFind your size across BD, US, UK, EU and Asia standards.',
               bn: 'লিঙ্গ ও বিভাগ (শার্ট / প্যান্ট / জুতা) বেছে নিন।\nBD, US, UK, EU ও Asia সাইজ দেখুন।' },
  unit:     { en: 'Select a category (length, weight, temperature, area, volume, speed).\nEnter value and choose units, then Calculate.',
               bn: 'বিভাগ বেছে নিন (দৈর্ঘ্য, ওজন, তাপমাত্রা, ক্ষেত্রফল, আয়তন, গতি)।\nমান ও একক দিয়ে হিসাব চাপুন।' },
  bdland:   { en: `BD Land Standards:
1 Bigha = 3 Katha
1 Katha = 20 Chattak
1 Chattak = 45 sq ft
1 Katha = 720 sq ft
1 Bigha = 14,400 sq ft
1 Decimal = 435.6 sq ft

Enter value, select unit, press Convert.`,
               bn: `বাংলাদেশ ভূমি মানদণ্ড:
১ বিঘা = ৩ কাঠা
১ কাঠা = ২০ ছটাক
১ ছটাক = ৪৫ বর্গফুট
১ কাঠা = ৭২০ বর্গফুট
১ বিঘা = ১৪,৪০০ বর্গফুট
১ শতাংশ = ৪৩৫.৬ বর্গফুট

পরিমাণ দিন, একক বেছে নিন, রূপান্তর চাপুন।` },
  bdweight: { en: 'Enter weight/quantity, select the unit (Maund, Seer, kg etc.).\nEnter price per kg, then Calculate total price.',
               bn: 'ওজন দিন, একক বেছে নিন (মণ, সের, কেজি ইত্যাদি)।\nপ্রতি কেজি দাম দিয়ে হিসাব চাপুন।' },
  deposit:  { en: 'Choose FDR (lump-sum) or DPS (monthly deposit).\nEnter amount, annual interest rate % and duration in years.\nPress Calculate for maturity amount.',
               bn: 'এফডিআর (এককালীন) বা ডিপিএস (মাসিক জমা) বেছে নিন।\nপরিমাণ, বার্ষিক সুদের হার ও মেয়াদ বছরে দিন।\nহিসাব চাপুন — মেয়াদপূর্তির পরিমাণ দেখুন।' },
  zakat:    { en: 'Choose Gold or Silver Nisab standard.\nEnter the current price per gram, your cash, gold, silver, business assets, and any debts.\nPress Calculate to see if Zakat is due and how much.',
               bn: 'স্বর্ণ বা রৌপ্য নিসাব মান বেছে নিন।\nআজকের প্রতি গ্রাম দাম, নগদ, স্বর্ণ, রৌপ্য, ব্যবসায়িক সম্পদ ও ঋণ দিন।\nহিসাব চাপুন — যাকাত ফরজ কিনা ও কত তা দেখুন।' },
  support:  { en: '', bn: '' },
};

function AppInner() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { history, add, clear } = useHistory();
  const { lang } = useLang();

  const handleBack  = useCallback(() => setActiveId(null), []);
  const handleOpen  = useCallback((id: string) => setActiveId(id), []);
  const handleHome  = useCallback(() => setActiveId(null), []);

  const activeApp   = activeId ? APPS.find(a => a.id === activeId) : null;
  const Screen      = activeId && activeId !== 'support' ? SCREENS[activeId] : null;
  const ActiveIcon  = activeApp ? ICONS[activeApp.icon] : activeId === 'support' ? FaQuestionCircle : null;
  const activeLabel = activeId ? (APP_LABELS[activeId]?.[lang] || activeId) : '';
  const activeColor = activeApp?.color || (activeId === 'support' ? '#c41e3a' : '#e8e8e8');
  const activeInfo  = activeId ? (APP_INFO[activeId]?.[lang] || '') : '';
  const isGeneral   = activeId === 'general';

  return (
    <div style={{
      width: '100dvw', height: '100dvh',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg)', overflow: 'hidden',
    }}>
      {/* Content area */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {activeId ? (
          <>
            {/* Header gets info= so it renders the ⓘ tooltip */}
            <Header
              onBack={handleBack}
              title={activeLabel}
              accent={activeColor}
              icon={ActiveIcon ?? undefined}
              info={activeInfo || undefined}
            />

            {activeId === 'support' ? (
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <SupportScreen />
              </div>
            ) : Screen ? (
              isGeneral ? (
                <div style={{ flex: 1, minHeight: 0, background: 'var(--bg)', overflow: 'hidden' }}>
                  <Screen history={history[activeId] || []} onAdd={add} onClear={clear} />
                </div>
              ) : (
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  <Screen history={history[activeId] || []} onAdd={add} onClear={clear} />
                </div>
              )
            ) : null}
          </>
        ) : (
          <HomeScreen onOpen={handleOpen} history={history} />
        )}
      </div>

      {/* Bottom nav — always visible */}
      <BottomNav
        activeId={activeId}
        onOpen={handleOpen}
        onShowHome={handleHome}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <AppInner />
      </LangProvider>
    </ThemeProvider>
  );
}