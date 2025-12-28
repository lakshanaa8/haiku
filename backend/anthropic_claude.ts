import { storage } from './storage';

export async function performSentimentAnalysis(callId: number, healthIssue: string) {
  console.log(`[AI Analysis] Starting sentiment analysis for call ${callId}`);
  
  // Demo mode transcript for testing
  const mockTranscript = "i am a patient suffering from severe chest pain and anxiety";
  
  // Perform AI sentiment analysis
  let sentimentLabel: "Hot" | "Non-hot" = "Hot"; // Default fallback
  
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic.default({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || 'dummy-key',
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: `Classify the following medical call transcript as "Hot" (urgent/high severity) or "Non-hot" (routine). Respond with ONLY "Hot" or "Non-hot".
        
        Transcript: "${mockTranscript}"`
      }],
    });

    const textContent = response.content[0]?.type === 'text' ? response.content[0].text : '';
    sentimentLabel = textContent.includes('Hot') ? 'Hot' : 'Non-hot';
    console.log(`[AI Analysis] Analysis complete: ${sentimentLabel}`);
  } catch (error) {
    console.error('[AI Analysis] AI Analysis failed:', error);
    sentimentLabel = 'Hot'; // Fallback for medical safety
  }
  
  // Update call record with analysis results
  const callRecord = await storage.updateCall(callId, {
    status: 'completed',
    audioUrl: 'https://twilio.com/docs/tutorials/twimlets/voicemail/welcome.wav',
    transcription: `Demo call - Patient called regarding ${healthIssue}. (Free trial mode - actual call requires verified numbers)`,
    sentimentLabel
  });
  
  console.log(`[AI Analysis] Call ${callId} updated with status: ${callRecord.status}, sentiment: ${callRecord.sentimentLabel}`);
  return callRecord;
}
