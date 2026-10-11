Option Explicit
Dim shell, filesystem, workspace
Set shell = CreateObject("WScript.Shell")
Set filesystem = CreateObject("Scripting.FileSystemObject")
workspace = filesystem.GetParentFolderName(filesystem.GetParentFolderName(WScript.ScriptFullName))
shell.CurrentDirectory = workspace
shell.Run "node """ & workspace & "\scripts\watch-model-library.js""", 0, False
