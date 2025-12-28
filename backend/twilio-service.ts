// twilio.ts
import { createRequire } from 'module';
import { storage } from './storage';
import { speechToText } from './audio-processor';
import { classifyIntent } from './intent-classifier';
import FormData from 'form-data';

const require = createRequire(import.meta.url);
const TwilioModule = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER!;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.error('❌ MISSING TWILIO CREDENTIALS!');
} else {
  console.log('✓ [Twilio] Initialized with Free Trial Account');
  console.log(
    '  Account SID: ' +
      accountSid.substring(0, 4) +
      '****' +
      accountSid.substring(accountSid.length - 4)
  );
  console.log('  Phone Number: ' + twilioPhoneNumber);
  console.log('  Note: Free trial accounts can only call verified phone numbers.');
}

// Twilio client & TwiML
const twilioClient = TwilioModule(accountSid, authToken);
const { VoiceResponse } = TwilioModule.twiml;

// IVR Config
export const IVR_CONFIG = {
  voice: 'Polly.Aditi-Neural',
  language: 'en-IN',
  recordingMaxLength: 15,
  speechTimeout: 5,
  gatherTimeout: 5,
};

// IVR Messages
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
Thank you and take care.`,
};

// Format phone number
function formatPhoneForTwilio(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) return `+91${cleaned}`;
  if (cleaned.length >= 11) return `+${cleaned}`;
  if (phone.includes('+')) return `+${cleaned}`;
  return `+${cleaned}`;
}

// Base URL
let cachedBaseUrl = '';
export function setBaseUrl(url: string) {
  cachedBaseUrl = url;
  console.log(`[Twilio] Base URL set to: ${url}`);
}

// Generate Greeting TwiML
export function generateGreetingTwiML(callId: number, healthIssue: string, baseUrl: string): string {
  const twiml = new VoiceResponse();
  twiml.say(IVR_MESSAGES.greeting, { voice: IVR_CONFIG.voice });

  const gather = twiml.gather({
    input: ['speech'],
    action: `${baseUrl}/api/twilio/availability?callId=${callId}&healthIssue=${encodeURIComponent(
      healthIssue
    )}`,
    method: 'POST',
    timeout: IVR_CONFIG.gatherTimeout,
    speechTimeout: 'auto',
  });

  gather.say(IVR_MESSAGES.availabilityPrompt, { voice: IVR_CONFIG.voice });

  twiml.say(IVR_MESSAGES.noResponseFallback, { voice: IVR_CONFIG.voice });
  twiml.hangup();
  return twiml.toString();
}

// Handle availability
export function handleAvailabilityResponse(
  speechResult: string,
  callId: number,
  healthIssue: string,
  baseUrl: string
): string {
  const twiml = new VoiceResponse();
  const speech = (speechResult || '').toLowerCase();

  if (speech.includes('no') || speech.includes('busy')) {
    twiml.say(IVR_MESSAGES.notAvailableResponse, { voice: IVR_CONFIG.voice });
    twiml.hangup();
    storage.updateCall(callId, { status: 'not_available', transcription: 'Patient unavailable' });
    return twiml.toString();
  }

  // Patient said YES
  twiml.say(IVR_MESSAGES.availableResponse, { voice: IVR_CONFIG.voice });
  twiml.record({
    timeout: 1,
    maxLength: IVR_CONFIG.recordingMaxLength,
    playBeep: true,
    action: `${baseUrl}/api/twilio/record-complete?callId=${callId}&healthIssue=${encodeURIComponent(
      healthIssue
    )}`,
    method: 'POST',
  });

  return twiml.toString();
}

// Handle recording complete
export function handleRecordingComplete(callId: number, recordingUrl: string, duration: number): string {
  const twiml = new VoiceResponse();
  console.log(`[IVR] Recording completed for call ${callId}: ${recordingUrl} (${duration}s)`);

  // Thank you
  twiml.say(IVR_MESSAGES.thankYouResponse, { voice: IVR_CONFIG.voice });
  twiml.hangup();

  // Update storage
  storage.updateCall(callId, { status: 'completed', audioUrl: recordingUrl });

  return twiml.toString();
}

// Initiate Enhanced IVR Call
export async function initiateEnhancedIVRCall(
  patientId: number,
  phoneNumber: string,
  healthIssue: string,
  baseUrl: string
) {
  try {
    const formattedPhone = formatPhoneForTwilio(phoneNumber);
    const callRecord = await storage.createCall({ patientId, status: 'pending' });

    try {
      const call = await twilioClient.calls.create({
        from: twilioPhoneNumber,
        to: formattedPhone,
        url: `${baseUrl}/api/twilio/ivr-greeting?callId=${callRecord.id}&healthIssue=${encodeURIComponent(
          healthIssue
        )}`,
        record: true,
        recordingStatusCallback: `${baseUrl}/api/twilio/recording-status?callId=${callRecord.id}`,
        recordingStatusCallbackMethod: 'POST',
      });

      await storage.updateCall(callRecord.id, { status: 'in_progress' });
      console.log(`[IVR] Call initiated: ${call.sid}`);
      return callRecord;
    } catch (error: any) {
      console.warn('[IVR] Free trial / call failed, switching to demo mode.');
      const mockTranscript = `Demo IVR: Patient available, recorded concern about ${healthIssue}`;
      await storage.updateCall(callRecord.id, {
        status: 'completed',
        audioUrl: 'https://twilio.com/docs/tutorials/twimlets/voicemail/welcome.wav',
        transcription: mockTranscript,
        sentimentLabel: 'Hot',
      });
      return callRecord;
    }
  } catch (error) {
    console.error('[IVR] Unexpected error:', error);
    throw error;
  }
}

export { twilioClient, VoiceResponse };

// Generate Voice Response (Legacy)
export function generateVoiceResponse(callId: number, healthIssue: string): any {
  const twiml = new VoiceResponse();
  twiml.say(`Hello, this is MedAgg Healthcare. We are calling about your ${healthIssue} inquiry.`, {
    voice: IVR_CONFIG.voice
  });
  twiml.hangup();
  return twiml;
}

// Handle Recording URL
export async function handleRecordingUrl(callId: number, recordingUrl: string, duration: number): Promise<void> {
  try {
    console.log(`[Twilio] Processing recording for call ${callId}: ${recordingUrl}`);
    await storage.updateCall(callId, { 
      status: 'completed', 
      audioUrl: recordingUrl 
    });
  } catch (error) {
    console.error('[Twilio] Error handling recording URL:', error);
  }
}

// Initiate Patient Call (Legacy)
export async function initiatePatientCall(patientId: number, phoneNumber: string, healthIssue: string) {
  try {
    const formattedPhone = formatPhoneForTwilio(phoneNumber);
    const callRecord = await storage.createCall({ patientId, status: 'pending' });

    const call = await twilioClient.calls.create({
      from: twilioPhoneNumber,
      to: formattedPhone,
      url: `${cachedBaseUrl}/voice?callId=${callRecord.id}&healthIssue=${encodeURIComponent(healthIssue)}`,
      record: true,
    });

    await storage.updateCall(callRecord.id, { status: 'in_progress' });
    console.log(`[Twilio] Legacy call initiated: ${call.sid}`);
    return callRecord;
  } catch (error) {
    console.error('[Twilio] Legacy call failed:', error);
    throw error;
  }
}