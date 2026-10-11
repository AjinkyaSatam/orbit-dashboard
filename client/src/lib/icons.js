/**
 * Icon vocabulary for the whole app: meaning → Lucide icon.
 * Rules: Lucide only, rendered at strokeWidth 1.5 (see ICON_STROKE). No emoji anywhere.
 */
import {
  // sensors
  Thermometer,
  Droplets,
  Radar,
  Flame,
  CloudRain,
  Mic,
  AudioLines,
  // features
  Globe,
  Activity,
  ShieldCheck,
  Wifi,
  WifiOff,
  CloudUpload,
  ChartLine,
  Bell,
  Zap,
  Timer,
  Code,
  Cpu,
  Server,
  TriangleAlert,
  // places (use-case tiles)
  House,
  Warehouse,
  // UI
  Menu,
  X,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Check,
  Copy,
  LogIn,
  LogOut,
  User,
  Settings,
  Moon,
  Sun,
  Mail,
  MapPin,
  Phone,
  Plus,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  ToggleLeft,
  ToggleRight,
  BookOpen,
  Image,
  Video,
  Briefcase,
} from 'lucide-react';

export const ICON_STROKE = 1.5;

export const SENSOR_ICONS = {
  temperature: Thermometer,
  humidity: Droplets,
  motion: Radar,
  flame: Flame,
  rain: CloudRain,
  sound: Mic,
  soundLevel: AudioLines,
};

export const FEATURE_ICONS = {
  anywhere: Globe,
  live: Activity,
  secure: ShieldCheck,
  wifi: Wifi,
  offline: WifiOff,
  cloud: CloudUpload,
  history: ChartLine,
  alerts: Bell,
  power: Zap,
  setup: Timer,
  openSource: Code,
  process: Cpu,
  store: Server,
  warning: TriangleAlert,
};

export const PLACE_ICONS = {
  home: House,
  outdoor: CloudRain,
  storage: Warehouse,
};

export const UI_ICONS = {
  menu: Menu,
  close: X,
  arrowRight: ArrowRight,
  external: ArrowUpRight,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  check: Check,
  copy: Copy,
  signIn: LogIn,
  signOut: LogOut,
  user: User,
  settings: Settings,
  moon: Moon,
  sun: Sun,
  mail: Mail,
  mapPin: MapPin,
  phone: Phone,
  plus: Plus,
  show: Eye,
  hide: EyeOff,
  soundOn: Volume2,
  soundOff: VolumeX,
  toggleOff: ToggleLeft,
  toggleOn: ToggleRight,
  book: BookOpen,
  image: Image,
  video: Video,
  briefcase: Briefcase,
};

/** Social kinds → generic Lucide glyphs (Lucide ships no brand logos; we do not add a second family). */
export const SOCIAL_ICONS = {
  github: Code,
  email: Mail,
  website: Globe,
  linkedin: ArrowUpRight,
  x: ArrowUpRight,
  instagram: ArrowUpRight,
  youtube: ArrowUpRight,
};

/** Sensor key (as used in readings/alerts) → icon. */
export const SENSOR_KEY_ICONS = {
  temp: Thermometer,
  hum: Droplets,
  motion: Radar,
  flame: Flame,
  rain: CloudRain,
  sound: Mic,
};
