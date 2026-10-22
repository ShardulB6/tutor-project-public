import * as fileSchema from "./file-schema.ts";
import * as schema from "./schema.ts";
import * as studioSchema from "./studio.schema.ts";

export const dbSchema = { ...schema, ...fileSchema, ...studioSchema };
