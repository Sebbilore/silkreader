; Installiert das Silkreader-Herausgeberzertifikat für den aktuellen Benutzer,
; damit Windows "Herausgeber: Silkreader" anzeigt und automatische Updates
; ihre Signatur prüfen können. Ist es schon vorhanden, passiert nichts.
!macro customInstall
  File "/oname=$PLUGINSDIR\silkreader.cer" "${BUILD_RESOURCES_DIR}\silkreader.cer"
  nsExec::Exec 'certutil -user -verifystore TrustedPublisher 66923f7442aa9a51cee8ee2055b12e9fb722f9f1'
  Pop $0
  ${If} $0 != 0
    nsExec::Exec 'certutil -user -addstore Root "$PLUGINSDIR\silkreader.cer"'
    Pop $0
    nsExec::Exec 'certutil -user -addstore TrustedPublisher "$PLUGINSDIR\silkreader.cer"'
    Pop $0
  ${EndIf}
!macroend
