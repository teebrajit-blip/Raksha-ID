import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const privateStorageDirectory = path.resolve(process.cwd(), "private-storage");

export async function storePrivateDocument(file: { buffer: Buffer; originalname: string }) {
  await mkdir(privateStorageDirectory, { recursive: true });
  const extension = path.extname(file.originalname).toLowerCase();
  const reference = `${randomUUID()}${extension}`;
  await writeFile(path.join(privateStorageDirectory, reference), file.buffer, { flag: "wx" });
  return { reference, hash: createHash("sha256").update(file.buffer).digest("hex") };
}

export async function readPrivateDocument(reference: string) {
  if (!/^[a-zA-Z0-9-]+\.(pdf|png|jpg|jpeg)$/.test(reference)) throw new Error("invalid storage reference");
  return readFile(path.join(privateStorageDirectory, reference));
}