import {
  CalendarDays,
  LayoutDashboard,
  ListTodo,
  PieChart,
  Settings,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  mobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    end: true,
    mobile: true,
  },
  { to: '/rotina', label: 'Rotina', icon: ListTodo, mobile: true },
  { to: '/calendario', label: 'Calendário', icon: CalendarDays, mobile: true },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet, mobile: true },
  { to: '/relatorios', label: 'Relatórios', icon: PieChart, mobile: true },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

export const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((item) => item.mobile);
