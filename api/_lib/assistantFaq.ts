export type AssistantFaq = {
  question: string
  answer: string
}

type AssistantFaqEntry = AssistantFaq & {
  keywords: string[]
}

const ERP_ASSISTANT_FAQS: AssistantFaqEntry[] = [
  {
    question: 'What can Mahalaxmi Saathi do?',
    answer: 'Saathi explains documented ERP workflows and can answer questions using only the signed-in user’s permitted tasks and ERP records supplied with the question. It is read-only: it cannot edit records, approve work, or perform ERP actions. Verify important decisions in the ERP or with a supervisor.',
    keywords: ['saathi', 'assistant', 'ai', 'ai helper', 'what can ai do', 'what can the ai do', 'what can it do', 'read only', 'change records', 'edit data', 'સહાયક', 'રેકોર્ડ બદલો'],
  },
  {
    question: 'How do I complete a Daily Task?',
    answer: 'The Super Admin assigns dated work in Daily Tasks. The employee updates progress and submits completed, pending, and issue notes. The Super Admin then approves the work or requests changes. Non-admin users can ask Saathi about their own assigned tasks.',
    keywords: ['daily task', 'daily tasks', 'my task', 'my tasks', 'pending task', 'pending tasks', 'task status', 'assign task', 'assign tasks', 'task complete', 'complete task', 'complete tasks', 'submit task', 'task approval', 'baki task', 'baki kaam', 'kaam', 'મારું કામ', 'બાકી કામ', 'દૈનિક કાર્ય'],
  },
  {
    question: 'Who records production and reviews quality?',
    answer: 'The Production Supervisor records production and manages quality review. Machine Operators can inspect production and their assigned targets. Use the Production and Quality Control pages for the workflow; ask the supervisor if a correction or review is needed.',
    keywords: ['production', 'record production', 'production entry', 'quality check', 'quality control', 'qc', 'machine operator', 'production target', 'ઉત્પાદન', 'ગુણવત્તા', 'મશીન'],
  },
  {
    question: 'How should I update stock?',
    answer: 'Record stock changes through the appropriate Stock Movement workflow. Do not edit workbook cells directly. Stock visibility and permitted actions depend on the signed-in ERP role.',
    keywords: ['stock', 'inventory', 'stock movement', 'stock update', 'adjust stock', 'raw material', 'finished goods', 'sku', 'maal', 'સ્ટોક', 'કાચો માલ', 'તૈયાર માલ'],
  },
  {
    question: 'How do Sales Executives work with leads and orders?',
    answer: 'Sales Executives work with their assigned leads, record follow-ups, and book orders against available active inventory. The Production Supervisor handles dispatches.',
    keywords: ['sales lead', 'lead follow up', 'followup', 'customer', 'sales order', 'book order', 'dispatch', 'sales executive', 'વેચાણ', 'લીડ', 'ગ્રાહક', 'ઓર્ડર'],
  },
  {
    question: 'What can E-commerce staff access?',
    answer: 'E-commerce staff can access only their assigned marketplace platforms. Executives update permitted listing fields and submit reports; Managers review their own team. Saathi live lookup currently covers assigned listings and stock movements only, so use the ERP page to verify orders or reports.',
    keywords: ['ecommerce', 'marketplace', 'assigned platform', 'listing', 'amazon', 'flipkart', 'meesho', 'myntra', 'shopify', 'ઈકોમર્સ', 'માર્કેટપ્લેસ', 'લિસ્ટિંગ'],
  },
  {
    question: 'How do Graphic Designers submit their work?',
    answer: 'Graphic Designers track assigned creative work and submit daily work reports. The Super Admin reviews the work.',
    keywords: ['graphic design', 'designer', 'creative task', 'daily work report', 'content', 'caption', 'video', 'design', 'ગ્રાફિક', 'ડિઝાઇન', 'ક્રિએટિવ'],
  },
  {
    question: 'Who can access Accounts, User Management, Settings, and Audit Logs?',
    answer: 'Accounts, User Management, ERP Settings, and Audit Logs are Super Admin areas. If access is needed, contact the Super Admin; do not bypass role permissions.',
    keywords: ['accounts', 'user management', 'settings', 'audit log', 'super admin access', 'permission', 'access denied', 'એકાઉન્ટ', 'વપરાશકર્તા', 'સેટિંગ્સ', 'ઓડિટ'],
  },
  {
    question: 'Can Saathi provide a final profit or accounting figure?',
    answer: 'Saathi can only refer to recorded ERP values that were supplied for the question. Reports may be incomplete, so do not treat an estimate or partial total as finalized profit or accounting advice.',
    keywords: ['profit', 'loss', 'financial report', 'accounting', 'final total', 'income', 'expense', 'નફો', 'ખોટ', 'હિસાબ'],
  },
]

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'can', 'do', 'for', 'how', 'i', 'in', 'is', 'it', 'me', 'my',
  'of', 'on', 'or', 'the', 'to', 'what', 'when', 'where', 'which', 'who', 'why', 'with',
  'assigned', 'complete', 'daily', 'report', 'task', 'tasks', 'work',
  'shu', 'su', 'kem', 'kai', 'kya', 'ma', 'mane', 'mara', 'mari', 'che', 'chhe',
])

function faqTokens(value: string) {
  return value.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []
}

function normalizeFaqText(value: string) {
  return faqTokens(value).join(' ')
}

export function findRelevantAssistantFaqs(question: string, limit = 3): AssistantFaq[] {
  const normalizedQuestion = normalizeFaqText(question)
  const questionTerms = new Set(faqTokens(question).filter(term => term.length > 1 && !STOP_WORDS.has(term)))
  if (!questionTerms.size) return []

  return ERP_ASSISTANT_FAQS
    .map((faq, index) => {
      const keywords = faq.keywords.map(normalizeFaqText).filter(Boolean)
      const faqTerms = new Set(keywords.flatMap(faqTokens).filter(term => term.length > 1 && !STOP_WORDS.has(term)))
      const phraseScore = keywords.reduce((score, keyword) => {
        return ` ${normalizedQuestion} `.includes(` ${keyword} `)
          ? score + (keyword.includes(' ') ? 4 : 2)
          : score
      }, 0)
      const overlapScore = [...questionTerms].filter(term => faqTerms.has(term)).length
      return { faq, index, score: phraseScore + overlapScore }
    })
    .filter(result => result.score >= 2)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, Math.max(0, Math.min(3, limit)))
    .map(({ faq }) => ({ question: faq.question, answer: faq.answer }))
}
