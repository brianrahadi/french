import { Link } from 'react-router'
import { useDocumentTitle } from '../../lib/hooks'

/** Who to write to with questions or to have a synced account deleted. */
const CONTACT = 'brian.rahadi@gmail.com'
const UPDATED = '30 September 2026'

export default function PrivacyPage() {
  useDocumentTitle('Privacy')
  return (
    <div className="page page--narrow">
      <header className="page-header">
        <div>
          <div className="page-eyebrow">Confidentialité</div>
          <h1 className="page-title">Privacy</h1>
          <p className="page-subtitle">Petit à petit keeps as little about you as it can. Last updated {UPDATED}.</p>
        </div>
      </header>

      <section className="section privacy" aria-labelledby="p-device">
        <h2 id="p-device" className="section-title">
          On your device
        </h2>
        <p className="prose-p">
          Your progress — flashcards, lessons, mistakes, writing, conversations and saved texts — and your settings are stored
          in this browser. There are no ads, no analytics and no tracking cookies.
        </p>
      </section>

      <section className="section privacy" aria-labelledby="p-sync">
        <h2 id="p-sync" className="section-title">
          If you sign in with Google
        </h2>
        <ul className="prose-list">
          <li>Signing in is optional and only used to sync your progress between your devices.</li>
          <li>Google shares your name, email address and profile picture with the app, which it uses to show who is signed in.</li>
          <li>
            Your progress is stored in a database hosted by Supabase. Access rules mean only your signed-in account can read or
            change it. AI keys, voice, speed and theme are never uploaded.
          </li>
          <li>Signing out keeps your progress on that device.</li>
        </ul>
      </section>

      <section className="section privacy" aria-labelledby="p-ai">
        <h2 id="p-ai" className="section-title">
          AI and speech features
        </h2>
        <ul className="prose-list">
          <li>
            If you add an AI key, what you ask it about (your writing, conversation messages, texts to explain, and recordings
            to transcribe) is sent from your browser straight to the provider you chose, under that provider’s privacy terms. The
            key stays on your device.
          </li>
          <li>
            Speech recognition uses your browser’s built-in service, which may process audio on the browser maker’s servers.
            Recordings you make to compare with a native voice stay on your device and are gone when you leave the page.
          </li>
        </ul>
      </section>

      <section className="section privacy" aria-labelledby="p-delete">
        <h2 id="p-delete" className="section-title">
          Deleting your data
        </h2>
        <p className="prose-p">
          <Link to="/settings">Settings</Link> → <em>Reset all progress</em> clears your progress on this device and, when you’re
          signed in, on all your devices and in your account. To have your account and its synced copy removed entirely, or for
          any question, email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </section>
    </div>
  )
}
