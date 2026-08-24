import { TIME_SLOTS } from '../../utils/timeUtils'

export function TimeColumn({ timeSlots = TIME_SLOTS }: { timeSlots?: string[] }) {
  return (
    <div className="timetable-time-column">
      <div
        className="timetable-time-body"
        style={{
          gridTemplateRows: `repeat(${timeSlots.length}, var(--timetable-row-height))`,
        }}
      >
        {timeSlots.map((slot, index) => {
          const label = `${slot} - ${timeSlots[index + 1] ?? slot}`
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
