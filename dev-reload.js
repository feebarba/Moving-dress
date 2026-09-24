// A recarga automática só funciona na prévia local; não faz requisições no site publicado.
if (['127.0.0.1', 'localhost'].includes(window.location.hostname)) {
  const files = ['index.html', 'styles.css', 'sketch.js', 'dev-reload.js'];
  let currentSource = null;
  let checking = false;

  async function checkRevision() {
    if (checking) return;
    checking = true;
    try {
      const sources = await Promise.all(files.map(async (file) => {
        const response = await fetch(file, { cache: 'no-store' });
        if (!response.ok) throw new Error(`${file}: ${response.status}`);
        return response.text();
      }));
      const nextSource = sources.join('\0');
      if (currentSource !== null && nextSource !== currentSource) {
        window.location.reload();
        return;
      }
      currentSource = nextSource;
    } catch {
      // A página continua utilizável mesmo quando o servidor local é encerrado.
    } finally {
      checking = false;
    }
  }

  checkRevision();
  setInterval(checkRevision, 1200);
}
