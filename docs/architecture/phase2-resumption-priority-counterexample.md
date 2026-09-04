# Phase 2 resumption-priority counterexample

Counterexample retained for review: a turn can simultaneously be a third-party semantic target and an explicit request to resume/advise on an unresolved topic. Treating `target=third_party` as a fresh-thread signal before checking `adviceRequested` duplicates the topic and makes a previously unambiguous thread ambiguous. The fix is semantic-priority ordering in DiscourseState, not phrase matching.
