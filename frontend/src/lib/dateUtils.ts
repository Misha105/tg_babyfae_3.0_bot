import { differenceInYears, differenceInMonths, differenceInWeeks, differenceInDays, addYears, addMonths, addWeeks, startOfDay } from 'date-fns';
import type { TFunction } from 'i18next';

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
