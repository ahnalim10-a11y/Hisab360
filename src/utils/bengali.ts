// Bengali digits map
const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export const bnNum = (n: number | string): string => {
  if (n === null || n === undefined) {
    return '০';
  }
  // Convert standard number to string without truncating decimals
  const numStr =
    typeof n === 'number'
      ? Number.isInteger(n)
        ? n.toString()
        : (Math.round(n * 1000) / 1000).toString()
      : n.toString();
  return numStr.replace(/\d/g, (d) => bengaliDigits[parseInt(d, 10)] || d);
};

export const formatMoney = (n: number): string => {
  const abs = Math.abs(Math.round(n));
  const formatted = abs.toLocaleString('en-IN');
  const bnFormatted = formatted.replace(/\d/g, (d) => bengaliDigits[parseInt(d, 10)] || d);
  return `${bnFormatted}৳`;
};

export const bengaliMonths = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

export const getTodayBengaliDate = (): string => {
  const d = new Date();
  const day = bnNum(d.getDate());
  const month = bengaliMonths[d.getMonth()];
  const year = bnNum(d.getFullYear());
  return `${day} ${month}, ${year}`;
};

export const formatDateToBengali = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = bnNum(d.getDate());
    const month = bengaliMonths[d.getMonth()];
    const year = bnNum(d.getFullYear());
    return `${day} ${month}, ${year}`;
  } catch {
    return dateStr;
  }
};

/**
 * Formats date into Bengali slash notation: DD/MM/YYYY (e.g. ০৭/১০/২০২৬)
 */
export const formatToBengaliSlashDate = (dateInput: string | Date): string => {
  if (!dateInput) return '';
  let d: Date;
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      d = new Date(year, month, day);
    } else {
      d = new Date(dateInput);
    }
  } else {
    d = dateInput;
  }

  if (isNaN(d.getTime())) return String(dateInput);

  const dayStr = String(d.getDate()).padStart(2, '0');
  const monthStr = String(d.getMonth() + 1).padStart(2, '0');
  const yearStr = String(d.getFullYear());

  return `${bnNum(dayStr)}/${bnNum(monthStr)}/${bnNum(yearStr)}`;
};

/**
 * Returns formatted period string as requested:
 * e.g. "অক্টোবর -২০২৬ (০৭/১০/২০২৬ হতে ০৮/১১/২০২৬)"
 */
export const getPeriodFormattedString = (
  monthIdx: number,
  year: number,
  startDateStr?: string,
  endDateStr?: string
): string => {
  const monthName = bengaliMonths[monthIdx] || bengaliMonths[0];
  const yearStr = bnNum(year);

  let startFormatted = '';
  let endFormatted = '';

  if (startDateStr && endDateStr) {
    startFormatted = formatToBengaliSlashDate(startDateStr);
    endFormatted = formatToBengaliSlashDate(endDateStr);
  } else {
    // Default 07/MM/YYYY to 08/MM+1/YYYY if not provided
    const m = monthIdx + 1;
    const mm = String(m).padStart(2, '0');
    const nextY = monthIdx === 11 ? year + 1 : year;
    const nextM = ((monthIdx + 1) % 12) + 1;
    const nextMm = String(nextM).padStart(2, '0');
    startFormatted = `${bnNum('07')}/${bnNum(mm)}/${yearStr}`;
    endFormatted = `${bnNum('08')}/${bnNum(nextMm)}/${bnNum(nextY)}`;
  }

  return `${monthName} -${yearStr} (${startFormatted} হতে ${endFormatted})`;
};

export const quotesList = [
  'টাকার যত্ন নিন, টাকা আপনার যত্ন নেবে।',
  'আয় বুঝে ব্যয় করুন, সঞ্চয়ে সমৃদ্ধি আনুন।',
  'ঋণমুক্ত জীবন সবচেয়ে বড় প্রশান্তির জীবন।',
  'ছোট ছোট সঞ্চয় ভবিষ্যতে বড় বিপদে সহায় হয়।',
  'অপ্রয়োজনীয় খরচ পরিহার করাই বুদ্ধিমানের কাজ।',
  'নিয়মিত হিসাব রাখলে পরিবারের ভবিষ্যৎ নিরাপদ থাকে।'
];

export const incomeCategories = ['বেতন', 'ব্যবসা', 'বোনাস', 'ভাড়া প্রাপ্তি', 'বিনিয়োগ', 'পাওনা হিসাব', 'ঋণ আদায়', 'অন্যান্য'];

export const expenseCategories = [
  'বাজার খরচ',
  'যাতায়াত',
  'খাবার ও রেস্তোরাঁ',
  'বাসা ভাড়া',
  'বিদ্যুৎ বিল',
  'গ্যাস বিল',
  'পানি ও ওয়াইফাই বিল',
  'চিকিৎসা ও ওষুধ',
  'কেনাকাটা ও পোশাক',
  'সন্তানের পড়াশোনা',
  'পরিবার বাবদ',
  'কিস্তি ও ঋণ',
  'দেনা হিসাব',
  'ঋণ পরিশোধ',
  'অন্যান্য'
];

export const getBengaliTimestamp = (date = new Date()): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours);

  const dStr = `${bnNum(day)}/${bnNum(month)}/${bnNum(year)}`;
  const tStr = `${bnNum(hoursStr)}:${bnNum(minutes)}:${bnNum(seconds)} ${ampm}`;
  return `${dStr}, ${tStr}`;
};
