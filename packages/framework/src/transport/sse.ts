/** Parsed server-sent event frame. */
export interface ServerSentEventMessage<T = unknown> { readonly event: string; readonly data: T; readonly id?: string; }
/** Parses a fetch response body into JSON-or-text SSE frames. */
export async function* parseEventStream<T = unknown>(response: Response, signal?: AbortSignal): AsyncGenerator<ServerSentEventMessage<T>> {
  if (!response.body) throw new TypeError('Response does not contain an event stream');
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader(); let buffer = '';
  try { while (true) { if (signal?.aborted) return; const chunk = await reader.read(); if (chunk.done) break; buffer += chunk.value; const frames = buffer.split(/\r?\n\r?\n/); buffer = frames.pop() ?? ''; for (const frame of frames) { const lines = frame.split(/\r?\n/); const event = lines.find((line) => line.startsWith('event:'))?.slice(6).trim() ?? 'message'; const id = lines.find((line) => line.startsWith('id:'))?.slice(3).trim(); const rawData = lines.filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n'); if (!rawData) continue; let data: T; try { data = JSON.parse(rawData) as T; } catch { data = rawData as T; } yield id ? { event, data, id } : { event, data }; } } } finally { reader.releaseLock(); }
}
