import { useEffect, useState } from 'react'
import { ActionIcon } from '@mantine/core'
import { Volume2 } from 'lucide-react'
import { speak, speechSupported } from '../lib/speech'
import { useStore } from '../lib/store'

export function useSpeak() {
  const voiceURI = useStore((s) => s.settings.voiceURI)
  const rate = useStore((s) => s.settings.rate)
  return (text: string, handlers?: { onStart?: () => void; onEnd?: () => void }) =>
    speak(text, { voiceURI, rate, ...handlers })
}

export function SpeakButton({
  text,
  size = 'md',
  label,
  autoPlay = false,
  className = '',
}: {
  text: string
  size?: 'sm' | 'md'
  label?: string
  autoPlay?: boolean
  className?: string
}) {
  const say = useSpeak()
  const [speaking, setSpeaking] = useState(false)
  const play = () => say(text, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) })

  useEffect(() => {
    if (autoPlay) play()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, text])

  if (!speechSupported) return null
  return (
    <ActionIcon
      variant={speaking ? 'filled' : 'light'}
      size={size === 'sm' ? 'md' : 'lg'}
      radius="xl"
      className={className}
      onClick={(e) => {
        e.stopPropagation()
        play()
      }}
      aria-label={label ?? `Listen: ${text}`}
      title="Listen"
    >
      <Volume2 size={size === 'sm' ? 16 : 19} aria-hidden />
    </ActionIcon>
  )
}
