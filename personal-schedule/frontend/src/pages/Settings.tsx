import { useEffect, useState } from 'react'
import { fetchSettings, updateSetting } from '../services/settingsApi'
import type { SettingsEntry } from '../types'

const defaultDraft: Record<string, string> = {
  NORMAL_RATE: '20000',
  NPC_RATE: '20000',
  OT_RATE: '40000',
  EXTEND_RATE: '50000',
  OT_START_TIME: '22:00',
  SHIFT_1_START: '09:00',
  SHIFT_1_END: '13:00',
  SHIFT_2_START: '13:00',
  SHIFT_2_END: '18:00',
  SHIFT_3_START: '18:00',
  SHIFT_3_END: '22:00',
}

export default function SettingsPage() {
  const [, setSettings] = useState<SettingsEntry[]>([])
  const [draft, setDraft] = useState<Record<string, string>>(defaultDraft)

  useEffect(() => {
    fetchSettings().then((result) => {
      setSettings(result)
      const nextDraft: Record<string, string> = { ...defaultDraft }
      result.forEach((item) => {
        if (item.key && item.value !== null && item.value !== undefined) {
          nextDraft[item.key] = item.value
        }
      })
      setDraft(nextDraft)
    })
  }, [])

  const submit = async () => {
    const updates = Object.entries(draft).map(([key, value]) => updateSetting(key, { value }))
    const updated = await Promise.all(updates)
    setSettings(updated)
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="mt-2 text-sm text-slate-600">Điều chỉnh các cấu hình hệ thống và thời gian ca làm.</p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">System Settings</h3>
          <div className="mt-5 grid gap-4">
            {Object.entries(draft).map(([key, value]) => (
              <label className="grid gap-2 text-sm text-slate-700" key={key}>
                {key}
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </label>
            ))}
            <button
              type="button"
              onClick={submit}
              className="mt-4 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Save Settings
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Backup / Restore</h3>
          <div className="mt-5 space-y-3 text-sm text-slate-600">
            <p>Export database to schedule.db.</p>
            <p>Upload a SQLite file to restore the backend database.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
