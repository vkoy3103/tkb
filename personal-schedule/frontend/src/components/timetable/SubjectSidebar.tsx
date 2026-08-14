import type { Subject } from '../../types'

type SubjectSidebarProps = {
  subjects: Subject[]
}

export function SubjectSidebar({ subjects }: SubjectSidebarProps) {
  return (
    <aside className="timetable-sidebar">
      <div className="timetable-sidebar__stack">
        <div>
          <p className="timetable-sidebar__title">Subjects</p>
          <div className="timetable-sidebar__list">
            {subjects.length === 0 ? (
              <p className="timetable-sidebar__empty">Chưa có môn học.</p>
            ) : (
              subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="timetable-sidebar__item timetable-sidebar__item--subject"
                  style={{
                    background: subject.color ? `${subject.color}1a` : '#f8fafc',
                    borderColor: subject.color ? `${subject.color}66` : '#e2e8f0',
                  }}
                >
                  <div className="timetable-sidebar__item-name">{subject.name}</div>
                  <div className="timetable-sidebar__item-meta">{subject.code || '—'} · {subject.default_room || 'No room'}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <p className="timetable-sidebar__title">Work shifts</p>
          <div className="timetable-sidebar__list">
            {[
              { name: 'SHIFT 1', time: '09:00 - 13:00' },
              { name: 'SHIFT 2', time: '13:00 - 18:00' },
              { name: 'SHIFT 3', time: '18:00 - 22:00' },
            ].map((shift) => (
              <div key={shift.name} className="timetable-sidebar__item timetable-sidebar__item--shift">
                <div className="timetable-sidebar__item-name">{shift.name}</div>
                <div className="timetable-sidebar__item-meta">{shift.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
