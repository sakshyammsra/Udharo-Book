// Robust bilingual Nepali (Devanagari & Romanized) voice & text parser for Udharo Book

const DEV_DIGITS = { '०':'0', '१':'1', '२':'2', '३':'3', '४':'4', '५':'5', '६':'6', '७':'7', '८':'8', '९':'9' }
const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  शून्य: 0, एक: 1, दुई: 2, तीन: 3, तिन: 3, चार: 4,
  पाँच: 5, पाच: 5, सात: 7, आठ: 8, नौ: 9, दश: 10
}
export function devanagariToAsciiDigits(str = '') {
  return str.replace(/[०-९]/g, d => DEV_DIGITS[d] || d)
}

const HON = new Set([
  'dai', 'didi', 'ji', 'bhai', 'sir', 'saheb', 'bhauju', 'kaka', 'kaki',
  'दाई', 'दिदी', 'जी', 'भाई', 'काका', 'काकी', 'सर', 'भाउजु', 'दाइ'
])
const NON_NAME_WORDS = new Set([
  'मैले', 'उसले', 'मैले', 'भर्खरै', 'खाजा', 'खर्च', 'रिचार्ज', 'कार्ड',
  'पेट्रोल', 'गाडी', 'भाडा', 'सामान', 'रूपैयाँ', 'रुपैयाँ', 'cash',
  'online', 'अनलाइन', 'ट्रान्सफर', 'खर्च', 'भयो', 'गर्‍यो', 'किनेँ', 'किनेको'
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

  const words = normalize(clean).split(' ')
  const number = words.map(word => NUMBER_WORDS[word]).find(value => value !== undefined)
  if (number !== undefined) {
    if (words.some(word => word === 'हजार' || word === 'thousand')) return number * 1000
    if (words.some(word => word === 'सय' || word === 'hundred')) return number * 100
    return number
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
  
  const fromSubjectMatch = norm.match(/^(?:मैले\s+)?(.+?)(?:बाट|bata)(?:\s+|$)/i)
  const vibhaktiMatch = norm.match(/^(.+?)(?:\s+(?:le|ko|lai|bata|ले|को|लाई|बाट)|(?:ले|को|लाई|बाट))(?:\s+|$)/i)
  if (fromSubjectMatch) {
    extractedName = fromSubjectMatch[1].trim()
  } else if (vibhaktiMatch) {
    extractedName = vibhaktiMatch[1].trim()
  } else {
    const fromMatch = norm.match(/(?:बाट|bata)\s+([a-zA-Z\u0900-\u097F]+)/i)
    if (fromMatch) {
      extractedName = fromMatch[1].trim()
    } else {
    // English style: "Add 500 credit for Ram", "Ram 500 udharo"
      const engMatch = norm.match(/(?:for|from|to|of)\s+([a-zA-Z\u0900-\u097F]+)/i)
      if (engMatch) {
        extractedName = engMatch[1].trim()
      } else {
        // Fallback: choose a meaningful word before or after the amount.
        const words = norm.split(/\s+/).filter(word =>
          !HON.has(word) &&
          !NON_NAME_WORDS.has(word) &&
          !/^\d+$/.test(word) &&
          !/^(?:ले|को|लाई|बाट|र|को)$/.test(word)
        )
        if (words.length) extractedName = words[0]
      }
    }
  }

  // 4. Determine intent
  const PAY_REGEX = /(?:tiryo|tirey|tireko|tire|bujhayo|bujhaidiyo|diyeko|diyo|dieko|paisa diyo|payment|paid|received|transfer|cash|तिरेँ|तिर्यो|तिरे|तिरेको|तिर्नुभयो|भुक्तानी|चुक्ता|बुझायो|बुझाएँ|बुझायो|दियो|दिएँ|जम्मा|उठायो|पाए|पाएँ|प्राप्त|फिर्ता दिइन्|बुझाइदियो|ट्रान्सफर|हस्तान्तरण)/i
  const CREDIT_REGEX = /(?:udharo|udhaar|udhar|lagyo|lagyeko|liyera|liyo|lieko|saman|credit|borrow|later|पछि दिन्छु|उधारो|उधार|सापटी|लग्यो|लगेको|लियो|लिएको|लिनुभयो|सामान|दिएको|दिन्छु)/i
  const EXPENSE_REGEX = /(?:expense|purchase|खर्च|किनेँ|किनेको|किन्यो|भाडा|पेट्रोल|रिचार्ज|खाजा)/i
  const BAL_REGEX = /(?:baki|khata|kati cha|dekha|balance|status|बाँकी|बाकि|बाकी|खाता|कति छ|कति बाँकी|हिसाब|हेर्नु|हेर)/i

  const isPay = PAY_REGEX.test(norm)
  const isBal = BAL_REGEX.test(norm) && !isPay && !CREDIT_REGEX.test(norm)
  const isCredit = CREDIT_REGEX.test(norm) || (amount && !isPay && !isBal && !EXPENSE_REGEX.test(norm))
  const isExpense = EXPENSE_REGEX.test(norm)

  let kind = 'unknown'
  if (isBal) {
    kind = 'balance'
  } else if (isPay && amount) {
    kind = 'payment'
  } else if (isCredit && amount) {
    kind = 'credit'
  } else if (isExpense && amount) {
    kind = 'payment'
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
