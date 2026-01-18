export const extract_date_time_from_description = (description: string): Date | null => {
  const date_time_pattern = /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/;
  const match = description.match(date_time_pattern);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const hours = parseInt(match[4], 10);
    const minutes = parseInt(match[5], 10);
    const seconds = parseInt(match[6], 10);
    
    const date = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
};

export const parse_date = (date_str: string | null | undefined): Date => {
  if (!date_str) {
    throw new Error("Date is required");
  }

  const date_str_trimmed = String(date_str).trim();
  if (!date_str_trimmed) {
    throw new Error("Date cannot be empty");
  }

  const dash_date_time_pattern = /(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/;
  const dash_date_time_match = date_str_trimmed.match(dash_date_time_pattern);
  if (dash_date_time_match) {
    const day = parseInt(dash_date_time_match[1], 10);
    const month = parseInt(dash_date_time_match[2], 10) - 1;
    const year = parseInt(dash_date_time_match[3], 10);
    const hours = parseInt(dash_date_time_match[4], 10);
    const minutes = parseInt(dash_date_time_match[5], 10);
    const seconds = parseInt(dash_date_time_match[6], 10);
    
    const date = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  const dash_date_pattern = /(\d{2})-(\d{2})-(\d{4})$/;
  const dash_date_match = date_str_trimmed.match(dash_date_pattern);
  if (dash_date_match) {
    const day = parseInt(dash_date_match[1], 10);
    const month = parseInt(dash_date_match[2], 10) - 1;
    const year = parseInt(dash_date_match[3], 10);
    
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  const slash_date_time_pattern = /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/;
  const slash_date_time_match = date_str_trimmed.match(slash_date_time_pattern);
  if (slash_date_time_match) {
    const day = parseInt(slash_date_time_match[1], 10);
    const month = parseInt(slash_date_time_match[2], 10) - 1;
    const year = parseInt(slash_date_time_match[3], 10);
    const hours = parseInt(slash_date_time_match[4], 10);
    const minutes = parseInt(slash_date_time_match[5], 10);
    const seconds = parseInt(slash_date_time_match[6], 10);
    
    const date = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  const date = new Date(date_str_trimmed);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${date_str}`);
  }

  return date;
};

export const format_date_detailed = (date_string: string | null): string => {
  if (!date_string) return "Unknown date";
  const date = new Date(date_string);
  if (isNaN(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
};


export function formatTimeIST(isoDate: string) {
  return new Date(isoDate).toLocaleTimeString("en-US", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatDateIST(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}


