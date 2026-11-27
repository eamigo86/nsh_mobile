// The app's icons: Phosphor (regular weight) through nsh-icon, drawn in the text colour of a theme token.
import { Icon as Glyph } from "nsh-icon";
import {
  CalendarBlank,
  CaretRight,
  ChartLine,
  Check,
  Clock,
  House,
  List,
  PencilSimple,
  Plus,
  SlidersHorizontal,
  Trash,
  User,
  WarningCircle,
  X,
} from "nsh-icon-phosphor";

export const ICONS = {
  list: List,
  calendar: CalendarBlank,
  alert: WarningCircle,
  plus: Plus,
  close: X,
  check: Check,
  home: House,
  settings: SlidersHorizontal,
  person: User,
  chevron: CaretRight,
  chart: ChartLine,
  edit: PencilSimple,
  trash: Trash,
  clock: Clock,
} as const;

export type IconName = keyof typeof ICONS;
export type IconColor =
  | "foreground"
  | "muted-foreground"
  | "primary"
  | "primary-foreground"
  | "destructive"
  | "on-hero"
  | "on-color"
  | "swipe-ink";
// Whole class names, so the style scan finds them.
const COLORS = {
  foreground: "text-foreground",
  "muted-foreground": "text-muted-foreground",
  primary: "text-primary",
  "primary-foreground": "text-primary-foreground",
  destructive: "text-destructive",
  "on-hero": "text-on-hero",
  "on-color": "text-on-color",
  "swipe-ink": "text-swipe-ink",
} as const;
const SIZES = { sm: 16, md: 20, lg: 24 } as const;

export function Icon(props: { name: IconName; color?: IconColor; size?: keyof typeof SIZES }) {
  return <Glyph icon={ICONS[props.name]} size={SIZES[props.size ?? "md"]} class={COLORS[props.color ?? "foreground"]} />;
}
