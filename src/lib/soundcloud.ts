/**
 * Resolves a shortened SoundCloud URL (on.soundcloud.com) to its canonical track/embed URL.
 * Works on both client and server.
 */
export async function resolveSoundCloudUrl(url: string): Promise<string | null> {
  if (!url || !url.includes("on.soundcloud.com")) {
    return null;
  }

  try {
    const oembedUrl = `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oembedUrl);
    
    if (response.ok) {
      const data = await response.json() as { html?: string };
      // Extract the track URL from the oEmbed iframe HTML
      const match = data.html?.match(/url=([^&"]+)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }
  } catch (error) {
    console.error("Error resolving SoundCloud URL:", error);
  }
  
  return null;
}
