/** Keep Shift+Enter distinct from submit, including when enhanced reporting is absent. */
export function shiftEnterInput(csiU: boolean): string {
  return csiU ? '\x1b[13;2u' : '\x1b\r'
}
