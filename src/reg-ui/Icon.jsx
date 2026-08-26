import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BadgeCheck,
  Building2,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clapperboard,
  Clock,
  CreditCard,
  Gamepad2,
  Headphones,
  Heart,
  Image as ImageIcon,
  IndianRupee,
  Info,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Palmtree,
  PartyPopper,
  Pause,
  Pencil,
  Play,
  Plus,
  Save,
  Search,
  SearchX,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  TicketPercent,
  Trash2,
  TrendingUp,
  Trophy,
  Upload,
  User,
  UserCheck,
  Users,
  Wallet,
  Waves,
  X,
  Zap,
} from 'lucide-react';

/**
 * Icon — thin wrapper over lucide-react so the rest of the app can reference
 * icons by the kebab-case names used in the source design (e.g. "arrow-left").
 * Add new icons to REGISTRY as they are needed rather than importing lucide
 * ad-hoc across the codebase.
 */
const REGISTRY = {
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up': ArrowUp,
  'badge-check': BadgeCheck,
  'building-2': Building2,
  calendar: Calendar,
  'calendar-check': CalendarCheck,
  check: Check,
  'check-circle': CheckCircle,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'circle-dot': CircleDot,
  clapperboard: Clapperboard,
  clock: Clock,
  'credit-card': CreditCard,
  'gamepad-2': Gamepad2,
  headphones: Headphones,
  heart: Heart,
  image: ImageIcon,
  'indian-rupee': IndianRupee,
  info: Info,
  'layout-dashboard': LayoutDashboard,
  loader: Loader2,
  'log-out': LogOut,
  mail: Mail,
  'map-pin': MapPin,
  menu: Menu,
  palmtree: Palmtree,
  'party-popper': PartyPopper,
  pause: Pause,
  pencil: Pencil,
  play: Play,
  plus: Plus,
  save: Save,
  search: Search,
  'search-x': SearchX,
  settings: Settings,
  'shield-check': ShieldCheck,
  smartphone: Smartphone,
  sparkles: Sparkles,
  star: Star,
  'ticket-percent': TicketPercent,
  'trash-2': Trash2,
  'trending-up': TrendingUp,
  trophy: Trophy,
  upload: Upload,
  user: User,
  'user-check': UserCheck,
  users: Users,
  wallet: Wallet,
  waves: Waves,
  x: X,
  zap: Zap,
};

export default function Icon({ name, size = 20, strokeWidth = 2, className, style, ...rest }) {
  const Glyph = REGISTRY[name];
  if (!Glyph) {
    // Fail soft: never crash the UI over a missing icon name.
    if (import.meta.env.DEV) console.warn(`Icon: unknown name "${name}"`);
    return null;
  }
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}
    >
      <Glyph size={size} strokeWidth={strokeWidth} {...rest} />
    </span>
  );
}
