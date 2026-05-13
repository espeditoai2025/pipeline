import {
  Zap, ArrowRight, Trophy, TrendingDown, UserPlus, Clock,
  Star, DollarSign, Mail, CheckSquare, ArrowRightCircle,
  UserCheck, Bell, Timer,
} from "lucide-react";
import type { TriggerType, ActionType } from "@/types/workflows";

export const TRIGGER_CONFIG: Record<TriggerType, { label: string; description: string; icon: React.ElementType; color: string }> = {
  DEAL_CREATED:       { label: "Affare creato",           description: "Si attiva quando viene creato un nuovo affare",                  icon: Zap,           color: "text-blue-600" },
  DEAL_STAGE_CHANGED: { label: "Stage cambiato",          description: "Si attiva quando un affare cambia stage nella pipeline",          icon: ArrowRight,    color: "text-purple-600" },
  DEAL_WON:           { label: "Affare vinto",            description: "Si attiva quando un affare viene segnato come vinto",             icon: Trophy,        color: "text-green-600" },
  DEAL_LOST:          { label: "Affare perso",            description: "Si attiva quando un affare viene segnato come perso",             icon: TrendingDown,  color: "text-red-600" },
  CONTACT_CREATED:    { label: "Contatto creato",         description: "Si attiva quando viene creato un nuovo contatto",                 icon: UserPlus,      color: "text-sky-600" },
  ACTIVITY_OVERDUE:   { label: "Attività scaduta",        description: "Si attiva quando un'attività supera la data di scadenza",        icon: Clock,         color: "text-orange-600" },
  LEAD_CREATED:       { label: "Lead creato",             description: "Si attiva quando viene creato un nuovo lead",                    icon: Star,          color: "text-yellow-600" },
  DEAL_VALUE_CHANGED: { label: "Valore affare cambiato",  description: "Si attiva quando il valore di un affare supera una soglia",      icon: DollarSign,    color: "text-emerald-600" },
};

export const ACTION_CONFIG: Record<ActionType, { label: string; description: string; icon: React.ElementType; color: string; disabled?: boolean }> = {
  SEND_EMAIL:         { label: "Invia email",           description: "Invia un'email usando un template",              icon: Mail,              color: "text-blue-600" },
  CREATE_ACTIVITY:    { label: "Crea attività",         description: "Crea una nuova attività in Pipely",                icon: CheckSquare,       color: "text-orange-600" },
  UPDATE_DEAL_STAGE:  { label: "Aggiorna stage",        description: "Sposta l'affare in un altro stage",             icon: ArrowRightCircle,  color: "text-purple-600" },
  ASSIGN_OWNER:       { label: "Assegna proprietario",  description: "Cambia il proprietario dell'affare",            icon: UserCheck,         color: "text-sky-600" },
  SEND_NOTIFICATION:  { label: "Invia notifica",        description: "Invia una notifica in-app all'utente",          icon: Bell,              color: "text-yellow-600" },
  WAIT:               { label: "Attendi",               description: "Attendi N giorni prima del prossimo step",      icon: Timer,             color: "text-neutral-500", disabled: true },
};
