export const FERGUSON_SIGNATURE = `Warm regards,
Owen K. Ferguson, JP
Ferguson Law
(876) 320-0235`;

const TRAILING_FERGUSON_SIGNATURE =
  /(?:\r?\n){1,2}(?:(Warm regards,?)\r?\n)?(Owen K\. Ferguson,? JP)(?:\r?\n(Ferguson Law))?(?:\r?\n(\(876\) 320-0235))?\s*$/i;

export function splitFergusonSignature(body: string): {
  content: string;
  signature: { signOff: string; fullName: string; firm: string; phone: string } | null;
} {
  const match = TRAILING_FERGUSON_SIGNATURE.exec(body);
  if (!match || match.index === undefined) return { content: body, signature: null };

  return {
    content: body.slice(0, match.index).trimEnd(),
    signature: {
      signOff: match[1] ?? "Warm regards,",
      fullName: match[2],
      firm: match[3] ?? "Ferguson Law",
      phone: match[4] ?? "(876) 320-0235",
    },
  };
}

export function withFergusonSignature(body: string): string {
  const content = splitFergusonSignature(body).content.trim();
  return content ? `${content}\n\n${FERGUSON_SIGNATURE}` : FERGUSON_SIGNATURE;
}
