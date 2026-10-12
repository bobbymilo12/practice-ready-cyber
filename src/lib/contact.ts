import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100),
  email: z.string().trim().email("Enter a valid email address.").max(255),
  practice: z.string().trim().max(120).optional().default(""),
  message: z.string().trim().min(1, "Enter a message.").max(2000),
  website: z.string().max(200).optional().default(""),
});
type ContactRow = { name: string; email: string; message: string };
interface ContactDatabase {
  from(table: "contact_messages"): {
    insert(row: ContactRow): PromiseLike<{ error: unknown }>;
  };
}
export async function persistContact(input: unknown, database: ContactDatabase) {
  const data = contactSchema.parse(input);
  if (data.website) throw new Error("Your message could not be sent. Please try again.");
  // Keep the existing table and its 2,000-character limit. No new message store.
  const message = data.practice ? `GP practice: ${data.practice}\n\n${data.message}` : data.message;
  if (message.length > 2000) throw new Error("Please shorten your message.");
  const { error } = await database
    .from("contact_messages")
    .insert({ name: data.name, email: data.email, message });
  if (error) throw new Error("Your message could not be sent. Please try again.");
  return { success: true as const };
}
