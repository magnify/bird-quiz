export interface LicenseOption {
  value: string
  label: string
}

export const LICENSE_OPTIONS: LicenseOption[] = [
  { value: 'cc-by-2.0', label: 'CC BY 2.0' },
  { value: 'cc-by-3.0', label: 'CC BY 3.0' },
  { value: 'cc-by-4.0', label: 'CC BY 4.0' },
  { value: 'cc-by-sa-2.0', label: 'CC BY-SA 2.0' },
  { value: 'cc-by-sa-3.0', label: 'CC BY-SA 3.0' },
  { value: 'cc-by-sa-4.0', label: 'CC BY-SA 4.0' },
  { value: 'cc0', label: 'CC0 / Public Domain' },
  { value: 'public-domain', label: 'Public Domain' },
  { value: 'own', label: 'Eget billede' },
  { value: 'copyright', label: 'Copyright (med tilladelse)' },
]

export function isKnownLicense(value: string | undefined): boolean {
  if (!value) return false
  const v = value.toLowerCase()
  return LICENSE_OPTIONS.some(o => o.value === v)
}
