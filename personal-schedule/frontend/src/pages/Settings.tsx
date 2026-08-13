import { useEffect, useState } from 'react'
import { fetchSettings, updateSettings } from '../services/settingsApi'
import type { Settings } from '../types'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [draft, setDraft] = useState({ normal_rate: 20000, npc_rate: 20000, ot_rate: 40000, extend_rate: 50000 })

  useEffect(() => {
    fetchSettings().then((result) => {
      setSettings(result)
      setDraft({
        normal_rate: result.normal_rate,
        npc_rate: result.npc_rate,
        ot_rate: result.ot_rate,
        extend_rate: result.extend_rate,
      })
    })
  }, [])

  const submit = async () => {
    if (!settings) return
    const updated = await updateSettings(draft)
    setSettings(updated)
    setDraft({
      normal_rate: updated.normal_rate,
      npc_rate: updated.npc_rate,
      ot_rate: updated.ot_rate,
      extend_rate: updated.extend_rate,
    })
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="mt-2 text-sm text-slate-600">Điều chỉnh mức lương và backup/restore dữ liệu.</p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Salary Settings</h3>
          <div className="mt-5 grid gap-4">
            {(['normal_rate', 'npc_rate', 'ot_rate', 'extend_rate'] as const).map((key) => (
              <label className="grid gap-2 text-sm text-slate-700" key={key}>
                {key.replace('_', ' ').toUpperCase()}
                <input
                  type="number"
                  value={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })}
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
            <p>Upload an SQLite file to restore.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
