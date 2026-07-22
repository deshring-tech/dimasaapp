// Parse stored hours JSON and figure out if a business is open right now.
//
// Hours format:  { mon: "9am–6pm", tue: "9:00–18:00", wed: "Closed", ... }
// Days:          mon, tue, wed, thu, fri, sat, sun
//
// Returns:  { isOpen: boolean, label: string, tone: "open"|"closed"|"unknown" }

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const NEXT_DAY_LABEL = { sun: "Mon", mon: "Tue", tue: "Wed", wed: "Thu", thu: "Fri", fri: "Sat", sat: "Sun" };

// Parse a time expression like "9am", "9:30pm", "18:00", "9" → minutes since midnight.
function parseTime(str) {
  if (!str) return null;
  const s = String(str).trim().toLowerCase().replace(/\s+/g, "");

  // "9pm", "9:30am"
  const ampm = s.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = ampm[2] ? parseInt(ampm[2], 10) : 0;
    if (ampm[3] === "pm" && h < 12) h += 12;
    if (ampm[3] === "am" && h === 12) h = 0;
    return h * 60 + m;
  }

  // "18:00", "9:30", "9"
  const twentyFour = s.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (twentyFour) {
    const h = parseInt(twentyFour[1], 10);
    const m = twentyFour[2] ? parseInt(twentyFour[2], 10) : 0;
    if (h > 23 || m > 59) return null;
    return h * 60 + m;
  }

  return null;
}

// Parse a range like "9am–6pm", "9:00-18:00", "closed", "24 hours"
function parseRange(str) {
  if (!str) return null;
  const s = String(str).trim().toLowerCase();
  if (s === "closed" || s === "closed today" || s === "-") return { closed: true };
  // Always-open shortcuts
  if (["24 hours", "24hours", "24/7", "24x7", "always open", "always"].includes(s)) {
    return { alwaysOpen: true };
  }

  // Normalize dash variants
  const norm = s.replace(/[–—−~to]/g, "-").replace(/\s+/g, "");
  const parts = norm.split("-");
  if (parts.length < 2) return null;

  const start = parseTime(parts[0]);
  const end   = parseTime(parts[parts.length - 1]);
  if (start === null || end === null) return null;
  return { start, end };
}

function safeParseHours(hours) {
  if (!hours) return null;
  try {
    return typeof hours === "string" ? JSON.parse(hours) : hours;
  } catch {
    return null;
  }
}

// Format minutes-since-midnight back into a friendly string
function fmt(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "pm" : "am";
  const hh = ((h % 12) || 12);
  return m === 0 ? `${hh}${ampm}` : `${hh}:${String(m).padStart(2, "0")}${ampm}`;
}

export function getOpenStatus(hoursData, now = new Date()) {
  const hours = safeParseHours(hoursData);
  if (!hours) return { isOpen: false, label: "See hours", tone: "unknown" };

  const dayKey = DAY_KEYS[now.getDay()];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const today = parseRange(hours[dayKey]);
  if (today?.alwaysOpen) {
    return { isOpen: true, label: "Open 24 hours", tone: "open" };
  }
  if (today?.closed) {
    // Find the next open day
    for (let i = 1; i <= 7; i++) {
      const nextKey = DAY_KEYS[(now.getDay() + i) % 7];
      const nextRange = parseRange(hours[nextKey]);
      if (nextRange && !nextRange.closed) {
        return {
          isOpen: false,
          label: `Closed · opens ${i === 1 ? NEXT_DAY_LABEL[dayKey] : NEXT_DAY_LABEL[nextKey === "sun" ? "sat" : DAY_KEYS[DAY_KEYS.indexOf(nextKey) - 1]]} ${fmt(nextRange.start)}`,
          tone: "closed",
        };
      }
    }
    return { isOpen: false, label: "Closed", tone: "closed" };
  }

  if (!today) return { isOpen: false, label: "See hours", tone: "unknown" };

  // Handle "9am-2am" (past midnight)
  const opensBeforeCloses = today.end > today.start;

  const isOpen = opensBeforeCloses
    ? nowMinutes >= today.start && nowMinutes < today.end
    : nowMinutes >= today.start || nowMinutes < today.end;

  if (isOpen) {
    const closesAt = today.end;
    const minutesLeft = opensBeforeCloses
      ? closesAt - nowMinutes
      : (closesAt + 24 * 60 - nowMinutes) % (24 * 60);
    if (minutesLeft < 60) {
      return { isOpen: true, label: `Open · closes in ${minutesLeft}m`, tone: "open" };
    }
    return { isOpen: true, label: `Open · closes ${fmt(closesAt)}`, tone: "open" };
  }

  // Not open yet today — will open later
  if (nowMinutes < today.start) {
    return { isOpen: false, label: `Closed · opens ${fmt(today.start)}`, tone: "closed" };
  }

  // Closed for the day
  return { isOpen: false, label: `Closed`, tone: "closed" };
}
