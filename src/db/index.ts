import { drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";
import { dbSchema } from "./db-schema.ts";

export const db = drizzle(env.DB, { schema: dbSchema });
