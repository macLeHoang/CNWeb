param([Parameter(Mandatory=$true)][int]$BrowserProcessId, [Parameter(Mandatory=$true)][string]$OutputPath)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class OwnedChromeCapture {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr window, out RECT rect);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr window, IntPtr dc, uint flags);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
}
'@
[OwnedChromeCapture]::SetProcessDPIAware() | Out-Null
# Only the PID returned by our Playwright launchServer is inspected. Never enumerate personal Chrome windows.
$ownedProcess = Get-Process -Id $BrowserProcessId
$window = $ownedProcess.MainWindowHandle
if ($window -eq 0) { throw 'The owned browser has no visible window.' }
$rect = [OwnedChromeCapture+RECT]::new()
if (-not [OwnedChromeCapture]::GetWindowRect($window, [ref]$rect)) { throw 'Cannot read owned browser bounds.' }
$bitmap = [System.Drawing.Bitmap]::new(($rect.Right-$rect.Left), ($rect.Bottom-$rect.Top))
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
try {
  $dc = $graphics.GetHdc()
  try { $captured = [OwnedChromeCapture]::PrintWindow($window, $dc, 2) } finally { $graphics.ReleaseHdc($dc) }
  if (-not $captured) { throw 'Owned browser window capture failed.' }
  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
} finally { $graphics.Dispose(); $bitmap.Dispose() }
