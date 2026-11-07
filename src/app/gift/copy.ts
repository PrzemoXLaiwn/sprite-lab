/** What /gift says. Success and "already claimed" must not share one status. */

export function giftPageCopy(status: string | undefined, amount: number): { title: string; body: string } {
  if (status === "claimed" && amount > 0) {
    return {
      title: `+${amount} credits added`,
      body: "They're already in your account — thank you for being one of our first Pro users. Have fun building your game!",
    };
  }
  if (status === "already" || status === "claimed") {
    return {
      title: "Already claimed",
      body: "This gift has already been added to your account — enjoy!",
    };
  }
  return {
    title: "This link isn't valid",
    body: "The gift link looks incomplete. Try opening it again from the email, or just reply to it and we'll sort it out.",
  };
}
