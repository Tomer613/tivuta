/**
 * Fetches an already-resolved image URL as a blob and triggers a browser download for it.
 * Used by both the Surveys page's "share to WhatsApp" button and the Distribution page's
 * WhatsApp-channel send flow, so an admin can attach a real photo manually in WhatsApp instead of
 * relying on a text-only deep link.
 */
export async function downloadImageFile(url: string, filename: string): Promise<void> {
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
}
