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
  /** Not in the top bar (legal pages, search-landing articles); still in the footer and sitemap. */
  hidden?: boolean;
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
  {
    id: 'subway', path: 'games-like-subway-surfers/', nav: 'Games like Subway Surfers', hidden: true,
    title: 'Games Like Subway Surfers You Can Play Free in a Browser',
    description: 'Like lane-switching runners such as Subway Surfers? Takeout Fox is a free 3D endless runner you play in the browser: swipe, jump, slide, no download.',
    h1: 'A game like Subway Surfers, right in your browser',
    lead: 'If you love three-lane runners where you swipe, jump and slide past everything the street throws at you, Takeout Fox plays the same way, runs in any browser and costs nothing.',
  },
  {
    id: 'runner', path: 'endless-runner-games/', nav: 'Free endless runner online', hidden: true,
    title: 'Free Endless Runner Game Online, No Download: Takeout Fox',
    description: 'Play a free 3D endless runner online with no download or sign-up. Three lanes, rising speed, power-ups, daily tasks and a leaderboard. Phone or computer.',
    h1: 'A free endless runner you can play online',
    lead: 'Takeout Fox is a 3D endless runner that opens in a browser tab: no app store, no account, no ads. The run never ends, it just gets faster.',
  },
  {
    id: 'fox', path: 'fox-games/', nav: 'Fox games', hidden: true,
    title: 'Fox Game Online: Run as Marm the Fox Courier, Free',
    description: 'A free fox game you play online: Marm the fox courier races over rooftops with a bag of noodles, a crowd of hangry raccoons on his tail. No download.',
    h1: 'A fox game you can play free online',
    lead: 'Marm is a fox with a teal delivery backpack and one last order of extra-spicy noodles. You keep him running across the rooftops of Lanternfall for as long as you can.',
  },
  {
    id: 'privacy', path: 'privacy/', nav: 'Privacy policy', hidden: true,
    title: 'Privacy Policy · Takeout Fox',
    description: 'What Takeout Fox stores and why: progress on your device, an optional leaderboard name, anonymous play counts. No accounts, no ads, no tracking cookies.',
    h1: 'Privacy policy',
    lead: 'Short version: no account, no ads, no tracking cookies. Your progress stays on your device. If you save a name to the leaderboard, that name and your score are stored. We count runs anonymously to make the game better.',
  },
  {
    id: 'terms', path: 'terms/', nav: 'Terms of use', hidden: true,
    title: 'Terms of Use · Takeout Fox',
    description: 'The terms for playing Takeout Fox: free to play, fair play on the leaderboard, what you may and may not do with the game, and how to contact us.',
    h1: 'Terms of use',
    lead: 'Takeout Fox is free to play. These few rules keep it fair and fun for everyone.',
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

/** Plain article pages: [heading, paragraphs][]. Facts must match the game (src/game/*). */
export const CONTACT = 'hello@takeoutfox.com';
export const UPDATED = '21 October 2026';
export const ARTICLES: Record<string, { sections: [string, string[]][]; faq?: [string, string][] }> = {
  subway: {
    sections: [
      ['Why lane runners are so hard to put down', [
        'Three lanes, one thumb and a street that never ends: you always know what to do, the question is only whether you do it in time. Every run is short enough for a bus stop and every near miss makes you want one more.',
        'Takeout Fox keeps exactly that loop. Swipe left or right to change lanes, swipe up to jump, swipe down to slide. A short tap also jumps. On a computer the arrow keys or WASD do the same.',
      ]],
      ['What is the same, what is different', [
        'Same: three lanes, swipe controls, coins to collect (here they are tips from customers), power-ups, a chase behind you and a speed that keeps climbing.',
        'Different: you run over rooftops instead of train tracks, through three districts that change the whole scenery (Noodle Roofs, Harbour Lights and Garden Terraces), and the chasers are a crowd of hangry raccoons who want your noodles. A bump does not end the run at once: a second bump within a few seconds does.',
        'There is no app to install, no account and no ads. The game runs in Chrome, Safari, Firefox and Edge on phones, tablets and computers.',
      ]],
      ['Things to chase once you are hooked', [
        'Three daily tasks give bonus tips every day, achievements come in tiers that keep getting bigger, and the tips you bank buy bag colours and extras for Marm in the shop. A shared leaderboard has an all-time and a today tab.',
      ]],
    ],
    faq: [
      ['Is Takeout Fox free?', 'Yes. It is free to play in the browser, with no download, no sign-up and no ads.'],
      ['Does it work on a phone?', 'Yes. It is made for portrait phones first, and also works on tablets and computers.'],
      ['Is it made by the same people as Subway Surfers?', 'No. Takeout Fox is an independent game. We only compare it because it plays in a similar three-lane style.'],
    ],
  },
  runner: {
    sections: [
      ['Play in a tab, keep running', [
        'Open takeoutfox.com/play and press Run. The first district loads in seconds and the rest streams in while you play. Once it has loaded, you can add it to your home screen and it works offline too.',
      ]],
      ['How a run works', [
        'Marm starts at a jog and gets quicker every few hundred metres. Chimneys block a lane, crates and washing lines can be jumped or dodged, and gaps in the roof must be jumped. One bump slows you down and brings the raccoons closer; a second bump soon after ends the run.',
        'Your score is the distance you run, boosted by the tips you collect. Power-ups help: the hot bag shields one hit, the chilli makes you sprint through obstacles, the umbrella lets you float over the gaps.',
      ]],
      ['Why it stays fresh', [
        'Every 700 metres the city changes around you, from noodle-shop roofs to a harbour boardwalk to terraced gardens. Funny scenes play out beside the track and the news ticker reports on them. Daily tasks, tiered achievements and a shop give every run a goal.',
      ]],
    ],
    faq: [
      ['Do I need to install anything?', 'No. It runs in the browser. You can add it to your home screen if you like.'],
      ['Does the run ever end?', 'Only when you bump twice in quick succession. The street itself is endless.'],
      ['Is there a leaderboard?', 'Yes, with all-time and today tabs. Saving a name is optional.'],
    ],
  },
  fox: {
    sections: [
      ['Meet Marm', [
        'Marm is the fastest courier in Lanternfall: a chunky orange fox in a mustard hoodie, red cap and teal delivery backpack. His grandmother runs the noodle shop, and tonight the last order is extra spicy and very late.',
      ]],
      ['What you do', [
        'Keep Marm running across the rooftops. Swipe to change lanes, jump chimneys and gaps, slide under washing lines, collect tips and grab power-ups. Behind him, thirty raccoons who smelled the noodles are not giving up.',
      ]],
      ['Make the fox yours', [
        'Tips you bank buy new bag colours and extras for Marm: a cosy scarf, cool shades or a chef hat. Daily tasks and achievements pay out more tips.',
      ]],
    ],
    faq: [
      ['Is this fox game free?', 'Yes, free in the browser with no ads and no sign-up.'],
      ['Is it suitable for kids?', 'Yes. It is cartoon slapstick: nobody gets hurt, Marm just flattens like a pancake now and then.'],
    ],
  },
  privacy: {
    sections: [
      ['Who we are', [
        `Takeout Fox (takeoutfox.com) is made by an independent developer in Lithuania. For anything about this policy, write to ${CONTACT}.`,
      ]],
      ['What stays on your device', [
        'Your progress (tips banked, daily tasks, achievements, shop items), your settings (volumes, battery saver), your best score and the leaderboard name you last used are kept in your browser\'s local storage. They never leave your device unless you save a score. You can delete them any time by clearing this site\'s data in your browser.',
        'If you add the game to your home screen, your browser also keeps a copy of the game files so it can run offline.',
      ]],
      ['The leaderboard (only if you save a score)', [
        'When you choose to save a score we store the name you typed, your score, distance, tips and the time. To stop spam, we also keep a one-way scrambled code made from your network address for about ten minutes; the address itself is not stored. Names and scores stay on the board while they are among the top results.',
        'Please do not use your full real name. We remove names that are offensive or scores that are clearly not real.',
      ]],
      ['Anonymous play statistics', [
        'To find out where the game is too hard or too easy, the game sends a few anonymous events: a run started, how far it got (in 250 m steps), what ended it and in which district, and when a daily task, achievement or shop item is completed. These are added up into daily totals. No network address, device identifier, name or cookie is stored with them. Daily totals are kept for 30 days.',
      ]],
      ['Services that help run the site', [
        'Cloudflare delivers the site and counts page visits with Cloudflare Web Analytics, which does not use cookies. Hostinger hosts the site and, like every web host, keeps short-lived server logs for security and troubleshooting.',
      ]],
      ['What we do not do', [
        'No accounts, no ads, no tracking or advertising cookies, no selling or sharing of data. If ads are ever added to an app version, this policy will be updated first and you will be asked where the law requires it.',
      ]],
      ['Children', [
        'The game is suitable for all ages and does not ask anyone for personal information. The only thing anyone can type is a leaderboard name, which is optional.',
      ]],
      ['Your rights', [
        `Under the GDPR you can ask what we hold about you and ask us to delete it. In practice the only thing that can be linked to you is a leaderboard name: write to ${CONTACT} with the name and score and we will remove it.`,
      ]],
      ['Changes', [
        `If this policy changes, the new version will be posted here with a new date. Last updated: ${UPDATED}.`,
      ]],
    ],
  },
  terms: {
    sections: [
      ['Playing', [
        'Takeout Fox is free to play for personal, non-commercial fun. You do not need an account.',
      ]],
      ['Fair play', [
        'Leaderboard names must not be offensive, impersonate someone or advertise anything. Scores must come from real play. We may remove any name or score that breaks these rules, without notice.',
      ]],
      ['The game and its content', [
        'The game, its characters (Marm, the Hangry Crowd and the people of Lanternfall), art, music, sounds and code belong to their maker. You may share links, screenshots and videos of your runs. You may not copy, sell or re-host the game without permission.',
      ]],
      ['No guarantees', [
        'The game is provided as it is. We do our best to keep it running, but it may change, pause or stop, and progress kept on your device can be lost if your browser data is cleared.',
      ]],
      ['Contact and law', [
        `Questions: ${CONTACT}. These terms are governed by the laws of the Republic of Lithuania. Last updated: ${UPDATED}.`,
      ]],
    ],
  },
};

