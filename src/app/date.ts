export function parseArDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const parsed = new Date(`${iso}T12:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === iso ? iso : null;
}

export function formatArDate(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  const iso = `${year}-${month}-${day}`;
  return parseArDate(`${day}/${month}/${year}`) === iso ? `${day}/${month}/${year}` : value;
}

export function overdueDates(goals: { date: string }[], reports: { date: string }[], today: string, localTime: string, closeTime: string): string[] {
  const reported = new Set(reports.map(report => report.date));
  return [...new Set(goals.filter(goal => (goal.date < today || (goal.date === today && localTime >= closeTime.slice(0, 5))) && !reported.has(goal.date)).map(goal => goal.date))].sort().reverse();
}
