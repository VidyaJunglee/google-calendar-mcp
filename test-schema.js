import { z } from 'zod';

const authParameterSchemas = {
  user_id: z.string().describe("User ID"),
  provider: z.enum(['google', 'microsoft']).describe("Provider")
};

const schema = z.object({
  ...authParameterSchemas,
  calendarId: z.string().describe("Calendar ID")
});

console.log('Schema shape:', schema.shape);
console.log('Keys:', Object.keys(schema.shape));
console.log('user_id in shape:', 'user_id' in schema.shape);
console.log('provider in shape:', 'provider' in schema.shape);
console.log('calendarId in shape:', 'calendarId' in schema.shape);
