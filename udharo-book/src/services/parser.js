// Robust bilingual Nepali (Devanagari & Romanized) voice & text parser for Udharo Book

const DEV_DIGITS = { '०':'0', '१':'1', '२':'2', '३':'3', '४':'4', '५':'5', '६':'6', '७':'7', '८':'8', '९':'9' }

export function devanagariToAsciiDigits(str = '') {
  return str.replace(/[०-९]/g, d => DEV_DIGITS[d] || d)
}

const HON = new Set([
  'dai', 'didi', 'ji', 'bhai', 'sir', 'saheb', 'bhauju', 'kaka', 'kaki',
  'दाई', 'दिदी', 'जी', 'भाई', 'काका', 'काकी', 'सर', 'भाउजु', 'दाइ'
])

export const normalize = (s = '') => {
  return devanagariToAsciiDigits(s.toLowerCase())
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractAmount(text = '') {
  const clean = devanagariToAsciiDigits(text)
  
  // Look for multiplier words like "5 hajar", "5 हजार", "5 saya", "5 सय"
  const multiplierMatch = clean.match(/(\d+)\s*(?:हजार|hajar|k\b)/i)
  if (multiplierMatch) {
    return parseInt(multiplierMatch[1], 10) * 1000
  }
  const hundredMatch = clean.match(/(\d+)\s*(?:सय|saya|hundred)/i)
  if (hundredMatch) {
    return parseInt(hundredMatch[1], 10) * 100
  }

  const numMatch = clean.match(/(\d[\d,]*)/)
  if (numMatch) {
    return parseInt(numMatch[1].replace(/,/g, ''), 10)
  }
  return null
}

export function matchCustomers(spokenName, customers = []) {
  if (!spokenName || !customers.length) return []
  const normSpoken = normalize(spokenName)
  const spokenTokens = normSpoken.split(' ').filter(w => w && !HON.has(w))
  if (!spokenTokens.length) return []

  return customers.filter(c => {
    const pool = normalize(`${c.name} ${c.nickname || ''} ${c.phone || ''}`).toLowerCase()
    return spokenTokens.some(st => pool.includes(st) || (st.length >= 3 && pool.includes(st.slice(0, 3))))
  })
}

export function parse(raw = '', customers = []) {
  const norm = normalize(raw)
  if (!norm) return { kind: 'unknown' }

  // 1. Top Debtor queries (who owes the most)
  if (/dherai baki|sabai bhanda dherai|sabaibhanda dherai|धेरै बाँकी|सबैभन्दा धेरै|धेरै बाकी|top debtor|who owes the most/i.test(norm)) {
    return { kind: 'top' }
  }

  // 2. Today's summary queries
  const isTodayQuery = /aaja|aja|aaj|आज|today/i.test(norm)
  if (isTodayQuery) {
    if (/uthyo|paisa|tiryo|collection|aayo|उठ्यो|संकलन|जम्मा|उठेको|तिरेको|collected/i.test(norm)) {
      return { kind: 'today_pay' }
    }
    if (/udharo|gayo|credit|उधारो|गयो|सामान/i.test(norm)) {
      return { kind: 'today_credit' }
    }
  }

  const amount = extractAmount(raw)

  // 3. Extract customer name:
  // Handles attached vibhakti: "रामले", "सितालाई", "हरिको" OR separated: "राम ले", "ram le", "ram ko"
  let extractedName = ''
  
  const vibhaktiMatch = norm.match(/^(.+?)(?:\s+(?:le|ko|lai|bata|ले|को|लाई|बाट)|(?:ले|को|लाई|बाट))(?:\s+|$)/i)
  if (vibhaktiMatch) {
    extractedName = vibhaktiMatch[1].trim()
  } else {
    // English style: "Add 500 credit for Ram", "Ram 500 udharo"
    const engMatch = norm.match(/(?:for|from|to)\s+([a-zA-Z\u0900-\u097F]+)/i)
    if (engMatch) {
      extractedName = engMatch[1].trim()
    } else {
      // Fallback: take the first word before any digits
      const beforeDigit = norm.split(/\d/)[0].trim()
      const words = beforeDigit.split(/\s+/).filter(w => !HON.has(w))
      if (words.length) {
        extractedName = words[0]
      }
    }
  }

  // 4. Determine intent
  const PAY_REGEX = /(?:tiryo|tirey|tireko|tire|bujhayo|bujhaidiyo|diyeko|diyo|dieko|paisa diyo|payment|paid|received|तिर्यो|तिरे|तिरेको|बुझायो|दियो|जम्मा|बुझाइदियो)/i
  const CREDIT_REGEX = /(?:udharo|udhaar|udhar|lagyo|lagyeko|liyera|liyo|lieko|saman|credit|borrow|उधारो|उधार|लग्यो|लगेको|लियो|लिएको|सामान)/i
  const BAL_REGEX = /(?:baki|khata|kati cha|dekha|balance|status|बाँकी|बाकि|खाता|कति छ|हिसाब|हेर)/i

  const isPay = PAY_REGEX.test(norm)
  const isBal = BAL_REGEX.test(norm) && !amount
  const isCredit = CREDIT_REGEX.test(norm) || (amount && !isPay && !isBal)

  let kind = 'unknown'
  if (isBal) {
    kind = 'balance'
  } else if (isPay && amount) {
    kind = 'payment'
  } else if (isCredit && amount) {
    kind = 'credit'
  } else if (isPay && !amount) {
    kind = 'payment'
  }

  if (kind === 'unknown') {
    return { kind: 'unknown', raw }
  }

  if (!extractedName) {
    return { kind: 'noname', raw }
  }

  if ((kind === 'payment' || kind === 'credit') && !amount) {
    return { kind: 'noamount', name: extractedName }
  }

  const matches = matchCustomers(extractedName, customers)

  return {
    kind,
    amount,
    name: extractedName,
    matches,
    raw
  }
}
