# User journey

- Open the app
- there's a prompt depending on the modes
  - default mode: note (or self-talk)
  - the other mode: ask AI
- note mode
  - just save the user input
- ask mode
  - answer the question
  - there's END button
  - when a user clicks the END button, summarize the conversation and save the summary
- view history
  - previous N notes/conversation-summary

# Examples

## self-talk at date-1
- I feel sad

## note at date-2
- I joined gym membership today

## ask at date-3
- ex
  - Me: I recently barely go to gym. I want to cancel the membership.
  - AI: You joined the gym at {date-2}. How long is your membership contract?
  - Me: Maybe 18 months?
  - AI: You can cancel your membership 6 months later or cancel now with a breaking fee.
  - 3 months later
  - Me: I want to cancel my gym membership.
  - AI: Since your 18-month membership started at {date} and you haven't canceled it yet, you can cancel in 3 months or end it now with a cancellation fee.
- example summary
  - I asked about canceling a gym membership; after confirming the membership started on {date-2} with an 18-month contract, the AI explained they could either wait until the contract ended (initially 6 months remaining, later 3 months remaining) or cancel immediately by paying an early termination fee.

## history
- at date-1 (self-talk): I feel sad
- at date-2 (note): I joined gym membership today
- at date-3 (ask): I asked about canceling a gym membership; after confirming the membership started on {date-2} with an 18-month contract, the AI explained they could either wait until the contract ended (initially 6 months remaining, later 3 months remaining) or cancel immediately by paying an early termination fee.
