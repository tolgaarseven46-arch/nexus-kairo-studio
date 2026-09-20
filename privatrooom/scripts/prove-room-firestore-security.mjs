import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

assert.doesNotMatch(rules, /match \/rooms\/\{roomId\}[\s\S]*?allow create, update: if true;/);
assert.doesNotMatch(rules, /match \/messages\/\{messageId\}[\s\S]*?allow read, create, update: if true;/);
assert.match(rules, /allow create: if signedIn\(\);/);
assert.match(rules, /immutableRoomAuthorityFieldsStaySame/);
assert.match(rules, /affectedKeys\(\)\.hasAny\(\[[\s\S]*?'creatorUid'[\s\S]*?'kairaPresence'/);
assert.match(rules, /request\.resource\.data\.senderUid == request\.auth\.uid/);
assert.match(rules, /request\.resource\.data\.messageSource == null/);
assert.match(rules, /resource\.data\.senderUid == request\.auth\.uid/);

console.log('room Firestore security proof: GREEN');
