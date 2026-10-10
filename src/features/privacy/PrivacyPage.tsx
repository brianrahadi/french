import type { ReactNode } from 'react'
import { Anchor, Box, Container, List, Text, Title } from '@mantine/core'
import { Link } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { useDocumentTitle } from '../../lib/hooks'

/** Who to write to with questions or to have a synced account deleted. */
const CONTACT = 'brian.rahadi@gmail.com'
const UPDATED = '9 October 2026'

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Box component="section" mt="xl" aria-labelledby={id}>
      <Title id={id} order={2} size="h5" c="dimmed" tt="uppercase" mb="sm">
        {title}
      </Title>
      {children}
    </Box>
  )
}

export default function PrivacyPage() {
  useDocumentTitle('Privacy')
  return (
    <Container size="var(--page-w-narrow)" py="xl">
      <PageHeader eyebrow="Confidentialité" title="Privacy" subtitle={`Petit à petit keeps as little about you as it can. Last updated ${UPDATED}.`} />

      <Section id="p-device" title="On your device">
        <Text lh={1.65} maw="68ch">
          Your progress — flashcards, lessons, mistakes, writing, conversations and saved texts — and your settings are stored
          in this browser. There are no ads, no analytics and no tracking cookies.
        </Text>
      </Section>

      <Section id="p-sync" title="If you sign in with Google">
        <List spacing="xs" lh={1.6} maw="68ch">
          <List.Item>Signing in is optional and only used to sync your progress between your devices.</List.Item>
          <List.Item>Google shares your name, email address and profile picture with the app, which it uses to show who is signed in.</List.Item>
          <List.Item>
            Your progress is stored in a database hosted by Supabase. Access rules mean only your signed-in account can change
            it, and only you and the app’s owner can read it. The owner sees your name, email, when you joined and a summary of
            your progress, to keep the app running and improve it. AI keys, voice, speed and theme are never uploaded.
          </List.Item>
          <List.Item>Signing out keeps your progress on that device.</List.Item>
        </List>
      </Section>

      <Section id="p-people" title="People">
        <List spacing="xs" lh={1.6} maw="68ch">
          <List.Item>
            When you’re signed in, other signed-in learners can find you on{' '}
            <Anchor component={Link} to="/people" inherit>
              People
            </Anchor>{' '}
            and open your profile: your name and picture from Google, when you joined, and the numbers on your profile page — level,
            how much of each level you’ve done, study days, answers, accuracy and skill mix.
          </List.Item>
          <List.Item>Your email address, writing, conversations, mistakes, saved texts and flashcards are never shown to other learners.</List.Item>
          <List.Item>
            To hide yourself, turn off <em>Show me on People</em> on the People page. Hidden profiles can’t be listed or opened by
            anyone else.
          </List.Item>
        </List>
      </Section>

      <Section id="p-ai" title="AI and speech features">
        <List spacing="xs" lh={1.6} maw="68ch">
          <List.Item>
            If you add an AI key, what you ask it about (your writing, conversation messages, texts to explain, and recordings
            to transcribe) is sent from your browser straight to the provider you chose, under that provider’s privacy terms. The
            key stays on your device.
          </List.Item>
          <List.Item>
            Speech recognition uses your browser’s built-in service, which may process audio on the browser maker’s servers.
            Recordings you make to compare with a native voice stay on your device and are gone when you leave the page.
          </List.Item>
        </List>
      </Section>

      <Section id="p-delete" title="Deleting your data">
        <Text lh={1.65} maw="68ch">
          <Anchor component={Link} to="/settings" inherit>
            Settings
          </Anchor>{' '}
          → <em>Reset all progress</em> clears your progress on this device and, when you’re signed in, on all your devices and
          in your account. To have your account and its synced copy removed entirely, or for any question, email{' '}
          <Anchor href={`mailto:${CONTACT}`} inherit>
            {CONTACT}
          </Anchor>
          .
        </Text>
      </Section>
    </Container>
  )
}
