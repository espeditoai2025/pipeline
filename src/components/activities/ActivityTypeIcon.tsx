import { Phone, Users, Mail, CheckSquare, AlertOctagon, UtensilsCrossed } from "lucide-react";
import type { ActivityType } from "@/types/activities";

export const ACTIVITY_CONFIG: Record<ActivityType, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  CALL:     { label: "Chiamata",  color: "text-blue-600",   bg: "bg-blue-100 dark:bg-blue-900/30",   Icon: Phone },
  MEETING:  { label: "Meeting",   color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30", Icon: Users },
  EMAIL:    { label: "Email",     color: "text-sky-600",    bg: "bg-sky-100 dark:bg-sky-900/30",     Icon: Mail },
  TASK:     { label: "Attività",  color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30", Icon: CheckSquare },
  DEADLINE: { label: "Scadenza",  color: "text-red-600",    bg: "bg-red-100 dark:bg-red-900/30",     Icon: AlertOctagon },
  LUNCH:    { label: "Pranzo",    color: "text-green-600",  bg: "bg-green-100 dark:bg-green-900/30", Icon: UtensilsCrossed },
};

type Props = { type: ActivityType; size?: "sm" | "md" };

export function ActivityTypeIcon({ type, size = "md" }: Props) {
  const { Icon, color, bg } = ACTIVITY_CONFIG[type];
  const cls = size === "sm"
    ? `h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0 ${bg}`
    : `h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`;
  const iconCls = size === "sm" ? `h-3 w-3 ${color}` : `h-4 w-4 ${color}`;
  return <div className={cls}><Icon className={iconCls} /></div>;
}
