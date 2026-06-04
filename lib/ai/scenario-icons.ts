// Per-scenario lucide icon — replaces the old emojis (which read childish, e.g.
// a baby for Hebrew School, a memorial-looking candle for Shabbat). Matches the
// app's lucide line-icon language. Used in the chat header.

import {
  Compass, Wine, BookOpen, ScrollText, Users, HeartHandshake, MessageCircle,
  type LucideIcon,
} from 'lucide-react';
import type { AIScenario } from './scenarios';

export const SCENARIO_ICON: Record<AIScenario, LucideIcon> = {
  purpose:       Compass,        // finding direction / meaning
  shabbat:       Wine,           // Kiddush cup — festive, not a memorial candle
  hebrew_school: BookOpen,       // learning / school
  parsha:        ScrollText,     // weekly Torah portion
  meet_people:   Users,          // community / connections
  struggling:    HeartHandshake, // support
  open:          MessageCircle,  // free chat
};
