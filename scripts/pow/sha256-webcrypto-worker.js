const encoder = new TextEncoder();
let activeJobId = null;

async function calculateSHA256(input) {
  const data = encoder.encode(input);
  return crypto.subtle.digest("SHA-256", data);
}

function toHexString(byteArray) {
  return Array.from(byteArray)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

self.addEventListener("message", async ({ data: eventData }) => {
  if (eventData.type === "cancel") {
    if (activeJobId === eventData.jobId) {
      activeJobId = null;
    }
    return;
  }

  if (eventData.type !== "start") {
    return;
  }

  const { data, difficulty, threads } = eventData;
  const { jobId } = eventData;
  let nonce = eventData.nonce;
  const isMainThread = nonce === 0;
  let iterations = 0;
  activeJobId = jobId;

  const requiredZeroBytes = Math.floor(difficulty / 2);
  const isDifficultyOdd = difficulty % 2 !== 0;

  for (;;) {
    if (activeJobId !== jobId) {
      return;
    }

    const hashBuffer = await calculateSHA256(data + nonce);
    if (activeJobId !== jobId) {
      return;
    }

    const hashArray = new Uint8Array(hashBuffer);

    let isValid = true;
    for (let index = 0; index < requiredZeroBytes; index += 1) {
      if (hashArray[index] !== 0) {
        isValid = false;
        break;
      }
    }

    if (isValid && isDifficultyOdd && hashArray[requiredZeroBytes] >> 4 !== 0) {
      isValid = false;
    }

    if (isValid) {
      activeJobId = null;
      self.postMessage({
        type: "result",
        jobId,
        hash: toHexString(hashArray),
        nonce,
      });
      return;
    }

    nonce += threads;
    iterations += 1;

    if (nonce % 1 !== 0) {
      nonce = Math.trunc(nonce);
    }

    if (isMainThread && (iterations & 1023) === 0) {
      self.postMessage({
        type: "progress",
        jobId,
        nonce,
      });
    }
  }
});
