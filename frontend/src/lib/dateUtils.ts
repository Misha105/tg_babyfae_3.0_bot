import { differenceInYears, differenceInMonths, differenceInWeeks, differenceInDays, addYears, addMonths, addWeeks, startOfDay, intervalToDuration } from 'date-fns';
import type { TFunction } from 'i18next';

export const formatPreciseTimeAgo = (date: Date, t: TFunction): string => {
  const now = new Date();
  if (date > now) return t('time.just_now');

  const duration = intervalToDuration({ start: date, end: now });
  const { days = 0, hours = 0, minutes = 0 } = duration;

  // Less than 1 minute
  if (days === 0 && hours === 0 && minutes === 0) {
    return t('time.just_now');
  }

  const parts: string[] = [];

  if (days > 0) {
    parts.push(t('time.days', { count: days }));
  }

  if (hours > 0) {
    parts.push(t('time.hours', { count: hours }));
  }

  if (minutes > 0) {
    // If we have days, we might skip minutes to keep it short? 
    // User asked for "5 hours 23 min", so hours + minutes is fine.
    // If we have days + hours + minutes, it might be too long.
    // Let's limit to top 2 units.
    if (parts.length < 2) {
        parts.push(t('time.minutes_short', { count: minutes }));
    }
  }

  return `${parts.join(' ')} ${t('time.ago')}`;
};

export const formatBabyAge = (birthDate: Date, t: TFunction, referenceDate: Date = new Date()) => {
  // Normalize dates to start of day to avoid time-based discrepancies
  const start = startOfDay(birthDate);
  const end = startOfDay(referenceDate);
  
  if (end < start) {
    return t('age.days', { count: 0 });
  }

  const years = differenceInYears(end, start);
  const dateAfterYears = addYears(start, years);
  
  const months = differenceInMonths(end, dateAfterYears);
  const dateAfterMonths = addMonths(dateAfterYears, months);
  
  // Logic for detailed age display
  
  // Case 1: >= 1 year
  if (years > 0) {
    // "1 year and 2 months"
    if (months === 0) {
      return t('age.years', { count: years });
    }
    return `${t('age.years', { count: years })} ${t('common.and')} ${t('age.months', { count: months })}`;
  }
  
  // Case 2: < 1 year, >= 1 month
  if (months > 0) {
    // "1 month and 29 days" (Avoid weeks here to prevent "1 month and 4 weeks")
    const daysAfterMonths = differenceInDays(end, dateAfterMonths);
    
    if (daysAfterMonths === 0) {
      return t('age.months', { count: months });
    }
    return `${t('age.months', { count: months })} ${t('common.and')} ${t('age.days', { count: daysAfterMonths })}`;
  }
  
  // Case 3: < 1 month
  const weeks = differenceInWeeks(end, start);
  const dateAfterWeeks = addWeeks(start, weeks);
  const daysAfterWeeks = differenceInDays(end, dateAfterWeeks);
  
  if (weeks > 0) {
    // "2 weeks and 3 days"
    if (daysAfterWeeks === 0) {
      return t('age.weeks', { count: weeks });
    }
    return `${t('age.weeks', { count: weeks })} ${t('common.and')} ${t('age.days', { count: daysAfterWeeks })}`;
  }
  
  // Case 4: < 1 week
  const totalDays = differenceInDays(end, start);
  if (totalDays === 0) {
    return t('age.days', { count: 0 });
  }
  return t('age.days', { count: totalDays });
};

export const createDateFromInput = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};
