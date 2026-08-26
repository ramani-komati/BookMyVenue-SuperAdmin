import {
  Archive, Bell, Briefcase, Building2, CalendarCheck, CheckCircle, ChevronsLeft, Clock,
  FileText, Image, Inbox, IndianRupee, LayoutDashboard, Menu, Plus, PlusCircle, Settings, Star,
  TrendingDown, TrendingUp, User, UserPlus, Users, Wallet, WifiOff, XCircle,
} from 'lucide-react'

const ICONS = {
  'archive': Archive,
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
  'menu': Menu,
  'plus': Plus,
  'plus-circle': PlusCircle,
  'settings': Settings,
  'star': Star,
  'trending-down': TrendingDown,
  'trending-up': TrendingUp,
  'user': User,
  'user-plus': UserPlus,
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
