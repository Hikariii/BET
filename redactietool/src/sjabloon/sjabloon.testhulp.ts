import { execFileSync } from 'node:child_process';
import path from 'node:path';

const HOOFDMAP = path.resolve(import.meta.dirname, '../../..');
const SJABLOON_LUKAS = path.join(HOOFDMAP, "bijbel/lukas/origineel/Lukas Jezus' woorden en highlights 1.0.docx");

/** `word/styles.xml` van het Lukas-sjabloon, rechtstreeks uit het docx gelezen (een docx is een zip). */
export function leesStylesXmlVanSjabloon(): string {
	return execFileSync('unzip', ['-p', SJABLOON_LUKAS, 'word/styles.xml'], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
}
