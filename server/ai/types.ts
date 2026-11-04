export type ChatMessage = { role: "user" | "assistant"; content: string };
export type Completion = { text: string; inputTokens: number; outputTokens: number; model: string };
export interface AIProvider {
  readonly name: "local" | "anthropic" | "openai";
  complete(input: { system: string; context: string; messages: ChatMessage[]; locale: "en" | "ar" }): Promise<Completion>;
}
