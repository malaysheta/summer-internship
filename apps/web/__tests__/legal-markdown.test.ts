import assert from 'node:assert/strict'
import { test } from 'node:test'
import { prepareLegalMarkdown, legalMarkdownToHtml, citationOrder, hasTopHeading } from '../lib/legal-markdown'

const DRAFT = [
  '--- **AI-generated draft — not legal advice.** Produced by Trionic Adalat. ---',
  '# LEGAL NOTICE UNDER SECTION 138',
  '**To:** Ramesh Kumar',
  '## Demand',
  'Pay within fifteen days [CITE:NI-1881/S-138], failing which [CITE:NI-1881/S-142] applies.',
  '1. First point\n2. Second point',
  '- bullet <script>alert(1)</script>',
  '---',
  '| A | B |\n|---|---|\n| x | y |',
].join('\n\n')

test('drops the Drafter banner paragraph but keeps the document', () => {
  const out = prepareLegalMarkdown(DRAFT)
  assert.ok(!out.includes('AI-generated draft'))
  assert.ok(out.startsWith('# LEGAL NOTICE'))
})

test('renders real markdown structure, not raw ## / ** text', () => {
  const html = legalMarkdownToHtml(DRAFT, (id) => `<sup>${citationOrder(DRAFT).indexOf(id) + 1}</sup>`)
  assert.match(html, /<h1>LEGAL NOTICE UNDER SECTION 138<\/h1>/)
  assert.match(html, /<h2>Demand<\/h2>/)
  assert.match(html, /<strong>To:<\/strong>/)
  assert.match(html, /<ol><li>First point<\/li><li>Second point<\/li><\/ol>/)
  assert.match(html, /<hr\/>/)
  assert.match(html, /<table>[\s\S]*<th>A<\/th>[\s\S]*<td>y<\/td>/)
  assert.match(html, /fifteen days <sup>1<\/sup>, failing which <sup>2<\/sup>/)
  assert.ok(!html.includes('##') && !html.includes('**') && !html.includes('[CITE:'))
})

test('escapes HTML coming from the draft text', () => {
  const html = legalMarkdownToHtml(DRAFT, () => '')
  assert.ok(!html.includes('<script>'))
  assert.ok(html.includes('&lt;script&gt;'))
})

test('citation numbering follows first appearance; top heading detection', () => {
  assert.deepEqual(citationOrder('a [CITE:X] b [CITE:Y] c [CITE:X]'), ['X', 'Y'])
  assert.equal(hasTopHeading(DRAFT), true)
  assert.equal(hasTopHeading('## Only sections'), false)
})

test('drops the translated (Gujarati) banner block too', () => {
  const gu = '---\n**AI દ્વારા તૈયાર કરેલ ડ્રાફ્ટ — કાનૂની સલાહ નથી.** ઉપયોગ પહેલાં ચકાસણી કરો.\n---\n\n# કાનૂની નોટિસ\n\n## મોકલનાર\n\nટેક્સ્ટ'
  const out = prepareLegalMarkdown(gu)
  assert.ok(out.startsWith('# કાનૂની નોટિસ'))
  assert.ok(!out.includes('કાનૂની સલાહ નથી'))
})
