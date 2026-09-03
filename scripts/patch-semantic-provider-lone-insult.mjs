import fs from "node:fs";
const path = "src/services/llmSemanticUnderstandingProvider.ts";
let source = fs.readFileSync(path, "utf8");
const from = '- Yalnız "salak" gibi hedefi belirsiz tek hakaret sözcüğünde target:unknown, uncertainty yüksek ve severity temkinli olmalı. "sen salaksın" / "Kaira sen salaksın" gibi açık ikinci-şahıs hedefinde target:kaira ve gerçek hostility kanıtına uygun severity üret.';
const to = '- Yalnız "salak" gibi hedefi belirsiz tek hakaret sözcüğünde target:unknown, primaryIntent:other, secondarySocialActs içinde insult YOK, uncertainty yüksek ve severity temkinli olmalı; bu yalnız lexical candidate kanıtıdır. "sen salaksın" / "Kaira sen salaksın" gibi açık ikinci-şahıs hedefinde target:kaira ve gerçek hostility kanıtına uygun primaryIntent:insult / insult act / severity üret.';
if (!source.includes(from)) {
  if (source.includes(to)) process.exit(0);
  throw new Error("semantic provider lone-insult marker missing");
}
source = source.replace(from, to);
fs.writeFileSync(path, source);
