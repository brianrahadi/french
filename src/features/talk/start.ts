import {
  Briefcase,
  Coffee,
  Croissant,
  Handshake,
  Hotel,
  House,
  Map as MapIcon,
  Newspaper,
  Package,
  PartyPopper,
  Phone,
  Plane,
  ShoppingBag,
  Stethoscope,
  Ticket,
  TrainFront,
  User,
  Utensils,
} from 'lucide-react'
import { SCENARIO_BY_ID, type ScenarioIcon } from '../../data/scenarios'
import type { Level } from '../../data/types'
import { newId, useStore } from '../../lib/store'
import { describeConfig, useAiConfig } from '../../lib/ai'
import type { Conversation } from './types'

export const SCENARIO_ICONS: Record<ScenarioIcon, React.ComponentType<{ size?: number }>> = {
  coffee: Coffee,
  croissant: Croissant,
  map: MapIcon,
  hotel: Hotel,
  stethoscope: Stethoscope,
  shopping: ShoppingBag,
  phone: Phone,
  briefcase: Briefcase,
  home: House,
  train: TrainFront,
  party: PartyPopper,
  package: Package,
  utensils: Utensils,
  handshake: Handshake,
  newspaper: Newspaper,
  plane: Plane,
  user: User,
  ticket: Ticket,
}

export const FREE_TOPICS = ['ton week-end', 'les films et les séries', 'la cuisine', 'ton travail ou tes études', 'les voyages', 'ta ville']

/** Creates a conversation and returns its id. */
export function useStartConversation() {
  const saveConversation = useStore((s) => s.saveConversation)
  const ai = useAiConfig()
  return (opts: { scenarioId: string; level: Level; topic?: string }) => {
    const sc = SCENARIO_BY_ID[opts.scenarioId]
    const now = new Date().toISOString()
    const c: Conversation = {
      id: newId('c'),
      scenarioId: opts.scenarioId,
      title: sc ? sc.titleFr : opts.topic?.trim() ? opts.topic.trim() : 'Conversation libre',
      level: sc?.level ?? opts.level,
      topic: opts.topic?.trim() || undefined,
      turns: [
        {
          id: newId('t'),
          role: 'ai',
          text: sc ? sc.opening : freeOpening(opts.topic),
          translation: sc ? sc.openingEn : freeOpeningEn(opts.topic),
          at: now,
        },
      ],
      goalsMet: [],
      startedAt: now,
      updatedAt: now,
      model: ai ? describeConfig(ai) : '',
    }
    saveConversation(c)
    return c.id
  }
}

function freeOpening(topic?: string): string {
  return topic?.trim()
    ? `Salut ! Moi, c'est Camille. Alors, parlons un peu de ça : ${topic.trim()}. Tu commences ?`
    : "Salut ! Je suis Camille. De quoi est-ce que tu veux parler aujourd'hui ?"
}
function freeOpeningEn(topic?: string): string {
  return topic?.trim()
    ? `Hi! I’m Camille. So, let’s talk a bit about this: ${topic.trim()}. Do you want to start?`
    : 'Hi! I’m Camille. What would you like to talk about today?'
}

