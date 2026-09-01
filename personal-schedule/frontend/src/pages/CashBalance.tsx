import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '../styles/pages.css'
import '../styles/cash-balance.css'

const fmt = (value: number) => Math.round(value || 0).toLocaleString('vi-VN')
const fmtMoney = (value: number) => `${fmt(value)} VNĐ`

// Format gọn: 20000 → "20k", 200 → "200", 1200000 → "1.200k", -10000 → "-10k"
const fmtK = (value: number) => {
  const n = Math.round(value || 0)
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs > 0 && abs % 1000 === 0) return `${sign}${(abs / 1000).toLocaleString('vi-VN')}k`
  return n.toLocaleString('vi-VN')
}

// Chuyển chuỗi nhập "20k" / "200k" / "20000" / "200.000" → số
const parseAmount = (raw: string): number => {
  const s = (raw || '').trim().toLowerCase().replace(/\s/g, '')
  if (!s) return 0
  const isK = s.endsWith('k')
  const numStr = isK ? s.slice(0, -1) : s
  const num = parseFloat(numStr.replace(/[.,\s]/g, ''))
  if (Number.isNaN(num)) return 0
  return isK ? Math.round(num * 1000) : Math.round(num)
}

// Hiển thị giá trị trong ô nhập dạng gọn: 20000 → "20k", 125000 → "125000"
const formatInputValue = (value: number): string => {
  if (value > 0 && value % 1000 === 0) return `${value / 1000}k`
  return String(value)
}

const QUICK_AMOUNTS = [1, 2, 5, 10, 20, 50, 100, 200, 500] // đơn vị: nghìn

// Mệnh giá tiền Việt Nam (VNĐ) — dùng để đếm tiền két
const BILLS = [
  { denom: 1000, label: '1k' },
  { denom: 2000, label: '2k' },
  { denom: 5000, label: '5k' },
  { denom: 10000, label: '10k' },
  { denom: 20000, label: '20k' },
  { denom: 50000, label: '50k' },
  { denom: 100000, label: '100k' },
  { denom: 200000, label: '200k' },
  { denom: 500000, label: '500k' },
]

// Ô nhập số tờ: nút mũi tên lên/xuống CSS đẹp + lăn chuột tăng/giảm nhanh (không cuộn trang)
function BillCountCell({
  denom,
  label,
  count,
  onChange,
}: {
  denom: number
  label: string
  count: number
  onChange: (denom: number, value: string) => void
}) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Lăn chuột: tăng/giảm theo tốc độ lăn (deltaY lớn → nhảy nhiều số)
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (!e.deltaY) return
      const steps = Math.max(1, Math.round(Math.abs(e.deltaY) / 40))
      const dir = e.deltaY > 0 ? -1 : 1
      const next = Math.max(0, (Number(el.value) || 0) + dir * steps)
      el.value = String(next)
      onChange(denom, String(next))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [denom, onChange])

  return (
    <div className="cb-bill">
      <span className="cb-bill__denom">{label}</span>
      <input
        ref={ref}
        className="pg-input cb-bill__count"
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        placeholder="0"
        value={count || ''}
        onChange={(e) => onChange(denom, e.target.value)}
      />
      <div className="cb-bill__spin">
        <button
          type="button"
          className="cb-bill__arrow"
          onClick={() => onChange(denom, String(Math.max(0, count + 1)))}
          aria-label={`Tăng ${label}`}
        >
          ▲
        </button>
        <button
          type="button"
          className="cb-bill__arrow"
          onClick={() => onChange(denom, String(Math.max(0, count - 1)))}
          aria-label={`Giảm ${label}`}
        >
          ▼
        </button>
      </div>
    </div>
  )
}

export default function CashBalancePage() {
  const [cashIncome, setCashIncome] = useState(0) // tiền mặt quán thu — nhập tay
  const [incomeItems, setIncomeItems] = useState<number[]>([]) // các khoản thu khác
  const [expenseItems, setExpenseItems] = useState<number[]>([]) // các khoản chi
  const [incomeInput, setIncomeInput] = useState('')
  const [expenseInput, setExpenseInput] = useState('')
  const [banked, setBanked] = useState(0) // bỏ két
  const [yesterdaySafe, setYesterdaySafe] = useState(0) // két hôm qua — nhập tay
  const [todaySafe, setTodaySafe] = useState(0) // két hôm nay (dự kiến) — tự tính
  const [actualSafe, setActualSafe] = useState(0) // két hôm nay thực tế — nhập tay (tự điền khi đếm tờ)
  const [billCounts, setBillCounts] = useState<Record<number, number>>({}) // số tờ theo mệnh giá
  const [copied, setCopied] = useState(false)

  const totalIncome = incomeItems.reduce((a, b) => a + b, 0)
  const totalExpense = expenseItems.reduce((a, b) => a + b, 0)
  const balance = cashIncome + totalIncome - totalExpense

  // Bỏ két tự = balance (để cash balance = 0)
  useEffect(() => {
    setBanked(balance)
  }, [balance])

  // Két hôm nay (dự kiến) = két hôm qua + bỏ két → tự điền vào ô Két hôm nay
  useEffect(() => {
    setTodaySafe((Number(yesterdaySafe) || 0) + (Number(banked) || 0))
  }, [yesterdaySafe, banked])

  // Tổng tiền đếm được từ số tờ các mệnh giá
  const safeFromBills = useMemo(
    () => BILLS.reduce((sum, b) => sum + b.denom * (billCounts[b.denom] || 0), 0),
    [billCounts],
  )

  // Tự điền vào ô "Két hôm nay (thực tế)" khi có đếm tiền
  useEffect(() => {
    if (safeFromBills > 0) setActualSafe(safeFromBills)
  }, [safeFromBills])

  // Chênh lệch két thực tế vs dự kiến (dương → thừa/xanh, âm → thiếu/đỏ)
  const diffSafe = (Number(actualSafe) || 0) - (Number(todaySafe) || 0)

  // Ấn nút nhanh (1k/2k...) → cộng dồn vào ô nhập, chưa thêm xuống danh sách
  const addQuickToInput = (
    input: string,
    setInput: (s: string) => void,
    valueK: number,
  ) => {
    setInput(formatInputValue(parseAmount(input) + valueK * 1000))
  }

  const addFromInput = (
    setter: React.Dispatch<React.SetStateAction<number[]>>,
    input: string,
    setInput: (s: string) => void,
  ) => {
    const v = parseAmount(input)
    if (v > 0) setter((prev) => [...prev, v])
    setInput('')
  }

  const removeItem = (
    setter: React.Dispatch<React.SetStateAction<number[]>>,
    index: number,
  ) => {
    setter((prev) => prev.filter((_, i) => i !== index))
  }

  // Cập nhật số tờ một mệnh giá (chỉ nhận số nguyên >= 0) — stable để dùng trong BillCountCell
  const setBillCount = useCallback((denom: number, value: string) => {
    const n = Math.max(0, Math.floor(Number(value) || 0))
    setBillCounts((prev) => ({ ...prev, [denom]: n }))
  }, [])

  const resetBills = () => {
    setBillCounts({})
    setActualSafe(0)
  }

  const outputText = useMemo(() => {
    const b = Number(banked) || 0
    const remain = balance - b
    // Tách rời từng khoản thu / chi (không gộp tổng); bỏ két ghi rõ nhãn
    const incomeParts = [fmtK(cashIncome), ...incomeItems.map((a) => `+ ${fmtK(a)}`)]
    const expenseParts = expenseItems.map((a) => `- ${fmtK(a)}`)
    // Két dưới text = két thực tế (nếu chưa nhập thực tế → dùng dự kiến)
    const finalSafe = Number(actualSafe) > 0 ? Number(actualSafe) : Number(todaySafe) || 0
    return `CASH BALANCE: ${[...incomeParts, ...expenseParts, `- ${fmtK(b)} (bỏ két)`].join(' ')} = ${fmtK(remain)}\nkét : ${fmtK(finalSafe)}`
  }, [cashIncome, incomeItems, expenseItems, banked, balance, todaySafe, actualSafe])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(outputText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* bỏ qua */
    }
  }

  return (
    <div className="pg-page">
      <div className="pg-header">
        <div className="pg-header__left">
          <div className="pg-header__icon">💰</div>
          <div>
            <h1 className="pg-header__title">Kết ca — Cash Balance</h1>
            <p className="pg-header__subtitle">Tiền mặt quán thu + thu khác − chi − bỏ két = 0 · Két hôm nay = két hôm qua + bỏ két</p>
          </div>
        </div>
      </div>

      <div className="cb-grid">
        {/* Cột trái: nhập liệu */}
        <div className="cb-main">
          <div className="pg-card">
            <div className="pg-card__head">
              <h3 className="pg-card__title">💵 Tiền mặt quán thu trong ngày</h3>
            </div>
            <input
              className="pg-input cb-cash-input"
              type="text"
              inputMode="decimal"
              placeholder="Nhập số tiền... (vd: 500k hoặc 500000)"
              value={cashIncome ? String(cashIncome) : ''}
              onChange={(e) => setCashIncome(parseAmount(e.target.value))}
            />
          </div>

          <div className="pg-card">
            <div className="pg-card__head">
              <h3 className="pg-card__title">🏦 Đếm tiền két (số tờ)</h3>
            </div>
            <p className="pg-card__subtitle">
              Nhập số tờ mỗi mệnh giá → tự điền vào "Két hôm nay (thực tế)".
            </p>
            <div className="cb-bills">
              {BILLS.map((b) => (
                <BillCountCell
                  key={b.denom}
                  denom={b.denom}
                  label={b.label}
                  count={billCounts[b.denom] || 0}
                  onChange={setBillCount}
                />
              ))}
            </div>
            <div className="cb-bills__total">
              <span>Tổng tiền két (thực tế)</span>
              <b>{fmtMoney(safeFromBills)}</b>
            </div>
            {safeFromBills > 0 && (
              <div className="cb-bills__actions">
                <button type="button" className="pg-btn pg-btn--sm pg-btn--ghost" onClick={resetBills}>
                  ✕ Đặt lại số tờ
                </button>
              </div>
            )}
          </div>

          <div className="pg-card">
            <div className="pg-card__head">
              <h3 className="pg-card__title">➕ Khoản thu khác</h3>
            </div>
            <div className="cb-quick">
              {QUICK_AMOUNTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  className="pg-btn pg-btn--sm pg-btn--ghost"
                  onClick={() => addQuickToInput(incomeInput, setIncomeInput, v)}
                >
                  {v}k
                </button>
              ))}
            </div>
            <div className="cb-row">
              <input
                className="pg-input"
                placeholder="Nhập số tiền (vd: 20k)..."
                value={incomeInput}
                onChange={(e) => setIncomeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addFromInput(setIncomeItems, incomeInput, setIncomeInput)
                }}
              />
              <button
                type="button"
                className="pg-btn pg-btn--sm pg-btn--success"
                onClick={() => addFromInput(setIncomeItems, incomeInput, setIncomeInput)}
              >
                + Thêm
              </button>
            </div>
            {incomeItems.length > 0 && (
              <div className="cb-chips">
                {incomeItems.map((a, i) => (
                  <span key={i} className="cb-chip cb-chip--pos">
                    +{fmtK(a)}
                    <button type="button" className="cb-chip__del" onClick={() => removeItem(setIncomeItems, i)}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="pg-card">
            <div className="pg-card__head">
              <h3 className="pg-card__title">➖ Khoản chi trong ngày</h3>
            </div>
            <div className="cb-quick">
              {QUICK_AMOUNTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  className="pg-btn pg-btn--sm pg-btn--ghost"
                  onClick={() => addQuickToInput(expenseInput, setExpenseInput, v)}
                >
                  {v}k
                </button>
              ))}
            </div>
            <div className="cb-row">
              <input
                className="pg-input"
                placeholder="Nhập số tiền (vd: 200k)..."
                value={expenseInput}
                onChange={(e) => setExpenseInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addFromInput(setExpenseItems, expenseInput, setExpenseInput)
                }}
              />
              <button
                type="button"
                className="pg-btn pg-btn--sm pg-btn--success"
                onClick={() => addFromInput(setExpenseItems, expenseInput, setExpenseInput)}
              >
                + Thêm
              </button>
            </div>
            {expenseItems.length > 0 && (
              <div className="cb-chips">
                {expenseItems.map((a, i) => (
                  <span key={i} className="cb-chip cb-chip--neg">
                    −{fmtK(a)}
                    <button type="button" className="cb-chip__del" onClick={() => removeItem(setExpenseItems, i)}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: kết quả */}
        <div className="cb-side">
          <div className="pg-card cb-result">
            <div className="pg-card__head">
              <h3 className="pg-card__title">🧮 Kết quả</h3>
            </div>
            <div className="cb-line">
              <span>Tiền mặt quán thu</span>
              <b>{fmtMoney(cashIncome)}</b>
            </div>
            <div className="cb-line">
              <span>+ Khoản thu khác</span>
              <b className="cb-pos">
                {incomeItems.length
                  ? incomeItems.map((a) => `+${fmtK(a)}`).join(' · ')
                  : '+0'}
              </b>
            </div>
            <div className="cb-line">
              <span>− Khoản chi</span>
              <b className="cb-neg">
                {expenseItems.length
                  ? expenseItems.map((a) => `−${fmtK(a)}`).join(' · ')
                  : '−0'}
              </b>
            </div>
            <div className="cb-divider" />
            <div className="cb-line cb-line--big">
              <span>Tổng (trước bỏ két)</span>
              <b>{fmtMoney(balance)}</b>
            </div>
            <div className="cb-line">
              <span>Bỏ két</span>
              <input
                className="pg-input cb-amount cb-amount--lg"
                type="number"
                min={0}
                readOnly
                title="Tự tính = tổng tiền mặt (để cash balance = 0)"
                value={banked || ''}
              />
            </div>
            <div className="cb-line">
              <span>Két hôm qua</span>
              <input
                className="pg-input cb-amount cb-amount--lg"
                type="text"
                inputMode="decimal"
                placeholder="Nhập két hôm qua (vd: 20k)"
                value={yesterdaySafe ? String(yesterdaySafe) : ''}
                onChange={(e) => setYesterdaySafe(parseAmount(e.target.value))}
              />
            </div>
            <div className="cb-line cb-line--big cb-safe">
              <span>Két hôm nay (dự kiến) </span>
              <input
                className="pg-input cb-amount cb-amount--lg cb-safe-input"
                type="text"
                readOnly
                title="Tự tính = két hôm qua + bỏ két"
                value={todaySafe ? (todaySafe % 1000 === 0 ? `${todaySafe / 1000}k` : String(todaySafe)) : ''}
              />
            </div>
            <div className="cb-line">
              <span>Két hôm nay (thực tế)</span>
              <input
                className="pg-input cb-amount cb-amount--lg"
                type="text"
                inputMode="decimal"
                placeholder="Nhập két thực tế (vd: 20k)"
                value={actualSafe ? String(actualSafe) : ''}
                onChange={(e) => setActualSafe(parseAmount(e.target.value))}
              />
            </div>
            {actualSafe > 0 && (
              <div className={`cb-line cb-line--big cb-diff ${diffSafe >= 0 ? 'cb-diff--pos' : 'cb-diff--neg'}`}>
                <span>Chênh lệch</span>
                <b>{diffSafe >= 0 ? '+' : ''}{fmtK(diffSafe)}</b>
              </div>
            )}
            <textarea
              className="pg-input pg-textarea cb-textarea"
              readOnly
              value={outputText}
              rows={4}
            />
            <div className="cb-actions">
              <button type="button" className="pg-btn pg-btn--primary" onClick={handleCopy}>
                {copied ? '✓ Đã chép' : '📋 Sao chép thông báo'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
