import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function analyzeGrammar(text) {
  try {
    const prompt = `Please analyze the following English text for grammar, pronunciation, and fluency. Provide corrections and explanations for any mistakes. Format the response as a JSON object with the following structure:
{
  "correctedText": "The corrected version of the text",
  "mistakes": [
    {
      "original": "The original incorrect text",
      "corrected": "The corrected version",
      "explanation": "Explanation of the correction",
      "position": {
        "start": 0,
        "end": 10
      }
    }
  ],
  "overallScore": 85,
  "suggestions": [
    "Suggestion for improvement"
  ]
}

Text to analyze:
${text}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "user",
        content: prompt
      }],
      temperature: 0.7,
      max_tokens: 1000
    });

    const response = completion.choices[0].message.content;
    return JSON.parse(response);

  } catch (error) {
    console.error('Grammar analysis error:', error);
    return null;
  }
}

export async function generateGrammarFeedback(callId) {
  try {
    const call = await Call.findById(callId);
    if (!call || !call.transcript.length) return;

    // Combine all transcripts
    const fullText = call.transcript
      .map(t => t.text)
      .join(' ');

    // Analyze grammar using OpenAI
    const analysis = await analyzeGrammar(fullText);
    if (!analysis) return;

    // Update call with grammar feedback
    await Call.findByIdAndUpdate(callId, {
      grammarFeedback: {
        originalText: fullText,
        correctedText: analysis.correctedText,
        mistakes: analysis.mistakes,
        overallScore: analysis.overallScore,
        suggestions: analysis.suggestions
      }
    });

  } catch (error) {
    console.error('Grammar feedback error:', error);
  }
}