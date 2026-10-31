// Local sentence-embedding model (no API key needed). Downloads ~25MB on first use.
// all-MiniLM-L6-v2 -> 384-dim vectors, L2-normalised, so cosine distance is meaningful.
let extractor;
export async function embed(text) {
  if (!extractor) {
    const { pipeline } = await import('@xenova/transformers');
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  const out = await extractor(text, { pooling: 'mean', normalize: true });
  return '[' + Array.from(out.data).join(',') + ']';
}
