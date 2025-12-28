// routes.ts
import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { initiatePatientCall, generateVoiceResponse, handleRecordingUrl, setBaseUrl } from "./twilio-service";
import { 
  generateGreetingTwiML, 
  handleAvailabilityResponse, 
  handleRecordingComplete, 
  initiateEnhancedIVRCall 
} from "./ivr-bot";

// Initialize Anthropic (Replit Integration)
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || 'dummy-key-replit-ai-handles-this',
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Enhanced IVR Bot Endpoints

  app.post('/api/twilio/ivr-greeting', (req, res) => {
    const { callId = '0', healthIssue = 'general' } = req.query;
    console.log(`[IVR] 📞 Enhanced IVR greeting - callId: ${callId}, healthIssue: ${healthIssue}`);
    
    res.set('Content-Type', 'text/xml');
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const twiml = generateGreetingTwiML(parseInt(callId as string), healthIssue as string, baseUrl);
    
    console.log('[IVR] 🎤 Enhanced greeting TwiML generated');
    res.send(twiml);
  });
  
  app.post('/api/twilio/availability', (req, res) => {
    const { callId, healthIssue } = req.query;
    const { SpeechResult } = req.body;

    console.log(`[IVR] 🗣️ Availability response - callId: ${callId}, speech: "${SpeechResult}"`);
    
    res.set('Content-Type', 'text/xml');
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const twiml = handleAvailabilityResponse(SpeechResult, parseInt(callId as string), healthIssue as string, baseUrl);
    
    res.send(twiml);
  });
  
  app.post('/api/twilio/record-complete', async (req, res) => {
    const { callId, healthIssue } = req.query;
    const { RecordingUrl, RecordingDuration } = req.body;

    console.log(`[IVR] 🎤 Recording complete - callId: ${callId}, URL: ${RecordingUrl}`);
    
    res.set('Content-Type', 'text/xml');
    const twiml = handleRecordingComplete(parseInt(callId as string), RecordingUrl, parseInt(RecordingDuration) || 0);

    if (RecordingUrl && callId) {
      handleRecordingUrl(parseInt(callId as string), RecordingUrl, parseInt(RecordingDuration) || 0)
        .catch(err => console.error('[IVR] Background recording processing failed:', err));
    }
    
    res.send(twiml);
  });

  app.post('/voice', (req, res) => {
    const { callId = '0', healthIssue = 'general' } = req.query;
    console.log(`[Twilio] 📞 Legacy voice endpoint - redirecting to enhanced IVR`);

    res.set('Content-Type', 'text/xml');
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const twiml = generateGreetingTwiML(parseInt(callId as string), healthIssue as string, baseUrl);
    res.send(twiml);
  });

  app.get('/voice', (req, res) => {
    console.log('[Twilio] 🧪 GET /voice endpoint hit for testing');
    res.send('Voice endpoint is working! (Use POST for actual calls)');
  });

  app.get('/test', (req, res) => {
    console.log('[Test] 🧪 Test endpoint hit - tunnel is working!');
    res.json({ message: 'Tunnel is working!', timestamp: new Date().toISOString() });
  });

  // Capture base URL for Twilio webhooks
  let baseUrlCaptured = false;
  app.use((req, res, next) => {
    if (!baseUrlCaptured && req.protocol && req.get('host')) {
      const capturedUrl = `${req.protocol}://${req.get('host')}`;
      setBaseUrl(capturedUrl);
      baseUrlCaptured = true;
    }
    next();
  });

  app.post(api.patients.create.path, async (req, res) => {
    try {
      const input = api.patients.create.input.parse(req.body);

      if (input.phone.includes('16822444811')) {
        return res.status(400).json({ 
          message: 'Error: This is the Twilio phone number. Please enter YOUR actual phone number.' 
        });
      }

      console.log(`[Routes] Creating patient: ${input.name}, Phone: ${input.phone}, Issue: ${input.healthIssue}`);
      const patient = await storage.createPatient(input);
      console.log(`[Routes] Patient created with ID: ${patient.id}`);

      try {
        const baseUrl = process.env.BASE_URL || process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3001}`;
        const callResult = await initiateEnhancedIVRCall(patient.id, patient.phone, input.healthIssue, baseUrl);
        console.log(`[Routes] ✅ Enhanced IVR call initiated successfully for patient ${patient.id}, call ID: ${callResult.id}`);
      } catch (callError) {
        console.error(`[Routes] ❌ Failed to initiate enhanced IVR call for patient ${patient.id}:`, callError);
        try {
          const fallbackResult = await initiatePatientCall(patient.id, patient.phone, input.healthIssue);
          console.log(`[Routes] ✅ Fallback call initiated for patient ${patient.id}, call ID: ${fallbackResult.id}`);
        } catch (fallbackError) {
          console.error(`[Routes] ❌ Both enhanced and fallback calls failed for patient ${patient.id}:`, fallbackError);
        }
      }

      res.status(201).json(patient);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error('[Routes] Error creating patient:', err);
      res.status(500).json({ message: 'Failed to create patient' });
    }
  });

  app.post('/api/twilio/voice', (req, res) => {
    const { callId, healthIssue } = req.query;
    const twiml = generateVoiceResponse(parseInt(callId as string), healthIssue as string);
    res.type('text/xml');
    res.send(twiml.toString());
  });

  app.post('/api/twilio/recording-status', async (req, res) => {
    try {
      const { callId } = req.query;
      const { RecordingUrl, RecordingDuration } = req.body;

      if (RecordingUrl && callId) {
        await handleRecordingUrl(parseInt(callId as string), RecordingUrl, parseInt(RecordingDuration) || 0);
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('[Twilio] Error in recording status webhook:', error);
      res.status(200).json({ success: true });
    }
  });

  app.post('/api/twilio/handle-recording', async (req, res) => {
    try {
      const { callId } = req.query;
      const { RecordingUrl, RecordingDuration } = req.body;

      if (RecordingUrl && callId) {
        await handleRecordingUrl(parseInt(callId as string), RecordingUrl, parseInt(RecordingDuration) || 0);
      }

      res.type('text/xml');
      res.send('<Response><Hangup/></Response>');
    } catch (error) {
      console.error('[Twilio] ❌ Error handling recording:', error);
      res.type('text/xml');
      res.send('<Response><Hangup/></Response>');
    }
  });

  app.get(api.patients.list.path, async (req, res) => {
    const patients = await storage.getPatients();
    res.json(patients);
  });

  app.get('/api/calls/:id/audio', async (req, res) => {
    try {
      const callId = parseInt(req.params.id);
      const calls = await storage.getCalls();
      const call = calls.find(c => c.id === callId);

      if (!call || !call.audioUrl) return res.status(404).json({ message: 'Audio not found' });

      const response = await fetch(call.audioUrl, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        },
      });

      if (!response.ok) return res.status(404).json({ message: 'Audio file not accessible' });

      const audioBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(audioBuffer);

      res.set('Content-Type', 'audio/wav');
      res.set('Content-Length', buffer.length.toString());
      res.send(buffer);
    } catch (error) {
      console.error('[Audio] ❌ Error fetching audio:', error);
      res.status(500).json({ message: 'Failed to fetch audio' });
    }
  });

  app.get(api.calls.list.path, async (req, res) => {
    const calls = await storage.getCalls();
    res.json(calls);
  });

  app.get(api.dashboard.stats.path, async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[Routes] Unhandled error:', err);
    res.status(500).json({ message: 'Internal server error' });
  });

  return httpServer;
}
