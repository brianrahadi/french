import { beforeEach, describe, expect, it } from 'vitest'
import { initialState, useStore, withSyncMeta, type State } from './store'
import { DEVICE_ID } from './device'
import { dayKey } from './date'

beforeEach(() => useStore.setState({ ...initialState }))

describe('sync bookkeeping in the store', () => {
  it('counts activity in total and for this device', () => {
    useStore.getState().logActivity(true)
    useStore.getState().logActivityBulk(3, 2)
    const s = useStore.getState()
    const k = dayKey()
    expect(s.activity[k]).toEqual({ items: 4, correct: 3, newWords: 0 })
    expect(s.sync.devices[DEVICE_ID][k]).toEqual(s.activity[k])
  })
  it('gives older saves a per-device activity record', () => {
    const old = { ...initialState, activity: { '2026-01-01': { items: 5, correct: 4, newWords: 1 } }, sync: undefined } as unknown as State
    expect(withSyncMeta(old).sync.devices[DEVICE_ID]).toEqual(old.activity)
  })
  it('stamps shared settings key by key, but not device settings', () => {
    useStore.getState().updateSettings({ voiceURI: 'x', theme: 'dark', palette: 'onyx' })
    expect(useStore.getState().sync.changed).toEqual({})
    useStore.getState().updateSettings({ dailyGoal: 50 })
    expect(Object.keys(useStore.getState().sync.changed)).toEqual(['settings.dailyGoal'])
  })
  it('stamps skill histories and the deck list when words are added', () => {
    useStore.getState().recordSkill('lesson:articles', true)
    useStore.getState().addCustomWords([{ id: 'custom-a', fr: 'a', en: 'a', pos: 'expr', level: 'A1', deck: 'custom', custom: true }])
    const { changed } = useStore.getState().sync
    expect(changed['skill:lesson:articles']).toBeTruthy()
    expect(changed.activeDecks).toBeTruthy()
  })
  it('stamps everything in a save from before sync, so it wins over a new device', () => {
    const old = { ...initialState, skills: { 'lesson:a': [1] }, sync: undefined } as unknown as State
    const { changed } = withSyncMeta(old, true).sync
    expect(changed['settings.dailyGoal']).toBeTruthy()
    expect(changed['skill:lesson:a']).toBeTruthy()
    expect(changed['settings.theme']).toBeUndefined()
    expect(withSyncMeta(old).sync.changed).toEqual({})
  })
  it('records deletions and starts a new epoch on reset', () => {
    useStore.getState().deleteWriting('w1')
    expect(useStore.getState().sync.deleted['writing:w1']).toBeTruthy()
    useStore.getState().resetAll()
    expect(useStore.getState().sync.epoch).not.toBe('')
  })
})

describe('study time and finished conversations', () => {
  it('adds study time to this device’s day', () => {
    useStore.getState().addStudyTime('2026-10-12', { grammar: 30 })
    useStore.getState().addStudyTime('2026-10-12', { grammar: 15, talk: 5 })
    expect(useStore.getState().studyTime[DEVICE_ID]['2026-10-12']).toEqual({ grammar: 45, talk: 5 })
  })
  it('keeps a short record of each finished conversation, and forgets it when the conversation is deleted', () => {
    const at = new Date().toISOString()
    const c = { id: 'c1', scenarioId: 'cafe', title: '', level: 'A1' as const, turns: [], goalsMet: [], startedAt: at, updatedAt: at, model: '' }
    useStore.getState().saveConversation(c)
    expect(useStore.getState().talkLog).toEqual({})
    useStore.getState().saveConversation({ ...c, feedback: { summary: '', score: 72, level: 'A1', strengths: [], improvements: [], vocabulary: [], tip: '' } })
    expect(useStore.getState().talkLog.c1).toEqual({ scenarioId: 'cafe', level: 'A1', score: 72, at })
    useStore.getState().deleteConversation('c1')
    expect(useStore.getState().talkLog.c1).toBeUndefined()
  })
})

describe('checking words after reading', () => {
  it('schedules known words for later and starts the unknown ones, without using up new words', async () => {
    const { State: S } = await import('./srs')
    const { newAvailableToday } = await import('../features/vocab/selectors')
    const before = newAvailableToday(useStore.getState())
    useStore.getState().checkWords([{ wordId: 'maison-n', known: true }, { wordId: 'gare-n', known: false }], ['r', 'p'])
    const s = useStore.getState()
    const known = s.cards['maison-n|r']
    expect(known.state).toBe(S.Review)
    expect(new Date(known.due).getTime() - Date.now()).toBeGreaterThan(24 * 3600e3)
    expect(s.cards['maison-n|p']).toBeUndefined()
    expect(s.cards['gare-n|r'].state).toBe(S.Learning)
    expect(s.cards['gare-n|p']).toBeDefined()
    expect(s.introduced['maison-n']).toBe(`${dayKey()}k`)
    expect(s.introduced['gare-n']).toBe(dayKey())
    expect(newAvailableToday(s)).toBe(Math.max(0, before - 1))
  })
  it('counts as a review for a word already being learned', () => {
    useStore.getState().introduceWord('maison-n', ['r'])
    useStore.getState().checkWords([{ wordId: 'maison-n', known: false }], ['r'])
    expect(useStore.getState().cards['maison-n|r'].lapses + useStore.getState().cards['maison-n|r'].reps).toBeGreaterThan(0)
  })
})

describe('no duplicate words', () => {
  it('starts a deck word instead of adding "la gare" when "gare" is built in', async () => {
    const { customWord } = await import('./words')
    useStore.getState().addCustomWords([customWord('la gare', 'station')])
    const s = useStore.getState()
    expect(s.customWords).toEqual([])
    expect(s.introduced['gare-n']).toBeDefined()
    expect(s.cards['gare-n|r']).toBeDefined()
  })
  it('skips the same word added again with another article or meaning', async () => {
    const { customWord } = await import('./words')
    useStore.getState().addCustomWords([customWord('la trottinette', 'scooter')])
    useStore.getState().addCustomWords([customWord('une trottinette', 'kick scooter'), customWord('trottinette (f)', 'scooter')])
    expect(useStore.getState().customWords.map((w) => w.fr)).toEqual(['la trottinette'])
  })
})
