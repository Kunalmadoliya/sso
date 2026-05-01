import { readFileSync } from "node:fs";
import path from "node:path";

export const PRIVATE_KEY = process.env.PRIVATE_KEY!.replace(/\\n/g, "\n");
export const PUBLIC_KEY = process.env.PUBLIC_KEY!.replace(/\\n/g, "\n");