export type AssistantFaq = {
  question: string
  answer: string
}

type AssistantFaqEntry = AssistantFaq & {
  keywords: string[]
}

const FAQ_TERM_ALIASES: Record<string, string> = {
  aaj: 'today',
  aaje: 'today',
  'કેમ': 'how',
  'કેવી': 'how',
  'રીતે': 'how',
  'શું': 'what',
  'ક્યાં': 'where',
  'નથી': 'not',
  'નહીં': 'not',
  'દેખાતું': 'show',
  'દેખાય': 'show',
  'દેખા': 'show',
  'રિપોર્ટ': 'report',
  'સ્ટોક': 'stock',
  'માલ': 'stock',
  'મશીન': 'machine',
  'એન્ટ્રી': 'entry',
  'ઓર્ડર': 'order',
  'લીડ': 'lead',
  'પાસવર્ડ': 'password',
  'ઉત્પાદન': 'production',
  'ગુણવત્તા': 'quality',
  'ક્વોલિટી': 'quality',
  'કામ': 'work',
  'દૈનિક': 'daily',
  'ઇમ્પોર્ટ': 'import',
  'એક્સેલ': 'excel',
  'રિટર્ન': 'return',
  'નુકસાન': 'damage',
  'खाते': 'account',
  'कैसे': 'how',
  'क्यों': 'why',
  'कहाँ': 'where',
  'क्या': 'what',
  'नहीं': 'not',
  'नही': 'not',
  'दिख': 'show',
  'दिखता': 'show',
  'दिखती': 'show',
  'रिपोर्ट': 'report',
  'स्टॉक': 'stock',
  'माल': 'stock',
  'मशीन': 'machine',
  'एंट्री': 'entry',
  'ऑर्डर': 'order',
  'लीड': 'lead',
  'पासवर्ड': 'password',
  'उत्पादन': 'production',
  'गुणवत्ता': 'quality',
  'काम': 'work',
  'दैनिक': 'daily',
  'इंपोर्ट': 'import',
  'एक्सेल': 'excel',
  'वापसी': 'return',
  'नुकसान': 'damage',
  dekh: 'show',
  dekhatu: 'show',
  dekhato: 'show',
  dikh: 'show',
  dikhai: 'show',
  entry: 'entry',
  entri: 'entry',
  enrry: 'entry',
  hai: 'is',
  he: 'is',
  kaise: 'how',
  kem: 'how',
  kya: 'what',
  maal: 'stock',
  machin: 'machine',
  nahi: 'not',
  nathi: 'not',
  ordar: 'order',
  prodakshan: 'production',
  ripot: 'report',
  show: 'show',
  showing: 'show',
  stok: 'stock',
  su: 'what',
}

const ERP_ASSISTANT_FAQS: AssistantFaqEntry[] = [
  {
    question: 'What can Mahalaxmi Saathi do?',
    answer: 'Saathi explains documented ERP workflows and can answer questions using only the signed-in user’s permitted tasks and ERP records supplied with the question. It is read-only: it cannot edit records, approve work, or perform ERP actions. Verify important decisions in the ERP or with a supervisor.',
    keywords: ['saathi', 'assistant', 'ai', 'ai helper', 'what can ai do', 'what can the ai do', 'what can it do', 'read only', 'change records', 'edit data', 'સહાયક', 'રેકોર્ડ બદલો'],
  },
  {
    question: 'Can I generate images or use voice while Saathi is FAQ-only?',
    answer: 'Not right now. FAQ-only mode answers from documented guidance and does not send text, images, or voice to OpenAI or another external AI provider. Image generation, image understanding, and voice transcription are paused. No external API request or API charge is made by this chat. Read-aloud, if available, uses the browser/device voice.',
    keywords: ['image generation', 'generate image', 'make image', 'image understanding', 'voice ai', 'voice transcription', 'voice recording', 'external ai', 'api charge', 'openai charge', 'image banavo', 'છબી બનાવવી', 'ઇમેજ જનરેટ', 'વોઇસ ટ્રાન્સક્રિપ્શન', 'voice kem use karvu'],
  },
  {
    question: 'How does the ERP system work, and what are its benefits?',
    answer: 'Mahalaxmi ERP keeps business work in one role-based system. Admins set up users, products, listings, targets, and tasks. Sales Executives follow up on assigned leads and book orders against available active stock. The Production Supervisor records production and quality checks; only QC-passed units increase finished-goods stock, and dispatches are linked to orders. E-commerce teams work with their assigned platforms, while Managers review their own teams. Reports summarize recorded ERP activity. This helps teams use shared records, trace stock and work, clarify responsibilities, and follow up more easily. It does not automatically sync marketplace data, and reports can be incomplete if source records are missing. Saathi is read-only and cannot perform ERP actions.',
    keywords: ['how does erp work', 'how does this erp work', 'how this erp works', 'how work this erp system', 'how work th this erp system', 'erp system overview', 'erp overview', 'what does erp do', 'what is erp', 'erp workflow', 'erp system benefit', 'erp system benefits', 'benefit of this system', 'benefits of erp', 'benofitt', 'benofit', 'benifit', 'benifits', 'erp kem chale', 'system su kare', 'shu faydo', 'ફાયદા'],
  },
  {
    question: 'How do I build a practical business strategy and 90-day plan?',
    answer: 'Use a one-page strategy before making a detailed calendar: (1) define one measurable 90-day goal and the current baseline; (2) choose a specific customer group and the problem your product solves; (3) state one clear reason to choose your offer; (4) select one or two sales channels you can serve reliably; (5) check per-unit contribution, available stock/capacity, and a spending limit; (6) assign an owner and due date to each weekly action. Review leads, conversion rate, realized contribution, returns, stock availability, and spend every week. Keep assumptions separate from verified ERP or customer data. This FAQ is a planning framework, not personalized advice or live market research.',
    keywords: ['business strategy', 'business plan', '90 day plan', '90-day plan', 'growth strategy', 'practical strategy', 'strategic plan', 'business planning', 'action plan business', 'વ્યવસાય યોજના', 'બિઝનેસ પ્લાન', 'બિઝનેસ સ્ટ્રેટેજી', 'વિકાસ યોજના', 'ધંધાની યોજના', 'business plan kem banavu', 'business strategy kem banavu', 'વ્યવસાયની યોજના'],
  },
  {
    question: 'How do I conduct market research and validate demand?',
    answer: 'Use a small, evidence-led research cycle: (1) write down the target buyer, use case, region, and decision you need to make; (2) interview a varied set of target customers about their current workaround, purchase frequency, must-have features, and reasons not to buy; ask about past behavior rather than only hypothetical intent; (3) review public marketplace listings, prices, product claims, ratings, and recent customer reviews, recording the source and date; (4) compare findings against your current offer and costs; (5) run a limited, budget-capped pilot with a clear success threshold before scaling. Label interview feedback, observed behavior, and assumptions separately. Saathi FAQ mode has no live web or marketplace access, so it cannot report current market size or verified competitor facts.',
    keywords: ['market research', 'market analysis', 'validate demand', 'customer research', 'customer interviews', 'market size', 'research market', 'market survey', 'demand validation', 'બજાર સંશોધન', 'માર્કેટ રિસર્ચ', 'ગ્રાહક રિસર્ચ', 'ડિમાન્ડ ચેક', 'બજારનો અભ્યાસ', 'market research kem karvu', 'ગ્રાહકની માંગ'],
  },
  {
    question: 'How do I compare competitors without guessing?',
    answer: 'Create a dated comparison table using public evidence only. For each direct and indirect alternative, record target customer, product/quality claims, pack size, listed price and discounts, delivery promise, sales channel, visible proof, and repeated positive/negative review themes. Save the source and date for every observation. Compare your offer on customer value, reliability, service, and contribution after variable costs—not price alone. Mark missing information as unknown, and do not treat a competitor listing or review as proof of total sales or market share. Saathi FAQ mode cannot browse or verify current listings.',
    keywords: ['competitor analysis', 'competitor research', 'compare competitors', 'competitor comparison', 'competitor pricing', 'competition analysis', 'સ્પર્ધક વિશ્લેષણ', 'કમ્પિટિટર રિસર્ચ', 'સ્પર્ધકોની સરખામણી', 'હરીફનો અભ્યાસ', 'competitor kem compare karva'],
  },
  {
    question: 'How do I set a product price using unit economics?',
    answer: 'First calculate realized net selling price per unit after discounts and applicable tax treatment. List variable costs per sold unit: product cost, packaging, channel/payment fees, shipping/fulfilment, expected returns/damage, and any sales commission. Contribution per unit = net selling price − all variable costs. Contribution margin % = contribution per unit ÷ net selling price × 100. Break-even units for a period = fixed costs for that period ÷ contribution per unit, when contribution is positive. Compare the result with customer willingness to pay and verified alternatives, then test a small price range and track conversion, returns, and contribution. Use an accountant for tax treatment and verify costs from source records; this FAQ is not a final accounting calculation.',
    keywords: ['pricing strategy', 'set product price', 'product pricing', 'unit economics', 'contribution margin', 'break even', 'break-even', 'price calculation', 'cost and margin', 'કિંમત કેવી રીતે નક્કી કરવી', 'પ્રાઇસિંગ', 'ભાવ નક્કી', 'નફાનો માર્જિન', 'unit economics kem', 'product ni price'],
  },
  {
    question: 'How do I create a measurable marketing and promotion plan?',
    answer: 'Build a 30-day test around one customer segment, one offer, and one or two channels. For each campaign, write the customer problem, message, creative format, call to action, budget cap, owner, launch date, and tracking method. Prepare content in weekly batches and use a consistent link/code where possible. Track qualified enquiries, response time, orders, conversion rate, realized contribution after discounts/fees, returns, and spend; compare against a pre-set stop/continue threshold. Do not scale a campaign based only on views or likes. Follow platform rules and consent requirements. Saathi FAQ mode can provide this framework but cannot create images, publish content, or verify live campaign performance.',
    keywords: ['marketing plan', 'promotion plan', 'marketing strategy', 'campaign plan', 'content calendar', 'social media plan', 'go to market', 'go-to-market', 'product launch', 'lead generation', 'marketing metrics', 'માર્કેટિંગ યોજના', 'પ્રચાર યોજના', 'કન્ટેન્ટ કૅલેન્ડર', 'સોશિયલ મીડિયા પ્લાન', 'પ્રોડક્ટ લોન્ચ', 'જાહેરાત યોજના', 'marketing kem karvu', 'product promotion'],
  },
  {
    question: 'What information should I prepare before making a business decision?',
    answer: 'Gather the decision and time horizon, target customer and region, product/variant, current verified selling price, item and fulfilment costs, available sellable stock, production capacity, current sales/leads by channel, returns/cancellations, budget limit, and any deadline. Mark each figure with its source and date; distinguish actual ERP records from estimates. Remove customer names, phone numbers, passwords, API keys, and other confidential details from notes. FAQ-only Saathi cannot inspect live ERP data or calculate from your private records; verify figures in the correct ERP report before deciding.',
    keywords: ['business decision data', 'what information for business plan', 'business plan inputs', 'strategy information', 'business planning information', 'data for pricing', 'data for marketing plan', 'વ્યવસાય માટે માહિતી', 'યોજના માટે શું જોઈએ', 'business mate su joiye', 'strategy banava mate'],
  },
  {
    question: 'How do I complete a Daily Task?',
    answer: 'The Super Admin assigns dated work in Daily Tasks. The employee updates progress and submits completed, pending, and issue notes. The Super Admin then approves the work or requests changes. Non-admin users can ask Saathi about their own assigned tasks.',
    keywords: ['daily task', 'daily tasks', 'my task', 'my tasks', 'pending task', 'pending tasks', 'task status', 'assign task', 'assign tasks', 'task complete', 'complete task', 'complete tasks', 'submit task', 'task approval', 'baki task', 'baki kaam', 'kaam', 'मेरा काम', 'मेरा टास्क', 'બાકી કામ', 'મારું કામ', 'દૈનિક કાર્ય', 'मेरा काम कैसे पूरा करूं'],
  },
  {
    question: 'Who records production and reviews quality?',
    answer: 'The Production Supervisor records production and manages quality review. Machine Operators can inspect production and their assigned targets. Use the Production and Quality Control pages for the workflow; ask the supervisor if a correction or review is needed.',
    keywords: ['production', 'record production', 'production entry', 'quality check', 'quality control', 'qc', 'machine operator', 'production target', 'उत्पादन', 'उत्पादन एंट्री', 'ગુણવત્તા', 'મશીન', 'મશીનની એન્ટ્રી', 'क्वालिटी चेक'],
  },
  {
    question: 'How should I update stock?',
    answer: 'Record stock changes through the appropriate Stock Movement workflow. Do not edit workbook cells directly. Stock visibility and permitted actions depend on the signed-in ERP role.',
    keywords: ['stock', 'inventory', 'stock movement', 'stock update', 'adjust stock', 'raw material', 'finished goods', 'sku', 'maal', 'स्टॉक अपडेट', 'माल का स्टॉक', 'સ્ટોક', 'કાચો માલ', 'તૈયાર માલ', 'સ્ટોક કેવી રીતે અપડેટ કરવો'],
  },
  {
    question: 'How do Sales Executives work with leads and orders?',
    answer: 'Sales Executives work with their assigned leads, record follow-ups, and book orders against available active inventory. The Production Supervisor handles dispatches.',
    keywords: ['sales lead', 'lead follow up', 'followup', 'customer', 'sales order', 'book order', 'dispatch', 'sales executive', 'सेल्स ऑर्डर', 'लीड फॉलो अप', 'વેચાણ', 'લીડ', 'ગ્રાહક', 'ઓર્ડર', 'ઓર્ડર બુક કેવી રીતે કરવો'],
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
    keywords: ['add supplier', 'supplier status', 'activate supplier', 'deactivate supplier', 'raw material supplier', 'supplier missing', 'સપ્લાયર'],
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
    answer: 'When the private model is not connected, the Private ERP assistant can answer only documented FAQs and cannot check live ERP records. If configured, the separate General AI mode can answer general questions through OpenAI, but it receives only the question you submit and has no ERP data or live web access. For live ERP answers, the administrator must configure the private model server and its authenticated HTTPS connection; never expose the model port or share either provider token.',
    keywords: ['ai not working', 'assistant unavailable', 'model offline', 'cannot answer', 'cant answer', 'private ai setup', 'ollama connection', 'server error', 'ai timeout', 'live data unavailable', 'openai api setup', 'general ai', 'chatgpt api', 'એઆઈ કામ નથી કરતું'],
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
  {
    question: 'How do I import marketplace order or settlement reports?',
    answer: 'The Super Admin can import reports for any supported marketplace from Marketplace Reconciliation. An E-commerce Executive can import only platforms assigned to their account. Supported files are XLSX, XLS, CSV, or a ZIP containing those report files; PDFs inside ZIPs are ignored. A selected file can be up to 25 MB. Rows are uploaded in batches of 500, so there is no fixed 1,000-row cap for the whole file, though file size and normal browser/server limits still apply. Use ORDER rows for order/SKU/quantity/gross-sales data and separate SETTLEMENT rows for payout data.',
    keywords: ['import marketplace report', 'marketplace reconciliation import', 'import settlement', 'import order report', 'reconciliation excel', 'reconciliation csv', 'zip report', '1000 row limit', '1000 rows', '500 rows batch', 'meesho report import', 'marketplace report upload', 'marketplace report nahi import', 'zip import', 'excel import limit', 'order data import', 'payment data import', 'ઓર્ડર રિપોર્ટ ઇમ્પોર્ટ'],
  },
  {
    question: 'Why were some marketplace report rows skipped?',
    answer: 'The import result reports how many new rows were added and how many duplicate rows were skipped. A record is identified by its platform, record type, and record ID, so importing the same source record again does not add a second copy. Check that the platform is assigned to your account, ORDER rows have an order ID, SKU, quantity, and gross sales, and SETTLEMENT rows have a settlement ID and expected settlement. Use a separate SETTLEMENT row for payouts; do not put payout values on an ORDER row.',
    keywords: ['marketplace rows skipped', 'duplicate reconciliation', 'duplicate rows skipped', 'import duplicate', 'reconciliation missing rows', 'report rows missing', 'order row required', 'settlement row required', 'record id duplicate', 'import error marketplace', 'રિપોર્ટ રો સ્કિપ'],
  },
  {
    question: 'How does the Product Catalog workbook import work?',
    answer: 'Use Product Catalog → Import workbook with the prepared Products_Import, SKU_Variants_Import, and Marketplace_Listings_Import sheets. The import merges new rows and updates matching records; blank cells do not erase saved values, and no catalog rows are deleted. Products are matched by stable product ID, existing SKU, or a unique exact title; ambiguous matches fail rather than guessing. Excel Management uploads are validation previews only, not catalog imports. A private Drive backup is made before changes.',
    keywords: ['product catalog import', 'product catalog excel import', 'import product workbook', 'import products excel', 'product import workbook', 'update product sku', 'catalog workbook', 'excel management import', 'excel upload not imported', 'blank cells delete', 'catalog row deleted', 'product excel upload', 'પ્રોડક્ટ ઇમ્પોર્ટ'],
  },
  {
    question: 'Can a machine have more than one production entry on the same day?',
    answer: 'A machine can have at most one entry for each date and production block. The system has Block 1, Block 2, and Block 3, so separate entries for the same machine on the same date are allowed only in different blocks. If a duplicate entry is blocked, check the selected date and block before trying again. Only the Production Supervisor can submit production entries.',
    keywords: ['duplicate machine entry', 'machine entry twice', 'one entry machine', 'one machine one entry', 'production entry duplicate', 'machine already has entry', 'same machine same day', 'production block', 'block 1', 'block 2', 'block 3', 'machine ni entry', 'ek machine ek entry', 'ek machine ek bar', 'same machine ek bar', '3 bar entry', 'teen bar entry', 'machine par teen entry', 'મશીન એન્ટ્રી'],
  },
  {
    question: 'Why is a submitted daily report not showing?',
    answer: 'Check the report date and the correct workspace first: E-commerce and Sales reports are separate from Graphic Design Daily Work Reports and Admin-assigned Daily Tasks. Employees generally see their own submissions; Managers see their direct reports, and the Super Admin can review reports across teams. Reopen or refresh the page and allow up to 30 seconds for the report list to refresh. If it is still missing, ask the Super Admin to verify the account role/assignment and check the Vercel and Apps Script execution logs.',
    keywords: ['daily report not showing', 'report not visible', 'report not saved', 'submitted report missing', 'daily report missing', 'daily report kaha', 'report nahi dikh raha', 'report dikh nahi raha', 'report show nahi', 'report system par nahi dikh raha', 'daily report kaha hai', 'ecommerce report missing', 'sales report missing', 'designer report missing', 'रिपोर्ट नहीं दिख रही', 'रिपोर्ट क्यों नहीं दिख रही', 'રિપોર્ટ દેખાતો નથી', 'રિપોર્ટ કેમ નથી દેખાતો'],
  },
  {
    question: 'Why does production not appear in finished-goods stock?',
    answer: 'A new production batch is Pending QC and is not available as finished-goods stock until the Production Supervisor records its QC decision. The pass and reject quantities must add up to the batch output; only approved units increase stock. Check the batch date and QC status in Quality Control before creating a separate stock adjustment.',
    keywords: ['production missing in stock', 'production not in finished goods', 'stock not updated after production', 'qc pending stock', 'pass quantity stock', 'qc approved stock', 'production batch stock', 'ઉત્પાદન સ્ટોકમાં નથી'],
  },
  {
    question: 'How should I record raw-material and finished-goods stock changes?',
    answer: 'Use the Raw Material or Finished Goods stock-movement pages rather than editing workbook cells. Raw Material supports purchase inward, issue, machine/stitching consumption, wastage, and adjustments. Finished Goods supports opening stock, dispatch, returns, damage, reservations, and adjustments. Roles determine which actions are available; ask the Production Supervisor if a correction is needed.',
    keywords: ['raw material stock update', 'finished goods stock update', 'stock adjustment', 'purchase inward', 'material issue', 'material wastage', 'stitching consumption', 'stock movement entry', 'inventory update', 'stock ma shu karvu', 'કાચા માલનો સ્ટોક'],
  },
  {
    question: 'Why do E-commerce and ERP sales report totals differ?',
    answer: 'E-commerce monthly gross sales use dispatched units multiplied by the current marketplace listing selling price, then subtract return and damage values for net sales. Changing a listing price can therefore affect those calculations for earlier movements. ERP Reports instead use the unit price saved when each order was dispatched. Check the report period, platform, returns, and damage records before comparing totals; neither total should be treated as finalized accounting without verification.',
    keywords: ['ecommerce sales report difference', 'erp report total differs', 'gross sales different', 'net sales calculation', 'listing price report', 'old order price changed', 'sales total mismatch', 'report amount mismatch', 'ઇકોમર્સ રિપોર્ટ તફાવત'],
  },
  {
    question: 'What should I do if ERP activity logging is unavailable?',
    answer: 'Activity logging is separate from Saathi and from normal ERP report data. Ask the Super Admin or Apps Script owner to deploy the latest apps-script/Code.gs as a new web-app version, confirm any requested Apps Script authorization, and inspect Apps Script Executions together with the Vercel function logs for the actual error. Do not send passwords, tokens, or private logs in chat; the exact cause cannot be determined from the warning alone.',
    keywords: ['activity logging unavailable', 'audit logging unavailable', 'erp activity logging error', 'audit log error', 'logging temporarily unavailable', 'activity log warning', 'apps script executions', 'redeploy apps script', 'audit event failed', 'એક્ટિવિટી લોગિંગ'],
  },
  {
    question: 'Does Excel Management import every spreadsheet into the ERP?',
    answer: 'No. Excel Management uploads are validation previews and do not write rows into the ERP. For product, variant, and listing updates, use Product Catalog → Import workbook. For Sales leads, only the Super Admin can import 1–500 rows per file. Marketplace reconciliation imports XLSX, XLS, CSV, or supported ZIP files in batches of 500 rows, with a 25 MB per-file limit and no fixed total row-count limit.',
    keywords: ['excel management import', 'excel upload not saved', 'excel preview only', 'import any excel', 'spreadsheet import limit', 'sales lead 500 rows', 'marketplace 1000 rows', 'excel file not syncing', 'excel import nahi ho raha', 'excell me limit', 'એક્સેલ ઇમ્પોર્ટ'],
  },
  {
    question: 'How do I record a return, RTO, or damaged item?',
    answer: 'Only the Production Supervisor can record returns or damage. In Returns & RTO, select the platform and shipped order/SKU, then enter a quantity no greater than the remaining shipped quantity. Sellable returned units increase available stock; damaged units are recorded as returned and damaged but do not become sellable stock. The Super Admin can view this page but cannot post the movement.',
    keywords: ['record return', 'record rto', 'record damaged item', 'return stock', 'damage stock', 'returns and rto', 'return order quantity', 'रिटर्न कैसे करें', 'नुकसान हुआ माल', 'રિટર્ન કેવી રીતે કરવો', 'ઓર્ડર રિટર્ન', 'નુકસાન થયેલો માલ'],
  },
  {
    question: 'How are financial Reports and Net tracked balance calculated?',
    answer: 'The Super Admin can review monthly financial and operational summaries in Reports. Revenue is counted when a finished-goods dispatch is posted, using the sale price saved at dispatch; recorded returns and damage are subtracted, and recorded supplier purchases and manual expenses are shown. Historical dispatches or purchases without saved prices or costs are excluded rather than estimated. Net tracked balance is a limited operational measure, not accounting profit.',
    keywords: ['financial report calculation', 'net tracked balance', 'accounts expense report', 'profit calculation', 'monthly accounts report', 'revenue returns expenses', 'रिपोर्ट में लाभ', 'ખર્ચનો રિપોર્ટ', 'નફાનો હિસાબ', 'account report kaise'],
  },
  {
    question: 'How do I correct a stock movement that was already posted?',
    answer: 'Stock Movement is an append-only audit ledger; posted movements cannot be deleted. Record a correcting adjustment instead, so the change remains traceable. An item with zero balance and movement history can only be archived; an item with zero balance and no history may be deleted. Ask the Production Supervisor to review the original movement and the correction.',
    keywords: ['correct posted stock movement', 'delete stock movement', 'wrong stock entry', 'stock ledger correction', 'reverse stock movement', 'adjustment instead of delete', 'गलत स्टॉक एंट्री', 'સ્ટોક એન્ટ્રી સુધારવી', 'સ્ટોક મૂવમેન્ટ ડિલીટ'],
  },
  {
    question: 'Does the ERP automatically sync marketplace orders or payments?',
    answer: 'No. The ERP does not connect to marketplace APIs or automatically sync orders, settlements, or payments. E-commerce staff import supported marketplace order and settlement reports through Marketplace Reconciliation. Compare the imported records with the marketplace source and bank credit; do not treat an import as confirmation that a payment reached the bank.',
    keywords: ['marketplace automatic sync', 'auto sync orders', 'payment sync', 'marketplace api', 'orders not syncing', 'marketplace payments', 'ऑर्डर अपने आप सिंक', 'માર્કેટપ્લેસ ઓટો સિંક', 'પેમેન્ટ સિંક'],
  },
  {
    question: 'How do I record a raw-material purchase?',
    answer: 'Use Raw Material → Purchase Inward and select an active supplier. Each inward needs a supplier and unit cost; the purchase movement records its supplier and total so monthly purchase amounts can be grouped by supplier. Use the separate issue, consumption, wastage, or adjustment movement for other stock changes, and do not edit the workbook directly.',
    keywords: ['record raw material purchase', 'raw material purchase inward', 'purchase inward supplier', 'raw material inward', 'supplier unit cost', 'purchase material stock', 'कच्चा माल खरीद', 'રૉ મટીરિયલ ખરીદી', 'સપ્લાયર સાથે ખરીદી'],
  },
  {
    question: 'Why is a returned item not available for sale?',
    answer: 'Only sellable returned units are added back to available finished-goods stock. A damaged return is recorded for reporting but is not added to sellable stock. Check the return and damage quantities against the shipped order in Returns & RTO; ask the Production Supervisor to correct a wrongly classified movement.',
    keywords: ['returned item not available', 'return not in stock', 'damaged return stock', 'sellable return', 'rto stock mismatch', 'रिटर्न स्टॉक में नहीं', 'નુકસાન રિટર્ન સ્ટોકમાં નથી', 'વેચી શકાય એવો રિટર્ન'],
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
    const aliased = FAQ_TERM_ALIASES[term] || term
    if (aliased.length > 4 && aliased.endsWith('ies')) return `${aliased.slice(0, -3)}y`
    if (aliased.length > 4 && aliased.endsWith('s') && !aliased.endsWith('ss')) return aliased.slice(0, -1)
    return aliased
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
        if (!` ${normalizedQuestion} `.includes(` ${keyword} `)) return score
        return score + Math.max(2, faqTokens(keyword).length * 2)
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
