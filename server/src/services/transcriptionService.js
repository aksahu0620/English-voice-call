import dotenv from 'dotenv';

dotenv.config();

const ASSEMBLY_AI_API_KEY = process.env.ASSEMBLY_AI_API_KEY;
const ASSEMBLY_AI_API_URL = 'https://api.assemblyai.com/v2';

// Function to upload audio to Assembly AI
async function uploadAudio(audioBlob) {
  try {
    const response = await fetch(`${ASSEMBLY_AI_API_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLY_AI_API_KEY
      },
      body: audioBlob
    });

    if (!response.ok) {
      throw new Error('Failed to upload audio');
    }

    const data = await response.json();
    return data.upload_url;
  } catch (error) {
    console.error('Audio upload error:', error);
    return null;
  }
}

// Function to create transcription job
async function createTranscriptionJob(audioUrl) {
  try {
    const response = await fetch(`${ASSEMBLY_AI_API_URL}/transcript`, {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLY_AI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        language_code: 'en',
        punctuate: true,
        format_text: true
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create transcription job');
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Transcription job creation error:', error);
    return null;
  }
}

// Function to get transcription result
async function getTranscriptionResult(transcriptId) {
  try {
    const response = await fetch(`${ASSEMBLY_AI_API_URL}/transcript/${transcriptId}`, {
      headers: {
        'Authorization': ASSEMBLY_AI_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get transcription result');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Get transcription result error:', error);
    return null;
  }
}

// Main transcription function
export async function transcribeAudio(audioBlob) {
  try {
    // Upload audio
    const uploadUrl = await uploadAudio(audioBlob);
    if (!uploadUrl) return null;

    // Create transcription job
    const transcriptId = await createTranscriptionJob(uploadUrl);
    if (!transcriptId) return null;

    // Poll for results
    let result = null;
    let attempts = 0;
    const maxAttempts = 30; // Maximum 30 attempts with 2-second intervals

    while (attempts < maxAttempts) {
      const transcriptionResult = await getTranscriptionResult(transcriptId);
      
      if (transcriptionResult?.status === 'completed') {
        result = {
          text: transcriptionResult.text,
          confidence: transcriptionResult.confidence,
          words: transcriptionResult.words
        };
        break;
      } else if (transcriptionResult?.status === 'error') {
        throw new Error('Transcription failed');
      }

      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      attempts++;
    }

    return result;
  } catch (error) {
    console.error('Transcription error:', error);
    return null;
  }
}