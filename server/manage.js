import { createApi } from "./api.js";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { copyFile, realpath } from "node:fs/promises";
import { resolve, extname } from "node:path";

const api = createApi();
try {
  const [command, email, designId, source] = process.argv.slice(2);
  if (command === "admin" || command === "reset-admin") {
    let hidden = false;
    const output = new Writable({ write(chunk, encoding, callback) { if (!hidden) process.stdout.write(chunk); callback(); } });
    const prompt = createInterface({ input: process.stdin, output, terminal: true });
    try {
      const name = command === "admin" ? await prompt.question("Owner name: ") : "";
      const ownerEmail = await prompt.question(command === "admin" ? "Owner email: " : "Existing owner email or phone: ");
      const phone = command === "admin" ? await prompt.question("Owner phone: ") : "";
      process.stdout.write("Password (10+ characters; hidden): ");
      hidden = true;
      const password = await prompt.question("");
      hidden = false; process.stdout.write("\n");
      process.stdout.write("Confirm password (hidden): ");
      hidden = true;
      const confirmation = await prompt.question("");
      hidden = false; process.stdout.write("\n");
      if (password !== confirmation) throw new Error("Passwords do not match. Nothing was changed.");
      if (command === "admin") {
        await api.createUser({ name, email: ownerEmail, phone, password }, "admin");
        console.log("Owner account created. Sign in through admin-login.html.");
      } else {
        await api.resetAdminPassword(ownerEmail, password);
        console.log("Admin password updated; existing admin sessions signed out. Type the new password on either login page and update your browser's saved password.");
      }
    } finally { prompt.close(); }
  } else if (command === "grant") {
    if (!email || !/^[a-z0-9-]+$/.test(designId || "") || !source) throw new Error("Usage: npm run server:grant -- customer@email.com design-id path/to/original.jpg");
    const user = api.db.prepare("SELECT id FROM users WHERE email=?").get(email.toLowerCase());
    if (!user) throw new Error("Customer must register through the website first.");
    const extension = extname(source).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp", ".avif"].includes(extension)) throw new Error("Use a JPG, PNG, WebP or AVIF file.");
    const existing = api.db.prepare("SELECT file FROM designs WHERE id=?").get(designId);
    if (!existing) {
      const file = `${designId}${extension}`;
      await copyFile(await realpath(source), resolve(api.filesRoot, file), 1);
      api.db.prepare("INSERT INTO designs VALUES (?,?)").run(designId, file);
    }
    api.db.prepare("INSERT OR IGNORE INTO entitlements VALUES (?,?)").run(user.id, designId);
    console.log("Download access granted. The customer can now use the download button.");
  } else if (command === "revoke") {
    const user = api.db.prepare("SELECT id FROM users WHERE email=?").get(email?.toLowerCase() || "");
    if (!user || !designId) throw new Error("Usage: npm run server:revoke -- customer@email.com design-id");
    api.db.prepare("DELETE FROM entitlements WHERE user_id=? AND design_id=?").run(user.id, designId);
    console.log("Download access revoked.");
  } else throw new Error("Choose admin, reset-admin, grant or revoke.");
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { api.close(); }
