import {
  Bell, Briefcase, Building2, CalendarCheck, CheckCircle, ChevronsLeft, Clock,
  FileText, Image, Inbox, IndianRupee, LayoutDashboard, Settings, Star,
  TrendingDown, TrendingUp, User, Users, Wallet, WifiOff, XCircle,
} from 'lucide-react'

const ICONS = {
  'bell': Bell,
  'briefcase': Briefcase,
  'building-2': Building2,
  'calendar-check': CalendarCheck,
  'check-circle': CheckCircle,
  'chevrons-left': ChevronsLeft,
  'clock': Clock,
  'file-text': FileText,
  'image': Image,
  'inbox': Inbox,
  'indian-rupee': IndianRupee,
  'layout-dashboard': LayoutDashboard,
  'settings': Settings,
  'star': Star,
  'trending-down': TrendingDown,
  'trending-up': TrendingUp,
  'user': User,
  'users': Users,
  'wallet': Wallet,
  'wifi-off': WifiOff,
  'x-circle': XCircle,
}

export default function Icon({ name, size = 20, ...rest }) {
  const LucideIcon = ICONS[name]
  if (!LucideIcon) return null
  return <LucideIcon size={size} strokeWidth={2} {...rest} />
}
