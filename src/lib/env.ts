import * as z from "zod";

const envSchema = z.object({
  // Oauth
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
});

export const env = envSchema.parse(process.env);
