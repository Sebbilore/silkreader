// Nach dem Packen: Dateien entfernen, die Silkreader nie braucht (kleinerer Download).
// dxcompiler.dll/dxil.dll sind der DirectX-Shader-Compiler für WebGPU – die App nutzt kein WebGPU
// (Grafik läuft über ANGLE/D3D11 mit d3dcompiler_47.dll, das bleibt).
const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;
  let freed = 0;
  for (const f of ['dxcompiler.dll', 'dxil.dll']) {
    const p = path.join(context.appOutDir, f);
    if (fs.existsSync(p)) { freed += fs.statSync(p).size; fs.unlinkSync(p); }
  }
  console.log(`  • afterPack: ${Math.round(freed / 1048576)} MB entfernt (WebGPU-Shader-Compiler)`);
};
