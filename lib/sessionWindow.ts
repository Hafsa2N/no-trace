// The single definition of "is this feedback session currently open" — used
// at every point that must gate on it (OTP request, OTP verify, feedback
// submission) so the rule lives in exactly one place, not three copies that
// could silently drift out of sync. `sessions.closes_at` is the only
// authoritative expiry boundary in this system; nothing else (a token, an
// OTP) carries its own separate expiry that could disagree with it.
export function isSessionOpen(opensAt: string | Date, closesAt: string | Date, now: Date = new Date()): boolean {
  const opens = opensAt instanceof Date ? opensAt : new Date(opensAt);
  const closes = closesAt instanceof Date ? closesAt : new Date(closesAt);
  return now >= opens && now <= closes;
}
