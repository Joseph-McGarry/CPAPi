import * as Notifications from 'expo-notifications';

export function nextDueDate(lastReplacedIso: string, intervalDays: number, hour: number, minute: number): Date {
  const base = new Date(lastReplacedIso);
  const due = new Date(base);
  due.setDate(due.getDate() + intervalDays);
  due.setHours(hour, minute, 0, 0);
  if (due.getTime() <= Date.now()) {
    const n = new Date();
    n.setMinutes(n.getMinutes() + 1);
    return n;
  }
  return due;
}

export async function scheduleOneShotNotificationFor(
  title: string,
  body: string,
  when: Date
): Promise<string> {
  const trigger: Notifications.CalendarTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
    year: when.getFullYear(),
    month: when.getMonth() + 1,
    day: when.getDate(),
    hour: when.getHours(),
    minute: when.getMinutes(),
    second: 0,
    repeats: false,
  };
  return await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger });
}

export async function cancelNotification(id: string) {
  try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
}
