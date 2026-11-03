export const FERGUSON_SIGNATURE = `Warm regards,
Owen K. Ferguson, JP
Ferguson Law
(876) 320-0235`;

const TRAILING_FERGUSON_SIGNATURE =
  /(?:\r?\n){1,2}(?:warm regards,?\r?\n)?Owen K\. Ferguson,? JP(?:\r?\nFerguson Law)?(?:\r?\n\(876\) 320-0235)?\s*$/i;

export function withFergusonSignature(body: string): string {
  const content = body.trim().replace(TRAILING_FERGUSON_SIGNATURE, "").trimEnd();
  return content ? `${content}\n\n${FERGUSON_SIGNATURE}` : FERGUSON_SIGNATURE;
}
