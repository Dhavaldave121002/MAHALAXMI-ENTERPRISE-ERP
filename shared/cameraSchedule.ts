const INDIA_TIME_ZONE = 'Asia/Kolkata'
const BREAK_START = 13 * 60 + 30
const BREAK_END = 14 * 60

export type CameraScheduleState = {
  state: 'active' | 'break' | 'off'
  message: string
  roomDate: string
  minutesUntilShiftEnd: number
}

export function cameraScheduleForRole(role: string, now = new Date()): CameraScheduleState {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: INDIA_TIME_ZONE,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const part = (type: string) => parts.find(item => item.type === type)?.value || ''
  const roomDate = `${part('year')}-${part('month')}-${part('day')}`
  const minute = Number(part('hour')) * 60 + Number(part('minute'))
  const weekday = part('weekday')
  const isWorkday = weekday !== 'Sun'
  const start = role === 'Production Supervisor' ? 9 * 60 + 30 : 10 * 60
  const end = role === 'Production Supervisor' ? 19 * 60 + 30 : role === 'Sales Executive' ? 18 * 60 : 19 * 60
  const shift = role === 'Production Supervisor'
    ? '9:30 AM–7:30 PM'
    : role === 'Sales Executive'
      ? '10:00 AM–6:00 PM'
      : '10:00 AM–7:00 PM'

  if (!isWorkday) {
    return { state: 'off', message: 'Camera schedule is Monday–Saturday.', roomDate, minutesUntilShiftEnd: 0 }
  }
  if (minute >= BREAK_START && minute < BREAK_END) {
    return { state: 'break', message: 'Camera and recording pause for the 1:30–2:00 PM break.', roomDate, minutesUntilShiftEnd: end - minute }
  }
  if (minute < start || minute >= end) {
    return { state: 'off', message: `Scheduled hours: ${shift} IST, Monday–Saturday.`, roomDate, minutesUntilShiftEnd: 0 }
  }
  return { state: 'active', message: `Scheduled hours: ${shift} IST. Video only; microphone is disabled.`, roomDate, minutesUntilShiftEnd: end - minute }
}

export function cameraRoomName(now = new Date()) {
  return `staff-cameras-${cameraScheduleForRole('', now).roomDate}`
}
