import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function analyzeDisaster(report: string, language: string) {
  const prompt = `You are a disaster response AI.
Respond in ${language} ONLY. NO ENGLISH.

Analyze the report and return ONLY JSON:
{
  "severity": number (1-10),
  "resources": ["food","medical","shelter"],
  "priority": "low|medium|high",
  "message": "Explain in ${language}"
}

Report: "${report}"`;

  const rawResult = await generateContent(prompt);
  try {
    const jsonMatch = rawResult.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
    }
    return JSON.parse(rawResult);
  } catch (e) {
    console.error("Failed to parse JSON from AI response:", rawResult);
    return {
      severity: 5,
      resources: [],
      priority: "medium",
      message: rawResult
    };
  }
}

export async function chatbot(query: string, language: string) {
  const prompt = `You are ReliefRoute's high-intelligence disaster management assistant.
Your goal is to be fully responsive, helpful, and provide clear guidance on ANY query while maintaining a professional coordinator persona.

Current Context:
- Language: ${language}
- Mode: Field Support

Instructions:
1. Respond in ${language} ONLY. 
2. If the user asks about relief operations, provide specific, actionable advice.
3. If the user asks general questions, stay helpful but bring it back to relief/safety if possible.
4. Keep responses concise but comprehensive.

User Query: "${query}"`;

  return await generateContent(prompt);
}

export async function generateJustifications(plan: any, zones: any[], language: string) {
  const prompt = `You are ReliefRoute's allocation advisor. 
Respond in ${language} ONLY.

For each zone assignment, write a 2-sentence plain-language justification.
Be honest about trade-offs.

Return ONLY JSON matching this schema:
{ "justifications": [ { "zoneId": "string", "justification": "string" } ] }

Plan: ${JSON.stringify(plan)}
Zones: ${JSON.stringify(zones.map(z => ({ id: z.id, name: z.name, severity: z.severityScore })))}`;

  const rawResult = await generateContent(prompt);
  try {
    const jsonMatch = rawResult.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const cleanText = jsonMatch ? jsonMatch[1] : rawResult.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanText);
    
    const justificationMap = new Map();
    if (result.justifications) {
      result.justifications.forEach((j: any) => justificationMap.set(j.zoneId, j.justification));
    }

    const updatedAllocations = plan.zoneAllocations.map((alloc: any) => ({
      ...alloc,
      justification: justificationMap.get(alloc.zoneId) || (language === 'hi' ? 'एआई औचित्य अनुपलब्ध है।' : 'AI justification unavailable.')
    }));

    return { ...plan, zoneAllocations: updatedAllocations, generatedBy: 'ai' };
  } catch (e) {
    console.error("Justification parsing failed:", e);
    return { ...plan, generatedBy: 'ai-unverified' };
  }
}

export async function runEquityAudit(plan: any, language: string) {
  const prompt = `Analyze this allocation plan for systematic bias.
Respond in ${language} ONLY.

Flag any zone that received less than 40% of its calculated need AND has roadAccessibility < 5.
Return ONLY JSON:
{ 
  "flaggedZones": [{"zoneId": "string", "reason": "string", "suggestedCorrection": "string"}],
  "overallEquityScore": number (0.0 to 1.0)
}

Plan: ${JSON.stringify(plan)}`;

  const rawResult = await generateContent(prompt);
  try {
    const jsonMatch = rawResult.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const cleanText = jsonMatch ? jsonMatch[1] : rawResult.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Equity audit parsing failed:", e);
    return { flaggedZones: [], overallEquityScore: 1.0 };
  }
}

const sessionHistories: Record<string, any[]> = {};

export async function conversationalReallocate(sessionId: string, userMessage: string, currentPlan: any, zones: any[], depots: any[], language: string) {
  if (!sessionHistories[sessionId]) sessionHistories[sessionId] = [];
  
  const prompt = `You are ReliefRoute's conversational reallocation assistant.
Respond in ${language} ONLY.

Context:
Zones: ${JSON.stringify(zones)}
Depots: ${JSON.stringify(depots)}
Current Plan: ${JSON.stringify(currentPlan)}

Task:
1. Acknowledge the user's request.
2. Provide revised allocations if needed.
3. Provide an equity check.

Return ONLY JSON:
{
  "acknowledgment": "string in ${language}",
  "revisedAllocations": [ { "zoneId": "string", "assignedResources": { "food": 0, "medicine": 0, "shelterKits": 0, "rescueTeams": 0 }, "justification": "string in ${language}" } ],
  "equityCheck": "string in ${language}"
}

User Message: "${userMessage}"`;

  sessionHistories[sessionId].push({ role: 'user', parts: [{ text: userMessage }] });

  try {
    const rawResult = await generateContent(prompt);
    const jsonMatch = rawResult.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const cleanText = jsonMatch ? jsonMatch[1] : rawResult.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanText);
    sessionHistories[sessionId].push({ role: 'model', parts: [{ text: rawResult }] });
    return result;
  } catch (e) {
    console.error("Reallocation parsing failed:", e);
    throw new Error('Failed to process reallocation via AI.');
  }
}

async function generateContent(prompt: string): Promise<string> {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    throw error;
  }
}
