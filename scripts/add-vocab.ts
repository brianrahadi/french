import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const BATCH_SIZE = 50
const FREQUENCY_LIST_URL = 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/fr/fr_50k.txt'
const SYSTEM_PROMPT = `You are an expert French language teacher.
Given a list of French words, provide the following for each:
- 'en': The best English translation (keep it concise, e.g., 'hello, good morning').
- 'pos': The part of speech (must be exactly one of: 'n', 'v', 'adj', 'adv', 'prep', 'conj', 'pron', 'expr', 'num', 'det', 'interj').
- 'ex': A natural, intermediate-level (A2/B1) French example sentence using the word.
- 'exEn': The English translation of the example sentence.

Respond ONLY with a JSON array of objects.
Example response:
[
  { "fr": "bonjour", "en": "hello, good morning", "pos": "interj", "ex": "Bonjour, comment allez-vous ?", "exEn": "Hello, how are you?" }
]
`

async function getExistingWords() {
  const existing = new Set<string>()
  const vocabDir = path.join(ROOT, 'content', 'vocab')
  
  function scan(dir: string) {
    if (!fs.existsSync(dir)) return
    for (const file of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, file)
      if (fs.statSync(fullPath).isDirectory()) {
        scan(fullPath)
      } else if (file.endsWith('.md')) {
        const content = fs.readFileSync(fullPath, 'utf8')
        // Extract words from markdown table: | word | translation | ...
        const lines = content.split('\n')
        let inTable = false
        for (const line of lines) {
          if (line.trim().startsWith('|') && line.includes('---')) {
            inTable = true
            continue
          }
          if (inTable && line.trim().startsWith('|')) {
            const cols = line.split('|').map(c => c.trim())
            if (cols.length > 2 && cols[1]) {
              existing.add(cols[1].toLowerCase())
            }
          } else if (inTable && line.trim() === '') {
            inTable = false
          }
        }
      }
    }
  }
  
  scan(vocabDir)
  return existing
}

async function getFrequencyList() {
  console.log('Downloading French frequency list...')
  const res = await fetch(FREQUENCY_LIST_URL)
  if (!res.ok) throw new Error('Failed to download frequency list')
  const text = await res.text()
  
  const words: string[] = []
  for (const line of text.split('\n')) {
    const parts = line.split(' ')
    if (parts.length > 0 && parts[0].trim()) {
      words.push(parts[0].trim().toLowerCase())
    }
  }
  return words
}

async function callOpenAI(words: string[]) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required to generate translations and examples.')
  }
  
  console.log(`Calling OpenAI to generate data for ${words.length} words...`)
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(words) }
      ],
      response_format: { type: 'json_object' } // We instruct it to return json but strictly expecting array might fail with json_object if not wrapped, so we will wrap it
    })
  })
  
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`OpenAI API failed: ${res.status} ${errorText}`)
  }
  
  const data = await res.json()
  const content = data.choices[0].message.content
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) return parsed
    if (parsed.words && Array.isArray(parsed.words)) return parsed.words
    if (parsed.data && Array.isArray(parsed.data)) return parsed.data
    throw new Error('Unexpected JSON format')
  } catch (err) {
    throw new Error(`Failed to parse OpenAI response: ${content}`)
  }
}

async function main() {
  const existing = await getExistingWords()
  console.log(`Found ${existing.size} existing words in markdown files.`)
  
  const allWords = await getFrequencyList()
  console.log(`Loaded ${allWords.length} words from frequency list.`)
  
  // Exclude single-letter words except a, y
  const validWords = allWords.filter(w => w.length > 1 || w === 'a' || w === 'y')
  const missing = validWords.filter(w => !existing.has(w))
  
  const batch = missing.slice(0, BATCH_SIZE)
  if (batch.length === 0) {
    console.log('No new words to add!')
    return
  }
  
  console.log(`Selected top ${batch.length} missing words:`, batch.join(', '))
  
  // Need to adjust SYSTEM_PROMPT to ensure it returns a root object if response_format={type:'json_object'}
  // Let's modify the system prompt slightly for this specific run.
  const modifiedPrompt = SYSTEM_PROMPT.replace('Respond ONLY with a JSON array of objects.', 'Respond ONLY with a JSON object containing a "words" array.')
  
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('ERROR: OPENAI_API_KEY environment variable is missing.')
    console.log(`Run: OPENAI_API_KEY=your_key node --experimental-strip-types scripts/add-vocab.ts`)
    process.exit(1)
  }
  
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: modifiedPrompt },
        { role: 'user', content: JSON.stringify(batch) }
      ],
      response_format: { type: 'json_object' }
    })
  })
  
  if (!res.ok) {
    console.error(`OpenAI API failed:`, await res.text())
    process.exit(1)
  }
  
  const data = await res.json()
  let generated = []
  try {
    const parsed = JSON.parse(data.choices[0].message.content)
    generated = parsed.words || parsed
  } catch (err) {
    console.error('Failed to parse OpenAI response:', data.choices[0].message.content)
    process.exit(1)
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '').split('T')[1].slice(0, 4)
  const id = `a2-freq-${timestamp}`
  const fileName = `99-freq-${timestamp}.md`
  const dirPath = path.join(ROOT, 'content', 'vocab', 'a2')
  
  let md = `---
id: ${id}
title: Popular Words ${timestamp}
titleFr: Mots Fréquents ${timestamp}
---

| French          | English              | Type   | Example                                | Translation                               |
| --------------- | -------------------- | ------ | -------------------------------------- | ----------------------------------------- |
`

  for (const item of generated) {
    md += `| ${item.fr.padEnd(15)} | ${item.en.padEnd(20)} | ${(item.pos||'').padEnd(6)} | ${item.ex.padEnd(38)} | ${item.exEn.padEnd(41)} |\n`
  }
  
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })
  fs.writeFileSync(path.join(dirPath, fileName), md, 'utf8')
  
  console.log(`\nSuccess! Created ${path.join('content/vocab/a2', fileName)} with ${generated.length} words.`)
  console.log('You can run this script again to get the next batch of 50 words.')
}

main().catch(console.error)
