# ---------------------------------------------------------------------------
#  gerar-dados.ps1 — regenera html/js/dados.js a partir da API mock.
#
#  A versão HTML pura não faz chamadas de rede: ela lê um snapshot embutido dos
#  endpoints do backend. Este script produz esse snapshot. Rode com o backend no
#  ar (iniciar-app.bat na raiz do projeto) sempre que os mocks de
#  backend/app/data.py mudarem.
#
#      powershell -ExecutionPolicy Bypass -File html\gerar-dados.ps1
#      powershell -ExecutionPolicy Bypass -File html\gerar-dados.ps1 -ApiUrl http://localhost:8000
#
#  As respostas são copiadas cruas (texto JSON do backend), sem round-trip por
#  objetos do PowerShell — o que o painel HTML lê é byte a byte o que a API
#  devolveu.
# ---------------------------------------------------------------------------
param(
    [string]$ApiUrl = "http://localhost:8010"
)

$ErrorActionPreference = "Stop"

$destino = Join-Path $PSScriptRoot "js\dados.js"
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("dados-precificacao-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $temp -Force | Out-Null

function Get-JsonCru([string]$rota) {
    $arquivo = Join-Path $temp ("resp-" + [guid]::NewGuid().ToString("N") + ".json")
    $url = "$ApiUrl$rota"
    & curl.exe -s -f --max-time 15 -o $arquivo $url
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao consultar $url (curl exit $LASTEXITCODE). O backend está no ar?"
    }
    return [System.IO.File]::ReadAllText($arquivo, [System.Text.Encoding]::UTF8).Trim()
}

try {
    Write-Host "Lendo a API em $ApiUrl ..."

    $filtrosJson = Get-JsonCru "/api/filtros"
    # page_size máximo aceito pelo backend é 100 (routers.py: Query(20, ge=1, le=100)).
    $inventarioJson = Get-JsonCru "/api/inventario?page=1&page_size=100"

    $placas = ($inventarioJson | ConvertFrom-Json).items | ForEach-Object { $_.placa }
    Write-Host "  $($placas.Count) veículos no inventário."

    $detalhes = New-Object System.Collections.Generic.List[string]
    $historicos = New-Object System.Collections.Generic.List[string]
    foreach ($placa in $placas) {
        $chave = ($placa -replace '"', '\"')
        $detalhes.Add('    "' + $chave + '": ' + (Get-JsonCru "/api/inventario/$placa"))
        $historicos.Add('    "' + $chave + '": ' + (Get-JsonCru "/api/inventario/$placa/historico"))
    }

    $gerado = (Get-Date).ToString("yyyy-MM-dd HH:mm")
    $conteudo = @"
/**
 * dados.js — SNAPSHOT dos endpoints da API mock (SDP #5211).
 *
 * GERADO AUTOMATICAMENTE por html/gerar-dados.ps1 — não editar à mão.
 * Origem: $ApiUrl · Gerado em: $gerado
 *
 * Este arquivo existe para que a versão HTML pura funcione sem servidor e sem
 * rede (abre por file://). Quando os mocks do backend mudarem, rode de novo:
 *     powershell -ExecutionPolicy Bypass -File html\gerar-dados.ps1
 */
window.DADOS = {
  "gerado_em": "$gerado",
  "origem": "$ApiUrl",
  "filtros": $filtrosJson,
  "inventario": $inventarioJson,
  "detalhes": {
$($detalhes -join ",`r`n")
  },
  "historicos": {
$($historicos -join ",`r`n")
  }
};
"@

    $dirDestino = Split-Path -Parent $destino
    if (-not (Test-Path $dirDestino)) { New-Item -ItemType Directory -Path $dirDestino -Force | Out-Null }
    [System.IO.File]::WriteAllText($destino, $conteudo, (New-Object System.Text.UTF8Encoding($true)))

    $tamanho = [math]::Round((Get-Item $destino).Length / 1KB, 1)
    Write-Host "OK: $destino ($tamanho KB)"
}
finally {
    Remove-Item -Recurse -Force $temp -ErrorAction SilentlyContinue
}
