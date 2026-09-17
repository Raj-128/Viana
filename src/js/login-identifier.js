const NORMAL_KEY = "studioLoginIdentifier";
const ADMIN_KEY = "studioAdminLoginIdentifier";

const validIdentifier = (value) => typeof value === "string" &&
  (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) || /^\+?[\d\s()-]{10,20}$/.test(value.trim()));

export function rememberLoginIdentifier(storage, user, identifier = user?.email) {
  if (!validIdentifier(identifier)) return;
  try {
    storage.setItem(NORMAL_KEY, identifier.trim());
    if (user?.role === "admin") storage.setItem(ADMIN_KEY, identifier.trim());
  } catch { /* Remembering an identifier is optional; login must still work. */ }
}

export function getLoginIdentifier(storage, { admin = false, session = null } = {}) {
  if (session && (!admin || session.role === "admin") && validIdentifier(session.email)) return session.email;
  try {
    const remembered = storage.getItem(admin ? ADMIN_KEY : NORMAL_KEY);
    if (validIdentifier(remembered)) return remembered.trim();
    // Reuse only an identifier from the old browser account, never its credentials or role as authorization.
    const previous = JSON.parse(storage.getItem("studioVianaSession") || "null");
    if (previous && (!admin || previous.role === "admin")) {
      if (validIdentifier(previous.email)) return previous.email;
      if (validIdentifier(previous.phone)) return previous.phone;
    }
    if (admin) {
      const users = JSON.parse(storage.getItem("studioVianaUsers") || "[]");
      const owners = Array.isArray(users) ? users.filter((user) => user?.role === "admin") : [];
      if (owners.length === 1 && validIdentifier(owners[0].email)) return owners[0].email;
    }
  } catch { /* Empty field when storage is unavailable or invalid. */ }
  return "";
}
