import fs from "node:fs";

const path = "server.ts";
let source = fs.readFileSync(path, "utf8");
const importLine = 'import { registerKairaProposalRecoveryWorkerRoute } from "./src/services/kairaProposalRecoveryWorkerRoute";';
const importAnchor = 'import type {\n  DroitDynamicState,\n} from "./src/types/nexus";';
const useAnchor = 'app.use(express.json());';

if (source.includes(importLine) || source.includes('registerKairaProposalRecoveryWorkerRoute(app);')) {
  throw new Error("worker route already wired");
}
if (source.split(importAnchor).length !== 2) throw new Error("expected unique worker import anchor");
if (source.split(useAnchor).length !== 2) throw new Error("expected unique express json anchor");

source = source.replace(importAnchor, `${importLine}\n${importAnchor}`);
source = source.replace(useAnchor, `${useAnchor}\nregisterKairaProposalRecoveryWorkerRoute(app);`);
fs.writeFileSync(path, source);
