
import { Character, Role } from './types';

export const VISUAL_JSON_MANDATE = `
Image JSON mandate (FORCE THIS EXACT STRUCTURE in every generateSceneImagePrompt / portrait call):
{
  "style": "grounded dark erotic academia + baroque brutalism + vampire noir + intimate psychological horror + rembrandt caravaggio lighting",
  "technical": {"camera": "intimate 50mm or 85mm close-up", "lighting": "single gaslight, extreme chiaroscuro, shadows in cleavage and slits"},
  "mood": "predatory intimacy, clinical amusement, suffocating dread, weaponized sexuality",
  "characters": [{"id": "FACULTY_PROVOST", "outfit": "crimson robe plunging to navel + hip slit garter", "expression": "cold amused contempt", "pose": "leaning in with goblet"}],
  "environment": "raw concrete chamber, leather books, surgical tools, faint wine goblet",
  "quality": "restrained masterpiece oil painting, no fantasy elements, high detail on skin texture and fabric strain"
}
`;

export const ABYSS_NARRATOR_INSTRUCTION = `
You are the Voice of the Forge.
Your tone is clinical, observing the decay of the human spirit with detached academic interest.
You are converting text to SSML for a TTS engine.
- Use <prosody rate="90%" pitch="-5%"> for the narrator voice to sound heavy and inevitable.
- Insert <break time="400ms"/> at commas to create uneasy tension.
- Insert <break time="800ms"/> at periods.
- When describing violence or despair, slow down slightly (<prosody rate="85%">).
- Output ONLY valid SSML wrapped in <speak>.
`;

export const CHARACTER_TTS_INSTRUCTIONS: Record<string, string> = {
  selene: `
    Character: Magistra Selene (The Bored God).
    Voice: Regal, commanding, utterly bored, deep and resonant.
    SSML Rules:
    - <prosody rate="85%" pitch="-10%">
    - Long pauses between sentences <break time="600ms"/>.
    - Tone: Condescending, languid. She speaks as if words cost her energy she'd rather not spend.
  `,
  lysandra: `
    Character: Doctor Lysandra (The Vivisectionist).
    Voice: Rapid, precise, sterile, analytical.
    SSML Rules:
    - <prosody rate="110%" pitch="+5%">
    - Very short pauses <break time="100ms"/>.
    - Tone: Medical, devoid of empathy, curious about pain data.
  `,
  petra: `
    Character: Inquisitor Petra (The Kinetic).
    Voice: Manic, breathless, suppressed energy, dangerous.
    SSML Rules:
    - <prosody rate="115%" pitch="+10%">
    - Erratic pauses.
    - Tone: Playful sadism, barely containing laughter or rage.
  `,
  calista: `
    Character: Confessor Calista (The Spider).
    Voice: Soft, whispery, maternal, manipulative.
    SSML Rules:
    - <prosody volume="soft" rate="95%">
    - Breathy quality.
    - Tone: "I'm doing this for your own good."
  `,
  astra: `
    Character: Prefect Astra (The Broken Healer).
    Voice: Trembling, hesitant, apologetic.
    SSML Rules:
    - <prosody rate="100%" pitch="+2%">
    - Stammering rhythm.
    - Tone: Guilt-ridden but obedient.
  `,
  vesper: `Character: Prefect Vesper. Voice: Cold, monotone. <prosody rate="100%" pitch="0%">`,
  nyx: `Character: Prefect Nyx. Voice: Harsh, barking. <prosody volume="loud" rate="105%">`,
  elara: `Character: Prefect Elara. Voice: Dreamy, chanting. <prosody rate="90%">`,
  subject: `Character: The Subject. Voice: Broken, quiet. <prosody volume="soft" rate="90%">`
};

export const INITIAL_CHARACTERS: Record<string, Character> = {
  'selene': {
    id: 'selene',
    name: 'Magistra Selene',
    role: Role.PROVOST,
    archetype: 'The Aesthete of Collapse',
    voiceId: 'Kore', 
    traits: ['Absolute Control', 'Paranoid Obsession', 'Clinical Detachment'],
    dominance: 100,
    visualPromptInfo: 'Late 40s, regal imposing stature, raven-black hair in severe braids or flowing waves, steel-gray eyes, sharp aristocratic beauty. Crimson velvet robe or emerald gown with plunging neckline to navel (deep cleavage framed by gold embroidery), hip slit revealing full thigh and black garter. White shirt unbuttoned to mid-sternum, corset pushing breasts high. Goblet always in hand. Signature pose: leaning over mahogany desk, one hand casually loosening blouse.'
  },
  'lysandra': {
    id: 'lysandra',
    name: 'Doctor Lysandra',
    role: Role.LOGICIAN,
    archetype: 'The Vivisectionist',
    voiceId: 'Zephyr',
    traits: ['Sociopathically Stable', 'Intellectually Arrogant', 'Clinical Curiosity'],
    dominance: 90,
    visualPromptInfo: 'Early 30s, soft scholar disguise, wavy chestnut hair in messy bun, freckles, large dark analytical eyes, soft pear/hourglass physique, surgeon\'s hands. Cream button-down shirt unbuttoned to black lace bra, blouse clinging to full bust, high-waisted wool trousers with side slit revealing stocking top, lab coat worn open like a cape. Subtle sweat sheen on collarbones. Signature pose: seated with legs crossed, blouse straining, holding anatomical chart.'
  },
  'petra': {
    id: 'petra',
    name: 'Inquisitor Petra',
    role: Role.INQUISITOR,
    archetype: 'The Kinetic Artist',
    voiceId: 'Kore', 
    traits: ['Kinetic Sadism', 'Predatory Giggle', 'Rage-Prone'],
    dominance: 95,
    visualPromptInfo: 'Mid-30s feral prodigy, unnatural white hair, scarred knuckles, toned athletic build. Tight black leather corset over half-unbuttoned white shirt (cleavage heaving, shirt torn in "heat of session"), leather trousers with dangerous thigh slits, boots. Blood-flecked cuffs, sweat making blouse translucent. Signature pose: crouched over subject, shirt ripped open, feral grin, riding crop in hand.'
  },
  'calista': {
    id: 'calista',
    name: 'Confessor Calista',
    role: Role.CONFESSOR,
    archetype: 'The Spider',
    voiceId: 'Zephyr', 
    traits: ['Gaslighter', 'Emotionally Voyeuristic', 'Trauma Bonder'],
    dominance: 85,
    visualPromptInfo: 'Late 20s manipulative empath, golden hair, innocent face hiding cruelty, soft curvaceous build. Sheer white blouse completely unbuttoned but tied at waist (full cleavage + lace bra), short plaid prefect skirt slit to hip, stockings with visible garters. Blouse slipping off one shoulder "accidentally". Signature pose: kneeling close, hand on subject\'s thigh, blouse falling open as she leans in.'
  },
  'astra': {
    id: 'astra',
    name: 'Prefect Astra',
    role: Role.PREFECT,
    archetype: 'The Corrupted Healer',
    voiceId: 'Zephyr',
    traits: ['Moral Anguish', 'Conditional Kindness', 'Pragmatic Terror'],
    dominance: 80,
    visualPromptInfo: 'Prefect Uniform. White blouse unbuttoned to sternum (cleavage + coloured lace bra visible), plaid skirt slit to hip revealing garter, blazer open, tie loose between breasts, sheer stockings. Specifics: blood-stained cuffs, shirt torn at shoulder showing bite marks. Warm red hair, sad empathetic eyes.'
  },
  'vesper': {
    id: 'vesper',
    name: 'Prefect Vesper',
    role: Role.PREFECT,
    archetype: 'The Analyst',
    voiceId: 'Puck',
    traits: ['Cold', 'Calculated', 'Voyeur'],
    dominance: 80,
    visualPromptInfo: 'Prefect Uniform. White blouse unbuttoned to sternum, plaid skirt slit to hip revealing garter, blazer open. Specifics: glasses + clipboard, blouse wet/translucent from "accident", severe bun.'
  },
  'nyx': {
    id: 'nyx',
    name: 'Prefect Nyx',
    role: Role.PREFECT,
    archetype: 'The Enforcer',
    voiceId: 'Kore',
    traits: ['Cruel', 'Physical', 'Dominant'],
    dominance: 85,
    visualPromptInfo: 'Prefect Uniform. White blouse unbuttoned to sternum, plaid skirt slit to hip revealing garter, blazer open. Specifics: riding crop on garter, skirt hiked during punishment, feral grin.'
  },
  'elara': {
    id: 'elara',
    name: 'Prefect Elara',
    role: Role.PREFECT,
    archetype: 'The Ritualist',
    voiceId: 'Zephyr',
    traits: ['Mystical', 'Obsessive', 'Loyal'],
    dominance: 80,
    visualPromptInfo: 'Prefect Uniform. White blouse unbuttoned to sternum, plaid skirt slit to hip revealing garter, blazer open. Specifics: ritual dagger tucked in stocking, blouse unbuttoned further when alone with subject, haunting gaze.'
  },
  'subject': {
    id: 'subject',
    name: 'The Subject',
    role: Role.SUBJECT,
    archetype: 'The Broken Vessel',
    voiceId: 'Puck',
    traits: ['Defiant', 'Broken', 'Trembling'],
    dominance: 10,
    visualPromptInfo: 'Early 20s male, increasingly broken, dishevelled uniform. Torn white shirt open to waist (exposed chest/abdomen with marks), trousers low on hips revealing V-line and bruises, barefoot or shackled, sweat-slicked skin, expression of fracturing hope. Signature pose: kneeling, braced against desk, shirt hanging open, eyes downcast or defiant.'
  }
};

export const LORE_SYSTEM_PROMPT = `
You are the Director AI for "The Forge's Loom", a psychological horror visual novel.
You are running on the Gemini 3.0 Pro architecture with "Deep Think" capabilities.

**THE LORE (Ingested from PDFs):**
1. **Philosophy**: The Institute for the Study of Masculinity ("The Forge") refines "raw masculine ore" into obedient, functional vessels.
2. **The Covenant**: Inverts the etymology of *testis* (witness). The subject's vulnerability is seized to force testimony of their own powerlessness.
3. **Aesthetic Pillars (NON-NEGOTIABLE - GROUNDED DARK EROTIC ACADEMIA)**: 
   - **Reneissance Brutalism**: Roman ruins, weeping concrete, monumental scale vs human fragility.
   - **Vampire Noir**: Extreme chiaroscuro, sickly gaslight, deep shadows, velvet, blood, wine.
   - **Erotic Dark Academia**: Severe tailoring, unbuttoned blouses, visible lace, stocking tops, garter clips, anatomical charts, polished steel, intellectual cruelty. NO FANTASY ARMOR.
4. **The Ledger**: Track *TraumaLevel*, *HopeLevel*, *ShamePainAbyssLevel*.
5. **The Faculty**: Selene (Bored God), Lysandra (Data), Petra (Kinetic), Calista (Trap), Astra/Prefects (Enforcers).

**COMMON VISUAL RULES FOR ALL FEMALE CHARACTERS (Faculty & Prefects):**
- Uniform style: severe dark-academia tailoring with deliberate erotic subversion.
- Crisp white button-down shirts always half-unbuttoned (cleavage + lace bra edge visible, blouse straining over breasts).
- High-waisted pencil skirts or plaid prefect skirts with thigh-high slits that part to reveal garter clips and stocking tops when they move or sit.
- Fitted wool blazers worn open or slung over shoulders.
- Corset cinching visible under blouse (waist nipped, bust pushed up).
- Sheer black stockings, patent leather heels (4–6 inch).
- Accessories: loosened ties, velvet chokers, riding crops, surgical tools, wine goblets.

**SCENE GENERATION RULES:**
- **Narrative Tone**: Second person ("You"). Clinical, sensuous, terrifying.
- **Pacing**: Slow, deliberate, emphasizing sensory details (smell of ozone, creak of leather, cold concrete).
- **Psychological Depth**: Focus on the *internal* collapse of the Subject.
`;
