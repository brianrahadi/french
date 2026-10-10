import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { Anchor, Container } from '@mantine/core'
import { ArrowLeft, BookOpenText } from 'lucide-react'
import { TEXT_BY_ID } from '../../data/texts'
import { Empty } from '../../components/ui'
import { useStore } from '../../lib/store'
import { useDocumentTitle } from '../../lib/hooks'
import { paragraphs as splitParagraphs } from '../../lib/french'
import { Reader, type ReaderDoc } from './Reader'

/** A graded text (content/reading) or one the learner pasted or generated. */
export default function ReaderPage() {
  const { id = '' } = useParams()
  const userText = useStore((s) => s.texts.find((t) => t.id === id))
  const updateText = useStore((s) => s.updateText)
  const builtin = TEXT_BY_ID[id]
  const doc: ReaderDoc | null = useMemo(() => {
    if (builtin)
      return {
        id,
        title: builtin.title,
        subtitle: builtin.titleEn,
        level: builtin.level,
        paragraphs: builtin.paragraphs.map((p) => p.fr),
        translation: builtin.paragraphs.map((p) => p.en),
      }
    if (userText)
      return {
        id,
        title: userText.title,
        level: userText.level,
        paragraphs: splitParagraphs(userText.content),
        translation: userText.translation,
      }
    return null
  }, [builtin, userText, id])
  useDocumentTitle(doc ? doc.title : 'Reading')

  if (!doc)
    return (
      <Container size="var(--page-w-narrow)" py="xl">
        <Anchor component={Link} to="/library#texts" size="sm" fw={600} c="dimmed" mb="sm" display="inline-flex" style={{ alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={16} aria-hidden /> Library
        </Anchor>
        <Empty icon={<BookOpenText size={30} />} title="This text isn’t here any more">
          It may have been deleted. <Anchor component={Link} to="/library#texts">Back to your texts</Anchor>
        </Empty>
      </Container>
    )
  return (
    <Reader
      key={doc.id}
      doc={doc}
      back={{ to: '/library#texts', label: 'Library' }}
      onOpen={builtin ? undefined : () => updateText(doc.id, { openedAt: new Date().toISOString() })}
      saveTranslation={builtin ? undefined : (t) => updateText(doc.id, { translation: t })}
    />
  )
}
