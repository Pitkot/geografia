import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const batch = await readFile(new URL('../run-windows.bat', import.meta.url), 'utf8');
const powershell = await readFile(new URL('../windows-server.ps1', import.meta.url), 'utf8');

test('launcher Windows używa wbudowanego Windows PowerShell bez Node.js', () => {
  assert.match(batch, /powershell\.exe/i);
  assert.match(batch, /-ExecutionPolicy Bypass/i);
  assert.match(batch, /windows-server\.ps1/i);
  assert.doesNotMatch(`${batch}\n${powershell}`, /\b(?:node|npm|python)\b/i);
});

test('serwer Windows nasłuchuje wyłącznie lokalnie i otwiera przeglądarkę', () => {
  assert.match(powershell, /IPAddress\]::Loopback/);
  assert.match(powershell, /http:\/\/127\.0\.0\.1:\$Port\//);
  assert.match(powershell, /Start-Process \$AppUrl/);
  assert.match(powershell, /ExclusiveAddressUse\s*=\s*\$true/);
});

test('serwer Windows obsługuje wszystkie lokalne zasoby aplikacji', () => {
  const requiredTypes = [
    'text/html; charset=utf-8',
    'text/css; charset=utf-8',
    'text/javascript; charset=utf-8',
    'application/json; charset=utf-8',
    'image/png',
    'image/svg+xml'
  ];

  for (const contentType of requiredTypes) {
    assert.ok(powershell.includes(contentType), `Brak typu MIME: ${contentType}`);
  }

  assert.match(powershell, /GetFullPath/);
  assert.match(powershell, /StartsWith\(\$RootPrefix/);
  assert.match(powershell, /StatusCode 404/);
});