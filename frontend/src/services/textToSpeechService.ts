
export async function generateSpeech(text: string, language: string = 'en-US'): Promise<HTMLAudioElement> {
  try {
    const response = await fetch('/api/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: text, language }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Speech API Error: ${response.status} ${errorText}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    return new Audio(audioUrl);

  } catch (error) {
    console.error('Error generating speech:', error);
    throw new Error('Could not generate audio.');
  }
}