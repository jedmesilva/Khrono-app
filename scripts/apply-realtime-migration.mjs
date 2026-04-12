/**
 * Script de migração: habilita REPLICA IDENTITY FULL e publica as tabelas
 * no canal de realtime do Supabase.
 *
 * Execute UMA VEZ pelo Shell do Replit:
 *   node scripts/apply-realtime-migration.mjs
 */

const PROJECT_REF = "hbekmqzdoxcsznykuxdj";
const ACCESS_TOKEN = process.env.EXPO_SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error("❌  Variável EXPO_SUPABASE_ACCESS_TOKEN não encontrada.");
  console.error("    Certifique-se de rodar este script no Shell do Replit,");
  console.error("    onde os secrets estão disponíveis.");
  process.exit(1);
}

const SQL = `
-- Garante que as tabelas estão na publicação do Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE provider_pins;
ALTER PUBLICATION supabase_realtime ADD TABLE provider_sessions;

-- Habilita REPLICA IDENTITY FULL para que filtros em colunas não-PK
-- funcionem corretamente em eventos UPDATE e DELETE via postgres_changes
ALTER TABLE contracts REPLICA IDENTITY FULL;
ALTER TABLE provider_pins REPLICA IDENTITY FULL;
ALTER TABLE provider_sessions REPLICA IDENTITY FULL;
`.trim();

async function run() {
  console.log("🔗  Conectando ao Supabase Management API...");

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: SQL }),
    }
  );

  const text = await res.text();

  if (!res.ok) {
    console.error("❌  Erro na API:", res.status, text.slice(0, 400));
    process.exit(1);
  }

  console.log("✅  Migração aplicada com sucesso!");
  console.log("    Status:", res.status);
  try {
    console.log("    Resposta:", JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log("    Resposta:", text.slice(0, 200));
  }
}

run().catch((err) => {
  console.error("❌  Erro inesperado:", err.message);
  process.exit(1);
});
