import * as path from 'node:path';
import * as fs from 'node:fs';

export function getAbsolutePath(rawPath: string): string {
  return path.join(process.cwd(), ...rawPath.trim().split('/'));
}

export async function getFiles(dir: string): Promise<string[]> {
  const dirents = fs.readdirSync(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map((dirent) => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getFiles(res) : res;
    })
  );
  return ([] as string[]).concat(...files);
}

export function getTimeStamp(): string {
  const myStamp = new Date();
  const hours = myStamp.getHours().toLocaleString('en-US', { minimumIntegerDigits: 2 });
  const minutes = myStamp.getMinutes().toLocaleString('en-US', { minimumIntegerDigits: 2 });
  const seconds = myStamp.getSeconds().toLocaleString('en-US', { minimumIntegerDigits: 2 });
  const millis = myStamp.getMilliseconds().toLocaleString('en-US', { minimumIntegerDigits: 3 });
  return `${hours}:${minutes}:${seconds}.${millis}`;
}
