import { useEffect, useMemo, useState } from 'react'
import { fetchSubjects, createSubject, deleteSubject, updateSubject } from '../services/subjectApi'
import type { Subject } from '../types'

const defaultSubject = {
  name: '',
  code: '',
  credits: 0,
  teacher: '',
  room: '',
  color: '#22c55e',
  note: '',
}

function formatLabel(subject: Subject) {
  return `${subject.name}${subject.code ? ` · ${subject.code}` : ''}`
}

export default function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [form, setForm] = useState(defaultSubject)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchSubjects().then(setSubjects)
  }, [])

  const filteredSubjects = useMemo(
    () => subjects.filter((subject) => subject.name.toLowerCase().includes(search.toLowerCase())),
    [subjects, search],
  )

  const resetForm = () => {
    setForm(defaultSubject)
    setEditingId(null)
  }

  const submit = async () => {
    const payload = {
      ...form,
      credits: Number(form.credits),
    }
    if (editingId) {
      const updated = await updateSubject(editingId, payload)
      setSubjects((current) => current.map((subject) => (subject.id === editingId ? updated : subject)))
    } else {
      const created = await createSubject(payload)
      setSubjects((current) => [created, ...current])
    }
    resetForm()
  }

  const startEdit = (subject: Subject) => {
    setForm({
      name: subject.name,
      code: subject.code || '',
      credits: subject.credits,
      teacher: subject.teacher || '',
      room: subject.room || '',
      color: subject.color || '#22c55e',
      note: subject.note || '',
    })
    setEditingId(subject.id)
  }

  const remove = async (subjectId: number) => {
    await deleteSubject(subjectId)
    setSubjects((current) => current.filter((subject) => subject.id !== subjectId))
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">Subjects</h2>
        <p className="mt-2 text-sm text-slate-600">Quản lý môn học của bạn.</p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">{editingId ? 'Edit Subject' : 'Add Subject'}</h3>
          <div className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-700">
                Name
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </label>
              <label className="block text-sm text-slate-700">
                Code
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-700">
                Credits
                <input
                  type="number"
                  value={form.credits}
                  onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </label>
              <label className="block text-sm text-slate-700">
                Teacher
                <input
                  value={form.teacher}
                  onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-700">
                Room
                <input
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </label>
              <label className="block text-sm text-slate-700">
                Color
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                />
              </label>
            </div>
            <label className="block text-sm text-slate-700">
              Note
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="mt-2 min-h-[120px] w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={submit}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {editingId ? 'Update' : 'Create'} Subject
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Subjects list</h3>
              <p className="mt-1 text-sm text-slate-500">Search and manage existing subjects.</p>
            </div>
            <input
              placeholder="Search subject"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            />
          </div>
          <div className="mt-5 space-y-3">
            {filteredSubjects.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                Không có subject nào.
              </p>
            ) : (
              filteredSubjects.map((subject) => (
                <div key={subject.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{formatLabel(subject)}</p>
                      <p className="mt-1 text-sm text-slate-600">{subject.teacher || 'No teacher'} · {subject.room || 'No room'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(subject)}
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(subject.id)}
                        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
