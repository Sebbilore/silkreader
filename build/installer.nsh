; Silkreader-Installer: Es wird bewusst KEIN Zertifikat mehr als vertrauenswürdige Stammzertifizierungsstelle
; installiert (das wäre auf fremden PCs ein Sicherheitsrisiko). Updates prüft die App selbst über den fest
; hinterlegten Fingerabdruck ihres Zertifikats.

; Beim Deinstallieren ein von älteren Versionen (bis 1.14) installiertes Silkreader-Zertifikat wieder entfernen.
; (Nur bei echter Deinstallation, nicht bei Updates.)
!macro customUnInstall
  ${ifNot} ${isUpdated}
    nsExec::Exec 'certutil -user -delstore TrustedPublisher 66923f7442aa9a51cee8ee2055b12e9fb722f9f1'
    Pop $0
    nsExec::Exec 'certutil -user -delstore Root 66923f7442aa9a51cee8ee2055b12e9fb722f9f1'
    Pop $0
  ${endIf}
!macroend
