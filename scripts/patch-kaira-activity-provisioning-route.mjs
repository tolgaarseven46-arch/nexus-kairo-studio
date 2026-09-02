import fs from "node:fs";

const path = "server.ts";
let source = fs.readFileSync(path, "utf8");
const importAnchor = 'import { registerKairaProposalRecoveryWorkerRoute } from "./src/services/kairaProposalRecoveryWorkerRoute";';
const provisioningImport = 'import { registerKairaActivityProvisioningRoute } from "./src/services/kairaActivityProvisioningRoute";';
if (!source.includes(importAnchor)) throw new Error("worker route import anchor missing");
if (!source.includes(provisioningImport)) source = source.replace(importAnchor, `${importAnchor}\n${provisioningImport}`);
const registerAnchor = "app.use(express.json());\nregisterKairaProposalRecoveryWorkerRoute(app);";
const replacement = "app.use(express.json());\nregisterKairaProposalRecoveryWorkerRoute(app);\nregisterKairaActivityProvisioningRoute(app);";
if (!source.includes(registerAnchor)) throw new Error("worker route registration anchor missing");
source = source.replace(registerAnchor, replacement);
if ((source.match(/registerKairaActivityProvisioningRoute/g) || []).length !== 2) throw new Error("unexpected provisioning registrar count");
fs.writeFileSync(path, source);
