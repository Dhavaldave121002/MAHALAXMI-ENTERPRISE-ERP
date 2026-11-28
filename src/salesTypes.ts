export type SalesLeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Follow-up' | 'Converted' | 'Lost'
export type SalesActivityType = 'Call' | 'WhatsApp' | 'Meeting' | 'Note'
export type SalesTargetPeriod = 'monthly' | 'yearly'

export type SalesLead = {
  id: string
  enquiryDate: string
  name: string
  company: string
  phone: string
  location: string
  email: string
  productInterest: string
  notes: string
  referenceUrl: string
  assignedUserId: string
  assignedUserName: string
  status: SalesLeadStatus
  nextFollowUp: string
  createdAt: string
  createdBy: string
  updatedAt: string
}

export type SalesActivity = {
  id: string
  leadId: string
  type: SalesActivityType
  outcome: string
  notes: string
  nextFollowUp: string
  createdAt: string
  createdBy: string
  createdByName: string
}

export type SalesOrder = {
  id: string
  createdAt: string
  salesUserId: string
  salesUserName: string
  leadId: string
  customerName: string
  sku: string
  salesChannel: 'DIRECT' | 'INDIAMART'
  indiaMartListingId: string
  listingSku: string
  unitCost: number | null
  productName: string
  quantity: number
  unitPrice: number
  amount: number
  fulfilledQuantity: number
  cancelledQuantity: number
  reservedQuantity: number
  status: string
  notes: string
}

export type IndiaMartListing = {
  id: string
  productSku: string
  listingSku: string
  productName: string
  listingInventory: number | null
  listedPrice: number | null
  unitCost: number | null
  sourceUrl: string
  imageUrl: string
  status: 'Draft' | 'Active' | 'Inactive'
  updatedAt: string
}

export type IndiaMartCatalogCandidate = {
  id: string
  productName: string
  sourceUrl: string
  imageUrl: string
  suggestedPrice: number | null
}

export type SalesTarget = {
  id: string
  salesUserId: string
  salesUserName: string
  period: SalesTargetPeriod
  periodKey: string
  targetAmount: number
  actualAmount: number
  updatedAt: string
  updatedBy: string
}

export type SalesDailyReport = {
  id: string
  date: string
  userId: string
  userName: string
  completed: string
  pending: string
  issues: string
  updatedAt: string
}

export type SalesAccount = {
  id: string
  name: string
  username: string
  role: 'Sales Executive'
  active: boolean
}

export type SalesLeadImportRow = {
  enquiryDate?: string
  name: string
  company: string
  phone: string
  location: string
  email: string
  productInterest: string
  notes: string
  referenceUrl: string
  assignedUserId: string
}
