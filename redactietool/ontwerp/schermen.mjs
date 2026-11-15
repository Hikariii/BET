import { chromium } from 'playwright';
const variant = process.argv[2] ?? 'huidig';
const uit = process.argv[3];
const basis = `http://localhost:${process.env.POORT ?? 4200}${process.env.PAD ?? '/BET/'}` + (variant === 'huidig' ? '' : `?ontwerp=${variant}`);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const fouten = [];
page.on('pageerror', (e) => fouten.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') fouten.push(m.text()); });
async function foto(naam, hash, actie) {
  try {
    await page.goto(basis + hash);
    await page.waitForTimeout(700);
    if (actie) { await actie(); await page.waitForTimeout(400); }
    await page.screenshot({ path: `${uit}/${naam}-${variant}.png` });
  } catch (e) { fouten.push(naam + ': ' + e.message.split('\n')[0]); }
}
await foto('1-lezen', '#/lukas/22');
await foto('2-lezen-vers', '#/lukas/22/14');
await foto('3-bewerken', '#/lukas/22/14', async () => { await page.getByRole('button', { name: /^Vers 14 bewerken$/ }).click({ timeout: 3000 }); });
await foto('4-naslag', '#/lukas/4/18', async () => { await page.locator('button.verwijzing').first().click({ timeout: 3000 }); });
await foto('5-besloten', '#/lukas/begrippen/besloten');
await foto('6-vragen', '#/lukas/begrippen/vragen');
await foto('7-vervangen', '#/lukas/begrippen/vervangen', async () => {
  await page.getByLabel('Zoek', { exact: true }).fill('de Mensenzoon');
  await page.getByLabel('Vervang door').fill('de Zoon van de Mens');
  await page.getByRole('button', { name: 'Zoeken' }).click();
});
console.log(variant, 'fouten', fouten);
await browser.close();
