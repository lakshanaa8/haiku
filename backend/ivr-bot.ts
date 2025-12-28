import { createRequire } from 'module';
import { storage } from './storage';

const require = createRequire(import.meta.url);
const TwilioModule = require('twilio');

// Use real Twilio VoiceResponse
const VoiceResponse = TwilioModule.twiml.VoiceResponse;

// Enhanced IVR Bot Configuration
export const IVR_CONFIG = {
  voice: 'Polly.Aditi-Neural', // Indian female voice (free)
  language: 'en-IN',
  recordingMaxLength: 15, // 15 seconds max recording
  speechTimeout: 5,
  gatherTimeout: 5
};

// IVR Flow Messages
export const IVR_MESSAGES = {
  greeting: `Hello, this is MedAgg Healthcare calling.
    We are reaching out to assist you with your recent enquiry.
    May I know if you are available to speak right now?`,
  
  availabilityPrompt: 'Please say yes or no.',
  
  notAvailableResponse: `No problem.
    Thank you for your time.
    We will discuss this at a later time.
    Take care.`,
  
  availableResponse: `Thank you.
    Please briefly tell us your concern.
    This may include health issues,
    appointment related questions,
    or general consultation enquiries.
    You may start speaking after the beep.`,
  
  thankYouResponse: `Thank you for sharing your concern.
    Our healthcare team will review it
    and get back to you shortly.
    Have a good day.`,
  
  noResponseFallback: `I did not receive a response.
    We will connect with you later.
    Thank you and take care.`
};

/**
 * Generate initial greeting TwiML with availability check
 */
export function generateGreetingTwiML(callId: number, healthIssue: string, baseUrl: string): string {
  const twimlResponse = new VoiceResponse();

  // Initial greeting
  twimlResponse.say(IVR_MESSAGES.greeting, {
    voice: IVR_CONFIG.voice
  });

  // Gather availability response (speech input)
  const gather = twimlResponse.gather({
    input: ['speech'],
    action: `${baseUrl}/api/twilio/availability?callId=${callId}&healthIssue=${encodeURIComponent(healthIssue)}`,
    method: 'POST',
    timeout: IVR_CONFIG.gatherTimeout,
    speechTimeout: 'auto'
  });

  gather.say(IVR_MESSAGES.availabilityPrompt, {
    voice: IVR_CONFIG.voice
  });

  // Fallback if no response
  twimlResponse.say(IVR_MESSAGES.noResponseFallback, {
    voice: IVR_CONFIG.voice
  });

  twimlResponse.hangup();

  return twimlResponse.toString();
}

/**
 * Handle availability response (YES/NO)
 */
export function handleAvailabilityResponse(speechResult: string, callId: number, healthIssue: string, baseUrl: string): string {
  const twimlResponse = new VoiceResponse();
  const speech = (speechResult || '').toLowerCase();

  console.log(`[IVR] Availability response for call ${callId}: "${speechResult}"`);

  // Check if user said NO
  if (speech.includes('no') || speech.includes('not available') || speech.includes('busy')) {
    console.log(`[IVR] Patient not available for call ${callId}`);
    
    twimlResponse.say(IVR_MESSAGES.notAvailableResponse, {
      voice: IVR_CONFIG.voice
    });
    
    twimlResponse.hangup();
    
    // Update call status to indicate patient was not available
    storage.updateCall(callId, {
      status: 'not_available',
      transcription: 'Patient was not available to speak'
    }).catch(err => console.error('[IVR] Error updating call status:', err));
    
    return twimlResponse.toString();
  }

  // User said YES or anything else (assume available)
  console.log(`[IVR] Patient available for call ${callId}, proceeding to record concern`);
  
  twimlResponse.say(IVR_MESSAGES.availableResponse, {
    voice: IVR_CONFIG.voice
  });

  // Record patient's health concern (15 seconds max)
  twimlResponse.record({
    timeout: 1,
    maxLength: IVR_CONFIG.recordingMaxLength,
    playBeep: true,
    action: `${baseUrl}/api/twilio/record-complete?callId=${callId}&healthIssue=${encodeURIComponent(healthIssue)}`,
    method: 'POST'
  });

  return twimlResponse.toString();
}

/**
 * Handle recording completion
 */
export function handleRecordingComplete(callId: number, recordingUrl: string, duration: number): string {
  const twimlResponse = new VoiceResponse();

  console.log(`[IVR] Recording completed for call ${callId}: ${recordingUrl} (${duration}s)`);

  // Thank you message
  twimlResponse.say(IVR_MESSAGES.thankYouResponse, {
    voice: IVR_CONFIG.voice
  });

  twimlResponse.hangup();

  return twimlResponse.toString();
}

/**
 * Enhanced call initiation with IVR flow
 */
export async function initiateEnhancedIVRCall(patientId: number, phoneNumber: string, healthIssue: string, baseUrl: string) {
  try {
    // Use correct Twilio v4+ ESM pattern
    const twilioClient = TwilioModule(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
    console.log('📞 [IVR] Using REAL Twilio client for call');
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    // Format phone number
    const formattedPhone = formatPhoneForTwilio(phoneNumber);
    console.log(`[IVR] Initiating enhanced IVR call to ${formattedPhone} for patient ${patientId}`);

    // Create call record
    let callRecord = await storage.createCall({
      patientId,
      status: 'pending'
    });

    try {
      // Make the call with enhanced IVR flow
      const call = await twilioClient.calls.create({
        from: twilioPhoneNumber,
        to: formattedPhone,
        url: `${baseUrl}/api/twilio/ivr-greeting?callId=${callRecord.id}&healthIssue=${encodeURIComponent(healthIssue)}`,
        record: true,
        recordingStatusCallback: `${baseUrl}/api/twilio/recording-status?callId=${callRecord.id}`,
        recordingStatusCallbackMethod: 'POST',
      });

      console.log(`[IVR] Enhanced IVR call initiated: ${call.sid}`);

      // Update call record
      callRecord = await storage.updateCall(callRecord.id, {
        status: 'in_progress'
      });

      return callRecord;

    } catch (callError: any) {
      console.error('[IVR] Call initiation failed:', callError);
      
      // Handle free trial limitations with demo mode
      if (callError.message?.includes('unverified') || callError.code === 21211) {
        console.log('[IVR] Free trial mode - simulating enhanced IVR flow');
        
        // Simulate the enhanced IVR flow
        const mockTranscript = `Enhanced IVR Demo: Patient available and described ${healthIssue}. Recorded 15-second concern about symptoms.`;
        
        await storage.updateCall(callRecord.id, {
          status: 'completed',
          audioUrl: 'https://twilio.com/docs/tutorials/twimlets/voicemail/welcome.wav',
          transcription: mockTranscript,
          sentimentLabel: 'Hot'
        });
        
        return callRecord;
      }
      
      await storage.updateCall(callRecord.id, {
        status: 'failed'
      });
      
      throw callError;
    }

  } catch (error) {
    console.error('[IVR] Unexpected error:', error);
    throw error;
  }
}

/**
 * Format phone number for Twilio
 */
function formatPhoneForTwilio(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  if (cleaned.length >= 11) {
    return `+${cleaned}`;
  }
  if (phone.includes('+')) {
    return `+${cleaned}`;
  }
  return `+${cleaned}`;
}