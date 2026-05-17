// Mock IPFS — stores file (as data URL) + JSON metadata in localStorage,
// keyed by a fake content-addressed CID. The contract receives `mock://<cid>`
// as its tokenURI, and the frontend resolves it back here for display.
//
// To swap in real Pinata later: replace `uploadFile` and `uploadMetadata` with
// HTTP POSTs to the Pinata API and return real `ipfs://<cid>` URIs. The rest of
// the app can stay the same because `resolveTokenURI` works with both prefixes.

const STORAGE_KEY = "artchain.mock-ipfs.v1";

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

async function fakeCid(content) {
  const enc = new TextEncoder();
  const bytes = enc.encode(typeof content === "string" ? content : JSON.stringify(content));
  const hashBuf = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `bafy${hex.slice(0, 40)}`;
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadFile(file) {
  const dataUrl = await fileToDataURL(file);
  const cid = await fakeCid(dataUrl);
  const uri = `mock://${cid}`;
  const store = loadStore();
  store[uri] = { type: "file", mime: file.type, name: file.name, dataUrl };
  saveStore(store);
  return uri;
}

export async function uploadMetadata(metadata) {
  const cid = await fakeCid(metadata);
  const uri = `mock://${cid}`;
  const store = loadStore();
  store[uri] = { type: "metadata", json: metadata };
  saveStore(store);
  return uri;
}

export async function resolveTokenURI(tokenURI) {
  if (!tokenURI) return null;
  if (tokenURI.startsWith("mock://")) {
    const store = loadStore();
    const entry = store[tokenURI];
    if (!entry) return null;
    if (entry.type === "metadata") {
      const meta = entry.json;
      // Resolve nested image URI if it's also a mock:// pointer
      if (meta.image && meta.image.startsWith("mock://")) {
        const imgEntry = store[meta.image];
        return { ...meta, image: imgEntry?.dataUrl || null };
      }
      return meta;
    }
    return entry.json || entry;
  }
  if (tokenURI.startsWith("ipfs://")) {
    const gateway = `https://ipfs.io/ipfs/${tokenURI.replace("ipfs://", "")}`;
    try {
      const r = await fetch(gateway);
      const meta = await r.json();
      if (meta.image?.startsWith("ipfs://")) {
        meta.image = `https://ipfs.io/ipfs/${meta.image.replace("ipfs://", "")}`;
      }
      return meta;
    } catch {
      return null;
    }
  }
  if (tokenURI.startsWith("http")) {
    try {
      const r = await fetch(tokenURI);
      return await r.json();
    } catch {
      return null;
    }
  }
  return null;
}
