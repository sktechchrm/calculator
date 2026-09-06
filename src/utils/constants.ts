export interface AppDef {
  id: string; icon: string; color: string; light: string; shadow: string;
}

/** Shared props interface for every calculator component */
export interface CalcProps {
  history: string[];
  onAdd: (id: string, entry: string) => void;
  onClear?: (id: string) => void;
}

// Dark, rich, professional colors — no blue/sky
export const APPS: AppDef[] = [
  { id: 'general',   icon: 'FaCalculator',    color: '#e8e8e8', light: '#1e1e22', shadow: '#e8e8e820' },
  { id: 'emi',       icon: 'FaUniversity',    color: '#d4a017', light: '#1e1a0e', shadow: '#d4a01720' },
  { id: 'age',       icon: 'FaBirthdayCake',  color: '#c41e3a', light: '#1e0a0f', shadow: '#c41e3a20' },
  { id: 'bmi',       icon: 'FaWeight',        color: '#e67e22', light: '#1e1108', shadow: '#e67e2220' },
  { id: 'calorie',   icon: 'FaFire',          color: '#e74c3c', light: '#1e0808', shadow: '#e74c3c20' },
  { id: 'vat',       icon: 'FaReceipt',       color: '#9b59b6', light: '#160e1a', shadow: '#9b59b620' },
  { id: 'smv',       icon: 'FaChartLine',     color: '#27ae60', light: '#081a0e', shadow: '#27ae6020' },
  { id: 'garments',  icon: 'FaTshirt',        color: '#e67e22', light: '#1e1108', shadow: '#e67e2220' },
  // { id: 'gpattern',  icon: 'FaRulerCombined', color: '#c41e3a', light: '#1e0a0f', shadow: '#c41e3a20' },
  { id: 'gsize',     icon: 'FaRuler',         color: '#d4a017', light: '#1e1a0e', shadow: '#d4a01720' },
  { id: 'unit',      icon: 'FaExchangeAlt',   color: '#8e44ad', light: '#140e1a', shadow: '#8e44ad20' },
  { id: 'bdland',    icon: 'FaMapMarkedAlt',  color: '#16a085', light: '#081612', shadow: '#16a08520' },
  { id: 'bdweight',  icon: 'FaBalanceScale',  color: '#c41e3a', light: '#1e0a0f', shadow: '#c41e3a20' },
  { id: 'deposit',   icon: 'FaPiggyBank',     color: '#0e9594', light: '#071616', shadow: '#0e959420' },
  { id: 'zakat',     icon: 'FaMosque',        color: '#2f9e44', light: '#0a170c', shadow: '#2f9e4420' },
];