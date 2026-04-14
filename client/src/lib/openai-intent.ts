import OpenAI from "openai";

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey, dangerouslyAllowBrowser: true }) : null;

export async function extractIntentWithOpenAI(text: string) {
  // Check if OpenAI is available
  if (!openai || !apiKey) {
    console.log("[OpenAI] API key not configured, skipping AI extraction");
    return null;
  }
  const prompt = `
You are an intent extraction engine for a behavioral commitment app. 
Given a user’s freeform sentence, extract the following as JSON:
- intent: The core intent or goal (short phrase)
- action: The main action verb (infinitive)
- object: The main object of the action (if any)
- time: When (date, time, or general period, if present)
- frequency: How often (if present)
- people: Who is involved (if present)
- context: Any extra context or motivation

Example input: "I want to run 5k with my friend every Saturday morning."
Example output:
{
  "intent": "run 5k",
  "action": "run",
  "object": "5k",
  "time": "Saturday morning",
  "frequency": "weekly",
  "people": "my friend",
  "context": ""
}

Input: "${text}"
Output:
`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 150,
    temperature: 0,
  });

  // Parse the JSON from the response
  const content = response.choices[0].message.content;
  const match = content?.match(/{[\s\S]*}/);
  if (match) {
    return JSON.parse(match[0]);
  }
  return null;
}
