import { writeFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

// Publish a complete file in one rename so Vite never reads a partial module.
export async function atomicWrite(file, content) {
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, content);
    for (let attempt = 0; ; attempt++) {
      try { await rename(temporary, file); break; }
      catch (error) {
        // Windows readers/virus scanners can briefly hold the destination open.
        if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt >= 20) throw error;
        await delay(25 * (attempt + 1));
      }
    }
  } finally {
    await rm(temporary, { force: true });
  }
}
