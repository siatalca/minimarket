' Inicia el puente de impresion local de Minimarket sin mostrar ventana.
' Escucha solo en 127.0.0.1:7357; los mensajes quedan en logs\impresion.log.
Option Explicit

Dim sh, fso, dir, logDir
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

dir = fso.GetParentFolderName(WScript.ScriptFullName)
logDir = dir & "\logs"
If Not fso.FolderExists(logDir) Then fso.CreateFolder(logDir)

sh.CurrentDirectory = dir
sh.Environment("PROCESS")("LOCAL_PRINT_BRIDGE_HOST") = "127.0.0.1"
sh.Environment("PROCESS")("LOCAL_PRINT_BRIDGE_PORT") = "7357"

sh.Run "cmd /c node """ & dir & "\local_print_bridge.js"" >> """ & logDir & "\impresion.log"" 2>&1", 0, False
