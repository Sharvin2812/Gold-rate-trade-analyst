export default function AboutPage() {
  return (
    <main style={{ maxWidth: 800, margin: "20px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1>About Data Sources</h1>
      <p>FX updates daily; gold spot updates live.</p>
      <p>
        Rates by <a href="https://www.exchangerate-api.com" target="_blank">ExchangeRate-API</a>.
      </p>
    </main>
  );
}
