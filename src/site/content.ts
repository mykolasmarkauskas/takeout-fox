/**
 * Copy for the crawlable pages around the game (/, /how-to-play/, /districts/, /characters/, /tips/).
 * Rendered to plain HTML at build time by src/site/render.ts, so search engines read every word
 * without running any script. Facts here must match the game: check src/game/* when changing rules.
 */

export const SITE = 'https://takeoutfox.com/';
export const NAME = 'Takeout Fox';

export interface Section { id: string; h2: string; body: string }
export interface Page {
  id: string;
  path: string; // '' for the landing page, 'how-to-play/' etc.
  nav: string;
  title: string; // <title>, ~60 chars
  description: string; // meta description, ~155 chars
  h1: string;
  lead: string;
}

export const PAGES: Page[] = [
  {
    id: 'home', path: '', nav: 'Home',
    title: 'Takeout Fox: Free Endless Runner Game, Play in Your Browser',
    description: 'Run the rooftops of Lanternfall as Marm the fox courier. A free 3D endless runner you play in the browser on phone or computer. No download, no sign-up.',
    h1: 'Takeout Fox',
    lead: 'A free 3D endless runner you play right in your browser. Marm the fox courier has one last order of extra-spicy noodles, thirty hangry raccoons on his tail, and nothing but rooftops between him and the customer.',
  },
  {
    id: 'how', path: 'how-to-play/', nav: 'How to play',
    title: 'How to Play Takeout Fox: Controls, Rules and Obstacles',
    description: 'Takeout Fox controls for phone and keyboard, how hits and deliveries work, what every rooftop obstacle needs (dodge, jump or slide) and what the power-ups do.',
    h1: 'How to play Takeout Fox',
    lead: 'Everything you need for your first run: the controls on phone and computer, what ends a run, how tips turn into score, and what to do about every chimney, crate and washing line in Lanternfall.',
  },
  {
    id: 'districts', path: 'districts/', nav: 'Districts',
    title: 'Takeout Fox Districts: Noodle Roofs, Harbour Lights, Gardens',
    description: 'The three districts of Lanternfall in Takeout Fox: Noodle Roofs, Harbour Lights and Garden Terraces. What changes, where each one starts and what to watch for.',
    h1: 'The districts of Lanternfall',
    lead: 'Lanternfall is a rooftop city of noodle shops, harbour boats and terraced gardens. Every 700 metres the run carries Marm into a new district, and the whole street changes around him.',
  },
  {
    id: 'cast', path: 'characters/', nav: 'Characters',
    title: 'Takeout Fox Characters: Marm, the Hangry Crowd and Customers',
    description: 'Meet the cast of Takeout Fox: Marm the fox courier, Grandma Pim, the Hangry Crowd of thirty raccoons, the customers waiting for dinner and the city pigeons.',
    h1: 'The characters of Takeout Fox',
    lead: 'A fox with a teal delivery backpack, a grandmother with a noodle shop, thirty raccoons who smelled dinner, and a city full of hungry customers. Here is who is who.',
  },
  {
    id: 'tips', path: 'tips/', nav: 'Tips for a high score',
    title: 'Takeout Fox Tips: How to Get a High Score',
    description: 'Practical Takeout Fox tips for longer runs and a higher score: how the score is counted, why tips matter, using power-ups well and surviving top speed.',
    h1: 'Takeout Fox tips for a high score',
    lead: 'The score is simple maths, and a few habits make runs much longer. These tips come straight from how the game counts points and how the rooftops are laid out.',
  },
];

/** Shared bits */
export const COMMON = {
  play: 'Play free now',
  play_short: 'Play',
  no_download: 'Free, no download, no sign-up. Works on phone, tablet and computer.',
  more_heading: 'More from the same maker',
  more: [
    ['https://hellopip.si/', 'Probably Intelligent', 'a free browser puzzle game about a very helpful AI that would really like to get out.'],
    ['https://gaminantis.lt/', 'Gaminantis.lt', 'free energy calculators and live electricity prices.'],
    ['https://konvertavimas.lt/', 'Konvertavimas.lt', 'free file and unit converter in your browser (in Lithuanian).'],
    ['https://roadlegs.com/', 'Roadlegs.com', 'another project from the same desk.'],
  ] as [string, string, string][],
  footer_fiction: 'Takeout Fox is a work of fiction. Lanternfall, its people and its raccoons are made up.',
  footer_privacy: 'No account and no ads. Your best scores are kept on your device; if you save a name to the leaderboard, that name and your score are stored, plus a short anonymous code used only to stop spam.',
};

/** Landing page sections (in order). Image paths are relative to the site root. */
export const HOME = {
  features: [
    ['Endless', 'No levels and no finish line: the city keeps going and so does the run.'],
    ['Three districts', 'Noodle Roofs, Harbour Lights and Garden Terraces, each with its own look and obstacles.'],
    ['Plays anywhere', 'Swipe on a phone or use the arrow keys. Loads in seconds, no install.'],
  ],
  story_h2: 'Why is Marm running?',
  story: [
    ['intro_01_last_order', 'Lanternfall, midnight. Grandma Pim’s noodle shop has one last order: extra-spicy, extra-hot. “Keep them steaming, Marm!”'],
    ['intro_02_smell', 'But the lid wasn’t on tight. The smell drifted over every rooftop in town…'],
    ['intro_03_crowd', '…and woke up the Hangry Crowd. Thirty raccoons. One craving.'],
    ['intro_04_run', 'No roads. No brakes. Run the rooftops, deliver it hot, and don’t drop the noodles!'],
  ] as [string, string][],
  how_h2: 'How to play in ten seconds',
  how_p: 'Marm runs by himself and keeps getting faster. You only steer: change lanes, jump and slide. Grab the gold tips along the way, hand the order over when a customer waves, and don’t hit the same trouble twice in a row: one bump makes Marm stumble, a second one within three seconds and the Hangry Crowd piles on.',
  controls: [
    ['Change lane', 'Swipe left or right', '← → or A / D'],
    ['Jump', 'Swipe up', '↑, W or Space'],
    ['Slide', 'Swipe down', '↓ or S'],
    ['Pause', 'Pause button', 'Esc or P'],
  ] as [string, string, string][],
  districts_h2: 'A city that changes as you run',
  districts_p: 'Every 700 metres the rooftops hand you over to a new district. The sky shifts, the houses change, and a red gate with the district’s name tells you where you are.',
  districts: [
    ['world_01_noodle_roofs', 'Noodle Roofs', 'Red tiled roofs, lantern strings and chimneys that puff steam from a hundred kitchens. Watch for chimneys in your lane and stray crates.'],
    ['world_02_harbour_lights', 'Harbour Lights', 'A purple evening over the water: wooden fishing boats bob below the rooftops, bollards line the edge and fish barrels block the way.'],
    ['world_03_garden_terraces', 'Garden Terraces', 'Green sky, bonsai trees in terracotta pots and flower carts parked right where you want to run.'],
  ] as [string, string, string][],
  power_h2: 'Power-ups',
  power: [
    ['pick_hotbag', 'Hot bag', 'Keeps the food safe once: the next bump is free.'],
    ['pick_chilli', 'Chilli dash', 'Four seconds of pure spice: Marm smashes straight through anything in his way.'],
    ['pick_umbrella', 'Floaty umbrella', 'Eight seconds of slow, floaty jumps that clear almost anything.'],
    ['pick_coin', 'Tips', 'Every gold tip adds 2% to your score multiplier. Deliveries pay five at once.'],
  ] as [string, string, string][],
  cast_h2: 'Who’s who',
  cast: [
    ['fox_02_run', 'Marm', 'Fox courier, teal backpack, zero brakes. Talks to himself while he runs.'],
    ['crowd_01_raccoons', 'The Hangry Crowd', 'Thirty raccoons with coupons, opinions and one shared craving.'],
    ['npc_01_grandma', 'Grandma Pim', 'Owner of the noodle shop and the reason the order has to arrive hot.'],
  ] as [string, string, string][],
  gags_h2: 'Meanwhile, elsewhere in Lanternfall…',
  gags_p: 'Now and then the run pauses for a quick cutaway gag: a chimney in therapy, the Pigeon Union voting on something, the noodles holding a meeting inside the box. They never cost you a run.',
  gags: ['gag_02_pigeon_union', 'gag_04_noodle_meeting', 'gag_05_seagull'],
  board_h2: 'Beat the leaderboard',
  board_p: 'After a run, type a name and your score goes on the shared Top Couriers board. Distance counts, and every tip you carried makes it count for more.',
  faq: [
    ['Is Takeout Fox free?', 'Yes. Takeout Fox is completely free to play in your browser. There is no download, no account and no ads.'],
    ['Does it work on my phone?', 'Yes. It runs in the browser on iPhone, iPad and Android phones and tablets, and on Windows, Mac, Linux and Chromebook computers. On a phone you play with swipes.'],
    ['Is it really endless?', 'Yes. There is no last level: the city keeps generating rooftops, the three districts take turns, and Marm keeps getting faster up to his top speed.'],
    ['How is the score counted?', 'Your score is the distance you ran in metres, multiplied by 1 plus 2% for every tip you collected. 1,000 metres with 50 tips scores 2,000.'],
    ['What ends a run?', 'Hitting an obstacle or missing a jump over a gap makes Marm stumble and lets the Hangry Crowd close in. A second hit within three seconds ends the run.'],
    ['Do I need to install anything?', 'No. Open takeoutfox.com and press Play. The game loads in a few seconds and keeps your best scores on your device.'],
  ] as [string, string][],
};

export const HOW = {
  sections: [
    { id: 'controls', h2: 'Controls', body: 'Marm runs forward on his own. You steer him across three lanes, make him jump and make him slide.' },
    { id: 'rules', h2: 'Hits, stumbles and the Hangry Crowd', body: 'The Hangry Crowd follows right behind you. Bump into an obstacle and Marm stumbles: the Crowd gets closer and Marm says something rude about gravity. Marm also loses a fifth of his speed. If you bump into anything again within three seconds, the Crowd catches up and the run is over. Gaps between roofs count the same way: miss the jump once and you stumble, miss twice in quick succession and the run ends.' },
    { id: 'tips-score', h2: 'Tips, deliveries and score', body: 'Gold tips are scattered along the lanes and in arcs over obstacles. Every 350 metres a customer waves from the rooftops and Marm hands over the order for five tips at once. Your score is the distance in metres times (1 + 2% for every tip), so tips quickly double or triple it.' },
  ],
  obstacles_h2: 'Obstacles and what to do',
  obstacles: [
    ['Chimneys', 'Tall brick chimneys stand in one lane, sometimes two side by side. Change lanes: they are too tall to jump.'],
    ['Crates, fish barrels and flower carts', 'Low obstacles in a single lane. Jump over them or change lanes. Tips often arc over the top to show the jump.'],
    ['Washing lines', 'A line of laundry across one lane at head height. Dodge it, jump it or slide under it.'],
    ['Gaps in the roofs', 'A gap across all three lanes. Jump it: it can’t be dodged. Missing it counts as a hit.'],
  ] as [string, string][],
  power_h2: 'Power-ups',
  speed_h2: 'Speed',
  speed_p: 'Marm starts at an easy jog and speeds up with every metre until he reaches top speed. A swipe or key press made a moment before landing is remembered, so you can line up your next jump while still in the air.',
};

export const DISTRICTS_PAGE = {
  intro: 'There are three districts and they take turns for as long as you can keep running: Noodle Roofs from the start, Harbour Lights from 700 metres, Garden Terraces from 1,400 metres, then back to Noodle Roofs at 2,100 metres and round again. Between two districts there is a stretch of about 180 metres where the old and new streets mix and the sky slowly changes colour, and a red gate over the street marks the exact border.',
  details: [
    ['Noodle Roofs', 'The heart of Lanternfall: red tile roofs, strings of red and gold lanterns, steaming chimneys and funny shop signs (“Wok this way”, “Soup of the day: yes”). The jump obstacle here is a wooden crate.', '0 m, 2,100 m, 4,200 m…'],
    ['Harbour Lights', 'The rooftops run along the harbour. Wooden fishing boats with little cabins bob in the water on the left, bollards and rope line the edge, and the lanterns turn warm white and teal. The jump obstacle here is a stack of fish barrels.', '700 m, 2,800 m, 4,900 m…'],
    ['Garden Terraces', 'The greenest part of town: bonsai trees in terracotta pots, hedges, flower pots on the curb and flower garlands overhead. The jump obstacle here is a gardener’s flower cart.', '1,400 m, 3,500 m, 5,600 m…'],
  ] as [string, string, string][],
};

export const CAST_PAGE = {
  people: [
    ['fox_04_proud', 'Marm', 'The fastest courier in Lanternfall and the hero of the game. Marm is a young fox in a yellow hoodie and a red cap, with a teal insulated backpack that keeps the noodles hot. He talks to himself while he runs (“Note to self: buy a scooter”) and takes every crash personally.'],
    ['npc_01_grandma', 'Grandma Pim', 'She runs the noodle shop where the story starts. Her last order of the night is extra-spicy and extra-hot, and she expects it to arrive that way.'],
    ['crowd_01_raccoons', 'The Hangry Crowd', 'Thirty raccoons woken by the smell of Grandma Pim’s noodles. They chase Marm across every district, shouting things like “Just ONE bite!” and “We have coupons!”. One stumble lets them close in.'],
    ['npc_02_student', 'The customers', 'Every 350 metres someone is waiting on a rooftop: a student before an exam, an opera singer, a baker who says his bread is better, a grumpy gardener and Grandma Pim’s regulars. Each delivery is worth five tips.'],
    ['gag_02_pigeon_union', 'The pigeons and the seagull', 'Lanternfall’s birds have opinions. The Pigeon Union holds votes, and a seagull keeps trying to order takeout for himself. You will meet them in the cutaway gags.'],
  ] as [string, string, string][],
};

export const TIPS_PAGE = {
  tips: [
    ['Collect tips, not just distance', 'The score is distance × (1 + 2% per tip). Fifty tips double your score and a hundred triple it, so a lane full of gold is often worth a small risk.'],
    ['Never take two hits in a row', 'The first bump only costs you a little ground to the Hangry Crowd. The second one within three seconds ends the run. After a stumble, play the next few seconds safe.'],
    ['Use the tip arcs as a guide', 'Tips that rise in an arc over a crate, barrel or cart show the exact jump that clears it. Follow the arc and you collect them all on the way over.'],
    ['Save the chilli for trouble', 'Chilli dash lets Marm smash through anything for four seconds. It is at its best when the road ahead is crowded with chimneys.'],
    ['Plan your next move in the air', 'A swipe or key press made just before landing is remembered, so you can queue the next jump or lane change while still airborne.'],
    ['Know where the districts change', 'Districts change every 700 metres. The mixed stretch around each border has a new obstacle look, so keep an eye on what is jumpable.'],
    ['Deliveries are free points', 'Every 350 metres a customer takes the order for five tips. You don’t have to do anything except stay alive.'],
  ] as [string, string][],
};
