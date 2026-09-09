import { FaCalculator, FaTshirt, FaMoneyBillWave, FaHome, FaQuestionCircle } from 'react-icons/fa';
import { useLang } from '../context/LangContext.tsx';

interface Tab {
  id: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  bn: string; en: string;
  apps: string[];
  primary: string;
  color: string;
}

const TABS: Tab[] = [
  { id:'home',     icon:FaHome,           bn:'হোম',     en:'Home',     apps:[],                                   primary:'',        color:'#e8e8e8' },
  { id:'calc',     icon:FaCalculator,     bn:'হিসাব',   en:'Calc',     apps:['general'],                          primary:'general', color:'#ff9f0a' },
  //{ id:'garments', icon:FaTshirt,         bn:'পোশাক',   en:'Garments', apps:['garments','gpattern','gsize'],      primary:'garments',color:'#e67e22' },
  { id:'finance',  icon:FaMoneyBillWave,  bn:'আর্থিক',  en:'Finance',  apps:['emi','vat','smv','bdweight','bdland','unit','bmi','calorie','age'], primary:'emi', color:'#d4a017' },
  { id:'support',  icon:FaQuestionCircle, bn:'সাপোর্ট', en:'Support',  apps:['support'],                          primary:'support', color:'#c41e3a' },
];

interface Props {
  activeId: string | null;
  onOpen: (id: string) => void;
  onShowHome: () => void;
}

export default function BottomNav({ activeId, onOpen, onShowHome }: Props) {
  const { lang } = useLang();
  const activeTab = TABS.find(t => t.apps.includes(activeId || '')) || null;
  const isHome = !activeId;

  const handleTap = (tab: Tab) => {
    if (tab.id === 'home') { onShowHome(); return; }
    if (tab.id === 'support') { onOpen('support'); return; }
    if (activeTab?.id === tab.id && tab.apps.length > 1) {
      const cur = tab.apps.indexOf(activeId || '');
      onOpen(tab.apps[(cur + 1) % tab.apps.length]);
    } else if (activeTab?.id === tab.id) {
      onShowHome();
    } else {
      onOpen(tab.primary);
    }
  };

  return (
    <div style={{
      flexShrink: 0,
      background: 'var(--bg)',
      borderTop: '1px solid var(--border)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      zIndex: 200,
      boxShadow: '0 -4px 24px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', height: 58 }}>
        {TABS.map(tab => {
          const isActive = tab.id === 'home' ? isHome : tab.id === 'support' ? activeId === 'support' : activeTab?.id === tab.id;
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => handleTap(tab)} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 3,
              border: 'none', background: 'none', cursor: 'pointer',
              padding: '6px 2px 4px', position: 'relative',
              transition: 'transform 0.1s',
            }}
              onTouchStart={e => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.85)'}
              onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 24, height: 2.5, borderRadius: 2,
                  background: tab.color,
                }} />
              )}
              <div style={{
                width: 30, height: 30, borderRadius: 10,
                background: isActive ? `${tab.color}20` : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.18s',
              }}>
                <Icon size={17} color={isActive ? tab.color : 'var(--text4)'} />
              </div>
              <span style={{
                fontSize: 9, fontWeight: isActive ? 700 : 500,
                color: isActive ? tab.color : 'var(--text4)',
                fontFamily: 'inherit', transition: 'color 0.18s',
              }}>
                {lang === 'bn' ? tab.bn : tab.en}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
