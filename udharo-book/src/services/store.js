const STORAGE_KEY = 'udharo-v2'

const dayAgo = (n, h = 11, m = 0) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export const seedData = () => ({
  customers: [
    { id: 'c1', name: 'राम थापा (Ram Thapa)', phone: '9841234567', nickname: 'राम दाई / Ram Dai', address: 'न्यूरोड (New Road)', createdAt: dayAgo(30) },
    { id: 'c2', name: 'सीता गुरुङ (Sita Gurung)', phone: '9801234568', nickname: 'सीता दिदी / Sita Didi', address: 'बगैंचा चोक (Bagicha)', createdAt: dayAgo(25) },
    { id: 'c3', name: 'हरि शर्मा (Hari Sharma)', phone: '9812345679', nickname: 'शर्मा जी / Sharma Ji', address: 'कालिमाटी (Kalimati)', createdAt: dayAgo(20) },
    { id: 'c4', name: 'कृष्ण अधिकारी (Krishna Adhikari)', phone: '9860123450', nickname: 'कृष्ण काका / Krishna Kaka', address: 'बानेश्वर (Baneshwor)', createdAt: dayAgo(15) },
  ],
  transactions: [
    { id: 't1', customerId: 'c1', type: 'credit', amount: 1500, description: 'चामल १ बोरा (Rice 1 bag)', timestamp: dayAgo(3, 10, 15) },
    { id: 't2', customerId: 'c1', type: 'payment', amount: 500, description: 'नगद भुक्तानी (Cash payment)', timestamp: dayAgo(1, 16, 30) },
    { id: 't3', customerId: 'c1', type: 'credit', amount: 650, description: 'तेल २ लिटर र मसला (Oil & spices)', timestamp: dayAgo(0, 9, 0) },
    { id: 't4', customerId: 'c2', type: 'credit', amount: 800, description: 'दैनिक किराना सामान (Daily grocery)', timestamp: dayAgo(2, 14, 0) },
    { id: 't5', customerId: 'c3', type: 'credit', amount: 1200, description: 'चिनी र चियापत्ती (Sugar & tea)', timestamp: dayAgo(6, 11, 20) },
    { id: 't6', customerId: 'c3', type: 'payment', amount: 1200, description: 'पुरै हिसाब चुक्ता (Full settlement)', timestamp: dayAgo(4, 17, 45) },
    { id: 't7', customerId: 'c4', type: 'credit', amount: 2400, description: 'घरेलु सामानहरू (Household items)', timestamp: dayAgo(5, 12, 10) },
    { id: 't8', customerId: 'c4', type: 'credit', amount: 350, description: 'साबुन र सर्फ (Soap & surf)', timestamp: dayAgo(0, 11, 30) },
  ],
})

export const uid = () => 'id_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)

export const getData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.customers) && Array.isArray(parsed.transactions)) {
        return parsed
      }
    }
  } catch (e) {
    console.error('Failed to load store data:', e)
  }
  const s = seedData()
  saveData(s)
  return s
}

export const saveData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save store data:', e)
  }
}

export const balanceOf = (transactions, customerId) => {
  if (!transactions || !customerId) return 0
  return transactions
    .filter(t => t.customerId === customerId)
    .reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0)
}

export const isToday = (isoString) => {
  if (!isoString) return false
  return new Date(isoString).toDateString() === new Date().toDateString()
}

export const downloadJSONBackup = (data) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dateStr = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `udharo-book-backup-${dateStr}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const exportTransactionsCSV = (data) => {
  const { customers, transactions } = data
  const custMap = new Map(customers.map(c => [c.id, c]))
  
  const headers = ['Transaction ID', 'Date & Time', 'Customer Name', 'Phone', 'Type', 'Amount (NPR)', 'Description']
  const rows = transactions.map(t => {
    const c = custMap.get(t.customerId)
    return [
      `"${t.id}"`,
      `"${new Date(t.timestamp).toLocaleString('en-IN')}"`,
      `"${(c?.name || 'Deleted').replace(/"/g, '""')}"`,
      `"${c?.phone || ''}"`,
      `"${t.type === 'credit' ? 'Udharo (Credit)' : 'Payment'}"`,
      t.amount,
      `"${(t.description || '').replace(/"/g, '""')}"`
    ].join(',')
  })

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dateStr = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `udharo-transactions-${dateStr}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
