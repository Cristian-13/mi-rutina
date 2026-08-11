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

echo "==> Instalando graphify (grafo de conocimiento del proyecto)"
# OJO: el paquete en PyPI es 'graphifyy' con doble y; el comando es 'graphify'.
if command -v uv >/dev/null 2>&1; then
  # --force: sin el, uv aborta con "Executables already exist" si un graphify
  # previo ocupa el nombre, y deja un trampolin roto que luego falla con
  # "failed to canonicalize script path". Tambien hace el script re-ejecutable.
  uv tool install --force graphifyy && uv tool update-shell >/dev/null 2>&1
elif command -v pipx >/dev/null 2>&1; then
  pipx install --force graphifyy && pipx ensurepath >/dev/null 2>&1
else
  echo "    Ni 'uv' ni 'pipx' encontrados. Instala uno de los dos y vuelve a ejecutar:"
  echo "      curl -LsSf https://astral.sh/uv/install.sh | sh"
fi

export PATH="$HOME/.local/bin:$PATH"
if command -v graphify >/dev/null 2>&1; then
  echo "==> Registrando la skill de graphify para todos tus proyectos"
  graphify install || echo "    (fallo el registro; ejecuta 'graphify install' a mano)"
else
  echo "    'graphify' no esta en el PATH todavia. Abre una terminal nueva y ejecuta 'graphify install'."
fi

echo
echo "Listo. Reinicia Claude Code y comprueba con:"
echo "  claude plugin list"
echo "  claude mcp list"
echo "  graphify --version"
echo
echo "Falta Obsidian, que es una app de escritorio y se instala aparte:"
echo "  Descarga:  https://obsidian.md/download"
echo "  macOS:     brew install --cask obsidian"
echo "  Windows:   winget install Obsidian.Obsidian"
echo "  Linux:     flatpak install flathub md.obsidian.Obsidian"
echo
echo "Luego, dentro de este proyecto:"
echo "  1. En Claude Code:  /graphify . --obsidian"
echo "  2. En Obsidian:     Abrir carpeta como vault -> graphify-out/obsidian/"
