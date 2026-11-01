import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../app/chatgpt-auth";
export type BackendBindings = Cloudflare.Env & {
  OPENAI_API_KEY?: string; OPENAI_MODEL?: string;
  CEREBRAS_API_KEY?: string; CEREBRAS_MODEL?: string;
  EXA_API_KEY?: string; STAFF_USER_IDS?: string;
};
export function bindings(): BackendBindings { return env as BackendBindings; }
export async function identity() { return getChatGPTUser(); }
