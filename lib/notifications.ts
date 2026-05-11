export function nextDueDate(lastReplacedIso: string, intervalDays: number, hour: number, minute: number): Date {
  const base = new Date(lastReplacedIso);
  const due = new Date(base);
  due.setDate(due.getDate() + intervalDays);
  due.setHours(hour, minute, 0, 0);
  return due;
}
