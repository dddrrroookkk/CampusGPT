export function chunkText(text, chunkSize = 1000, overlap = 200) {
  const words = text.split(/\s+/);

  const chunks = [];
  let currentChunk = [];
  let currentLength = 0;

  for (const word of words) {
    if (currentLength + word.length + 1 > chunkSize) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(" "));
      }

      const overlapWords = [];
      let overlapLength = 0;

      for (let i = currentChunk.length - 1; i >= 0; i--) {
        if (overlapLength + currentChunk[i].length + 1 > overlap) {
          break;
        }

        overlapWords.unshift(currentChunk[i]);
        overlapLength += currentChunk[i].length + 1;
      }

      currentChunk = [...overlapWords, word];
      currentLength = overlapLength + word.length + 1;
    } else {
      currentChunk.push(word);
      currentLength += word.length + 1;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
}