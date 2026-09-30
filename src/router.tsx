import { createBrowserRouter, Link } from 'react-router'
import { FocusLayout, Layout } from './components/Layout'

// Each page is code-split and loaded on demand.
const page = (load: () => Promise<{ default: React.ComponentType }>) => async () => ({ Component: (await load()).default })

function NotFound() {
  return (
    <div className="page">
      <div className="page-eyebrow">404</div>
      <h1 className="page-title">Page introuvable</h1>
      <p className="page-subtitle">
        That page doesn’t exist. <Link to="/">Back to Today</Link>
      </p>
    </div>
  )
}

function Fallback() {
  return <div className="page" aria-busy="true" />
}

export const router = createBrowserRouter(
  [
    {
      Component: Layout,
      HydrateFallback: Fallback,
      children: [
        { index: true, lazy: page(() => import('./features/today/TodayPage')) },
        { path: 'vocab', lazy: page(() => import('./features/vocab/VocabPage')) },
        { path: 'grammar', lazy: page(() => import('./features/grammar/GrammarPage')) },
        { path: 'grammar/:id', lazy: page(() => import('./features/grammar/LessonPage')) },
        { path: 'conjugation', lazy: page(() => import('./features/conjugation/ConjugationPage')) },
        { path: 'verbs', lazy: page(() => import('./features/verbs/VerbsPage')) },
        { path: 'verbs/:inf', lazy: page(() => import('./features/verbs/VerbDetailPage')) },
        { path: 'writing', lazy: page(() => import('./features/writing/WritingHome')) },
        { path: 'writing/new', lazy: page(() => import('./features/writing/WritingEditor')) },
        { path: 'writing/:id', lazy: page(() => import('./features/writing/WritingResult')) },
        { path: 'practice', lazy: page(() => import('./features/practice/PracticeHub')) },
        { path: 'weak', lazy: page(() => import('./features/weak/WeakPage')) },
        { path: 'listening', lazy: page(() => import('./features/listening/ListeningPage')) },
        { path: 'speaking', lazy: page(() => import('./features/speaking/SpeakingPage')) },
        { path: 'reading', lazy: page(() => import('./features/reading/ReadingHome')) },
        { path: 'reading/:id', lazy: page(() => import('./features/reading/ReaderPage')) },
        { path: 'talk', lazy: page(() => import('./features/talk/TalkHome')) },
        { path: 'settings', lazy: page(() => import('./features/settings/SettingsPage')) },
        { path: '*', Component: NotFound },
      ],
    },
    {
      Component: FocusLayout,
      HydrateFallback: Fallback,
      children: [
        { path: 'session', lazy: page(() => import('./features/session/MixedSession')) },
        { path: 'vocab/study', lazy: page(() => import('./features/vocab/StudySession')) },
        { path: 'grammar/:id/practice', lazy: page(() => import('./features/grammar/PracticeSession')) },
        { path: 'conjugation/drill', lazy: page(() => import('./features/conjugation/DrillSession')) },
        { path: 'listening/session', lazy: page(() => import('./features/listening/DictationSession')) },
        { path: 'speaking/session', lazy: page(() => import('./features/speaking/SpeakingSession')) },
        { path: 'talk/:id', lazy: page(() => import('./features/talk/TalkChat')) },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
)
