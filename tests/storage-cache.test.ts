import assert from "node:assert/strict";

// Simula window.localStorage para testes no ambiente Node
class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string) {
    return this.store[key] || null;
  }
  setItem(key: string, value: string) {
    this.store[key] = value;
  }
  removeItem(key: string) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

const mockStorage = new MockLocalStorage();
(global as any).window = {
  localStorage: mockStorage,
};
Object.defineProperty(globalThis, "localStorage", {
  value: mockStorage,
  writable: true,
  configurable: true,
});

async function runStorageTest() {
  const {
    getCachedNewsDigests,
    saveCachedNewsDigests,
    getCachedJobs,
    saveCachedJobs,
    STORAGE_KEYS,
  } = await import("../src/lib/utils/storage");

  // Teste 1: Estado inicial vazio
  assert.deepEqual(getCachedNewsDigests(), [], "Cache inicial de notícias deve ser vazio");
  assert.deepEqual(getCachedJobs(), [], "Cache inicial de vagas deve ser vazio");

  // Teste 2: Salvar e ler notícias
  const sampleNews = [
    {
      id: "news-1",
      date: "08/10/2026",
      dateIso: "2026-10-08",
      lastUpdatedTime: "10:00",
      headline: "Notícia Teste 08",
      highlights: [],
      batches: [],
      isActive: true,
    },
  ];

  saveCachedNewsDigests(sampleNews as any);
  const retrievedNews = getCachedNewsDigests();
  assert.equal(retrievedNews.length, 1);
  assert.equal(retrievedNews[0].date, "08/10/2026");

  // Teste 3: Salvar e ler vagas
  const sampleJobs = [
    {
      id: "job-1",
      title: "Desenvolvedor",
      company: "Tech Guarapuava",
      publishedDate: "08/10/2026",
    },
  ];

  saveCachedJobs(sampleJobs as any);
  const retrievedJobs = getCachedJobs();
  assert.equal(retrievedJobs.length, 1);
  assert.equal(retrievedJobs[0].title, "Desenvolvedor");

  console.log("✅ storage-cache.test.ts passed successfully!");
}

runStorageTest();
