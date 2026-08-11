# Instala en tu computador los plugins de Claude Code que usa este proyecto.
# Version para Windows (PowerShell). El equivalente en Mac/Linux es el .sh de al lado.
#
# Uso, en PowerShell:
#   powershell -ExecutionPolicy Bypass -File scripts\setup-claude-plugins.ps1
#
# Es idempotente: si algo ya estaba instalado, lo salta sin romper nada.

$ErrorActionPreference = "Continue"

# uv y sus herramientas (graphify) aterrizan aqui. Windows no refresca el PATH de
# una consola ya abierta, asi que lo anadimos a mano para esta sesion: sin esto,
# el 'graphify install' del final no encontraria el ejecutable recien instalado.
$env:PATH = "$env:USERPROFILE\.local\bin;$env:PATH"

function Have($name) { return [bool](Get-Command $name -ErrorAction SilentlyContinue) }

if (-not (Have "claude")) {
  Write-Host "No encuentro el comando 'claude'. Instala Claude Code primero:"
  Write-Host "  https://claude.com/product/claude-code"
  exit 1
}

Write-Host "==> Anadiendo marketplaces"
foreach ($repo in @(
  "obra/superpowers-marketplace",
  "anthropics/claude-code",
  "upstash/context7"
)) {
  Write-Host "  - $repo"
  claude plugin marketplace add $repo --scope user 2>&1 | Out-Null
}

Write-Host "==> Instalando plugins"
foreach ($plugin in @(
  "superpowers@superpowers-marketplace",
  "frontend-design@claude-code-plugins",
  "ralph-wiggum@claude-code-plugins",
  "context7@context7-marketplace"
)) {
  Write-Host "  - $plugin"
  claude plugin install $plugin --scope user 2>&1 | Out-Null
}

Write-Host "==> Anadiendo Playwright como servidor MCP global"
claude mcp add --scope user playwright -- npx -y '@playwright/mcp@latest' 2>&1 | Out-Null

Write-Host "==> Descargando el navegador de Playwright (puede tardar un par de minutos)"
npx -y playwright install chromium

Write-Host "==> Instalando graphify (grafo de conocimiento del proyecto)"
# OJO: el paquete en PyPI es 'graphifyy' con doble y; el comando es 'graphify'.
if (Have "uv") {
  uv tool install graphifyy
  uv tool update-shell 2>&1 | Out-Null
} elseif (Have "pipx") {
  pipx install graphifyy
  pipx ensurepath 2>&1 | Out-Null
} else {
  Write-Host "    Ni 'uv' ni 'pipx' encontrados. Instalando uv..."
  # Instalador oficial de Astral: deja uv.exe en %USERPROFILE%\.local\bin, que ya
  # esta en el PATH de esta sesion (arriba). winget tambien sirve, pero coloca el
  # binario en una ruta que cambia con la version y no podriamos anadirla aqui.
  Invoke-RestMethod https://astral.sh/uv/install.ps1 | Invoke-Expression
  if (Have "uv") {
    uv tool install graphifyy
  } else {
    Write-Host "    No se pudo instalar uv. Hazlo a mano y vuelve a ejecutar este script:"
    Write-Host "      winget install astral-sh.uv"
  }
}

if (Have "graphify") {
  Write-Host "==> Registrando la skill de graphify para todos tus proyectos"
  graphify install
} else {
  Write-Host "    'graphify' no esta en el PATH todavia."
  Write-Host "    Abre una consola nueva y ejecuta: graphify install"
}

Write-Host ""
Write-Host "Listo. Reinicia Claude Code y comprueba con:"
Write-Host "  claude plugin list"
Write-Host "  claude mcp list"
Write-Host "  graphify --version"
Write-Host ""
Write-Host "Falta Obsidian, que es una app de escritorio y se instala aparte:"
Write-Host "  winget install Obsidian.Obsidian"
Write-Host ""
Write-Host "Luego, dentro de este proyecto:"
Write-Host "  1. En Claude Code:  /graphify . --obsidian"
Write-Host "  2. En Obsidian:     Abrir carpeta como vault -> graphify-out\obsidian\"
