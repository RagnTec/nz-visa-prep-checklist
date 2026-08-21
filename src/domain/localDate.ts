export interface LocalDate {
  year: number;
  month: number;
  day: number;
}

const localDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return isLeapYear ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function parseLocalDate(value: unknown): LocalDate | null {
  if (typeof value !== 'string') return null;

  const match = localDatePattern.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null;
  }

  return { year, month, day };
}

export function localDateFromDate(value: Date): LocalDate {
  return {
    year: value.getFullYear(),
    month: value.getMonth() + 1,
    day: value.getDate()
  };
}

export function compareLocalDates(left: LocalDate, right: LocalDate): number {
  if (left.year !== right.year) return left.year - right.year;
  if (left.month !== right.month) return left.month - right.month;
  return left.day - right.day;
}

export function addCalendarMonths(value: LocalDate, months: number): LocalDate {
  const monthIndex = value.year * 12 + value.month - 1 + months;
  const year = Math.floor(monthIndex / 12);
  const month = monthIndex - year * 12 + 1;

  return {
    year,
    month,
    day: Math.min(value.day, daysInMonth(year, month))
  };
}
