import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const AUDIO_DIR = "server/audio";

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

export async function speechToText(audioUrl: string, twilioAuth: { sid: string, token: string }): Promise<{ text: string; language: string; intent?: any }> {
  try {
    console.log('[AudioProcessor] Starting Python-based transcription with Whisper...');
    console.log('[AudioProcessor] Audio URL:', audioUrl);
    console.log('[AudioProcessor] Twilio SID:', twilioAuth.sid ? 'Present' : 'Missing');
    
    return new Promise((resolve, reject) => {
      // Use the virtual environment's Python
      const pythonProcess = spawn('.venv\\Scripts\\python.exe', [
        path.join(__dirname, 'transcription_service.py'),
        audioUrl,
        twilioAuth.sid,
        twilioAuth.token
      ]);

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        const dataStr = data.toString();
        console.log('[AudioProcessor] Python stdout:', dataStr);
        output += dataStr;
      });

      pythonProcess.stderr.on('data', (data) => {
        const errorStr = data.toString();
        console.error('[AudioProcessor] Python stderr:', errorStr);
        errorOutput += errorStr;
      });

      pythonProcess.on('close', (code) => {
        console.log(`[AudioProcessor] Python process exited with code: ${code}`);
        console.log(`[AudioProcessor] Full output: ${output}`);
        console.log(`[AudioProcessor] Full error: ${errorOutput}`);
        
        if (code !== 0) {
          console.error('[AudioProcessor] Python process failed');
          
          // Return a graceful fallback
          resolve({
            text: 'Call recorded successfully. Transcription processing failed.',
            language: 'en',
            intent: { intent: 'GENERAL_ENQUIRY', confidence: 0, is_hot: false, scores: {} }
          });
          return;
        }

        try {
          // Extract only the JSON part from the output
          const lines = output.trim().split('\n');
          const jsonLine = lines.find(line => line.trim().startsWith('{') && line.trim().endsWith('}'));
          
          if (!jsonLine) {
            console.error('[AudioProcessor] No JSON found in output');
            resolve({
              text: 'Transcription completed but no valid result found.',
              language: 'en',
              intent: { intent: 'GENERAL_ENQUIRY', confidence: 0, is_hot: false, scores: {} }
            });
            return;
          }
          
          const result = JSON.parse(jsonLine);
          
          if (!result.success) {
            console.error('[AudioProcessor] Transcription failed:', result.error);
            resolve({
              text: 'Call transcription failed. Please check logs.',
              language: 'en',
              intent: { intent: 'GENERAL_ENQUIRY', confidence: 0, is_hot: false, scores: {} }
            });
            return;
          }

          console.log('[AudioProcessor] ✅ Transcription successful:', result.transcription.text);
          console.log('[AudioProcessor] 🎯 Intent classification:', result.intent);

          resolve({
            text: result.transcription.text || 'Transcription completed successfully.',
            language: result.transcription.language || 'en',
            intent: result.intent
          });
        } catch (parseError) {
          console.error('[AudioProcessor] Failed to parse Python output:', output);
          console.error('[AudioProcessor] Parse error:', parseError);
          
          resolve({
            text: 'Audio processing completed but parsing failed.',
            language: 'en',
            intent: { intent: 'GENERAL_ENQUIRY', confidence: 0, is_hot: false, scores: {} }
          });
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('[AudioProcessor] Python process error:', error);
        
        resolve({
          text: 'Call recorded successfully. Python process failed to start.',
          language: 'en',
          intent: { intent: 'GENERAL_ENQUIRY', confidence: 0, is_hot: false, scores: {} }
        });
      });
    });

  } catch (error) {
    console.error('[AudioProcessor] Transcription error:', error);
    
    return {
      text: 'Call recorded. Transcription processing failed.',
      language: 'en',
      intent: { intent: 'GENERAL_ENQUIRY', confidence: 0, is_hot: false, scores: {} }
    };
  }
}