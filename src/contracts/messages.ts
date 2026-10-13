export type RequestId = string

export interface FontReference {
  family: string
  style: string
}

export interface AvailableFont {
  family: string
  style: string
}

export interface ImportRequestMessage {
  type: 'IMPORT_REQUEST'
  requestId: RequestId
  url: string
}

export interface ImportDecisionMessage {
  type: 'IMPORT_DECISION'
  requestId: RequestId
  decision: 'add' | 'cancel'
}

export interface FontSubstitutionDecisionMessage {
  type: 'FONT_SUBSTITUTION_DECISION'
  requestId: RequestId
  sourceFont: FontReference
  selection: AvailableFont | 'default'
}

export interface CancelImportMessage {
  type: 'CANCEL_IMPORT'
  requestId: RequestId
}

export interface ClosePluginMessage {
  type: 'CLOSE_PLUGIN'
  requestId: RequestId
}

export type InterfaceMessage =
  | ImportRequestMessage
  | ImportDecisionMessage
  | FontSubstitutionDecisionMessage
  | CancelImportMessage
  | ClosePluginMessage

export interface ConfirmAppendMessage {
  type: 'CONFIRM_APPEND'
  requestId: RequestId
}

export interface FontSubstitutionRequiredMessage {
  type: 'FONT_SUBSTITUTION_REQUIRED'
  requestId: RequestId
  sourceFont: FontReference
  availableFonts: AvailableFont[]
}

export interface ProcessingImportStatusMessage {
  type: 'IMPORT_STATUS'
  requestId: RequestId
  status: 'processing'
}

export interface SuccessImportStatusMessage {
  type: 'IMPORT_STATUS'
  requestId: RequestId
  status: 'success'
}

export interface WarningImportStatusMessage {
  type: 'IMPORT_STATUS'
  requestId: RequestId
  status: 'warning'
  message: string
}

export interface ErrorImportStatusMessage {
  type: 'IMPORT_STATUS'
  requestId: RequestId
  status: 'error'
  message: string
}

export type ImportStatusMessage =
  | ProcessingImportStatusMessage
  | SuccessImportStatusMessage
  | WarningImportStatusMessage
  | ErrorImportStatusMessage

export type ApplicationMessage =
  | ConfirmAppendMessage
  | FontSubstitutionRequiredMessage
  | ImportStatusMessage
