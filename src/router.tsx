import { createBrowserRouter, Link, Navigate } from 'react-router'
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
        { path: 'roadmap', lazy: page(() => import('./features/roadmap/RoadmapPage')) },
        { path: 'vocab', lazy: page(() => import('./features/vocab/VocabPage')) },
        { path: 'grammar', lazy: page(() => import('./features/grammar/GrammarPage')) },
        { path: 'grammar/:id', lazy: page(() => import('./features/grammar/LessonPage')) },
        { path: 'conjugation', lazy: page(() => import('./features/conjugation/ConjugationPage')) },
        { path: 'verbs', lazy: page(() => import('./features/verbs/VerbsPage')) },
        { path: 'verbs/:inf', lazy: page(() => import('./features/verbs/VerbDetailPage')) },
        { path: 'library', lazy: page(() => import('./features/library/LibraryPage')) },
        // Old content homes now live as rows in the Library.
        { path: 'writing', element: <Navigate to="/library#writing" replace /> },
        { path: 'writing/new', lazy: page(() => import('./features/writing/WritingEditor')) },
        { path: 'writing/:id', lazy: page(() => import('./features/writing/WritingResult')) },
        { path: 'practice', lazy: page(() => import('./features/practice/PracticeHub')) },
        { path: 'weak', lazy: page(() => import('./features/weak/WeakPage')) },
        { path: 'audio', element: <Navigate to="/library#audio" replace /> },
        { path: 'audio/:id', lazy: page(() => import('./features/audio/AudioLessonPage')) },
        { path: 'listening', element: <Navigate to="/library#stories" replace /> },
        { path: 'dictation', lazy: page(() => import('./features/listening/DictationPage')) },
        { path: 'listening/story/:id', lazy: page(() => import('./features/listening/StoryPage')) },
        { path: 'speaking', lazy: page(() => import('./features/speaking/SpeakingPage')) },
        { path: 'reading', element: <Navigate to="/library#texts" replace /> },
        { path: 'reading/:id', lazy: page(() => import('./features/reading/ReaderPage')) },
        { path: 'talk', element: <Navigate to="/library#talk" replace /> },
        { path: 'profile', lazy: page(() => import('./features/profile/ProfilePage')) },
        { path: 'history', lazy: page(() => import('./features/history/HistoryPage')) },
        { path: 'queue', lazy: page(() => import('./features/queue/QueuePage')) },
        { path: 'settings', lazy: page(() => import('./features/settings/SettingsPage')) },
        { path: 'privacy', lazy: page(() => import('./features/privacy/PrivacyPage')) },
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
        { path: 'grammar/check/:level', lazy: page(() => import('./features/grammar/LevelCheck')) },
        { path: 'conjugation/drill', lazy: page(() => import('./features/conjugation/DrillSession')) },
        { path: 'listening/session', lazy: page(() => import('./features/listening/DictationSession')) },
        { path: 'speaking/session', lazy: page(() => import('./features/speaking/SpeakingSession')) },
        { path: 'talk/:id', lazy: page(() => import('./features/talk/TalkChat')) },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
)
