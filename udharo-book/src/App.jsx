import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Mic, Home, Users, Receipt, Plus, Search, X, Send, Trash2, Pencil,
  ArrowLeft, Check, Copy, Download, Upload, Calendar, Filter, Globe,
  Phone, MessageCircle, Share2, RotateCcw, FileSpreadsheet, AlertTriangle,
  TrendingUp, TrendingDown, UserCheck, Clock, ChevronRight
} from 'lucide-react'
import { parse } from './services/parser'
import {
  getData, saveData, balanceOf, isToday, uid,
  downloadJSONBackup, exportTransactionsCSV, seedData
} from './services/store'
import {
  translations, getStoredLang, setStoredLang,
  formatMoney, formatRelativeDate
} from './services/i18n'

// Helper for HTML datetime-local input
const toDateTimeLocal = (iso) => {
  const d = iso ? new Date(iso) : new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function Modal({ title, onClose, children, maxWidth = 'max-w-lg' }) {
  return (
    <div
      className="sheet-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className={`sheet-panel w-full ${maxWidth} bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 pb-8 max-h-[92vh] overflow-y-auto border border-stone-100/80 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5 pb-2 border-b border-stone-100">
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 font-heading">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const Btn = ({ kind = 'primary', className = '', ...props }) => {
  const base = 'btn-interactive h-11 sm:h-12 px-5 rounded-2xl font-medium text-sm sm:text-base flex items-center justify-center gap-2'
  const kinds = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/20 shadow-lg',
    secondary: 'bg-stone-800 hover:bg-stone-900 text-white',
    ghost: 'bg-stone-100 hover:bg-stone-200 text-stone-800',
    danger: 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200',
    dangerSolid: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 shadow-lg',
    outline: 'border border-stone-300 hover:border-emerald-600 text-stone-700 hover:text-emerald-700 bg-white'
  }
  return <button {...props} className={`${base} ${kinds[kind] || kinds.primary} ${className}`} />
}

const Input = ({ className = '', ...props }) => (
  <input
    {...props}
    className={`w-full h-11 sm:h-12 px-4 rounded-2xl border border-stone-200 bg-white text-sm sm:text-base text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all ${className}`}
  />
)

export default function App() {
  const [data, setData] = useState(getData)
  const dataRef = useRef(data)
  const [lang, setLang] = useState(getStoredLang)
  const [tab, setTab] = useState('home')
  const [customerSearch, setCustomerSearch] = useState('')
  const [txSearch, setTxSearch] = useState('')
  const [txFilterType, setTxFilterType] = useState('all') // 'all' | 'credit' | 'payment'
  const [txSort, setTxSort] = useState('newest') // 'newest' | 'oldest' | 'highest'

  // Modals & Panels
  const [profileCustomerId, setProfileCustomerId] = useState(null)
  const [customerModal, setCustomerModal] = useState(null) // null | { isEdit: boolean, customer?: object }
  const [txModal, setTxModal] = useState(null) // null | { isEdit: boolean, tx?: object, defaultCustomerId?: string }
  const [deleteConfirm, setDeleteConfirm] = useState(null) // null | { type: 'tx' | 'cust', item: object }
  const [reminderModal, setReminderModal] = useState(null) // null | customer object
  const [voicePanel, setVoicePanel] = useState(null)
  const [toastMsg, setToastMsg] = useState('')
  const [saveStatus, setSaveStatus] = useState('saved')
  const [undoAction, setUndoAction] = useState(null)
  const undoTimerRef = useRef(null)

  // Speech Recognition
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState('')
  const [lastVoiceCommand, setLastVoiceCommand] = useState('')
  const [micLang, setMicLang] = useState('ne-NP') // independent from UI lang
  const speechRec = useRef(null)
  const mediaRecRef = useRef(null)

  // Google Cloud Speech-to-Text API key (optional fallback)
  const GCP_KEY_STORAGE = 'udharo_gcp_speech_key'
  const [gcpApiKey, setGcpApiKey] = useState(() => {
    try { return localStorage.getItem(GCP_KEY_STORAGE) || '' } catch { return '' }
  })
  const [gcpKeyInput, setGcpKeyInput] = useState(() => {
    try { return localStorage.getItem(GCP_KEY_STORAGE) || '' } catch { return '' }
  })
  const [gcpKeySaved, setGcpKeySaved] = useState(false)

  const t = translations[lang] || translations.en
  const { customers, transactions } = data

  // Persist store changes
  useEffect(() => {
    dataRef.current = data
    saveData(data)
    setSaveStatus('saved')
  }, [data])

  // Flush the latest data before the page is hidden or closed.
  useEffect(() => {
    const persistBeforeExit = () => saveData(dataRef.current)
    window.addEventListener('pagehide', persistBeforeExit)
    window.addEventListener('beforeunload', persistBeforeExit)

    return () => {
      window.removeEventListener('pagehide', persistBeforeExit)
      window.removeEventListener('beforeunload', persistBeforeExit)
    }
  }, [])

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 2800)
  }

  const offerUndo = (label, restore) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoAction({ label, restore })
    undoTimerRef.current = setTimeout(() => setUndoAction(null), 6000)
  }

  // Interface language changes independently from the microphone language.
  const toggleLanguage = () => {
    const next = lang === 'ne' ? 'en' : 'ne'
    setLang(next)
    setStoredLang(next)
    showToast(next === 'ne' ? '🇳🇵 भाषा: नेपाली' : '🇬🇧 Language: English')
  }

  // Khata Balance calculations
  const bal = (id) => balanceOf(transactions, id)
  const nameOf = (id) => customers.find((c) => c.id === id)?.name || (lang === 'ne' ? 'हटाएको ग्राहक' : 'Deleted')

  const owingCustomers = useMemo(() => {
    return customers.filter((c) => bal(c.id) > 0).sort((a, b) => bal(b.id) - bal(a.id))
  }, [customers, transactions])

  const totalOutstanding = useMemo(() => {
    return customers.reduce((sum, c) => sum + Math.max(0, bal(c.id)), 0)
  }, [customers, transactions])

  const sumToday = (type) =>
    transactions
      .filter((tx) => tx.type === type && isToday(tx.timestamp))
      .reduce((sum, tx) => sum + tx.amount, 0)

  const weeklyInsights = useMemo(() => {
    const weekStart = new Date()
    weekStart.setHours(0, 0, 0, 0)
    weekStart.setDate(weekStart.getDate() - 6)

    const weeklyTransactions = transactions.filter((tx) => new Date(tx.timestamp) >= weekStart)
    const credit = weeklyTransactions
      .filter((tx) => tx.type === 'credit')
      .reduce((sum, tx) => sum + tx.amount, 0)
    const collected = weeklyTransactions
      .filter((tx) => tx.type === 'payment')
      .reduce((sum, tx) => sum + tx.amount, 0)
    const activity = credit + collected

    return {
      credit,
      collected,
      collectionRate: activity ? Math.round((collected / activity) * 100) : 0
    }
  }, [transactions])

  // Transactions sorted by timestamp descending
  const recentTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }, [transactions])

  // Filtered transactions for the Transactions tab
  const filteredTransactions = useMemo(() => {
    let result = [...transactions]
    if (txFilterType !== 'all') {
      result = result.filter((tx) => tx.type === txFilterType)
    }
    if (txSearch.trim()) {
      const q = txSearch.toLowerCase()
      result = result.filter((tx) => {
        const cName = nameOf(tx.customerId).toLowerCase()
        const desc = (tx.description || '').toLowerCase()
        const amtStr = String(tx.amount)
        return cName.includes(q) || desc.includes(q) || amtStr.includes(q)
      })
    }
    if (txSort === 'newest') {
      result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    } else if (txSort === 'oldest') {
      result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    } else if (txSort === 'highest') {
      result.sort((a, b) => b.amount - a.amount)
    }
    return result
  }, [transactions, txFilterType, txSearch, txSort, customers])

  // --- CRUD ACTIONS ---

  // 1. Transaction Commit & Edit
  const saveOrUpdateTransaction = (txPayload) => {
    if (txPayload.id) {
      // Edit
      setData((d) => ({
        ...d,
        transactions: d.transactions.map((tx) => (tx.id === txPayload.id ? { ...tx, ...txPayload } : tx))
      }))
      showToast(lang === 'ne' ? 'कारोबार अपडेट गरियो' : 'Transaction updated')
    } else {
      // Add
      const newTx = {
        id: uid(),
        customerId: txPayload.customerId,
        type: txPayload.type,
        amount: Number(txPayload.amount),
        description: txPayload.description || (txPayload.type === 'credit' ? (lang === 'ne' ? 'सामान उधारो' : 'Credit items') : (lang === 'ne' ? 'रकम तिरेको' : 'Payment received')),
        timestamp: txPayload.timestamp || new Date().toISOString()
      }
      setData((d) => ({ ...d, transactions: [newTx, ...d.transactions] }))
      showToast(lang === 'ne' ? 'नयाँ कारोबार सुरक्षित भयो' : 'New transaction recorded')
    }
    setTxModal(null)
  }

  // 2. Transaction Delete
  const executeDeleteTransaction = (txId) => {
    const deleted = data.transactions.find((tx) => tx.id === txId)
    setData((d) => ({
      ...d,
      transactions: d.transactions.filter((tx) => tx.id !== txId)
    }))
    setDeleteConfirm(null)
    showToast(lang === 'ne' ? 'कारोबार हटाइयो' : 'Transaction deleted')
    if (deleted) {
      offerUndo(
        lang === 'ne' ? 'कारोबार हटाइयो' : 'Transaction deleted',
        () => setData((d) => ({ ...d, transactions: [deleted, ...d.transactions] }))
      )
    }
  }

  // 3. Customer Add / Edit
  const saveOrUpdateCustomer = (custPayload) => {
    if (custPayload.id) {
      // Edit
      setData((d) => ({
        ...d,
        customers: d.customers.map((c) => (c.id === custPayload.id ? { ...c, ...custPayload } : c))
      }))
      showToast(lang === 'ne' ? 'ग्राहक विवरण सुरक्षित भयो' : 'Customer updated')
    } else {
      // Add
      const newCust = {
        id: uid(),
        name: custPayload.name.trim(),
        phone: custPayload.phone?.trim() || '',
        nickname: custPayload.nickname?.trim() || '',
        address: custPayload.address?.trim() || '',
        createdAt: new Date().toISOString()
      }
      const initialDue = parseInt(custPayload.oldBalance, 10) || 0
      setData((d) => ({
        customers: [...d.customers, newCust],
        transactions: initialDue > 0
          ? [
              {
                id: uid(),
                customerId: newCust.id,
                type: 'credit',
                amount: initialDue,
                description: lang === 'ne' ? 'पुराना बाँकी हिसाब (Old Balance)' : 'Old Balance (Opening Dues)',
                timestamp: new Date().toISOString()
              },
              ...d.transactions
            ]
          : d.transactions
      }))
      showToast(lang === 'ne' ? 'नयाँ ग्राहक थपियो' : 'Customer added')
    }
    setCustomerModal(null)
    setVoicePanel(null)
  }

  // 4. Customer Delete
  const executeDeleteCustomer = (custId) => {
    const deletedCustomer = data.customers.find((c) => c.id === custId)
    const deletedTransactions = data.transactions.filter((tx) => tx.customerId === custId)
    setData((d) => ({
      customers: d.customers.filter((c) => c.id !== custId),
      transactions: d.transactions.filter((tx) => tx.customerId !== custId)
    }))
    if (profileCustomerId === custId) setProfileCustomerId(null)
    setDeleteConfirm(null)
    showToast(lang === 'ne' ? 'ग्राहक र सम्पूर्ण कारोबार हटाइयो' : 'Customer and transactions deleted')
    if (deletedCustomer) {
      offerUndo(
        lang === 'ne' ? 'ग्राहक हटाइयो' : 'Customer deleted',
        () => setData((d) => ({
          customers: [...d.customers, deletedCustomer],
          transactions: [...deletedTransactions, ...d.transactions]
        }))
      )
    }
  }

  // --- VOICE WORKFLOW ---
  const proposeVoiceAction = (cmd, customer) => {
    const currentBal = bal(customer.id)
    if (cmd.kind === 'balance') {
      return setVoicePanel({
        kind: 'answer',
        title: customer.name,
        big: formatMoney(currentBal, lang),
        sub: t.outstanding
      })
    }
    if (cmd.kind === 'payment' && cmd.amount > currentBal && currentBal > 0) {
      return setVoicePanel({
        kind: 'error',
        msg: lang === 'ne'
          ? `${customer.name} को बाँकी ${formatMoney(currentBal, lang)} मात्र छ। ${formatMoney(cmd.amount, lang)} धेरै भयो।`
          : `${customer.name} only owes ${formatMoney(currentBal, lang)}. Payment of ${formatMoney(cmd.amount, lang)} is too much.`
      })
    }

    setVoicePanel({
      kind: 'confirm',
      customer,
      type: cmd.kind,
      amount: cmd.amount,
      after: cmd.kind === 'credit' ? currentBal + cmd.amount : currentBal - cmd.amount
    })
  }

  const runVoiceCommand = (text) => {
    setHeard(text)
    setLastVoiceCommand(text)
    const cmd = parse(text, customers)
    const hint = lang === 'ne' ? 'उदा: "रामले ५०० रुपैयाँ उधारो लियो"' : 'Try: "Ram le 500 udharo liyo"'

    if (cmd.kind === 'unknown') {
      return setVoicePanel({ kind: 'error', msg: t.speechFail, hint })
    }
    if (cmd.kind === 'noname') {
      return setVoicePanel({
        kind: 'error',
        msg: lang === 'ne' ? 'ग्राहकको नाम बुझ्न सकिएन।' : "Couldn't understand the customer name.",
        hint
      })
    }
    if (cmd.kind === 'noamount') {
      return setVoicePanel({
        kind: 'error',
        msg: lang === 'ne' ? 'रकम (Amount) बुझ्न सकिएन।' : "Couldn't understand the amount.",
        hint
      })
    }
    if (cmd.kind === 'top') {
      return owingCustomers[0]
        ? setVoicePanel({
            kind: 'answer',
            title: owingCustomers[0].name,
            big: formatMoney(bal(owingCustomers[0].id), lang),
            sub: t.mostOwed
          })
        : setVoicePanel({
            kind: 'error',
            msg: lang === 'ne' ? 'अहिले कसैको बाँकी छैन।' : 'Nobody owes anything right now.'
          })
    }
    if (cmd.kind === 'today_credit') {
      return setVoicePanel({
        kind: 'answer',
        title: t.creditToday,
        big: formatMoney(sumToday('credit'), lang),
        sub: lang === 'ne' ? 'आज दिएको नयाँ उधारो' : 'Given on credit today'
      })
    }
    if (cmd.kind === 'today_pay') {
      return setVoicePanel({
        kind: 'answer',
        title: t.collectedToday,
        big: formatMoney(sumToday('payment'), lang),
        sub: lang === 'ne' ? 'आज उठेको रकम' : 'Cash collected today'
      })
    }

    if (!customers.length) {
      return setVoicePanel({ kind: 'error', msg: t.noCustomers, hint: t.addCustomerPrompt })
    }

    if (!cmd.matches || !cmd.matches.length) {
      return setVoicePanel({ kind: 'notfound', name: cmd.name, cmd })
    }
    if (cmd.matches.length > 1) {
      return setVoicePanel({ kind: 'pick', cmd })
    }

    proposeVoiceAction(cmd, cmd.matches[0])
  }

  // --- Google Cloud Speech-to-Text fallback via MediaRecorder ---
  const startCloudSpeechListening = async () => {
    if (!gcpApiKey) {
      return setVoicePanel({ kind: 'error', msg: t.voiceNotSupported, hint: t.gcpKeyHint })
    }
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return setVoicePanel({ kind: 'error', msg: t.micDenied })
    }

    // Pick best supported MIME type
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
      .find(m => MediaRecorder.isTypeSupported(m)) || ''

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
    mediaRecRef.current = recorder
    const chunks = []

    setHeard('')
    setVoicePanel(null)
    setListening(true)

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      setListening(false)
      if (!chunks.length) return

      try {
        const blob = new Blob(chunks, { type: mimeType || 'audio/webm' })
        const arrayBuf = await blob.arrayBuffer()
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)))

        const langCode = micLang
        const resp = await fetch(
          `https://speech.googleapis.com/v1/speech:recognize?key=${gcpApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              config: {
                encoding: 'WEBM_OPUS',
                sampleRateHertz: 48000,
                languageCode: langCode,
                alternativeLanguageCodes: langCode === 'ne-NP' ? ['en-US'] : ['ne-NP'],
                enableAutomaticPunctuation: false,
              },
              audio: { content: base64Audio }
            })
          }
        )
        const json = await resp.json()
        if (!resp.ok) {
          const errMsg = json?.error?.message || t.speechFail
          return setVoicePanel({ kind: 'error', msg: `Google API: ${errMsg}` })
        }
        const transcript = json?.results?.[0]?.alternatives?.[0]?.transcript?.trim() || ''
        if (transcript) {
          setHeard(transcript)
          runVoiceCommand(transcript)
        } else {
          setVoicePanel({ kind: 'error', msg: t.speechFail })
        }
      } catch (err) {
        setVoicePanel({ kind: 'error', msg: t.speechFail })
      }
    }

    recorder.start()
    // Auto-stop after 8 seconds
    setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop()
    }, 8000)
  }

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    // If browser supports Web Speech API natively, prefer it (free, streaming)
    if (SpeechRecognition) {
      const rec = new SpeechRecognition()
      // ne-NP natively transcribes Nepali Devanagari in Chrome Android and desktop
      rec.lang = micLang
      rec.interimResults = true
      rec.maxAlternatives = 3
      speechRec.current = rec
      setHeard('')
      setVoicePanel(null)
      setListening(true)

      let finalTranscript = ''
      let recognitionError = false
      rec.onresult = (e) => {
        const text = Array.from(e.results).map((x) => x[0].transcript).join(' ').trim()
        const completed = Array.from(e.results)
          .filter((result) => result.isFinal)
          .map((result) => result[0].transcript)
          .join(' ')
          .trim()
        finalTranscript = completed || text
        setHeard(text)
      }
      rec.onerror = (e) => {
        recognitionError = true
        setListening(false)
        const message = e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? t.micDenied
          : e.error === 'audio-capture'
            ? (lang === 'ne' ? 'माइक भेटिएन। माइक जोडेर फेरि प्रयास गर्नुहोस्।' : 'No microphone was found. Connect a microphone and try again.')
            : e.error === 'no-speech'
              ? (lang === 'ne' ? 'आवाज सुनिएन। माइक नजिक स्पष्ट रूपमा बोल्नुहोस्।' : 'No speech detected. Speak clearly near the microphone and try again.')
              : t.speechFail
        setVoicePanel({ kind: 'error', msg: message })
      }
      rec.onend = () => {
        setListening(false)
        if (finalTranscript.trim()) {
          runVoiceCommand(finalTranscript)
        } else if (!recognitionError) {
          setVoicePanel({ kind: 'error', msg: t.speechFail })
        }
      }
      rec.onnomatch = () => {
        recognitionError = true
        setListening(false)
        setVoicePanel({ kind: 'error', msg: t.speechFail })
      }
      try {
        rec.start()
      } catch (error) {
        setListening(false)
        setVoicePanel({
          kind: 'error',
          msg: lang === 'ne'
            ? 'माइक सुरु हुन सकेन। ब्राउजर सेटिङमा माइक अनुमति जाँच गर्नुहोस्।'
            : 'The microphone could not start. Check browser microphone permissions and try again.'
        })
      }
      return
    }

    // Fallback: Google Cloud Speech-to-Text REST API
    startCloudSpeechListening()
  }

  const stopListening = () => {
    if (speechRec.current) {
      try { speechRec.current.stop() } catch {}
    }
    if (mediaRecRef.current && mediaRecRef.current.state === 'recording') {
      mediaRecRef.current.stop()
    }
  }

  const confirmVoiceTransaction = () => {
    const p = voicePanel
    const newTx = {
      customerId: p.customer.id,
      type: p.type,
      amount: p.amount,
      description: p.type === 'credit' ? (lang === 'ne' ? 'सामान उधारो (Voice)' : 'Credit items (Voice)') : (lang === 'ne' ? 'नगद तिरेको (Voice)' : 'Payment (Voice)'),
      timestamp: new Date().toISOString()
    }
    saveOrUpdateTransaction(newTx)
    setVoicePanel({ kind: 'done', p })
  }

  // --- SUBCOMPONENTS ---

  // Transaction Edit / Add Form
  const TransactionForm = ({ init = {}, onSave }) => {
    const [customerId, setCustomerId] = useState(init.customerId || customers[0]?.id || '')
    const [type, setType] = useState(init.type || 'credit')
    const [amount, setAmount] = useState(init.amount ? String(init.amount) : '')
    const [description, setDescription] = useState(init.description || '')
    const [timestamp, setTimestamp] = useState(init.timestamp ? toDateTimeLocal(init.timestamp) : toDateTimeLocal())

    const parsedAmount = parseInt(amount, 10) || 0
    const oldBalance = bal(customerId)
    const newBalance = type === 'credit'
      ? oldBalance + parsedAmount
      : oldBalance - parsedAmount

    const paymentWarning = type === 'payment' && parsedAmount > oldBalance && oldBalance > 0
      ? `${lang === 'ne' ? 'ग्राहकको हाल बाँकी हिसाब:' : 'Customer dues:'} ${formatMoney(oldBalance, lang)}`
      : ''

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">{t.selectCustomer}</label>
          <select
            className="w-full h-11 sm:h-12 px-4 rounded-2xl border border-stone-200 bg-white text-stone-900 text-sm sm:text-base focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.nickname ? `(${c.nickname})` : ''} · {t.oldBalance}: {formatMoney(bal(c.id), lang)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">{lang === 'ne' ? 'कारोबार प्रकार' : 'Transaction Type'}</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`h-11 rounded-2xl font-semibold text-sm flex items-center justify-center gap-1.5 transition-all ${
                type === 'credit'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
              onClick={() => setType('credit')}
            >
              <TrendingUp size={16} />
              {t.udharo}
            </button>
            <button
              type="button"
              className={`h-11 rounded-2xl font-semibold text-sm flex items-center justify-center gap-1.5 transition-all ${
                type === 'payment'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
              onClick={() => setType('payment')}
            >
              <TrendingDown size={16} />
              {t.payment}
            </button>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-semibold text-stone-600">{t.amount} (Rs.)</label>
            {type === 'payment' && oldBalance > 0 && (
              <button
                type="button"
                onClick={() => setAmount(String(oldBalance))}
                className="btn-interactive text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1"
              >
                <span>{t.payFull}</span>
                <span>({formatMoney(oldBalance, lang)})</span>
              </button>
            )}
          </div>
          <Input
            placeholder="500"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          />
          {paymentWarning && <p className="text-xs text-amber-600 mt-1">{paymentWarning}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">{t.description}</label>
          <Input
            placeholder={lang === 'ne' ? 'उदा. चामल १ बोरा, दाल, तेल' : 'e.g. Rice 1 bag, groceries'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">{t.date}</label>
          <Input
            type="datetime-local"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
          />
        </div>

        {/* Live Old Balance & New Balance Breakdown */}
        {customerId && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-2">
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="text-stone-500 font-medium">{t.oldBalance}:</span>
              <span className={`font-bold ${oldBalance > 0 ? 'text-rose-600' : 'text-stone-700'}`}>
                {formatMoney(oldBalance, lang)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="text-stone-500 font-medium">
                {type === 'credit' ? `+ ${t.udharo}` : `− ${t.payment}`}:
              </span>
              <span className={`font-semibold ${type === 'credit' ? 'text-rose-600' : 'text-emerald-600'}`}>
                {parsedAmount ? (type === 'credit' ? '+ ' : '− ') + formatMoney(parsedAmount, lang) : '—'}
              </span>
            </div>
            <div className="pt-2 border-t border-stone-200 flex justify-between items-center text-sm sm:text-base font-bold">
              <span className="text-stone-800">{t.newBalance}:</span>
              <span className={newBalance > 0 ? 'text-rose-600 font-bold' : newBalance === 0 ? 'text-emerald-600 font-bold' : 'text-stone-700 font-bold'}>
                {formatMoney(newBalance, lang)}
                {newBalance === 0 && parsedAmount > 0 ? ` (${t.settled})` : ''}
              </span>
            </div>
          </div>
        )}

        <Btn
          className="w-full mt-2"
          disabled={!parsedAmount || !customerId}
          onClick={() => {
            onSave({
              id: init.id,
              customerId,
              type,
              amount: parsedAmount,
              description: description.trim(),
              timestamp: new Date(timestamp).toISOString()
            })
          }}
        >
          {init.id ? t.updateTransaction : t.saveTransaction}
        </Btn>
      </div>
    )
  }

  // Customer Edit / Add Form
  const CustomerForm = ({ init = {}, onSave }) => {
    const [name, setName] = useState(init.name || '')
    const [phone, setPhone] = useState(init.phone || '')
    const [nickname, setNickname] = useState(init.nickname || '')
    const [address, setAddress] = useState(init.address || '')
    const [oldBalance, setOldBalance] = useState('')

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">{t.customerName} *</label>
          <Input
            placeholder={lang === 'ne' ? 'उदा. राम थापा' : 'e.g. Ram Thapa'}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">{t.phone}</label>
          <Input
            placeholder="98XXXXXXXX"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {!init.id && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-stone-600">{t.openingBalance}</label>
              <span className="text-[11px] text-stone-400 font-mono">NPR</span>
            </div>
            <Input
              placeholder="0"
              inputMode="numeric"
              value={oldBalance}
              onChange={(e) => setOldBalance(e.target.value.replace(/\D/g, ''))}
            />
            <p className="text-[11px] text-stone-400 mt-1">{t.openingBalanceHint}</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">{t.nickname}</label>
          <Input
            placeholder={lang === 'ne' ? 'उदा. राम दाई / काका' : 'e.g. Ram dai'}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">{t.address}</label>
          <Input
            placeholder={lang === 'ne' ? 'उदा. न्यूरोड, काठमाडौं' : 'e.g. New Road, Kathmandu'}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <Btn
          className="w-full mt-2"
          disabled={!name.trim()}
          onClick={() => {
            onSave({
              id: init.id,
              name: name.trim(),
              phone: phone.trim(),
              nickname: nickname.trim(),
              address: address.trim(),
              oldBalance: oldBalance.trim()
            })
          }}
        >
          {init.id ? t.updateCustomer : t.saveCustomer}
        </Btn>
      </div>
    )
  }

  // Transaction Row item
  const TransactionItem = ({ tx, showCustomer = true, compact = false }) => {
    const isCredit = tx.type === 'credit'
    const cName = nameOf(tx.customerId)

    return (
      <div className={`list-row group flex items-center justify-between ${
        compact
          ? 'px-2 py-3 border-b border-stone-100 last:border-b-0'
          : 'p-3.5 sm:p-4 rounded-2xl border border-stone-100/80 bg-white/80 shadow-xs mb-2.5'
      } hover:bg-stone-50/80 transition-all`}>
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`${compact ? 'w-9 h-9 rounded-lg' : 'w-10 h-10 rounded-xl'} flex items-center justify-center shrink-0 ${
              isCredit ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {isCredit ? <TrendingUp size={compact ? 17 : 20} /> : <TrendingDown size={compact ? 17 : 20} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {showCustomer && (
                <button
                  onClick={() => setProfileCustomerId(tx.customerId)}
                  className="font-semibold text-stone-900 hover:text-emerald-700 text-sm truncate transition-colors text-left"
                >
                  {cName}
                </button>
              )}
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isCredit ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {isCredit ? t.udharo : t.payment}
              </span>
            </div>
            <div className="text-[11px] text-stone-500 truncate mt-0.5">
              <span>{formatRelativeDate(tx.timestamp, lang)}</span>
              {tx.description && <span className="ml-1.5 font-medium text-stone-600">· {tx.description}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0 pl-2">
          <div className="text-right">
            <div className={`font-bold text-sm ${isCredit ? 'text-rose-600' : 'text-emerald-600'}`}>
              {isCredit ? '+' : '−'} {formatMoney(tx.amount, lang)}
            </div>
          </div>

          {/* Quick Edit & Delete icons */}
          <div className="flex items-center opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity gap-1">
            <button
              onClick={() => setTxModal({ isEdit: true, tx })}
              className="p-1.5 text-stone-400 hover:text-emerald-700 hover:bg-stone-100 rounded-lg transition-colors"
              title={t.edit}
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => setDeleteConfirm({ type: 'tx', item: tx })}
              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-stone-100 rounded-lg transition-colors"
              title={t.delete}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Selected Profile Customer
  const profileCustomer = customers.find((c) => c.id === profileCustomerId)
  const profileBal = profileCustomer ? bal(profileCustomer.id) : 0
  const profilePhoneClean = profileCustomer?.phone?.replace(/\D/g, '') || ''
  const waPhone = profilePhoneClean.length === 10 ? '977' + profilePhoneClean : profilePhoneClean
  const reminderText = profileCustomer ? t.reminderMessage(profileCustomer.name, formatMoney(profileBal, lang)) : ''
  const whatsAppUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(reminderText)}`
  const smsUrl = `sms:${profilePhoneClean}?body=${encodeURIComponent(reminderText)}`

  return (
    <div className="min-h-screen text-stone-900 flex flex-col justify-between">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="toast-banner fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-stone-900/95 text-white px-5 py-2.5 rounded-full shadow-2xl backdrop-blur-md text-sm font-medium flex items-center gap-2 border border-stone-700">
          <Check size={16} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}
      {undoAction && (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-stone-700 bg-stone-900/95 px-4 py-2.5 text-sm text-white shadow-2xl backdrop-blur-md">
          <span>{undoAction.label}</span>
          <button
            className="font-bold text-emerald-300 hover:text-emerald-200"
            onClick={() => {
              undoAction.restore()
              setUndoAction(null)
              showToast(lang === 'ne' ? 'फेरि सुरक्षित गरियो' : 'Restored successfully')
            }}
          >
            {lang === 'ne' ? 'फिर्ता' : 'Undo'}
          </button>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-stone-200/80 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center gap-3 sm:gap-5 lg:grid lg:grid-cols-[minmax(220px,1fr)_auto_minmax(280px,1fr)] lg:gap-6">
          {/* Logo & Subtitle - Clickable to navigate to Home */}
          <button
            type="button"
            onClick={() => {
              setTab('home')
              setProfileCustomerId(null)
            }}
            className="btn-interactive shrink-0 flex items-center gap-2.5 sm:gap-3 group text-left cursor-pointer focus:outline-none lg:min-w-[220px]"
            title={lang === 'ne' ? 'गृहपृष्ठमा जानुहोस्' : 'Go to Home'}
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-600 group-hover:bg-emerald-700 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-all">
              <Receipt size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-xl sm:text-2xl font-bold text-emerald-700 font-heading group-hover:text-emerald-800 transition-colors">
                  {t.appTitle || 'Udharo'}
                </span>
                <span className="text-xl sm:text-2xl font-bold text-stone-900 font-heading">
                  {t.appSubtitle || 'Book'}
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-stone-500 mt-1 leading-none">{t.tagline}</p>
            </div>
          </button>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex shrink-0 items-center gap-1 bg-stone-100/90 p-1.5 rounded-2xl border border-stone-200/70 lg:justify-self-center">
            {[
              ['home', Home, t.home],
              ['customers', Users, t.customers],
              ['tx', Receipt, t.transactions],
              ['tools', FileSpreadsheet, t.tools]
            ].map(([k, Icon, label]) => (
              <button
                key={k}
                onClick={() => {
                  setTab(k)
                  setProfileCustomerId(null)
                }}
                className={`btn-interactive flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  tab === k && !profileCustomerId
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {/* Actions & Language Switcher */}
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3 lg:justify-self-end lg:min-w-[280px] lg:justify-end">
            <span className="hidden xl:inline-flex items-center gap-1 text-[11px] font-medium text-stone-400">
              <Check size={12} className="text-emerald-500" />
              {saveStatus === 'saved' ? (lang === 'ne' ? 'स्थानीय रूपमा सुरक्षित' : 'Saved locally') : 'Saving...'}
            </span>
            {/* Quick Add Transaction Button */}
            <Btn
              onClick={() => {
                if (!customers.length) {
                  setCustomerModal({ isEdit: false })
                  showToast(t.addCustomerPrompt)
                } else {
                  setTxModal({ isEdit: false })
                }
              }}
              className="h-10 sm:h-11 px-3 sm:px-4 text-xs sm:text-sm"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">{t.addTransaction}</span>
              <span className="sm:hidden">{t.addTransaction.split(' ')[0]}</span>
            </Btn>

            {/* Interface language switcher; microphone language remains independent. */}
            <button
              onClick={toggleLanguage}
              className="btn-interactive flex h-10 items-center gap-1 rounded-full border border-stone-200 bg-white p-1 hover:border-emerald-300 text-xs sm:text-sm font-semibold text-stone-700 shadow-2xs"
              title="Toggle English / नेपाली"
              aria-label={`Switch interface language to ${lang === 'ne' ? 'English' : 'Nepali'}`}
            >
              <span className={`flex h-8 items-center gap-1 rounded-full px-2.5 sm:px-3 ${
                lang === 'en' ? 'bg-emerald-600 text-white shadow-sm' : 'text-stone-500'
              }`}>
                <Globe size={14} />
                <span className="w-[4.5rem] text-center">English</span>
              </span>
              <span className={`flex h-8 items-center rounded-full px-2.5 sm:px-3 ${
                lang === 'ne' ? 'bg-emerald-600 text-white shadow-sm' : 'text-stone-500'
              }`}>
                <span className="w-[3.5rem] text-center">नेपाली</span>
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area (Fuller & Responsive with proper bottom bar clearance) */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-5 sm:pt-7 pb-28 md:pb-12 flex-1">
        {/* ================= HOME TAB ================= */}
        {tab === 'home' && (
          <div className="space-y-6">
            {/* Top Responsive Grid: Stats & Voice Assistant */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (Stats + Voice) */}
              <div className="lg:col-span-7 space-y-5">
                {/* Hero Dashboard Outstanding Card */}
                <div className="dashboard-card text-white rounded-3xl p-6 sm:p-8 shadow-xl">
                  <div className="relative z-10 flex justify-between items-start">
                    <div>
                      <div className="text-emerald-100 text-xs sm:text-sm font-medium tracking-wide uppercase">
                        {t.totalOutstanding}
                      </div>
                      <div className="text-3xl sm:text-5xl font-black mt-2 tracking-tight font-heading">
                        {formatMoney(totalOutstanding, lang)}
                      </div>
                    </div>
                    <div className="bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border border-white/20">
                      <UserCheck size={14} />
                      <span>
                        {owingCustomers.length} {t.customersOwing}
                      </span>
                    </div>
                  </div>

                  <div className="relative z-10 grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-white/20">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3">
                      <div className="text-emerald-100 text-xs">{t.creditToday}</div>
                      <div className="text-lg sm:text-xl font-bold mt-1 text-white">
                        {formatMoney(sumToday('credit'), lang)}
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3">
                      <div className="text-emerald-100 text-xs">{t.collectedToday}</div>
                      <div className="text-lg sm:text-xl font-bold mt-1 text-white">
                        {formatMoney(sumToday('payment'), lang)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Weekly Insights */}
                <div className="card-interactive bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/80 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-stone-900 text-base sm:text-lg font-heading">
                        {lang === 'ne' ? 'साप्ताहिक झलक' : 'Weekly Insights'}
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {lang === 'ne' ? 'पछिल्लो ७ दिन' : 'Last 7 days'}
                      </p>
                    </div>
                    <TrendingUp size={18} className="text-emerald-600" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="rounded-2xl bg-rose-50 p-3">
                      <div className="text-[11px] font-medium text-rose-700">
                        {lang === 'ne' ? 'नयाँ उधारो' : 'New credit'}
                      </div>
                      <div className="mt-1 text-sm sm:text-base font-bold text-rose-700">
                        {formatMoney(weeklyInsights.credit, lang)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-3">
                      <div className="text-[11px] font-medium text-emerald-700">
                        {lang === 'ne' ? 'उठेको रकम' : 'Collected'}
                      </div>
                      <div className="mt-1 text-sm sm:text-base font-bold text-emerald-700">
                        {formatMoney(weeklyInsights.collected, lang)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-blue-50 p-3">
                      <div className="text-[11px] font-medium text-blue-700">
                        {lang === 'ne' ? 'संकलन दर' : 'Collection rate'}
                      </div>
                      <div className="mt-1 text-sm sm:text-base font-bold text-blue-700">
                        {weeklyInsights.collectionRate}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Voice Assistant Interactive Card */}
                <div className="card-interactive bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/80 shadow-xs flex flex-col items-center text-center">
                  <div className="w-full flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${listening ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`} />
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                        {lang === 'ne' ? 'आवाज सहायक (Voice AI)' : 'Voice Assistant'}
                      </span>
                    </div>
                    {/* Mic Language Toggle */}
                    <button
                      onClick={() => setMicLang(m => m === 'ne-NP' ? 'en-US' : 'ne-NP')}
                      disabled={listening}
                      title={micLang === 'ne-NP' ? 'Switch mic to English' : 'माइक नेपालीमा बदल्नुहोस्'}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                        listening ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'
                      } ${
                        micLang === 'ne-NP'
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-amber-50 border-amber-200 text-amber-700'
                      }`}
                    >
                      <Mic size={11} />
                      {micLang === 'ne-NP' ? '🇳🇵 NE' : '🇬🇧 EN'}
                    </button>
                  </div>

                  {/* Big Voice Button */}
                  <div className="my-3">
                    <button
                      onClick={listening ? stopListening : startListening}
                      className={`voice-button w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-white ${
                        listening ? 'is-listening bg-rose-600' : 'bg-emerald-600'
                      }`}
                      title={t.tapToSpeak}
                    >
                      <Mic size={40} className={listening ? 'animate-bounce' : ''} />
                    </button>
                  </div>

                  <p className="font-semibold text-stone-800 text-sm sm:text-base mt-1">
                    {listening ? t.listening : t.tapToSpeak}
                  </p>

                  {heard && (
                    <div className="mt-2.5 px-4 py-2 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs sm:text-sm text-stone-700 italic max-w-md">
                      "{heard}"
                    </div>
                  )}

                  {/* Quick Voice Command Chips */}
                  <div className="w-full mt-4 pt-4 border-t border-stone-100">
                    <p className="text-xs font-semibold text-stone-500 mb-2 text-left">{t.tryCommand}:</p>
                    <div className="flex flex-wrap gap-2 text-left">
                      {t.voiceChips.map((chip) => (
                        <button
                          key={chip}
                          onClick={() => runVoiceCommand(chip)}
                          className="btn-interactive text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl px-3 py-1.5 border border-emerald-200/60"
                        >
                          "{chip}"
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (Top Debtors & Recent Transactions) */}
              <div className="lg:col-span-5 space-y-5">
                {/* Highest Outstanding Customers */}
                <div className="card-interactive bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/80 shadow-xs">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-stone-900 text-base sm:text-lg font-heading">{t.mostOwed}</h3>
                    <button
                      onClick={() => setTab('customers')}
                      className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                    >
                      {t.viewAll} <ChevronRight size={14} />
                    </button>
                  </div>

                  {owingCustomers.length === 0 ? (
                    <p className="text-sm text-stone-500 py-4 text-center">{lang === 'ne' ? 'कुनै बाँकी रकम छैन।' : 'No outstanding balances.'}</p>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {owingCustomers.slice(0, 4).map((c) => (
                        <div
                          key={c.id}
                          className="py-3 flex items-center justify-between group hover:bg-stone-50/70 px-2 rounded-xl transition-colors cursor-pointer"
                          onClick={() => setProfileCustomerId(c.id)}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-semibold text-stone-900 text-sm sm:text-base truncate group-hover:text-emerald-700 transition-colors">
                              {c.name}
                            </div>
                            <div className="text-xs text-stone-500 truncate">
                              {c.phone || c.nickname || (lang === 'ne' ? 'नियमित ग्राहक' : 'Customer')}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-bold text-rose-600 text-sm sm:text-base">
                              {formatMoney(bal(c.id), lang)}
                            </div>
                            <span className="text-[10px] text-stone-400 uppercase font-semibold">{t.outstanding}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Transactions Card */}
                <div className="card-interactive bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/80 shadow-xs">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-stone-900 text-base sm:text-lg font-heading">{t.recentTransactions}</h3>
                    <button
                      onClick={() => setTab('tx')}
                      className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                    >
                      {t.viewAll} <ChevronRight size={14} />
                    </button>
                  </div>

                  {recentTransactions.length === 0 ? (
                    <p className="text-sm text-stone-500 py-4 text-center">{t.noTransactions}</p>
                  ) : (
                    <div>
                      {recentTransactions.slice(0, 4).map((tx) => (
                        <TransactionItem key={tx.id} tx={tx} showCustomer={true} compact />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= CUSTOMERS TAB ================= */}
        {tab === 'customers' && (
          <div className="space-y-6">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-3.5 text-stone-400" size={18} />
                <Input
                  className="pl-10 pr-9"
                  placeholder={t.searchCustomer}
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
                {customerSearch && (
                  <button
                    onClick={() => setCustomerSearch('')}
                    className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 p-1"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Btn onClick={() => setCustomerModal({ isEdit: false })}>
                  <Plus size={18} />
                  <span>{t.addCustomer}</span>
                </Btn>
              </div>
            </div>

            {/* Customers Grid */}
            {customers.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-stone-200/80 shadow-xs max-w-lg mx-auto mt-8">
                <Users size={44} className="mx-auto text-stone-300 mb-3" />
                <h3 className="text-lg font-bold text-stone-800">{t.noCustomers}</h3>
                <p className="text-sm text-stone-500 mt-1">{t.addCustomerPrompt}</p>
                <Btn className="mt-4 mx-auto" onClick={() => setCustomerModal({ isEdit: false })}>
                  <Plus size={16} />
                  {t.addCustomer}
                </Btn>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {customers
                  .filter((c) => {
                    const pool = `${c.name} ${c.nickname || ''} ${c.phone || ''} ${c.address || ''}`.toLowerCase()
                    return pool.includes(customerSearch.toLowerCase())
                  })
                  .map((c) => {
                    const currentBal = bal(c.id)
                    const hasOwing = currentBal > 0
                    return (
                      <div
                        key={c.id}
                        className="card-interactive bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <h4
                                onClick={() => setProfileCustomerId(c.id)}
                                className="font-bold text-stone-900 text-base sm:text-lg truncate hover:text-emerald-700 cursor-pointer font-heading"
                              >
                                {c.name}
                              </h4>
                              {c.nickname && <div className="text-xs text-stone-500 truncate">{c.nickname}</div>}
                            </div>
                            <span
                              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${
                                hasOwing ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-stone-100 text-stone-600'
                              }`}
                            >
                              {formatMoney(currentBal, lang)}
                            </span>
                          </div>

                          <div className="mt-3 space-y-1 text-xs text-stone-500">
                            {c.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone size={13} className="text-stone-400" />
                                <span>{c.phone}</span>
                              </div>
                            )}
                            {c.address && (
                              <div className="flex items-center gap-1.5 truncate">
                                <span>📍</span>
                                <span>{c.address}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Customer Card Actions */}
                        <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between">
                          <button
                            onClick={() => setProfileCustomerId(c.id)}
                            className="btn-interactive text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-1"
                          >
                            <span>{lang === 'ne' ? 'खाता हेर्नुहोस्' : 'View Khata'}</span>
                            <ChevronRight size={14} />
                          </button>

                          <div className="flex items-center gap-1">
                            {c.phone && hasOwing && (
                              <button
                                onClick={() => setReminderModal(c)}
                                className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                                title={t.sendReminder}
                              >
                                <MessageCircle size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => setCustomerModal({ isEdit: true, customer: c })}
                              className="p-2 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
                              title={t.edit}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ type: 'cust', item: c })}
                              className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                              title={t.delete}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}

        {/* ================= TRANSACTIONS TAB ================= */}
        {tab === 'tx' && (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/80 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3.5 text-stone-400" size={18} />
                  <Input
                    className="pl-10 pr-9"
                    placeholder={t.searchTx}
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                  />
                  {txSearch && (
                    <button
                      onClick={() => setTxSearch('')}
                      className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 p-1"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    className="h-11 sm:h-12 px-3 sm:px-4 rounded-2xl border border-stone-200 bg-white text-stone-700 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500/20"
                    value={txSort}
                    onChange={(e) => setTxSort(e.target.value)}
                  >
                    <option value="newest">{lang === 'ne' ? 'नयाँ पहिले' : 'Newest First'}</option>
                    <option value="oldest">{lang === 'ne' ? 'पुरानो पहिले' : 'Oldest First'}</option>
                    <option value="highest">{lang === 'ne' ? 'धेरै रकम' : 'Highest Amount'}</option>
                  </select>

                  <Btn onClick={() => setTxModal({ isEdit: false })}>
                    <Plus size={18} />
                    <span>{t.addTransaction}</span>
                  </Btn>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100">
                <div className="flex items-center gap-1.5">
                  {[
                    ['all', t.all],
                    ['credit', t.creditsOnly],
                    ['payment', t.paymentsOnly]
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setTxFilterType(key)}
                      className={`btn-interactive px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                        txFilterType === key
                          ? 'bg-stone-900 text-white shadow-2xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="text-xs text-stone-500 font-medium">
                  {lang === 'ne' ? 'जम्मा' : 'Count'}:{' '}
                  <b className="text-stone-800">{filteredTransactions.length}</b> ·{' '}
                  {lang === 'ne' ? 'कुल' : 'Total'}:{' '}
                  <b className="text-emerald-700">
                    {formatMoney(
                      filteredTransactions.reduce((s, tx) => s + tx.amount, 0),
                      lang
                    )}
                  </b>
                </div>
              </div>
            </div>

            {/* Transactions List */}
            {filteredTransactions.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-stone-200/80 shadow-xs max-w-lg mx-auto">
                <Receipt size={40} className="mx-auto text-stone-300 mb-2" />
                <p className="text-stone-500 text-sm">{t.noTransactions}</p>
                {(txSearch || txFilterType !== 'all') && (
                  <Btn
                    kind="ghost"
                    className="mt-3 mx-auto text-xs"
                    onClick={() => {
                      setTxSearch('')
                      setTxFilterType('all')
                    }}
                  >
                    {t.clearFilter}
                  </Btn>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((tx) => (
                  <TransactionItem key={tx.id} tx={tx} showCustomer={true} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= BACKUP & TOOLS TAB ================= */}
        {tab === 'tools' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-6">
              <div>
                <h3 className="text-xl font-bold text-stone-900 font-heading">{t.tools}</h3>
                <p className="text-xs sm:text-sm text-stone-500 mt-1">
                  {lang === 'ne'
                    ? 'आफ्नो सम्पूर्ण खाता डाटा सुरक्षित राख्नुहोस् वा नयाँ डिभाइसमा सार्नुहोस्।'
                    : 'Safely backup, restore, or export your ledger transactions.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1-Click JSON Backup */}
                <div className="card-interactive bg-stone-50 rounded-2xl p-5 border border-stone-200/80 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                      <Download size={20} />
                    </div>
                    <h4 className="font-bold text-stone-800 text-base">{t.backupData}</h4>
                    <p className="text-xs text-stone-500 mt-1">
                      {lang === 'ne' ? 'सबै ग्राहक र कारोबारहरूको JSON फाइल डाउनलोड गर्नुहोस्।' : 'Download a complete JSON snapshot of all records.'}
                    </p>
                  </div>
                  <Btn
                    onClick={() => {
                      downloadJSONBackup(data)
                      showToast(lang === 'ne' ? 'ब्याकअप डाउनलोड भयो' : 'Backup downloaded')
                    }}
                    className="mt-4 w-full text-xs sm:text-sm"
                  >
                    <Download size={16} />
                    {t.backupData}
                  </Btn>
                </div>

                {/* CSV Excel Export */}
                <div className="card-interactive bg-stone-50 rounded-2xl p-5 border border-stone-200/80 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                      <FileSpreadsheet size={20} />
                    </div>
                    <h4 className="font-bold text-stone-800 text-base">{t.exportCSV}</h4>
                    <p className="text-xs text-stone-500 mt-1">
                      {lang === 'ne' ? 'Microsoft Excel वा Google Sheets मा खोल्न मिल्ने फाइल।' : 'Export transactions into an Excel-ready CSV format.'}
                    </p>
                  </div>
                  <Btn
                    kind="secondary"
                    onClick={() => {
                      exportTransactionsCSV(data)
                      showToast(lang === 'ne' ? 'CSV फाइल डाउनलोड भयो' : 'CSV exported')
                    }}
                    className="mt-4 w-full text-xs sm:text-sm"
                  >
                    <FileSpreadsheet size={16} />
                    {t.exportCSV}
                  </Btn>
                </div>
              </div>

              {/* JSON Restore */}
              <div className="p-5 rounded-2xl border border-stone-200 bg-stone-50/50">
                <h4 className="font-bold text-stone-800 text-sm mb-1">{t.restoreData}</h4>
                <p className="text-xs text-stone-500 mb-3">
                  {lang === 'ne' ? 'पहिले डाउनलोड गरिएको JSON ब्याकअप फाइल छान्नुहोस्।' : 'Select a previously exported JSON backup file.'}
                </p>
                <label className="btn-interactive cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-stone-300 text-stone-700 text-sm font-semibold hover:border-emerald-600 hover:text-emerald-700">
                  <Upload size={16} />
                  <span>{lang === 'ne' ? 'ब्याकअप फाइल छान्नुहोस्' : 'Choose Backup File'}</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = (event) => {
                        try {
                          const parsed = JSON.parse(event.target?.result)
                          if (parsed && Array.isArray(parsed.customers) && Array.isArray(parsed.transactions)) {
                            if (window.confirm(t.confirmRestore)) {
                              setData(parsed)
                              showToast(t.dataRestored)
                            }
                          } else {
                            alert(t.invalidFile)
                          }
                        } catch {
                          alert(t.invalidFile)
                        }
                      }
                      reader.readAsText(file)
                    }}
                  />
                </label>
              </div>

              {/* Demo Reset */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <h5 className="font-semibold text-stone-800 text-xs sm:text-sm">
                    {lang === 'ne' ? 'डेमो डाटा लोड गर्नुहोस्' : 'Reset to Demo Data'}
                  </h5>
                  <p className="text-[11px] text-stone-500">
                    {lang === 'ne' ? 'नमूना ग्राहक र कारोबारहरू फेरि लोड गर्दछ।' : 'Loads sample Nepali customers and transactions.'}
                  </p>
                </div>
                <Btn
                  kind="danger"
                  className="h-10 text-xs"
                  onClick={() => {
                    if (window.confirm(lang === 'ne' ? 'के तपाईं नमूना डाटा लोड गर्न चाहनुहुन्छ?' : 'Reset to sample demo data?')) {
                      const s = seedData()
                      setData(s)
                      showToast(lang === 'ne' ? 'नमूना डाटा लोड भयो' : 'Demo data reloaded')
                    }
                  }}
                >
                  <RotateCcw size={14} />
                  <span>{lang === 'ne' ? 'रिसेट' : 'Reset'}</span>
                </Btn>
              </div>
            </div>

            {/* Google Cloud Speech-to-Text API Key Settings */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Mic size={16} />
                  </div>
                  <h3 className="text-base font-bold text-stone-900">
                    {lang === 'ne' ? 'Google Cloud आवाज पहिचान (वैकल्पिक)' : 'Google Cloud Speech API (Optional)'}
                  </h3>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  {lang === 'ne'
                    ? 'Chrome/Edge मा आवाज पहिचान निःशुल्क काम गर्छ। Firefox/Safari को लागि Google Cloud Speech API Key थप्नुहोस्।'
                    : 'Voice recognition works free in Chrome/Edge. For Firefox/Safari, add a Google Cloud Speech-to-Text API key as fallback.'}
                </p>
              </div>

              {/* Web Speech status */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-200">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition))
                    ? 'bg-emerald-500' : 'bg-amber-400'
                }`} />
                <span className="text-xs text-stone-700">
                  {(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition))
                    ? (lang === 'ne' ? '✓ यो ब्राउजरमा Web Speech API उपलब्ध छ (निःशुल्क)' : '✓ Web Speech API available in this browser (free)')
                    : (lang === 'ne' ? '⚠ यो ब्राउजरमा Web Speech API छैन — Cloud API चाहिन्छ' : '⚠ Web Speech API not available — Cloud API key needed')}
                </span>
              </div>

              {/* API Key Input */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-stone-600">
                  {lang === 'ne' ? 'Google Cloud Speech API Key' : 'Google Cloud Speech API Key'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={gcpKeyInput}
                    onChange={(e) => { setGcpKeyInput(e.target.value); setGcpKeySaved(false) }}
                    placeholder={lang === 'ne' ? 'AIza... (ऐच्छिक)' : 'AIza... (optional)'}
                    className="flex-1 h-11 px-4 rounded-2xl border border-stone-200 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                  />
                  <Btn
                    onClick={() => {
                      const trimmed = gcpKeyInput.trim()
                      setGcpApiKey(trimmed)
                      try { localStorage.setItem(GCP_KEY_STORAGE, trimmed) } catch {}
                      setGcpKeySaved(true)
                      showToast(trimmed
                        ? (lang === 'ne' ? '✓ Google Speech API Key सुरक्षित गरियो' : '✓ Google Speech API Key saved')
                        : (lang === 'ne' ? 'API Key हटाइयो' : 'API Key cleared')
                      )
                    }}
                    kind={gcpKeySaved ? 'ghost' : 'primary'}
                    className="h-11 px-4 text-sm flex-shrink-0"
                  >
                    {gcpKeySaved ? <Check size={16} /> : null}
                    {gcpKeySaved
                      ? (lang === 'ne' ? 'सुरक्षित' : 'Saved')
                      : (lang === 'ne' ? 'सेभ गर्नुहोस्' : 'Save Key')}
                  </Btn>
                </div>
                {gcpApiKey && (
                  <p className="text-[11px] text-emerald-700 flex items-center gap-1">
                    <Check size={11} />
                    {lang === 'ne' ? 'API Key सेट छ — Firefox/Safari मा Cloud Speech सक्रिय' : 'API Key set — Cloud Speech active for Firefox/Safari'}
                  </p>
                )}
                <p className="text-[11px] text-stone-400">
                  {lang === 'ne'
                    ? 'Key तपाईंको डिभाइसमा मात्र सुरक्षित राखिन्छ, कहिँ पनि पठाइँदैन।'
                    : 'Your key is stored only on this device and never sent anywhere except Google.'}
                </p>
              </div>

              {/* How to get a key */}
              <details className="text-xs text-stone-500 rounded-xl border border-stone-200 bg-stone-50/60 p-3">
                <summary className="cursor-pointer font-semibold text-stone-600 select-none">
                  {lang === 'ne' ? 'API Key कसरी पाउने?' : 'How to get an API Key?'}
                </summary>
                <ol className="mt-2 space-y-1 list-decimal list-inside text-[11px] leading-5">
                  <li>{lang === 'ne' ? 'console.cloud.google.com मा जानुहोस्' : 'Go to console.cloud.google.com'}</li>
                  <li>{lang === 'ne' ? 'नयाँ Project सिर्जना गर्नुहोस्' : 'Create a new project'}</li>
                  <li>{lang === 'ne' ? '"Cloud Speech-to-Text API" Enable गर्नुहोस्' : 'Enable "Cloud Speech-to-Text API"'}</li>
                  <li>{lang === 'ne' ? 'APIs & Services → Credentials → "Create API Key"' : 'APIs & Services → Credentials → "Create API Key"'}</li>
                  <li>{lang === 'ne' ? 'माथि बक्समा Key टाँस्नुहोस् र Save थिच्नुहोस्' : 'Paste the key above and click Save'}</li>
                </ol>
              </details>
            </div>
          </div>
        )}
      </main>

      {/* ================= BOTTOM NAVIGATION (MOBILE) ================= */}
      <nav className="bottom-nav md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-stone-200/80 bg-white/95 backdrop-blur-md px-2 py-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-lg">
        <div className="grid grid-cols-4 gap-1 items-center max-w-md mx-auto">
          {[
            ['home', Home, t.home],
            ['customers', Users, t.customers],
            ['tx', Receipt, t.transactions],
            ['tools', FileSpreadsheet, t.tools]
          ].map(([k, Icon, label]) => {
            const isActive = tab === k && !profileCustomerId
            return (
              <button
                key={k}
                onClick={() => {
                  setTab(k)
                  setProfileCustomerId(null)
                }}
                className={`nav-item flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all ${
                  isActive
                    ? 'bg-emerald-100/70 text-emerald-800 font-bold shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Icon size={19} className={isActive ? 'text-emerald-700' : 'text-stone-500'} />
                <span className="text-[11px] mt-0.5 tracking-tight truncate max-w-full">{label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* ================= MODALS & DRAWERS ================= */}

      {/* 1. Transaction Add/Edit Modal */}
      {txModal && (
        <Modal
          title={txModal.isEdit ? t.editTransaction : t.addTransaction}
          onClose={() => setTxModal(null)}
        >
          <TransactionForm
            init={txModal.tx || { customerId: txModal.defaultCustomerId || customers[0]?.id }}
            onSave={saveOrUpdateTransaction}
          />
        </Modal>
      )}

      {/* 2. Customer Add/Edit Modal */}
      {customerModal && (
        <Modal
          title={customerModal.isEdit ? t.editCustomer : t.addCustomer}
          onClose={() => setCustomerModal(null)}
        >
          <CustomerForm
            init={customerModal.customer || {}}
            onSave={saveOrUpdateCustomer}
          />
        </Modal>
      )}

      {/* 3. Delete Confirmation Dialog */}
      {deleteConfirm && (
        <Modal title={t.deleteConfirmTitle} onClose={() => setDeleteConfirm(null)} maxWidth="max-w-md">
          <div className="space-y-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto sm:mx-0">
              <AlertTriangle size={24} />
            </div>

            <div>
              <p className="text-stone-800 font-medium">
                {deleteConfirm.type === 'tx'
                  ? `${t.confirmDeleteTx} ${formatMoney(deleteConfirm.item.amount, lang)}?`
                  : `${t.confirmDeleteCust} (${deleteConfirm.item.name})`}
              </p>
              <p className="text-stone-500 text-xs mt-1">{t.cannotUndone}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Btn kind="ghost" onClick={() => setDeleteConfirm(null)}>
                {t.cancel}
              </Btn>
              <Btn
                kind="dangerSolid"
                onClick={() => {
                  if (deleteConfirm.type === 'tx') {
                    executeDeleteTransaction(deleteConfirm.item.id)
                  } else {
                    executeDeleteCustomer(deleteConfirm.item.id)
                  }
                }}
              >
                {t.delete}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* 4. Reminder Modal */}
      {reminderModal && (
        <Modal title={t.sendReminder} onClose={() => setReminderModal(null)} maxWidth="max-w-md">
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <div className="font-semibold text-stone-900">{reminderModal.name}</div>
              <div className="text-xs text-stone-500">{reminderModal.phone}</div>
              <div className="text-lg font-bold text-rose-600 mt-2">
                {formatMoney(bal(reminderModal.id), lang)} {t.outstanding}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 text-xs sm:text-sm text-stone-800 italic">
              "{t.reminderMessage(reminderModal.name, formatMoney(bal(reminderModal.id), lang))}"
            </div>

            <div className="space-y-2 pt-2">
              {reminderModal.phone && (
                <>
                  <a
                    href={whatsAppUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-interactive w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    <MessageCircle size={18} />
                    <span>{t.whatsAppReminder}</span>
                  </a>

                  <a
                    href={smsUrl}
                    className="btn-interactive w-full h-12 rounded-2xl bg-stone-800 hover:bg-stone-900 text-white font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    <Send size={16} />
                    <span>{t.smsReminder}</span>
                  </a>
                </>
              )}

              <Btn
                kind="outline"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(reminderText)
                  showToast(t.messageCopied)
                }}
              >
                <Copy size={16} />
                <span>{t.copyReminder}</span>
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Voice Assistant Modal / Panel */}
      {voicePanel && (
        <Modal
          title={
            {
              confirm: t.confirmTxTitle,
              done: t.recordedSuccess,
              answer: voicePanel.title,
              error: lang === 'ne' ? 'ध्यान दिनुहोस्' : 'Notice',
              pick: lang === 'ne' ? `कुन ${voicePanel.cmd?.name}?` : `Which ${voicePanel.cmd?.name}?`,
              notfound: lang === 'ne' ? 'ग्राहक भेटिएन' : 'Customer Not Found'
            }[voicePanel.kind] || 'Voice'
          }
          onClose={() => setVoicePanel(null)}
          maxWidth="max-w-md"
        >
          {voicePanel.kind === 'answer' && (
            <div className="text-center py-6">
              <div className="text-4xl sm:text-5xl font-extrabold text-emerald-700 font-heading">
                {voicePanel.big}
              </div>
              <div className="text-stone-500 mt-2 text-sm font-medium">{voicePanel.sub}</div>
            </div>
          )}

          {voicePanel.kind === 'error' && (
            <div className="py-2">
              <p className="text-stone-800 font-medium">{voicePanel.msg}</p>
              {voicePanel.hint && (
                <div className="mt-3 p-3 bg-stone-50 rounded-xl text-xs text-stone-600 border border-stone-200">
                  {voicePanel.hint}
                </div>
              )}
            </div>
          )}

          {voicePanel.kind === 'confirm' && (
            <div className="space-y-4">
              {lastVoiceCommand && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs italic text-blue-800">
                  “{lastVoiceCommand}”
                </div>
              )}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="text-base font-bold text-stone-900">{voicePanel.customer.name}</div>
                <div className="flex justify-between items-center text-xs text-stone-500 pt-1">
                  <span>{t.oldBalance}:</span>
                  <b className="text-stone-800">{formatMoney(bal(voicePanel.customer.id), lang)}</b>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-600 font-medium">
                    {voicePanel.type === 'credit' ? `+ ${t.udharo}` : `− ${t.payment}`}:
                  </span>
                  <b className={voicePanel.type === 'credit' ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                    {formatMoney(voicePanel.amount, lang)}
                  </b>
                </div>
                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-stone-200">
                  <span className="text-stone-700 font-semibold">{t.newBalance}:</span>
                  <b className={voicePanel.after > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                    {formatMoney(voicePanel.after, lang)}
                  </b>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Btn kind="ghost" onClick={() => setVoicePanel(null)}>
                  {t.cancel}
                </Btn>
                <Btn onClick={confirmVoiceTransaction}>
                  {t.confirm}
                </Btn>
              </div>
            </div>
          )}

          {voicePanel.kind === 'done' && (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Check size={28} />
              </div>
              <div className="text-lg font-bold text-stone-900">
                {voicePanel.p.type === 'credit'
                  ? `${voicePanel.p.customer.name} को खातामा ${formatMoney(voicePanel.p.amount, lang)} उधारो थपियो`
                  : `${formatMoney(voicePanel.p.amount, lang)} भुक्तानी रेकर्ड गरियो`}
              </div>
              <div className="text-stone-500 text-xs mt-2">{t.newBalance}</div>
              <div className="text-3xl font-extrabold text-emerald-700 mt-1 font-heading">
                {formatMoney(voicePanel.p.after, lang)}
              </div>
            </div>
          )}

          {voicePanel.kind === 'pick' && (
            <div className="space-y-2">
              <p className="text-xs text-stone-500 mb-2">
                {lang === 'ne' ? 'कृपया उपयुक्त ग्राहक छान्नुहोस्:' : 'Select matching customer:'}
              </p>
              {voicePanel.cmd.matches.map((c) => (
                <button
                  key={c.id}
                  onClick={() => proposeVoiceAction(voicePanel.cmd, c)}
                  className="btn-interactive w-full text-left p-3.5 rounded-2xl border border-stone-200 hover:border-emerald-500 bg-white flex justify-between items-center"
                >
                  <div>
                    <div className="font-semibold text-stone-900">{c.name}</div>
                    <div className="text-xs text-stone-500">{c.nickname || c.phone}</div>
                  </div>
                  <div className="font-bold text-sm text-rose-600">{formatMoney(bal(c.id), lang)}</div>
                </button>
              ))}
            </div>
          )}

          {voicePanel.kind === 'notfound' && (
            <div className="space-y-4">
              <p className="text-stone-700 text-sm">
                "{voicePanel.name}" {lang === 'ne' ? 'तपाईंको खातामा फेला परेन।' : 'is not in your khata.'}
              </p>
              <Btn
                className="w-full"
                onClick={() => {
                  setCustomerModal({ isEdit: false, customer: { name: voicePanel.name } })
                  setVoicePanel(null)
                }}
              >
                <Plus size={16} />
                <span>
                  {t.addCustomer}: {voicePanel.name}
                </span>
              </Btn>
            </div>
          )}
        </Modal>
      )}

      {/* ================= CUSTOMER PROFILE FULL LEDGER DRAWER ================= */}
      {profileCustomer && (
        <div className="profile-page fixed inset-0 z-50 bg-[#f4f7f2] overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-32 sm:pb-24">
            {/* Top Toolbar */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setProfileCustomerId(null)}
                  className="btn-interactive p-2.5 px-3.5 bg-white border border-stone-200 rounded-2xl text-stone-700 hover:text-emerald-700 flex items-center gap-1.5 text-sm font-semibold shadow-xs"
                >
                  <ArrowLeft size={18} />
                  <span>{t.back}</span>
                </button>
                <button
                  onClick={() => {
                    setProfileCustomerId(null)
                    setTab('home')
                  }}
                  className="btn-interactive p-2.5 px-3 bg-white border border-stone-200 rounded-2xl text-stone-600 hover:text-emerald-700 text-xs font-semibold shadow-xs flex items-center gap-1.5"
                  title="Go to Home"
                >
                  <Home size={15} />
                  <span>{t.home}</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  className="btn-interactive p-2.5 bg-white border border-stone-200 hover:border-emerald-500 rounded-2xl text-stone-700 hover:text-emerald-700 shadow-xs"
                  onClick={() => setCustomerModal({ isEdit: true, customer: profileCustomer })}
                  title={t.editCustomer}
                >
                  <Pencil size={18} />
                </button>
                <button
                  className="btn-interactive p-2.5 bg-white border border-rose-200 hover:bg-rose-50 rounded-2xl text-rose-600 shadow-xs"
                  onClick={() => setDeleteConfirm({ type: 'cust', item: profileCustomer })}
                  title={t.deleteCustomer}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {/* Profile Overview Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-heading">
                    {profileCustomer.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-stone-500">
                    {profileCustomer.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={14} />
                        {profileCustomer.phone}
                      </span>
                    )}
                    {profileCustomer.nickname && (
                      <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 text-xs font-medium">
                        {profileCustomer.nickname}
                      </span>
                    )}
                    {profileCustomer.address && <span>📍 {profileCustomer.address}</span>}
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-xs uppercase font-bold tracking-wider text-stone-400">{t.outstanding}</div>
                  <div className="text-3xl sm:text-4xl font-black text-rose-600 font-heading mt-0.5">
                    {formatMoney(profileBal, lang)}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-6 pt-6 border-t border-stone-100">
                <Btn
                  onClick={() => setTxModal({ isEdit: false, defaultCustomerId: profileCustomer.id })}
                  className="text-xs sm:text-sm"
                >
                  <Plus size={16} />
                  <span>{t.addTransaction}</span>
                </Btn>

                {profileBal > 0 && profileCustomer.phone && (
                  <Btn
                    kind="outline"
                    onClick={() => setReminderModal(profileCustomer)}
                    className="text-xs sm:text-sm"
                  >
                    <Send size={16} />
                    <span>{t.sendReminder}</span>
                  </Btn>
                )}

                <Btn
                  kind="ghost"
                  onClick={() => {
                    const statement = `${profileCustomer.name} Khata Statement:\nOutstanding: ${formatMoney(profileBal, lang)}\nTotal Transactions: ${transactions.filter((tx) => tx.customerId === profileCustomer.id).length}`
                    navigator.clipboard.writeText(statement)
                    showToast(lang === 'ne' ? 'हिसाब कपी भयो' : 'Summary copied')
                  }}
                  className="text-xs sm:text-sm"
                >
                  <Copy size={16} />
                  <span>{lang === 'ne' ? 'हिसाब कपी' : 'Copy Summary'}</span>
                </Btn>
              </div>
            </div>

            {/* Customer Transactions History */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-stone-900 text-lg font-heading">
                  {lang === 'ne' ? 'कारोबार विवरण (Khata History)' : 'Transaction History'}
                </h3>
                <span className="text-xs text-stone-500 font-medium">
                  {transactions.filter((tx) => tx.customerId === profileCustomer.id).length} {lang === 'ne' ? 'कारोबार' : 'entries'}
                </span>
              </div>

              {transactions.filter((tx) => tx.customerId === profileCustomer.id).length === 0 ? (
                <p className="text-sm text-stone-500 py-6 text-center">{t.noTransactions}</p>
              ) : (
                <div className="space-y-2">
                  {recentTransactions
                    .filter((tx) => tx.customerId === profileCustomer.id)
                    .map((tx) => (
                      <TransactionItem key={tx.id} tx={tx} showCustomer={false} />
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
