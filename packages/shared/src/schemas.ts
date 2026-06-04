import { z } from "zod";

// Key-value input fed to a tool when the agent calls it
export const toolInputSchema = z.record(z.string(), z.json());
export type ToolInput = z.infer<typeof toolInputSchema>;

// A single typed block of content within a stored message
export const messageBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("reasoning"), text: z.string() }),
  z.object({
    type: z.literal("tool-use"),
    id: z.string(),
    name: z.string(),
    input: toolInputSchema,
    result: z.string().optional(),
  }),
  z.object({ type: z.literal("text"), text: z.string() }),
]);

export type MessageBlock = z.infer<typeof messageBlockSchema>;

// The full content of a stored message — an ordered list of blocks
export const messageContentSchema = z.array(messageBlockSchema);
export type MessageContent = z.infer<typeof messageContentSchema>;

// A single event emitted during the agent's response stream
export const agentStreamEventSchema = z.discriminatedUnion("type", [
  // Deltas are streaming chunks, incrementally arriving over time
  z.object({ type: z.literal("text-delta"), text: z.string() }),
  z.object({ type: z.literal("reasoning-delta"), text: z.string() }),
  z.object({
    type: z.literal("tool-input"),
    toolCallId: z.string(),
    toolName: z.string(),
    input: toolInputSchema,
  }),
  z.object({
    type: z.literal("tool-output"),
    toolCallId: z.string(),
    result: z.string(),
  }),
  z.object({
    type: z.literal("done"),
    messageId: z.string(),
    durationMs: z.number(),
  }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);

export type AgentStreamEvent = z.infer<typeof agentStreamEventSchema>;
