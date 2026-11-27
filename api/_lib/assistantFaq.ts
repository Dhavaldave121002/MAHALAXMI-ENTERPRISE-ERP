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
    question: 'How does the ERP system work, and what are its benefits?',
    answer: 'Mahalaxmi ERP keeps business work in one role-based system. Admins set up users, products, listings, targets, and tasks. Sales Executives follow up on assigned leads and book orders against available active stock. The Production Supervisor records production and quality checks; only QC-passed units increase finished-goods stock, and dispatches are linked to orders. E-commerce teams work with their assigned platforms, while Managers review their own teams. Reports summarize recorded ERP activity. This helps teams use shared records, trace stock and work, clarify responsibilities, and follow up more easily. It does not automatically sync marketplace data, and reports can be incomplete if source records are missing. Saathi is read-only and cannot perform ERP actions.',
    keywords: ['how does erp work', 'how does this erp work', 'how this erp works', 'how work this erp system', 'how work th this erp system', 'erp system overview', 'erp overview', 'what does erp do', 'what is erp', 'erp workflow', 'erp system benefit', 'erp system benefits', 'benefit of this system', 'benefits of erp', 'benofitt', 'benofit', 'benifit', 'benifits', 'erp kem chale', 'system su kare', 'shu faydo', 'ફાયદા'],
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
    question: 'What can a Store Manager access?',
    answer: 'Store Manager accounts retain dashboard access. Other ERP modules are role-restricted; ask the Super Admin if your assigned responsibilities require additional access.',
    keywords: ['store manager access', 'store manager module', 'store manager dashboard', 'store manager permission', 'સ્ટોર મેનેજર'],
  },
  {
    question: 'Can Saathi provide a final profit or accounting figure?',
    answer: 'Saathi can only refer to recorded ERP values that were supplied for the question. Reports may be incomplete, so do not treat an estimate or partial total as finalized profit or accounting advice.',
    keywords: ['profit', 'loss', 'financial report', 'accounting', 'final total', 'income', 'expense', 'નફો', 'ખોટ', 'હિસાબ'],
  },
  {
    question: 'How do I change or reset my password?',
    answer: 'Change your own password from the Change Password page using your current password. If you cannot sign in, ask the Super Admin to set a new password in User Management. Never send a password in chat or to Saathi.',
    keywords: ['change password', 'reset password', 'forgot password', 'password problem', 'cannot login', 'cant login', 'sign in', 'login issue', 'password bhuli', 'પાસવર્ડ', 'લૉગિન'],
  },
  {
    question: 'Why can’t I see a page, task, or business record?',
    answer: 'Page access depends on your active ERP role. Tasks and business records are also limited to your assignments; E-commerce users see only their assigned platforms and team. Ask the Super Admin to check your account role, assignment, or reporting link. Do not use another person’s account.',
    keywords: ['cannot see', 'cant see', 'can’t see', 'not visible', 'not showing', 'missing page', 'missing data', 'access denied', 'no access', 'permission', 'role access', 'assigned platform', 'dekhatu nathi', 'દેખાતું નથી', 'પરવાનગી'],
  },
  {
    question: 'Why can’t an E-commerce Manager see an executive?',
    answer: 'Managers see only active direct reports linked to them. A Super Admin can link or reassign an active E-commerce Executive in User Management. Executives created by a Manager are linked to that Manager automatically.',
    keywords: ['manager cannot see executive', 'manager cant see executive', 'manager can’t see executive', 'cant see executive', 'can’t see executive', 'manager team', 'direct report', 'reporting manager', 'link executive', 'assign manager', 'team member missing', 'મેનેજર', 'ટીમ'],
  },
  {
    question: 'How do E-commerce users get access to a marketplace platform?',
    answer: 'A Super Admin assigns one or more supported platforms to each E-commerce Executive. The Manager workspace is limited to that Manager’s active direct reports and their assigned platforms. Ask the Super Admin to correct a missing or incorrect assignment.',
    keywords: ['ecommerce platform access', 'marketplace access', 'assign platform', 'platform assignment', 'platform missing', 'amazon access', 'flipkart access', 'meesho access', 'shopify access', 'myntra access', 'માર્કેટપ્લેસ'],
  },
  {
    question: 'How do I complete and submit an E-commerce task or daily report?',
    answer: 'Executives update their assigned task progress and submit completed work for Manager review. For a daily report, enter completed, pending, and issue notes in the E-commerce workspace. Managers can assign dated tasks to their own executives, review submissions, and submit one private daily report of their own.',
    keywords: ['ecommerce task', 'ecommerce report', 'daily report', 'submit report', 'task progress', 'manager review', 'completed pending issues', 'e-commerce daily', 'ઈકોમર્સ રિપોર્ટ'],
  },
  {
    question: 'How are E-commerce order targets and actuals counted?',
    answer: 'The Super Admin sets Manager targets, and Managers set targets for their Executives. Actuals count unique dispatched order numbers across the assigned platforms; an order is not counted twice when platforms overlap. The ERP does not connect to marketplace APIs, so verify marketplace totals separately.',
    keywords: ['ecommerce target', 'ecommerce targets', 'ecommerce actual', 'order target', 'target calculation', 'targets counted', 'actual count', 'unique order', 'marketplace api', 'double count', 'target mismatch', 'લક્ષ્ય', 'ટાર્ગેટ'],
  },
  {
    question: 'How do I import Sales leads?',
    answer: 'Only the Super Admin can import leads. Use the first sheet of an XLSX, XLS, or CSV file with 1–500 rows; Contact Name and Phone are required. Duplicate phone numbers are skipped. You can include Assigned To or choose a default assignee during import.',
    keywords: ['import leads', 'import sales leads', 'sales lead import', 'lead import', 'sales leads upload', 'upload csv', 'upload xlsx', 'lead template', 'duplicate phone', 'assigned to', 'લીડ ઇમ્પોર્ટ'],
  },
  {
    question: 'Why was my Sales order booking rejected?',
    answer: 'A booking must use an active finished-goods SKU and enough currently available stock. A successful booking immediately reserves stock. A custom product or customer name is saved only on that order; it does not create a catalog item, listing, or lead. Ask the Production Supervisor to check stock or the SKU.',
    keywords: ['sales order booking rejected', 'order booking rejected', 'booking rejected', 'order booking failed', 'order rejected', 'booking failed', 'cannot book order', 'cant book order', 'insufficient stock', 'not enough stock', 'active sku', 'order reservation', 'sales order problem', 'ઓર્ડર બુક', 'સ્ટોક ઓછો'],
  },
  {
    question: 'Who can dispatch a booked Sales order?',
    answer: 'Only the Production Supervisor records dispatches. In Shipping & Delivery, select DIRECT and link the booked ORD-… order ID. Dispatch consumes the order’s stock reservation. The Super Admin can inspect dispatch information but cannot record the dispatch.',
    keywords: ['dispatch sales order', 'ship booked order', 'direct dispatch', 'ord id', 'order reservation', 'who can dispatch', 'shipping and delivery', 'dispatch order', 'ડિસ્પેચ'],
  },
  {
    question: 'How do Sales order cancellations affect targets?',
    answer: 'A Sales Executive can cancel their own unfulfilled quantity, and the Super Admin can cancel any order. Cancellation releases the related reserved quantity and Sales actuals are calculated from booked amounts minus cancelled units. Contact the Super Admin if the order is already fulfilled or the cancellation is incorrect.',
    keywords: ['cancel sales order', 'sales order cancellations', 'order cancellation', 'cancellations affect targets', 'cancel quantity', 'sales target actual', 'unfulfilled order', 'release reservation', 'ઓર્ડર રદ'],
  },
  {
    question: 'What is the difference between a Product SKU and a marketplace SKU?',
    answer: 'The Product SKU identifies the ERP product or variant. A marketplace SKU identifies its listing on a specific platform. Admins and Production Supervisors manage products and listings in Product Catalog; changing a listing SKU does not change the shared ERP Product SKU.',
    keywords: ['product sku', 'marketplace sku', 'platform sku', 'listing sku', 'sku difference', 'catalog listing', 'sku mapping', 'product catalog', 'એસકેયુ'],
  },
  {
    question: 'How do I upload or find a shipping label?',
    answer: 'Shipping labels are private PDFs up to 3 MB. E-commerce Executives can access labels for their assigned platforms, Managers for their active direct reports’ platforms, and Production Supervisors for all platforms. Labels are permanently deleted after 7 days. Super Admins do not have access to the Shipping Labels module.',
    keywords: ['shipping label', 'upload label', 'download label', 'label pdf', 'label missing', 'label size', '3 mb', '7 days', 'shipping label access', 'શિપિંગ લેબલ'],
  },
  {
    question: 'How do I plan Graphic Design work and submit progress?',
    answer: 'In Graphic Design, schedule product-linked posts or videos within a selected month, choose one or more supported platforms, and provide a brief, caption, and video script or shot list. Track shoot and edit progress separately. Submit completed, pending, and issue notes in Daily Work Report; the Super Admin reviews the work.',
    keywords: ['graphic design task', 'schedule post', 'social post', 'video script', 'shot list', 'shoot progress', 'edit progress', 'daily work report', 'designer task', 'ગ્રાફિક ડિઝાઇન'],
  },
  {
    question: 'Who can add a supplier or change supplier status?',
    answer: 'The Super Admin and Production Supervisor can add suppliers. Only the Production Supervisor can activate or deactivate them. A raw material requires an active supplier, and each Purchase Inward requires a supplier and unit cost.',
    keywords: ['add supplier', 'supplier status', 'activate supplier', 'deactivate supplier', 'purchase inward', 'raw material supplier', 'supplier missing', 'સપ્લાયર'],
  },
  {
    question: 'Why is a production entry not increasing finished-goods stock?',
    answer: 'New production starts as Pending QC and does not increase available finished-goods stock until the Production Supervisor records a QC pass. Pass and reject quantities must add up to the batch output. Ask the Production Supervisor to review the QC record if the quantities or stock still look wrong.',
    keywords: ['production not increasing finished goods stock', 'production stock not updated', 'pending qc', 'quality control pass', 'qc rejected', 'production entry stock', 'finished goods quantity', 'qc quantity', 'ઉત્પાદન સ્ટોક', 'ક્વોલિટી'],
  },
  {
    question: 'Why does a stock or report total look different?',
    answer: 'Check the source ERP page and date range first. Stock Movement is an append-only ledger, so corrections are recorded as adjustments rather than deleting posted movements. E-commerce reports use the current listing selling price for dispatched units, while ERP Reports use the unit price saved at dispatch. Do not treat partial Saathi context as a finalized total.',
    keywords: ['stock mismatch', 'stock discrepancy', 'report mismatch', 'wrong total', 'sales total different', 'selling price report', 'stock movement correction', 'ledger adjustment', 'રિપોર્ટ ખોટો', 'સ્ટોક ખોટો'],
  },
  {
    question: 'What should I do if Mahalaxmi Saathi cannot answer?',
    answer: 'When the private model is not connected, Saathi can answer only documented FAQs and cannot check live ERP records. If a documented FAQ is missing, ask the Super Admin to add the workflow to the knowledge base. For live answers, the administrator must configure the private model server and its authenticated HTTPS connection; never expose the model port or share its token.',
    keywords: ['ai not working', 'assistant unavailable', 'model offline', 'cannot answer', 'cant answer', 'private ai setup', 'ollama connection', 'server error', 'ai timeout', 'live data unavailable', 'એઆઈ કામ નથી કરતું'],
  },
  {
    question: 'How are Chat messages, attachments, and AI memory retained?',
    answer: 'Chat messages and attachments are separate from AI memory. Messages are hidden after 48 hours and a scheduled cleanup deletes expired messages and files; cleanup may be delayed by about 15 minutes. Saathi’s separate memory remains until you clear it. If expired messages remain visible, ask the Super Admin to check the Apps Script deployment and cleanup trigger.',
    keywords: ['chat retention', 'delete chat', 'chat messages expired', 'chat attachment retention', 'clear ai memory', 'memory separate', '48 hours', 'chat cleanup', 'ચેટ ડિલીટ'],
  },
  {
    question: 'How do I share my screen or camera, and what is recorded?',
    answer: 'Screen sharing and camera recording start only after you press Start and approve the browser permissions; you can stop at any time. No audio, keystrokes, or browser history are recorded. Saved clips are private, split into five-minute files, and moved to Drive Trash after 24 hours. Select only a screen you are permitted to share.',
    keywords: ['screen recording', 'share screen', 'camera recording', 'webcam', 'recording permission', 'recording upload', 'screen clip', 'no audio', 'screen share', 'સ્ક્રીન રેકોર્ડિંગ'],
  },
  {
    question: 'Who can see Chat messages and attachments?',
    answer: 'Chat participants can read their own conversations, and the Super Admin can view all conversations and attachments. Attachments may be JPEG, PNG, GIF, WebP, or PDF files up to 3 MB. Chat data is stored privately and links are not made public.',
    keywords: ['chat privacy', 'who can see chat', 'chat attachment', 'send file chat', 'chat file size', 'private chat', 'chat access', 'ચેટ પ્રાઇવસી'],
  },
  {
    question: 'Can Saathi reset the ERP or change business records?',
    answer: 'No. Saathi is read-only and cannot edit, approve, or reset ERP data. Only the Super Admin can run the separate Reset ERP data action, which clears business rows after making private backups. Ask the Super Admin to verify backups and deployment before any reset.',
    keywords: ['reset erp', 'clear erp data', 'delete all data', 'change records', 'approve work', 'assistant edit', 'read only', 'erp reset', 'ડેટા ડિલીટ'],
  },
]

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'can', 'do', 'for', 'how', 'i', 'in', 'is', 'it', 'me', 'my',
  'of', 'on', 'or', 'the', 'to', 'what', 'when', 'where', 'which', 'who', 'why', 'with',
  'assigned', 'complete', 'daily', 'report', 'task', 'tasks', 'work',
  'shu', 'su', 'kem', 'kai', 'kya', 'ma', 'mane', 'mara', 'mari', 'che', 'chhe',
])

function faqTokens(value: string) {
  return (value.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).map(term => {
    if (term.length > 4 && term.endsWith('ies')) return `${term.slice(0, -3)}y`
    if (term.length > 4 && term.endsWith('s') && !term.endsWith('ss')) return term.slice(0, -1)
    return term
  })
}

function normalizeFaqText(value: string) {
  return faqTokens(value).join(' ')
}

export function findRelevantAssistantFaqs(question: string, limit = 3): AssistantFaq[] {
  const normalizedQuestion = normalizeFaqText(question)
  const questionTerms = new Set(faqTokens(question).filter(term => term.length > 1 && !STOP_WORDS.has(term)))

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

export function assistantFaqQuestionNeedsLiveData(question: string): boolean {
  const hasLiveDataTopic = /\b(tasks?|daily work|stock|inventory|sku|product|lead|follow.?up|order|sales|production|machine|target|supplier|vendor|expense|account|report|listing|platform|shipment|dispatch|return|damage|customer|revenue|purchase|manager|executive)\b/i.test(question)
  const asksForSnapshot = /\b(show|list|find|search|check|how many|how much|current|today|yesterday|actual|balance|available|pending|assigned|what is my|what are my|who is my|my (?:stock|inventory|tasks?|orders?|leads?|reports?)|ketla|ketli|ketlu|ketlo|aaje|aaj|mara|mari)\b/i.test(question)
  const asksForWorkflow = /\b(how to|how do i|how can i|how should i|steps|workflow|procedure|who can|who handles|where do i|show me how|kem karu|kem karvu|shu rite|kevi rite|kya thi)\b/i.test(question)
  return hasLiveDataTopic && asksForSnapshot && !asksForWorkflow
}

export function getAssistantFaqOnlyAnswer(question: string): string | null {
  const faq = findRelevantAssistantFaqs(question, 1)[0]
  if (!faq) return null
  return `${faq.answer}\n\nSource: ERP FAQ. FAQ-only mode uses documented guidance and has not checked live ERP data.`
}
