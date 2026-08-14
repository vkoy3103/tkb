import { TIME_SLOTS } from '../../utils/timeUtils'

export function TimeColumn() {
  return (
    <div className="timetable-time-column">
      <div className="timetable-time-body">
        {TIME_SLOTS.map((slot, index) => {
          const label = `${slot} - ${TIME_SLOTS[index + 1] ?? slot}`
          return (
            <div key={`${slot}-${index}`} className="timetable-time-slot">
              <span className="timetable-time-slot__text">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
