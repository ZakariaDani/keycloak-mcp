/** A tool result reporting a problem the caller can act on. */
export const fail = (text: string) => ({
  content: [{ type: "text" as const, text }],
  isError: true
});
