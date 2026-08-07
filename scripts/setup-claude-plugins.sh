#!/usr/bin/env bash
# Instala en tu computador los plugins de Claude Code que usa este proyecto.
# Se instalan con scope "user", asi que quedan disponibles en TODOS tus proyectos.
#
# Uso:  bash scripts/setup-claude-plugins.sh
#
# Es idempotente: si algo ya estaba instalado, lo salta sin romper nada.

set -uo pipefail

if ! command -v claude >/dev/null 2>&1; then
  echo "No encuentro el comando 'claude'. Instala Claude Code primero:"
  echo "  https://claude.com/product/claude-code"
  exit 1
fi

echo "==> Anadiendo marketplaces"
for repo in \
  obra/superpowers-marketplace \
  anthropics/claude-code \
  upstash/context7
do
  echo "  - $repo"
  claude plugin marketplace add "$repo" --scope user >/dev/null 2>&1 \
    || echo "    (ya estaba, o fallo la descarga; revisa tu conexion)"
done

echo "==> Instalando plugins"
for plugin in \
  superpowers@superpowers-marketplace \
  frontend-design@claude-code-plugins \
  ralph-wiggum@claude-code-plugins \
  context7@context7-marketplace
do
  echo "  - $plugin"
  claude plugin install "$plugin" --scope user >/dev/null 2>&1 \
    || echo "    (ya estaba instalado, o fallo; revisa con 'claude plugin list')"
done

echo "==> Anadiendo Playwright como servidor MCP global"
claude mcp add --scope user playwright -- npx -y @playwright/mcp@latest >/dev/null 2>&1 \
  || echo "    (ya estaba configurado)"

echo "==> Descargando el navegador de Playwright (puede tardar un par de minutos)"
npx -y playwright install chromium || echo "    (fallo la descarga; ejecuta 'npx playwright install chromium' a mano)"

echo
echo "Listo. Reinicia Claude Code y comprueba con:"
echo "  claude plugin list"
echo "  claude mcp list"
