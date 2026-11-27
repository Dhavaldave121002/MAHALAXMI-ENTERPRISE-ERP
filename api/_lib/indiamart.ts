import { createHash } from 'node:crypto'

const STOREFRONT_ORIGIN = 'https://www.mahalaxmienterprise.in.net'
const SITEMAP_URL = `${STOREFRONT_ORIGIN}/sitemap.xml`
const MAX_SITEMAP_BYTES = 2_000_000
const MAX_PAGE_BYTES = 2_000_000
const MAX_CATEGORY_PAGES = 100

export type IndiaMartCatalogCandidate = {
  id: string
  productName: string
  sourceUrl: string
  imageUrl: string
  suggestedPrice: number | null
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .trim()
}

function safeStorefrontUrl(value: string) {
  try {
    const url = new URL(decodeHtml(value))
    return url.protocol === 'https:' && url.origin === STOREFRONT_ORIGIN ? url.href : ''
  } catch {
    return ''
  }
}

function safeImageUrl(value: string) {
  try {
    const url = new URL(decodeHtml(value))
    return url.protocol === 'https:' && /(^|\.)imimg\.com$/i.test(url.hostname) ? url.href : ''
  } catch {
    return ''
  }
}

function textFromMarkup(value: string) {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '))
}

function normalizedName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function categoryName(url: string) {
  return new URL(url).pathname
    .split('/')
    .pop()!
    .replace(/\.html?$/i, '')
    .split('-')
    .filter(Boolean)
    .map(word => word[0].toUpperCase() + word.slice(1))
    .join(' ')
}

function candidateId(productName: string) {
  return `IM-${createHash('sha256').update(normalizedName(productName)).digest('hex').slice(0, 20)}`
}

function pricesFromPage(html: string) {
  const prices = new Map<string, number>()
  const pricePattern = /Approx\.\s*Price[\s\S]{0,300}?\bRs(?:\s|&nbsp;|<[^>]*>)*([\d,]+(?:\.\d+)?)/gi
  for (const match of html.matchAll(pricePattern)) {
    const index = match.index ?? 0
    const precedingMarkup = html.slice(Math.max(0, index - 12000), index)
    const altMatches = [...precedingMarkup.matchAll(/\balt=["']([^"']+)["']/gi)]
    const productName = textFromMarkup(altMatches[altMatches.length - 1]?.[1] || '')
    const price = Number((match[1] || '').replace(/,/g, ''))
    const key = normalizedName(productName)
    if (key && Number.isFinite(price) && price > 0 && !prices.has(key)) prices.set(key, price)
  }
  return prices
}

async function fetchSiteText(url: string, maximumBytes: number) {
  const response = await fetch(url, {
    headers: { Accept: 'application/xml,text/html', 'User-Agent': 'Mahalaxmi-ERP-Catalog-Importer/1.0' },
    redirect: 'error',
    signal: AbortSignal.timeout(12000),
  })
  if (!response.ok) throw new Error(`IndiaMART storefront request failed (${response.status}): ${url}`)
  const content = await response.text()
  if (content.length > maximumBytes) throw new Error(`IndiaMART storefront response is too large: ${url}`)
  return content
}

export async function fetchIndiaMartCatalog(): Promise<IndiaMartCatalogCandidate[]> {
  const sitemap = await fetchSiteText(SITEMAP_URL, MAX_SITEMAP_BYTES)
  const categoryPages = new Map<string, Map<string, { productName: string; imageUrl: string }>>()

  for (const urlMatch of sitemap.matchAll(/<url(?:\s[^>]*)?>([\s\S]*?)<\/url>/gi)) {
    const entry = urlMatch[1] || ''
    const pageUrl = safeStorefrontUrl(entry.match(/<loc>([\s\S]*?)<\/loc>/i)?.[1] || '')
    if (!pageUrl) continue
    const pageProducts = new Map<string, { productName: string; imageUrl: string }>()
    const category = categoryName(pageUrl)

    for (const imageMatch of entry.matchAll(/<image:image>([\s\S]*?)<\/image:image>/gi)) {
      const imageEntry = imageMatch[1] || ''
      const productName = textFromMarkup(imageEntry.match(/<image:title>([\s\S]*?)<\/image:title>/i)?.[1] || '')
        .replace(/,\s*(?:Ahmedabad|Gujarat)\s*$/i, '')
        .replace(new RegExp(`,\\s*${escapeRegex(category)}\\s*$`, 'i'), '')
        .trim()
      const imageUrl = safeImageUrl(imageEntry.match(/<image:loc>([\s\S]*?)<\/image:loc>/i)?.[1] || '')
      if (!productName || !imageUrl) continue
      const key = normalizedName(productName)
      if (!pageProducts.has(key)) pageProducts.set(key, { productName, imageUrl })
    }

    if (pageProducts.size) categoryPages.set(pageUrl, pageProducts)
  }

  if (!categoryPages.size) throw new Error('No products were found in the IndiaMART storefront sitemap.')
  if (categoryPages.size > MAX_CATEGORY_PAGES) {
    throw new Error(`The storefront sitemap has more than ${MAX_CATEGORY_PAGES} product categories; import was stopped to avoid a partial catalog.`)
  }

  const pageEntries = [...categoryPages.entries()]
  const pagePrices = new Map<string, number>()
  for (let index = 0; index < pageEntries.length; index += 8) {
    const batch = pageEntries.slice(index, index + 8)
    const results = await Promise.all(batch.map(async ([pageUrl]) => [pageUrl, pricesFromPage(await fetchSiteText(pageUrl, MAX_PAGE_BYTES))] as const))
    for (const [, prices] of results) {
      for (const [name, price] of prices) {
        if (!pagePrices.has(name)) pagePrices.set(name, price)
      }
    }
  }

  const candidates = new Map<string, IndiaMartCatalogCandidate>()
  for (const [pageUrl, pageProducts] of categoryPages) {
    for (const [name, product] of pageProducts) {
      const id = candidateId(product.productName)
      const candidate = candidates.get(id)
      if (candidate) {
        if (!candidate.suggestedPrice) candidate.suggestedPrice = pagePrices.get(name) ?? null
        continue
      }
      candidates.set(id, {
        id,
        productName: product.productName,
        sourceUrl: pageUrl,
        imageUrl: product.imageUrl,
        suggestedPrice: pagePrices.get(name) ?? null,
      })
    }
  }

  return [...candidates.values()].sort((left, right) => left.productName.localeCompare(right.productName))
}
