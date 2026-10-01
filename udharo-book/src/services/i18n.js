// Internationalization dictionary and utilities for Udharo Book (English & Nepali)

export const LANG_KEY = 'udharo_lang'

export const translations = {
  en: {
    appName: 'Udharo Book',
    tagline: 'Smart Voice-Powered Khata for Local Businesses',
    totalOutstanding: 'Total Outstanding',
    customersOwing: 'Customers Owing',
    creditToday: "Today's Udharo",
    collectedToday: 'Collected Today',
    allCustomers: 'Total Customers',
    tapToSpeak: 'Tap and speak',
    listening: 'Listening... Speak in Nepali or English',
    tryCommand: 'Voice command examples',
    mostOwed: 'Highest Outstanding',
    recentTransactions: 'Recent Transactions',
    viewAll: 'View All',
    noTransactions: 'No transactions recorded yet.',
    noCustomers: 'No customers in your khata yet.',
    addCustomerPrompt: 'Add your first customer to get started.',
    searchCustomer: 'Search by name, nickname or phone...',
    searchTx: 'Search by customer, note or amount...',
    addTransaction: 'New Transaction',
    addCustomer: 'Add Customer',
    editCustomer: 'Edit Customer',
    deleteCustomer: 'Delete Customer',
    customerName: 'Customer Name',
    phone: 'Phone Number (10 digits)',
    nickname: 'Nickname / Relation (e.g. Ram dai)',
    address: 'Address / Shop / Notes (Optional)',
    saveCustomer: 'Save Customer',
    updateCustomer: 'Update Customer',
    saveTransaction: 'Save Transaction',
    updateTransaction: 'Update Transaction',
    editTransaction: 'Edit Transaction',
    deleteTransaction: 'Delete Transaction',
    deleteConfirmTitle: 'Confirm Deletion',
    confirmDeleteTx: 'Are you sure you want to delete this transaction of',
    confirmDeleteCust: 'Are you sure you want to delete this customer? All their transactions will be deleted.',
    cannotUndone: 'This action cannot be undone.',
    udharo: 'Udharo (Credit given)',
    payment: 'Payment (Cash received)',
    amount: 'Amount',
    description: 'Description / Item list (e.g. Rice 1 bag, Oil)',
    date: 'Date & Time',
    selectCustomer: 'Select Customer',
    outstanding: 'Current Outstanding',
    oldBalance: 'Old Balance (Dues)',
    newBalance: 'New Balance',
    openingBalance: 'Old Balance / Opening Dues (Optional)',
    openingBalanceHint: 'Enter if this customer already owes you money from before',
    payFull: 'Pay Full Dues',
    balanceSummary: 'Balance Breakdown',
    settled: 'Fully Settled (Rs. 0)',
    sendReminder: 'Send Reminder',
    whatsAppReminder: 'Send WhatsApp Reminder',
    smsReminder: 'Send via SMS',
    copyReminder: 'Copy Message',
    messageCopied: 'Reminder copied to clipboard!',
    home: 'Home',
    customers: 'Customers',
    transactions: 'Transactions',
    tools: 'Backup & Tools',
    all: 'All',
    creditsOnly: 'Udharo Only',
    paymentsOnly: 'Payments Only',
    backupData: 'Export Backup (JSON)',
    restoreData: 'Restore Backup (JSON)',
    exportCSV: 'Export to Excel (CSV)',
    dataRestored: '✓ Backup restored successfully!',
    invalidFile: 'Invalid backup file format.',
    confirmRestore: 'Restoring backup will replace current local data. Continue?',
    voiceNotSupported: 'Speech recognition is not supported in this browser. Please use Chrome on Android/PC.',
    micDenied: 'Microphone permission was denied. Please allow microphone access.',
    speechServiceBlocked: 'Brave blocked the browser speech service. Allow microphone access and disable Shields for this site, or add a Google Cloud Speech API key below.',
    speechFail: 'Could not catch that. Please speak clearly and try again.',
    gcpKeyHint: 'Go to Backup & Tools tab → Google Cloud Speech API → paste your Google Cloud API key to enable voice in this browser.',
    confirmTxTitle: 'Confirm Transaction',
    recordedSuccess: '✓ Transaction Recorded',
    newBalance: 'New Balance',
    cancel: 'Cancel',
    confirm: 'Confirm',
    edit: 'Edit',
    delete: 'Delete',
    clearFilter: 'Clear Filter',
    totalFiltered: 'Filtered Total',
    today: 'Today',
    yesterday: 'Yesterday',
    daysAgo: 'days ago',
    details: 'Details',
    back: 'Back',
    allTxCount: 'Total Transactions',
    reminderMessage: (name, amount) => `Namaste ${name}, your outstanding khata balance at our shop is Rs. ${amount}. Please clear it at your convenience. Thank you!`,
    voiceChips: [
      'Ram le 500 udharo liyo',
      'Ram le 200 tiryo',
      'Ram ko baki kati cha',
      'Aaja kati udharo gayo',
      'Sabai bhanda dherai baki kasle cha'
    ]
  },
  ne: {
    appName: 'उधारो बुक',
    tagline: 'स्मार्ट भ्वाइस डिजिटल खाता — छिटो, सजिलो र सुरक्षित',
    totalOutstanding: 'कुल बाँकी रकम',
    customersOwing: 'बाँकी तिर्नुपर्ने ग्राहक',
    creditToday: 'आजको नयाँ उधारो',
    collectedToday: 'आज उठेको रकम',
    allCustomers: 'कुल ग्राहक',
    tapToSpeak: 'बोल्नको लागि छुनुहोस्',
    listening: 'सुन्दैछ... नेपाली वा अंग्रेजीमा बोल्नुहोस्',
    tryCommand: 'आवाज कमाण्डका उदाहरणहरू',
    mostOwed: 'धेरै बाँकी भएका ग्राहक',
    recentTransactions: 'हालैका कारोबारहरू',
    viewAll: 'सबै हेर्नुहोस्',
    noTransactions: 'कुनै कारोबार भेटिएन।',
    noCustomers: 'खातामा कुनै ग्राहक छैनन्।',
    addCustomerPrompt: 'सुरु गर्न नयाँ ग्राहक थप्नुहोस्।',
    searchCustomer: 'नाम, उपनाम वा फोन खोज्नुहोस्...',
    searchTx: 'ग्राहक, सामान वा रकम खोज्नुहोस्...',
    addTransaction: 'नयाँ कारोबार',
    addCustomer: 'ग्राहक थप्नुहोस्',
    editCustomer: 'ग्राहक सम्पादन',
    deleteCustomer: 'ग्राहक मेटाउनुहोस्',
    customerName: 'ग्राहकको पूरा नाम',
    phone: 'फोन नम्बर (१० अंक)',
    nickname: 'उपनाम वा सम्बन्ध (उदा. राम दाई)',
    address: 'ठेगाना वा टिप्पणी (ऐच्छिक)',
    saveCustomer: 'ग्राहक सेभ गर्नुहोस्',
    updateCustomer: 'ग्राहक अपडेट गर्नुहोस्',
    saveTransaction: 'कारोबार सुरक्षित गर्नुहोस्',
    updateTransaction: 'कारोबार अपडेट गर्नुहोस्',
    editTransaction: 'कारोबार सम्पादन',
    deleteTransaction: 'कारोबार मेटाउनुहोस्',
    deleteConfirmTitle: 'मेटाउने पुष्टि',
    confirmDeleteTx: 'के तपाईं यो कारोबार मेटाउन निश्चित हुनुहुन्छ? रकम:',
    confirmDeleteCust: 'के तपाईं यो ग्राहक मेटाउन निश्चित हुनुहुन्छ? यस ग्राहकका सबै कारोबारहरू पनि मेटिनेछन्।',
    cannotUndone: 'यो कार्य फिर्ता गर्न सकिँदैन।',
    udharo: 'उधारो (सामान लगेको)',
    payment: 'जम्मा (रकम तिरेको)',
    amount: 'रकम',
    description: 'विवरण / सामानको नाम (उदा. चामल १ बोरा, तेल)',
    date: 'कारोबार मिति र समय',
    selectCustomer: 'ग्राहक छान्नुहोस्',
    outstanding: 'हालको बाँकी रकम',
    oldBalance: 'पहिलेको बाँकी (Old Balance)',
    newBalance: 'नयाँ बाँकी हिसाब (New Balance)',
    openingBalance: 'पुराना बाँकी हिसाब (ऐच्छिक)',
    openingBalanceHint: 'यदि ग्राहकको पहिलेदेखि बाँकी हिसाब छ भने रकम लेख्नुहोस्',
    payFull: 'पुरै बाँकी तिर्ने',
    balanceSummary: 'हिसाब सारांश',
    settled: 'चुक्ता (रू. ०)',
    sendReminder: 'ताकेता पठाउनुहोस्',
    whatsAppReminder: 'WhatsApp मा ताकेता पठाउनुहोस्',
    smsReminder: 'SMS सन्देश पठाउनुहोस्',
    copyReminder: 'सन्देश कपी गर्नुहोस्',
    messageCopied: 'ताकेता सन्देश कपी भयो!',
    home: 'गृहपृष्ठ',
    customers: 'ग्राहकहरू',
    transactions: 'कारोबारहरू',
    tools: 'ब्याकअप र टुलहरू',
    all: 'सबै',
    creditsOnly: 'उधारो मात्र',
    paymentsOnly: 'तिरेको मात्र',
    backupData: 'डाटा ब्याकअप (JSON)',
    restoreData: 'ब्याकअप रिस्टोर (JSON)',
    exportCSV: 'Excel (CSV) मा डाउनलोड',
    dataRestored: '✓ डाटा सफलतापूर्वक रिस्टोर गरियो!',
    invalidFile: 'अमान्य ब्याकअप फाइल।',
    confirmRestore: 'ब्याकअप रिस्टोर गर्दा हालको सबै डाटा फेरिनेछ। के तपाईं जारी राख्न चाहनुहुन्छ?',
    voiceNotSupported: 'यो ब्राउजरमा आवाज पहिचान सुविधा उपलब्ध छैन। कृपया Android वा PC मा Chrome चलाउनुहोस्।',
    micDenied: 'माइकको अनुमति दिइएको छैन। कृपया ब्राउजरमा माइक अन गर्नुहोस्।',
    speechServiceBlocked: 'Brave ले ब्राउजर आवाज सेवा रोक्यो। यो साइटका लागि माइक अनुमति र Shields अन गर्नुहोस्, वा तल Google Cloud Speech API Key थप्नुहोस्।',
    speechFail: 'आवाज बुझिएन। कृपया फेरि स्पष्ट रूपमा बोल्नुहोस्।',
    gcpKeyHint: 'ब्याकअप र टुलहरू → Google Cloud Speech API मा जानुहोस् र API Key थप्नुहोस्।',
    confirmTxTitle: 'कारोबार पुष्टि गर्नुहोस्',
    recordedSuccess: '✓ कारोबार खातामा लेखियो',
    newBalance: 'नयाँ बाँकी रकम',
    cancel: 'रद्द',
    confirm: 'पुष्टि गर्नुहोस्',
    edit: 'सम्पादन',
    delete: 'मेटाउनुहोस्',
    clearFilter: 'फिल्टर हटाउनुहोस्',
    totalFiltered: 'कुल रकम',
    today: 'आज',
    yesterday: 'हिजो',
    daysAgo: 'दिन अघि',
    details: 'विवरण',
    back: 'पछाडि',
    allTxCount: 'कुल कारोबार संख्या',
    reminderMessage: (name, amount) => `नमस्ते ${name}, तपाईंको हाम्रो पसलको खातामा रू. ${amount} बाँकी हिसाब रहेको छ। समय मिलाएर बुझाइदिनुहुन विनम्र अनुरोध गर्दछौं। धन्यवाद!`,
    voiceChips: [
      'रामले ५०० रुपैयाँ उधारो लियो',
      'रामले २०० तिर्यो',
      'रामको बाँकी कति छ',
      'आज कति उधारो गयो',
      'सबैभन्दा धेरै बाँकी कसको छ'
    ]
  }
}

export const getStoredLang = () => {
  try {
    const l = localStorage.getItem(LANG_KEY)
    if (l === 'en' || l === 'ne') return l
  } catch {}
  return 'en' // Default to English, easily toggleable
}

export const setStoredLang = (lang) => {
  try {
    localStorage.setItem(LANG_KEY, lang)
  } catch {}
}

export const toDevanagariDigits = (numStr) => {
  const map = { '0': '०', '1': '१', '2': '२', '3': '३', '4': '४', '5': '५', '6': '६', '7': '७', '8': '८', '9': '९' }
  return String(numStr).replace(/[0-9]/g, d => map[d] || d)
}

export const formatMoney = (n, lang = 'en') => {
  const rounded = Math.round(Number(n) || 0)
  const formatted = rounded.toLocaleString('en-IN')
  if (lang === 'ne') {
    return 'रू. ' + toDevanagariDigits(formatted)
  }
  return 'Rs. ' + formatted
}

export const formatRelativeDate = (isoString, lang = 'en') => {
  if (!isoString) return ''
  const d = new Date(isoString)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return lang === 'ne' ? 'आज' : 'Today'
  
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return lang === 'ne' ? 'हिजो' : 'Yesterday'

  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24))
  if (diffDays > 0 && diffDays < 7) {
    return lang === 'ne' ? `${toDevanagariDigits(diffDays)} दिन अघि` : `${diffDays} days ago`
  }

  return d.toLocaleDateString(lang === 'ne' ? 'ne-NP' : 'en-US', {
    month: 'short',
    day: 'numeric'
  })
}
