export async function uploadAudioBuffer(episodeId: string, buffer: Buffer): Promise<{ audioUrl: string; durationSeconds: number }> {
  const filePath = `audio/${episodeId}.mp3`;
  return {
    audioUrl: `${process.env.S3_ENDPOINT ?? 'http://localhost:9000'}/${process.env.S3_BUCKET ?? 'illuvrse-audio'}/${filePath}`,
    durationSeconds: Math.max(30, Math.round(buffer.length / 1000))
  };
}
