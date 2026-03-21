import fs from 'node:fs/promises';
import path from 'node:path';

export async function ensureFile(filePath, defaultValue) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
  }
}

export async function readJson(filePath, defaultValue) {
  await ensureFile(filePath, defaultValue);
  const raw = await fs.readFile(filePath, 'utf-8');

  if (!raw.trim()) {
    return defaultValue;
  }

  return JSON.parse(raw);
}

export async function writeJson(filePath, value) {
  await ensureFile(filePath, value);
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8');
}
