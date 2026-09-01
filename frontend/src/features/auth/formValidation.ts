export function getEmailError(
  value: string,
  showRequiredError = true,
): string | undefined {
  const email = value.trim()

  if (email.length === 0) {
    return showRequiredError ? 'Enter your email address.' : undefined
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? undefined
    : 'Enter a valid email address.'
}
