import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUT_DIR = '/home/z/my-project/public/images/btm';

const STYLE = 'dark fantasy RPG concept art, dramatic cinematic lighting, atmospheric fog, mature grim tone, AAA game splash art quality, intricate details, high contrast, painterly digital illustration, no text, no watermark';

const HERO = {
  file: 'hero.jpg',
  size: '864x1152',
  prompt: `Lone hooded warrior challenger in dark engraved plate armor with glowing amber core, standing on a cliff facing a colossal machine fortress in the distance, back view, ember sparks floating, moody dusk sky with crimson horizon, ${STYLE}`,
};

const BOSSES = [
  {
    file: 'boss1.jpg',
    size: '864x1152',
    prompt: `SENTINEL PRIME, colossal gatekeeper machine boss, towering bronze-and-iron automaton warden with a single burning furnace eye, armored shoulders shaped like fortress bastions, chains and glowing calculation runes etched on metal, standing guard at iron gates, embers and ash, ${STYLE}`,
  },
  {
    file: 'boss2.jpg',
    size: '864x1152',
    prompt: `THE ARCHITECT, machine boss made of floating glass panels and brass mechanical arms, each arm writing glowing equations in the air, a hooded chassis of clockwork with a bright geometric halo behind its head, blueprint light beams, marble and brass ruins background, ${STYLE}`,
  },
  {
    file: 'boss3.jpg',
    size: '864x1152',
    prompt: `THE GEOMANCER, sinister machine sorcerer boss, cloaked in fragmented mirrored shards, faceless porcelain mask with carved compass rose, hovering crystal polyhedra orbiting around it, reality bending into impossible angles, arcane violet and teal energy, ${STYLE}`,
  },
  {
    file: 'boss4.jpg',
    size: '864x1152',
    prompt: `OVERLORD VOLT, thunder tyrant machine boss, titanic humanoid dynamo crackling with lightning arcs, tesla coil crown, molten copper veins glowing across blackened steel armor, storm clouds swirling above, lightning striking its raised gauntlet, electric amber and deep charcoal palette, ${STYLE}`,
  },
  {
    file: 'boss5.jpg',
    size: '864x1152',
    prompt: `THE TYRANT, alchemical machine warlord boss, armored torso of corroded brass vats and glass tubes filled with luminous toxic green and crimson fluids, plague-doctor like iron mask with three lenses, dripping cauldrons and vapor, toxic fog laboratory throne room, ${STYLE}`,
  },
  {
    file: 'boss6.jpg',
    size: '864x1152',
    prompt: `NULL SOVEREIGN, void emperor machine boss, regal skeletal frame of black obsidian metal with cracks leaking pure darkness, tattered royal mantle of drifting star field, a collapsed binary star halo above its crown, throne of shattered monoliths floating in an abyss, white void light against absolute black, ${STYLE}`,
  },
  {
    file: 'boss7.jpg',
    size: '864x1152',
    prompt: `REQUIEM OMEGA, final god-machine boss, cathedral-sized divine engine with a serene angelic metal face, wings made of spinning clockwork blades and data streams, core of blinding white-gold light, ruined digital cathedral with floating pillars, judgment day atmosphere, awe and terror, ${STYLE}`,
  },
];

const REGIONS = [
  { file: 'region1.jpg', prompt: `vast iron fortress gates of a machine empire at dawn, ash plains with broken calculating engines, distant warden towers with furnace eyes, path of cracked stone leading to giant gate, ${STYLE}` },
  { file: 'region2.jpg', prompt: `floating marble archives and brass machinery of an equation citadel, giant rotating astrolabe rings in the sky, glass bridges between towers, cold blue morning light, ${STYLE}` },
  { file: 'region3.jpg', prompt: `impossible geometry canyon, mirrored crystal spires defying gravity, violet arcane storm overhead, floating polyhedra rocks, reality warping dreamscape, ${STYLE}` },
  { file: 'region4.jpg', prompt: `storm-wracked highlands with colossal broken tesla pylons, lightning hitting copper conduits, turbulent clouds, muddy battlefield with wrecked dynamos, epic scale, ${STYLE}` },
  { file: 'region5.jpg', prompt: `subterranean alchemical foundry, rivers of glowing green and orange chemicals, giant distillation towers and pipes, toxic vapors, cavern ceiling with hanging cauldrons, ${STYLE}` },
  { file: 'region6.jpg', prompt: `void abyss plateau, floating obsidian monoliths around a black hole sun, star field below the edge, pale ghostly light, silent cosmic dread, minimal colors black white and deep blue, ${STYLE}` },
  { file: 'region7.jpg', prompt: `ruined digital cathedral of the machine god, colossal broken columns of light and data, white-gold judgment beams from the sky, floating altar, epic final battlefield, holy yet menacing, ${STYLE}` },
];

async function gen(zai, item, retries = 3) {
  const outPath = path.join(OUT_DIR, item.file);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 10000) {
    console.log(`skip ${item.file} (exists)`);
    return true;
  }
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await zai.images.generations.create({ prompt: item.prompt, size: item.size });
      const b64 = response?.data?.[0]?.base64;
      if (!b64) throw new Error('empty base64');
      fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
      console.log(`OK ${item.file} (${Math.round(fs.statSync(outPath).size / 1024)} KB)`);
      return true;
    } catch (err) {
      console.error(`FAIL ${item.file} attempt ${attempt}: ${err.message}`);
      if (attempt < retries) await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
  return false;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const zai = await ZAI.create();

  const all = [HERO, ...BOSSES, ...REGIONS.map(r => ({ ...r, size: '1344x768' }))];
  let ok = 0;
  for (const item of all) {
    if (await gen(zai, item)) ok++;
  }
  console.log(`\nDone: ${ok}/${all.length} images`);
  if (ok < all.length) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
