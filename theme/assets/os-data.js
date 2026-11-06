/* os-data.js: from the old web/pages/_data.html (OScreenplay's engine, unchanged). The lexicon: spark slots, idea decks, reactions, names, prompts. */
(function () {
  'use strict';
  var OS = window.OS = window.OS || {};

  function P(list) {
    return list.map(function (s) {
      var p = s.split('|');
      return { t: p[0].trim(), g: (p[1] || '').trim() ? p[1].trim().split(/\s+/) : [], x: (p[2] || '').trim(), y: (p[3] || '').trim() };
    });
  }
  // Idea decks: "title|description|tags|extra"
  function D(list) {
    return list.map(function (s) {
      var p = s.split('|');
      return { t: p[0].trim(), d: (p[1] || '').trim(), g: (p[2] || '').trim() ? p[2].trim().split(/\s+/) : [], x: (p[3] || '').trim() };
    });
  }
  OS.parseItems = P;

  OS.GENRES = [
    ['dr', 'Drama', 'Characters under pressure, choices with weight. The arc is internal.', 'A personal crisis, relationships tested, a real cost.'],
    ['co', 'Comedy', 'A flawed hero with a big want and escalating trouble. Truth delivered by surprise.', 'Rule of three. Make things worse, not darker. Let characters be wrong with total conviction.'],
    ['cr', 'Crime', 'Rules broken, loyalties tested, consequences you can\'t outrun.', 'The family or the crew, the job, the betrayal, the price.'],
    ['th', 'Thriller', 'Danger, a clock, and a hero always one step behind.', 'Suspense over surprise: the audience knows more than the hero.'],
    ['ho', 'Horror', 'Fear is the engine; what the monster means matters more than how it looks.', 'Isolation, clear rules for the threat, a final face-to-face with the thing (or the self).'],
    ['sf', 'Science fiction', 'A "what if" about technology, society or time.', 'One big rule, explored to its consequences. Humanity tested by the new.'],
    ['fa', 'Fantasy', 'Magic with rules and costs.', 'A world bible, the cost of power, a chosen (or unchosen) hero.'],
    ['ro', 'Romance', 'Two people and one obstacle, usually themselves.', 'Meet-cute, forced proximity, the dark moment, the grand gesture.'],
    ['fm', 'Family', 'For every age. Heart first.', 'Clear wants, warm humour, a lesson that never feels like a lecture.'],
    ['ac', 'Action', 'Physical conflict with clear goals and clear geography.', 'Set pieces that escalate; every fight reveals character.'],
    ['my', 'Mystery', 'A question the audience badly wants answered.', 'Fair-play clues, red herrings, a reveal that changes everything before it.'],
    ['we', 'Western', 'Frontiers, codes, and the law against the lawless.', 'Big landscapes, a moral code, the showdown.']
  ];
  OS.GENRE = {};
  OS.GENRES.forEach(function (g) { OS.GENRE[g[0]] = { key: g[0], name: g[1], about: g[2], conventions: g[3] }; });

  /* ======================================================================== Spark slot pools */
  var S = OS.S = {};
  S.setting = P([
    'In a sleepy dairy village|co fa ro fm', 'In a drowned seaside town|dr my ho', 'On the last night of a dying carnival|dr ho fa',
    'Aboard a generation ship that forgot where it\'s going|sf dr', 'In a Montréal laundromat that never closes|co dr ro',
    'In a border town where the river keeps moving|we dr cr', 'Inside a luxury bunker built for billionaires|th sf co',
    'At a ski resort the week before it closes forever|dr co ro', 'In a monastery that brews the world\'s strongest beer|co dr',
    'On a container ship stuck in a canal for forty days|th dr co', 'In a suburb where every lawn is judged|co fm',
    'In a 1970s radio station behind the Iron Curtain|dr th', 'Deep inside a theme park after closing time|ho co fm',
    'In a city where it has rained for nine years|sf my dr', 'In the back kitchen of a famous restaurant|dr co ro',
    'On a remote Arctic research station|th ho sf', 'In a nursing home with a secret poker ring|co dr',
    'In a desert motel on an empty highway|we cr th', 'Inside a high school during the final week of senior year|co dr ro fm',
    'In a kingdom where lying is physically impossible|fa co', 'In an abandoned shopping mall turned into a village|sf dr fm',
    'In a fishing harbour run by one family for a century|cr dr', 'On a reality show filmed on a deserted island|co th',
    'In the waiting room of the afterlife|fa co dr', 'In 1920s Paris, in a jazz club with no licence|dr ro cr',
    'On an island that only appears at low tide|fa my ho', 'On the night shift at a diner on the Moon|sf co',
    'In an Alpine village that elects a new mayor every winter|co dr', 'In a megachurch the week of its biggest scandal|dr co',
    'In a forest that rearranges itself every night|fa ho fm', 'In a hospital where nobody is allowed to die on Sundays|fa dr co',
    'Inside a family-run funeral home|co dr', 'In a forgotten underground metro line|sf th ac', 'At a wedding that lasts three days|co ro dr',
    'In a prison library|dr cr', 'On a sheep farm at the edge of the world|dr fm ro', 'In a casino that never closes|cr th',
    'In a hurricane shelter during the storm of the century|th dr', 'Inside a virtual afterlife run by a startup|sf co',
    'In a cursed opera house|ho dr fa', 'In a small-town cinema on its final night|dr fa ro', 'In a vineyard during the worst frost in fifty years|dr ro fm',
    'On a cruise ship where someone goes missing every night|my th co', 'In a border checkpoint between two invented countries|co dr th'
  ]);
  S.adj = P([
    'lonely||E- N+', 'washed-up||N+ C-', 'overconfident||E+ A- N-', '400-year-old||O+', 'recently divorced||N+', 'nine-year-old||O+ C-',
    'painfully shy||E- N+', 'retired||C+', 'disgraced||N+ A-', 'hopelessly romantic||O+ A+ N+', 'chronically late||C-', 'ruthless||A- C+',
    'kind-hearted||A+', 'paranoid||N+ O-', 'newly widowed||N+ E-', 'ambitious||C+ E+', 'lazy||C-', 'fearless||N- E+', 'superstitious||O- N+',
    'bored||O+ C-', 'honest-to-a-fault||A+ C+', 'charming||E+ A+', 'grumpy||A- E-', 'over-caffeinated||E+ N+', 'small-town||O-',
    'former child-star||E+ N+', 'incurably curious||O+', 'fiercely loyal||A+ C+', 'burned-out||N+ C-', 'rule-obsessed||C+ O-',
    'free-spirited||O+ C-', 'secretly brilliant||O+ E-', 'very polite||A+ C+', 'heartbroken||N+', 'aging||C+', 'newly elected||E+ C+',
    'exiled||N+', 'unemployed||C-', 'self-help-addicted||N+ O+', 'stubborn||A- C+', 'sleep-deprived||N+ C-', 'gentle||A+ N-'
  ]);
  S.hero = P([
    'vampire|ho fa co ro', 'farmer|dr fm co we', 'wedding DJ|co ro', 'lighthouse keeper|dr my fa', 'android nanny|sf fm dr', 'surgeon|dr th',
    'nun|dr co cr', 'ghost|ho fa co ro', 'detective|cr my th', 'sheriff|we cr', 'astronaut|sf dr', 'chef|co dr ro', 'pop star|dr co',
    'magician|fa co my', 'hitman|cr th co ac', 'kindergarten teacher|co fm dr', 'dragon|fa fm co', 'taxi driver|dr cr co',
    'funeral director|co dr', 'grandmother|fm co dr', 'insurance adjuster|co th', 'deep-sea diver|th dr sf', 'AI assistant|sf co th',
    'beekeeper|dr fm', 'con artist|cr co', 'librarian|my co ro', 'prince|fa ro co', 'werewolf|ho fa co', 'boxer|dr ac', 'translator|th dr ro',
    'chess prodigy|dr th', 'ice-cream truck driver|co fm', 'wrestler|co dr ac', 'priest|dr ho', 'spy|th ac ro', 'witch|fa ho co',
    'cowboy|we co', 'barista|co ro', 'submarine captain|th ac', 'zookeeper|co fm', 'mail carrier|co dr fm', 'robot|sf fm co',
    'journalist|th dr cr', 'puppeteer|ho co dr', 'pirate|ac fa co', 'mayor|co dr', 'projectionist|dr fa ro', 'smuggler|cr ac',
    'night nurse|dr', 'ballet dancer|dr ro', 'marine biologist|dr sf cr', 'stand-up comedian|co dr'
  ]);
  S.want = P([
    'falls in love with a cow|co fa ro', 'wants to win the county pie contest|co fm', 'must deliver a coffin across three borders|th co cr',
    'sets out to find their missing twin|my dr th', 'tries to save the family restaurant|dr co fm', 'plans one last heist|cr th ac',
    'wants to be the first to reach the summit|ac dr', 'promises to throw the perfect funeral|co dr', 'needs to pass a driving test by Friday|co',
    'tries to win back their ex at a wedding|ro co', 'searches for the person who stole their name|th my sf', 'wants to become truly human|sf fa fm',
    'keeps a dying town\'s radio station on air|dr co', 'tries to prove a murder nobody reported|my cr th', 'plans to escape the island|th ac',
    'wants their father\'s approval|dr fm', 'protects a witness who won\'t stop talking|cr co ac', 'dreams of opening a jazz club|dr ro',
    'vows to break an ancient curse|fa ho', 'decides to run for mayor|co dr', 'needs to pay off a debt to the wrong people|cr th',
    'wants to adopt a child|dr fm', 'tries to steal back a painting their grandmother made|cr co', 'needs to know what\'s behind the locked door|ho my',
    'wants the whole world to forget one embarrassing video|co sf', 'chases a legendary fish|dr co we', 'reunites a broken band for one last show|co dr',
    'seeks revenge for a burned-down home|we ac dr', 'wants to stay invisible until graduation|co dr fm', 'sets out to bury their father where he was born|dr fm',
    'fights to keep custody of a talking dog|co fm fa', 'wants to be remembered|dr', 'hunts for a cure before the next full moon|ho fa th',
    'tries to sell the haunted family house|ho co', 'wants one perfectly normal day|co dr sf', 'searches the sky for a signal only they heard|sf dr',
    'plans the perfect surprise party for an enemy|co', 'keeps the old cinema open one more night|dr fa ro', 'wants to take over the family business|cr dr'
  ]);
  S.obstacle = P([
    'can\'t fight off a jealous bull|co fa ro|the bull', 'keeps losing to a rival who never sleeps|co dr ac|the rival',
    'is hunted by a debt collector with a sense of humour|cr co th|the debt collector', 'is haunted by a voice nobody else can hear|ho th my|the voice',
    'has a mother who sabotages everything with love|co dr fm|the mother', 'is trapped by a contract they never read|co dr cr|the contract',
    'keeps losing to a machine that learns from them|sf th|the machine', 'can\'t get past a guard who knows their secret|th cr|the guard',
    'has an arch-enemy who is also their best friend|co dr|the best friend', 'is followed by a storm that won\'t leave|fa dr th|the storm',
    'has the whole town betting against them|co dr we|the town', 'is blackmailed by someone who has the photos|th cr|the blackmailer',
    'forgets everything at midnight|sf fa ro|the forgetting', 'has a reflection that acts on its own|ho fa|the reflection',
    'is up against a corporation that owns the water|dr th sf|the corporation', 'can\'t stop telling the truth|co fa|the truth',
    'is shadowed by a detective who\'s always one step ahead|cr th my|the detective', 'has a twin who wants the same life|dr th|the twin',
    'keeps waking up on the same terrible morning|fa co sf|the morning', 'is being replaced, piece by piece, by a better version|sf ho|the better version',
    'must get past a bureaucrat who loves rules|co dr|the bureaucrat', 'has a gang that wants them back|cr ac dr|the gang',
    'is forgotten by everyone they meet|fa ro dr|the curse', 'is outmatched by a wolf pack that hunts by moonlight|ho ac we|the wolves',
    'has an ex who is suddenly the boss|co ro|the ex', 'is trapped in a house that keeps moving its rooms|ho my|the house',
    'competes with a celebrity who wants the same thing|co dr|the celebrity', 'has a body that is slowly turning to glass|fa sf dr|the glass',
    'is up against a developer who already bought the building|dr co|the developer', 'is opposed by a rival family that wants the harbour|cr dr|the rival family'
  ]);
  S.twist = P([
    'the {hero} realizes {enemy} was never there at all', '{enemy} turns out to be the {hero}\'s long-lost sibling',
    'the {hero} discovers {enemy} has been protecting them all along', '{enemy} wants exactly the same thing, for the same reason',
    'the {hero} finds out they caused all of it years ago', '{enemy} disappears, and everything gets much worse',
    'the thing the {hero} wanted turns out to be a trap', 'the {hero}\'s mentor turns out to be working for {enemy}',
    'the {hero} wins, and loses everyone who mattered', '{enemy} comes to the {hero} begging for help',
    'the {hero} learns they\'ve been a ghost the whole time', 'everyone else knew the secret from the start',
    'the {hero} has to become {enemy} to win', 'it turns out the whole town is in on it', '{enemy} is the {hero}\'s own future self',
    'the {hero}\'s best friend switches sides', 'the prize was destroyed decades ago', 'the {hero} realizes they\'re in love with {enemy}',
    'the {hero} finds a letter that changes everything', '{enemy} was only a symptom of something much bigger',
    'the {hero} sees the whole story through {enemy}\'s eyes', 'the rules everyone followed were invented by a child',
    'the {hero} gets exactly what they asked for', 'the {hero}\'s mother arrives with the truth', '{enemy} saves the {hero}\'s life'
  ]);
  S.truth = P([
    'the real enemy was their own insecurity', 'family is whoever shows up', 'you can\'t win love, only give it',
    'growing means losing the story you tell about yourself', 'being right isn\'t the same as being good', 'home is a decision, not a place',
    'the past only has the power you give it', 'strength sometimes means asking for help', 'nothing worth keeping can be controlled',
    'forgiving isn\'t the same as forgetting', 'the monster is whoever stops listening', 'you can\'t save people who don\'t want saving',
    'ordinary days were the whole point', 'courage is just fear that keeps walking', 'winning alone is losing slowly',
    'the truth costs less the sooner you pay it', 'nobody needed them to be perfect, only present', 'some doors are meant to stay closed',
    'what you run from follows you', 'love looks different on everyone', 'you become what you refuse to look at',
    'a legacy is what you leave in people', 'change starts the day you stop waiting', 'there never was a bull, only fear'
  ]);
  S.stakes = P([
    'the village loses its last cow|co fa', 'the family name is gone for good|dr cr', 'the whole town floods|dr th', 'someone they love goes to prison in their place|cr dr',
    'they\'re erased from history|sf fa', 'the only witness disappears|my th cr', 'a war begins at sunrise|ac fa th', 'they\'ll spend forever alone|ro dr fa',
    'the band breaks up for good|co dr', 'the house goes to the bank|dr co fm', 'the base runs out of air|sf th', 'the curse passes to their child|ho fa',
    'nobody will remember the last song|dr', 'the company gets to keep their face|sf co', 'they\'ll turn into their father|dr cr'
  ]);
  S.clock = P(['sunrise', 'the harvest moon', 'the wedding', 'the last ferry leaves', 'the end of summer', 'the polls close', 'the snow melts',
    'the funeral on Sunday', 'the eclipse', 'the bank opens on Monday', 'their 40th birthday', 'the oxygen runs out', 'the final screening',
    'Christmas Eve', 'the tide comes in', 'the building is demolished']);
  S.inciting = P([
    'a stranger arrives with their name tattooed on her arm|my th', 'the town\'s only bridge collapses|dr th', 'their grandmother leaves them a key and a warning|my fa fm',
    'a cow walks into the church during mass|co', 'the lottery ticket in their pocket wins|co dr', 'the radio starts playing tomorrow\'s news|sf th my',
    'a body washes up wearing their jacket|cr my th', 'the factory closes overnight|dr co', 'the power goes out across the whole continent|th sf',
    'a letter arrives forty years late|dr ro my', 'their mother announces she\'s getting married|co fm', 'the ice cracks in the middle of the lake|th dr',
    'a famous director rents their spare room|co dr', 'a child knocks on the door claiming to be their son|dr co fm', 'their father is shot on the night of a wedding|cr dr',
    'a film reel arrives with no label|dr fa my'
  ]);
  S.titleWord = ['Bull', 'Moon', 'Harvest', 'Static', 'Salt', 'Glass', 'Midnight', 'Ash', 'Velvet', 'Thunder', 'Honey', 'Iron', 'Paper', 'Neon',
    'Ghost', 'Winter', 'Copper', 'Feather', 'Echo', 'Ember', 'Tide', 'Smoke', 'Silver', 'Orchard', 'Signal', 'Lantern', 'Marrow', 'Ribbon'];

  /* ======================================================================== idea decks (the Ideas page) */
  var L = OS.L = {};
  L.archetypes = D([
    'The Reluctant Heir|Never wanted the crown, and becomes the best (or the worst) at wearing it. Their slide is the story: watch each choice that makes it possible.|cr dr fa',
    'The Mentor|Has walked the road. Gives the hero a gift, a rule or a push, then leaves (or dies) so the hero has to stand alone.',
    'The Shadow|The dark mirror. Wants what the hero wants and will do what the hero won\'t. Strongest when they\'re right about something.',
    'The Trickster|Breaks the rules and the tension. Comic relief with a sharp edge, often the one who says the truth out loud.|co',
    'The Herald|Brings the call: a letter, a stranger, a phone call at 3 a.m. Their arrival ends the ordinary world.',
    'The Threshold Guardian|Tests whether the hero is serious. A bouncer, a bureaucrat, a parent. Beat them, befriend them or sneak past.',
    'The Shapeshifter|Loyalty and mood keep shifting, so neither the hero nor the audience knows where they stand. Great for love interests and double agents.|ro th',
    'The Ally|Walks beside the hero and reflects their better side. Give them a goal of their own or they\'ll feel like furniture.',
    'The Fallen Hero|Once the champion, now the cautionary tale. They know exactly how this ends, and that knowledge is a weapon.|dr ac',
    'The Innocent|Sees the world as it should be. Their belief either redeems the others or breaks them.|fm dr',
    'The Caregiver|Puts everyone first and quietly runs out of themselves. Their arc: learning to take.|dr fm',
    'The Rebel|Defines themselves against the system. The real question: what do they build after it falls?',
    'The Everyman|An ordinary person in an extraordinary situation, the audience\'s eyes. Make them specific or they\'ll be invisible.',
    'The Fatal Attraction|Desire as danger. Wants something the hero has, and uses the hero\'s own want to get it.|th cr ro',
    'The Loyal Lieutenant|Serves the leader without question, until the day they have to ask one.|cr ac',
    'The Outsider|Doesn\'t belong to the world of the story, so they see it more clearly than anyone inside it.',
    'The Fool|Gets everything wrong for the right reasons, and lands on wisdom by accident.|co',
    'The Ruler|Controls a kingdom: a company, a family, a kitchen. Their fear is chaos, and being replaced.|cr dr',
    'The Seeker|Restless and never at home. The arc is finding, or making, the thing they look for.',
    'The Martyr|Willing to sacrifice everything. The danger: they enjoy it a little.',
    'The Fixer|Solves everyone else\'s problems so they never have to face their own.|cr th',
    'The Prodigal|Left home and comes back changed, or pretending to be. Old wounds open on arrival.|dr fm',
    'The Witness|Saw the crime, the miracle or the truth, and has to decide what to do with it.|th my',
    'The Child Who Knows|Young, overlooked, and the only one who sees what is really going on.|fm ho fa'
  ]);
  OS.ROLES = [
    ['protagonist', 'Protagonist', 'Drives the story; we follow their want.'], ['antagonist', 'Antagonist', 'Wants the opposite, or the same thing first.'],
    ['deuteragonist', 'Deuteragonist', 'The second lead: a parallel or opposite journey.'], ['love', 'Love interest', 'Tests the hero\'s need, not just their want.'],
    ['mentor', 'Mentor', 'Teaches, then steps aside.'], ['ally', 'Ally', 'Helps, and needs something too.'], ['foil', 'Foil', 'Shows the hero by contrast.'],
    ['confidant', 'Confidant', 'The one the hero tells the truth to (so the audience hears it).'], ['trickster', 'Trickster', 'Chaos and comedy with a point.'],
    ['herald', 'Herald', 'Brings the call to adventure.'], ['guardian', 'Threshold guardian', 'Blocks the way to test commitment.'],
    ['shapeshifter', 'Shapeshifter', 'Whose side are they on?'], ['witness', 'Witness', 'Saw something that matters.'], ['supporting', 'Supporting', 'A smaller part with a clear job.']
  ];
  OS.ROLE = {};
  OS.ROLES.forEach(function (r) { OS.ROLE[r[0]] = r[1]; });

  L.occupations = D([
    'Lighthouse keeper|Solitude, ritual, weather. Who visits, and why?', 'Night-shift nurse|Sees people at their most honest, at 4 a.m.',
    'Wedding DJ|Reads every room; never part of the party.', 'Disgraced surgeon|Skill without permission to use it.', 'Funeral director|Comfortable with death, awkward with the living.',
    'Bomb technician|Calm hands; what does the calm cost?', 'Court interpreter|Speaks other people\'s truths and lies, word for word.',
    'Insurance fraud investigator|Professionally suspicious of everyone.', 'Ferry captain|Same route forever; what if they turned left?', 'Hotel concierge|Knows every guest\'s secret.',
    'Pastry chef|Precision and sweetness, under pressure.', 'Tow-truck driver|Arrives at the worst moment of strangers\' days.', 'Taxidermist|Preserves what has already gone.',
    'Child-star turned realtor|Sells dream homes; lives in a rental.', 'Beekeeper|Patience, colonies, stings.', 'Locksmith|Can open any door but their own.',
    'Stunt double|Takes the hits for someone else\'s glory.', 'Air-traffic controller|Holds hundreds of lives in their voice.', 'Radio host (overnight)|The voice lonely people talk to.',
    'Crime-scene cleaner|Erases the evidence of tragedy.', 'Marine biologist|Studies the deep; avoids depths in people.', 'Small-town mayor|Every neighbour is a constituent and a critic.',
    'Ghostwriter|Their words, other people\'s names.', 'Debt collector|Paid to be the villain of other people\'s stories.', 'Projectionist|Lives in the dark, watching other lives.',
    'Sommelier|Can name a vineyard by smell; can\'t name a feeling.', 'Dog walker to the rich|A side door into every mansion.', 'Ice-road trucker|One crack from disaster, every day.'
  ]);
  L.wounds = D([
    'Abandoned by a parent as a child|Someone who should have stayed, didn\'t.|dr fm|If I let people close, they leave.',
    'Took the blame for someone else\'s crime|They carried a punishment that belonged to someone else.|cr dr|Nobody protects me but me.',
    'Survived an accident that killed others|Survivor\'s guilt shapes every choice.|dr th|I don\'t deserve good things.',
    'Humiliated in public at the worst moment|The whole room laughed.|co dr|If I try, they\'ll laugh again.',
    'Betrayed by a best friend|The one person they trusted sold them out.|dr cr th|Trust is for fools.',
    'Grew up poor next door to the very rich|Nose pressed against the glass for years.|dr cr|Money is the only safety.',
    'Lost a child|The unspeakable loss.|dr ho|I failed the only thing that mattered.',
    'Was the golden child who could never fail|Love came with conditions: keep winning.|dr co|I\'m only worth what I achieve.',
    'Caused a tragedy by doing nothing|Froze when it mattered most.|dr th|I\'m a coward at heart.',
    'Raised in a closed community or cult|The outside world was the enemy.|dr th ho|Obedience keeps you safe.',
    'Watched a parent destroyed by love|Love ruined the strongest person they knew.|ro dr|Love makes you weak.',
    'Cheated out of an inheritance|What was theirs was taken, legally.|dr cr we|The system is rigged, so take what you can.',
    'Bullied for being different|Difference was punished every day.|dr co fm|I have to hide who I really am.',
    'Lost everything in a fire, flood or war|Home vanished overnight.|dr we|Nothing lasts, so don\'t hold on.',
    'Told they had no talent|By the one teacher who mattered.|dr co|I\'m not a real artist (or athlete, or chef).',
    'Left at the altar|In front of everyone they knew.|ro co|I\'m unlovable.',
    'Had to parent their own parents|The adult of the house at age eight.|dr fm|If I stop holding everything, it all falls apart.',
    'Failed to save someone|They arrived too late.|dr th ac|I can never fail again.',
    'Found out they were adopted, by accident|The family story was a lie.|dr fm|I don\'t really belong anywhere.',
    'Spent years in prison|Time stolen, guilty or not.|cr dr|The world owes me.',
    'Famous young, then forgotten|Peaked at twelve.|co dr|I\'m nothing without an audience.',
    'Witnessed something they could never talk about|A secret swallowed whole.|th my ho|Some truths would destroy everyone.',
    'Watched their mother go to prison for their father|The family survived because someone paid.|cr dr|If I\'m in charge, nobody I love gets hurt.'
  ]);
  L.flaws = D([
    'Pride|Can\'t admit a mistake, even when it costs everything.', 'Need for control|Has to run everything; delegating feels like falling.',
    'Cowardice|Avoids conflict until it explodes.', 'Jealousy|Measures their life against everyone else\'s.', 'Recklessness|Acts first, regrets later, repeats.',
    'Self-righteousness|Always believes they\'re the good one.', 'People-pleasing|Says yes to everyone and no to themselves.', 'Greed|Enough is never enough.',
    'Vengefulness|Keeps score and collects debts.', 'Dishonesty|Lies even when the truth would be easier.', 'Stubbornness|Once decided, never revisits.',
    'Cynicism|Expects the worst so they\'re never disappointed.', 'Naivety|Trusts everyone, learns nothing.', 'Impatience|Wants it now and skips steps.',
    'Vanity|Obsessed with image.', 'Addiction|Something (a substance, a person, a screen) runs the show.', 'Perfectionism|Nothing is ever finished because nothing is ever good enough.',
    'Self-pity|Their pain is the biggest in every room.', 'Arrogance|Thinks rules and consequences are for other people.', 'Indecision|Waits for a certainty that never comes.',
    'Possessiveness|Holds on to people as if they were property.', 'Secrecy|Lives behind closed doors; even friends don\'t know them.', 'Workaholism|Hides in work from everything else.',
    'Short temper|Small sparks, big fires.', 'Martyrdom|Suffers loudly and refuses help.', 'Manipulation|Gets what they want by pulling strings.',
    'Laziness|Does the minimum and hopes.', 'Fear of commitment|Always has one foot out of the door.', 'Obsession|One thing matters, and everything else burns for it.'
  ]);
  L.lies = D([
    'I\'m only lovable if I\'m useful|', 'Showing feelings is weakness|', 'The world is dangerous, so stay small|', 'If I\'m in charge, nobody gets hurt|',
    'I have to earn rest|', 'Everybody leaves eventually|', 'Being good means being quiet|', 'Success will fill the emptiness|', 'I\'m the only one who can fix this|',
    'It\'s too late for me to change|', 'My worth is how I look|', 'People like me don\'t get happy endings|', 'If they knew the real me, they\'d go|',
    'Anger keeps me safe|', 'The past decides the future|'
  ]);
  L.fears = D([
    'Abandonment|Being left, again.', 'Being ordinary|A life nobody notices.', 'Failure|Trying and not being enough.', 'Losing control|Chaos, and someone else at the wheel.',
    'Intimacy|Being truly seen.', 'Being found out|The impostor unmasked.', 'Death|Their own, or of the people they love.', 'Becoming their parent|The mirror at 50.',
    'Poverty|Going back to nothing.', 'Being forgotten|Erased once they\'re gone.', 'Betrayal|Trust used as a weapon.', 'Responsibility|Being the one it all depends on.',
    'Deep water|And what it stands for.', 'Rejection|The closed door.', 'Change|The ground moving under them.', 'Their own anger|What they might do.',
    'Commitment|Doors closing forever.', 'Powerlessness|Watching, unable to act.', 'Prison|Walls, rules, time.', 'Being alone|Silence in an empty house.'
  ]);
  L.values = D(['Loyalty|', 'Freedom|', 'Justice|', 'Family|', 'Truth|', 'Power|', 'Security|', 'Recognition|', 'Love|', 'Faith|', 'Knowledge|', 'Honour|',
    'Independence|', 'Beauty|', 'Tradition|', 'Adventure|', 'Kindness|', 'Wealth|', 'Order|', 'Creativity|']);
  L.motivations = D([
    'Revenge|Someone has to pay. Scenes: planning, the target\'s humanity showing, the moment of choice.', 'Redemption|Make up for a past wrong. Scenes: the debt remembered, the chance to repay.',
    'Survival|Stay alive, or keep the family alive. Scenes: scarcity, impossible choices.', 'Love|Win, keep or protect someone. Scenes: closeness, distance, the gesture.',
    'Greed|More. Scenes: the score, the split, the double-cross.', 'Duty|Because it\'s their job or their blood. Scenes: orders against conscience.',
    'Curiosity|Need to know. Scenes: clues, forbidden doors, the answer that costs.', 'Belonging|Find the tribe. Scenes: auditions, outsider moments, being chosen.',
    'Recognition|Be seen as great. Scenes: rivals, applause, the empty room after.', 'Justice|Make it right. Scenes: evidence, the system failing, taking it into their own hands.',
    'Protecting family|Whatever it takes. Scenes: threats at home, compromises, the line crossed.', 'Proving someone wrong|Usually a parent. Scenes: the phone call, the trophy, the silence.',
    'Guilt|Can\'t live with what they did. Scenes: avoidance, confession, atonement.', 'Legacy|Leave something behind. Scenes: heirs, monuments, the cost to the living.',
    'Escape|Get out: of the town, the marriage, the life. Scenes: plans, the last night, the turn back.', 'Ambition|Rise. Scenes: ladders, sacrifices, who gets left below.',
    'Faith|Serve something bigger. Scenes: doubt, signs, the test.', 'Obsession|One thing, everything. Scenes: neglect, collapse, the moment it\'s in reach.'
  ]);
  L.secrets = D(['Has a second family in another city|', 'Was the one who called the police|', 'Can\'t read|', 'Isn\'t really a doctor|', 'Is the anonymous author everyone hates|',
    'Started the fire that burned the old house|', 'Is in love with their best friend\'s partner|', 'Has six months to live|', 'Already spent the inheritance|',
    'Was a child star under another name|', 'Works for the other side|', 'Didn\'t really win the medal|', 'Knows where the body is buried|', 'Is broke behind all the luxury|',
    'Has been sending money to their enemy|', 'Lied about their age for twenty years|', 'Faked their own death once before|', 'Is the child\'s real parent|',
    'Still talks to their dead brother every night|', 'Has never been to the country they say they\'re from|']);
  L.quirks = D(['Hums show tunes when lying|', 'Counts steps everywhere|', 'Collects strangers\' lost gloves|', 'Eats dessert first|', 'Only wears one colour|',
    'Names every car they own|', 'Talks to plants, formally|', 'Can\'t sleep without the radio on|', 'Keeps a pocketknife in every coat|', 'Laughs at funerals|',
    'Corrects everyone\'s grammar|', 'Never sits with their back to a door|', 'Writes everything in a tiny notebook|', 'Carries snacks for strangers|',
    'Answers the phone with their full name|', 'Flips a lucky coin for every decision|', 'Knows every train timetable by heart|', 'Wears sunglasses indoors|',
    'Cooks when angry|', 'Wears a wedding ring on a chain|', 'Whistles in empty rooms|', 'Can\'t stand a crooked picture frame|']);
  L.voices = D([
    'Answers questions with questions|Deflects and probes; never commits.||Why would you want to know that?',
    'Short, clipped sentences|Economical and hard: military, or just tired.||Car\'s outside. Get in.',
    'Over-explains everything|Nervous and kind; fills every silence.||What I mean, and it\'s not bad, is that it\'s slightly, a little bit, on fire.',
    'Quotes their mother constantly|Lives by inherited rules.||My mother always said: never trust a man with clean boots.',
    'Formal words in casual places|Old-fashioned, precise, a little lonely.||I find your proposal agreeable. Also, the pizza is here.',
    'Jokes when scared|Humour as armour.||Great. A haunted basement. Love that for us.',
    'Says what you\'ll do, never what they feel|Commanding subtext.||You\'ll stay for dinner.',
    'Talks in sports metaphors|Everything is a game, a play, a season.||We\'re down two in the ninth and you want to bunt?',
    'Speaks softly so people lean in|Power through quiet.||Sit. Closer. I\'m only saying this once.',
    'Mixes two languages mid-sentence|Code-switching shows who they\'re with.||Oui, oui, I\'ll be there, but tell your brother he owes me.',
    'Lists things in threes|An orderly mind with a persuasive rhythm.||We need water, rope, and a very good excuse.',
    'Repeats your words back to you|Stalling, or listening very hard.||"Not a big deal." Not a big deal?',
    'Drifts into the past|Lives in memories.||Back in \'74, this whole street was cherry trees.',
    'Blunt, zero filter|Says the unsayable.||Your haircut is a cry for help.',
    'Polite to power, sharp with everyone else|Shows the pecking order in one breath.||Of course, sir. (turning) You. Coffee. Now.'
  ]);
  L.conditions = D([
    'Insomnia|Days blur and perception slips.||Good for paranoid thrillers and time pressure.', 'Retrograde amnesia|Lost the past, kept the skills.||An identity mystery: who were they?',
    'Early-onset dementia|Losing memories one by one.||A ticking clock on every relationship; a heartbreaking point of view.', 'Chronic pain|Every action has a cost.||Shows will and limits. Don\'t reduce it to a metaphor.',
    'PTSD|The past breaks into the present.||Triggers create scene turns. Research it and portray it with care.', 'OCD|Rituals that hold back unbearable thoughts.||Show the inside, never the punchline.',
    'Terminal diagnosis|Time is finite, and now they know it.||The ultimate ticking clock; it reorders every priority.', 'Face blindness|Can\'t recognise faces.||Brilliant for mysteries and mistaken identity.',
    'Narcolepsy|Falls asleep without warning.||Comedy, danger and vulnerability in one.', 'Agoraphobia|The outside world is a threat.||Contained stories where the front door is the threshold.',
    'Synesthesia|Hears colours, tastes words.||Visual storytelling gold.', 'Haemophilia|A small cut is a big risk.||Raises the stakes of every action scene.',
    'Type 1 diabetes|Life runs on insulin and timing.||Real, physical ticking clocks.', 'Deafness|Lives in a visual language.||Sign-language scenes; cast authentically.',
    'Tinnitus|A ringing nobody else hears.||Sound design becomes character.', 'Stutter|Words fight their way out.||Gives dialogue rhythm. Never make it the joke.',
    'Addiction in recovery|Every day is a choice.||Temptation scenes; a relapse can be the midpoint or the low point.', 'Heart condition|Excitement could kill them.||Comic and dramatic stakes at once.',
    'Severe allergy|One peanut is a weapon.||A perfect setup and payoff (the epinephrine pen).', 'Long grief|Not an illness, a weight carried daily.||Shapes how they react to every loss.',
    'Colour blindness|Sees a different palette.||Clues they miss, and clues only they catch.', 'Bipolar disorder|Moods with their own seasons.||Avoid cliché; show treatment and agency.',
    'Migraine with aura|Light hurts and the world flickers.||Point-of-view shots; unreliable moments.', 'Phantom limb|Feels what isn\'t there.||Shows loss without saying it.',
    'Perfect autobiographical memory|Remembers every day of their life.||They can\'t forget the wound: a gift and a curse.'
  ]);
  L.conflicts = D([
    'Person vs. person|Two wills, one prize. The clearest engine in drama.', 'Person vs. self|The enemy is inside: a fear, a flaw, an addiction, a lie.',
    'Person vs. society|The hero against the rules, the town, the system.', 'Person vs. nature|Storm, sea, mountain, disease. Nature doesn\'t negotiate.',
    'Person vs. technology|The tool turns, or the hero is replaced by it.', 'Person vs. fate|Prophecy, destiny or the supernatural. Can choice beat what\'s written?',
    'Person vs. the unknown|The thing in the dark. Mystery as an enemy.'
  ]);
  L.obstacles = D([
    'A deadline moves up|', 'The key witness takes it back|', 'The money runs out|', 'A storm closes the roads|', 'The plan needs a skill they don\'t have|',
    'An ally names a price|', 'Their secret is about to come out|', 'Two goals that can\'t both be met|', 'The law is on the wrong side|', 'The person they need hates them|',
    'Their body gives out|', 'The map is wrong|', 'They\'re being watched|', 'Someone they love becomes the leverage|', 'They must lie to win|',
    'The only door is guarded by a friend|', 'Success would destroy someone else|', 'An old enemy comes back|', 'Their own rule forbids the solution|'
  ]);
  L.twists = D([
    'The ally is the enemy|Plant it early: one look, one lie that doesn\'t fit.', 'It was all in their head|Play fair: the clues must work on a second viewing.',
    'The victim is the culprit|Sympathy turned into suspicion.', 'The prize is worthless|What they really needed was the journey.',
    'Time isn\'t what it seemed|Two timelines are actually one, or one is actually two.', 'The narrator lied|Make the lie motivated, not just clever.',
    'They were the monster|The hero discovers the harm they did.', 'The dead aren\'t dead|Use it once, mean it.', 'The mentor planned it all|The guide was the puppeteer.',
    'Identity swap|Two people were each other.', 'It was a test|And the hero failed, or passed in a way nobody expected.', 'The real target was someone else|Misdirection by focus.',
    'The rescue is the trap|Help arrives, and it\'s worse.', 'The prophecy was misread|Fate was right; everyone just read it wrong.'
  ]);
  L.stakes = D([
    'Personal|Someone they love.', 'Professional|Career, reputation, life\'s work.', 'Physical|Life, health, body.', 'Moral|Who they are; the line they won\'t cross.',
    'Community|A town, a team, a family business.', 'Global|Everyone. Make it personal anyway.', 'Spiritual|Faith, soul, meaning.', 'Generational|What passes on to the children.'
  ]);
  L.macguffins = D(['A briefcase nobody opens|', 'A family recipe|', 'The master tape of an unreleased album|', 'The deed to the land|', 'A key to a seed vault|',
    'A love letter|', 'The last bottle of a legendary vintage|', 'A hard drive|', 'A stolen painting|', 'A child\'s drawing that is really a map|', 'A ring|', 'A ledger|',
    'A vaccine sample|', 'A ghost\'s last wish|', 'A trophy|', 'An urn of ashes|', 'A winning lottery ticket|', 'A forbidden book|', 'A single vote|', 'An unlabelled film reel|']);
  L.complications = D(['The phone dies.|', 'Someone recognises them.|', 'The rival arrives early.|', 'It starts to rain. Hard.|', 'A child is watching.|',
    'The car won\'t start.|', 'Their ex walks in.|', 'The alarm goes off.|', 'They\'re asked to make a speech.|', 'The expert gets food poisoning.|', 'A news crew shows up.|',
    'The dog eats the evidence.|', 'The power cuts out.|', 'Their mother calls. Twice.|', 'The door locks behind them.|', 'They get what they asked for, too soon.|',
    'Someone confesses something unrelated and huge.|', 'An earlier lie is repeated to the wrong person.|', 'A stranger needs help right now.|', 'The money is fake.|',
    'The wrong person overhears.|', 'They\'re mistaken for someone else.|', 'An old injury flares up.|', 'A gift arrives with no name on it.|', 'Somebody faints.|']);
  L.scenes = D([
    'The dinner from hell|Everyone wants something from the table. Seat enemies together, make leaving impossible, and let the subtext rise with every course.',
    'The interrogation|One wants information, the other wants to hide it. Shift the power at least twice. Whoever controls the silence wins.',
    'The confession|A secret comes out. Delay it with interruptions and false starts. The reaction matters more than the reveal.',
    'The plan|Explain the plan fast, with pictures. The audience should know enough to worry. Plans told in full usually fail.',
    'The reunion|Two people with history. Play what is NOT said, and let an object from the past do the talking.',
    'The chase|Clear geography, escalating obstacles, a choice at the end. A chase is about character: what will they give up?',
    'The breakup|Both of them are right. Write it so we can\'t pick a side.', 'The meet-cute|Opposites collide over a small object. Conflict first, attraction second.',
    'The ticking bomb|Show the bomb (real or not) to the audience before the characters see it. Suspense is information plus waiting.',
    'The temptation|Offer the hero exactly what they want, at a price that costs who they are.', 'The funeral|Grief makes people honest and ridiculous: comedy and tragedy at one table.',
    'The showdown|Hero and antagonist face to face. The outer fight must settle the inner question.', 'The quiet before|A calm scene before the storm: small talk loaded with dread.',
    'The mirror scene|The hero sees who they\'re becoming: a person, a reflection, a photograph.', 'The false victory|They win, and the audience sees the cost before they do.',
    'The return home|Back to the opening location. Show how differently the hero moves through it now.', 'The phone call|One side on screen. Use reactions and silences; cut to the other side only to twist.',
    'The montage|Time passes, skill grows. Give it a shape: start, struggle, success.', 'The cross-cut|Intercut two actions so each comments on the other: a celebration and a crime.',
    'The stranger\'s question|An outsider asks the obvious question everyone has been avoiding.'
  ]);
  L.themes = D(['Can you love your family and still stay good?|', 'Is it ever too late to change?|', 'What do we owe the people who raised us?|', 'Does power always corrupt?|',
    'Can you forgive the unforgivable?|', 'What makes a home?|', 'Is safety worth giving up freedom?|', 'Who are you when nobody is watching?|', 'Can love survive the truth?|',
    'Do we choose our fate?|', 'What is the price of ambition?|', 'Is revenge ever justice?|', 'Can you outrun your past?|', 'What makes us human?|',
    'Is it better to be loved or respected?|', 'Can one person change a system?|', 'What do we lose when we win?|', 'Are we only our memories?|',
    'When does loyalty become a cage?|', 'Is the truth always worth telling?|', 'Can we ever really leave home?|']);
  L.settings = S.setting.map(function (s) { return { t: s.t.replace(/^(In|On|At|Inside|Aboard|Deep inside) (a |an |the )?/i, function (m) { return ''; }).replace(/^./, function (c) { return c.toUpperCase(); }), d: s.t, g: s.g }; });
  L.inciting = S.inciting.map(function (s) { return { t: s.t.charAt(0).toUpperCase() + s.t.slice(1), d: 'Something happens TO the hero that they can\'t ignore.', g: s.g }; });

  OS.DECKS = [
    ['Characters', [['archetypes', 'Archetypes', 'users'], ['occupations', 'Jobs & worlds', 'grid'], ['wounds', 'Wounds', 'heart'], ['lies', 'Lies they believe', 'info'],
      ['flaws', 'Flaws', 'bug'], ['fears', 'Fears', 'moon'], ['values', 'Values', 'star'], ['secrets', 'Secrets', 'lock'], ['quirks', 'Quirks', 'sparkle'],
      ['voices', 'Voices', 'chat'], ['conditions', 'Conditions & illnesses', 'shield']]],
    ['Plot', [['motivations', 'Motivations', 'arrow'], ['conflicts', 'Kinds of conflict', 'x'], ['obstacles', 'Problems', 'filter'], ['inciting', 'Inciting incidents', 'bell'],
      ['twists', 'Twists', 'refresh'], ['stakes', 'Stakes', 'bulb'], ['macguffins', 'MacGuffins', 'inbox'], ['complications', 'Complications deck', 'more']]],
    ['World & scenes', [['settings', 'Settings', 'map'], ['themes', 'Themes', 'globe'], ['scenes', 'Scene recipes', 'camera']]]
  ];

  /* ======================================================================== relationships */
  OS.REL = [
    ['family', 'Family', '#c8102e', 'Blood or chosen. What do they owe each other that they never say?'],
    ['love', 'Love', '#e0457b', 'Who loves more? What would each give up?'],
    ['ex', 'Exes', '#a65b8a', 'What ended it, and what never did?'],
    ['friends', 'Friends', '#2f8f6b', 'What would break this friendship? Put it in the story.'],
    ['rivals', 'Rivals', '#e0a526', 'They want the same thing. Who gets it first?'],
    ['enemies', 'Enemies', '#5b2a86', 'Each thinks they\'re the hero. Write both sides.'],
    ['mentor', 'Mentor & student', '#2c6db3', 'What does the mentor need from the student?'],
    ['alliance', 'Alliance', '#3e9aa8', 'United by a goal, not by love. When does it break?'],
    ['debt', 'Debt', '#8a6d3b', 'One owes the other: money, a life, a lie. When is it called in?'],
    ['secret', 'Shared secret', '#6b6f7a', 'They both know. Who will crack first?'],
    ['boss', 'Boss & worker', '#46505e', 'Power runs one way. Does it ever flip?'],
    ['unrequited', 'Unrequited', '#d07a52', 'One loves, one doesn\'t (or doesn\'t know).'],
    ['protector', 'Protector', '#4a8a3a', 'One shields the other. From what, and at what cost?'],
    ['jealousy', 'Jealousy', '#9c8a1e', 'One wants the other\'s life.']
  ];
  OS.RELTYPE = {};
  OS.REL.forEach(function (r) { OS.RELTYPE[r[0]] = { key: r[0], name: r[1], color: r[2], q: r[3] }; });

  /* ======================================================================== the reaction engine's rules
     Each event: [key, label, icon, scene tip, responses]. A response is "what they do|rules".
     Rules: TRAIT>n:w or TRAIT<n:w (O C E A N, 0-100), field~word|word:w (flaw, fear, value, wound, lie, arc, role contain a word).
     The engine scores each response for a character and shows the top three with the reasons that matched. */
  OS.REACT = [
    ['betrayal', 'Betrayed by someone close', 'x', 'Write the moment they find out. Give their hands something to do.', [
      'Cuts them off without a word and never mentions it again.|A<40:2 E<40:2 N<50:1 flaw~pride|proud|stubborn:2',
      'Confronts them on the spot, loudly, in front of everyone.|E>60:2 A<50:1 N>60:2 flaw~temper|reckless:3',
      'Smiles, says nothing, and starts planning revenge.|C>60:2 A<40:3 flaw~veng|manipul|secre:3 value~power|honour:1',
      'Blames themself and tries harder to be worth keeping.|A>60:2 N>60:2 fear~abandon|reject:3 flaw~pleas|martyr:3',
      'Forgives out loud, but keeps the receipt.|A>55:2 C>55:2 value~loyal|family:2',
      'Turns the betrayal into leverage.|C>60:1 A<40:2 value~power|wealth:3 flaw~greed|manipul:2']],
    ['loss', 'Loses someone or something they love', 'heart', 'Grief in action: what do they DO in the first hour?', [
      'Throws themself into work and refuses to stop.|C>60:3 flaw~work|control:3 E<50:1',
      'Falls apart in public and can\'t function for days.|N>65:3 E>50:1',
      'Goes numb and handles every practical detail perfectly.|C>60:2 N<45:2 flaw~control|secre:2',
      'Looks for someone to blame, and finds them.|A<45:2 N>55:2 flaw~veng|temper|righteous:3',
      'Reaches out to the people they had pushed away.|A>60:2 E>55:1 arc~positive:2',
      'Makes a reckless, life-changing decision overnight.|O>60:2 C<45:2 flaw~reckless|impatien:3']],
    ['threat', 'Someone threatens them or their people', 'shield', 'Show the threat to the audience first, then let them react.', [
      'Strikes first, harder than they need to.|A<40:2 N>55:1 E>55:1 flaw~temper|reckless|veng:3 value~power:2',
      'Negotiates calmly, buys time and studies the enemy.|C>60:2 N<45:2 O>55:1',
      'Hides the threat from everyone to protect them.|flaw~secre|control|martyr:3 value~family:2 A>55:1',
      'Runs: packs a bag and disappears.|N>65:2 fear~death|powerless:2 flaw~coward:3',
      'Goes to the authorities, by the book.|C>60:2 A>55:1 value~justice|order|truth:3',
      'Calls in an old favour from someone dangerous.|O>50:1 value~loyal|family:2 flaw~pride:1 A<50:1']],
    ['temptation', 'Is offered exactly what they want, at a price', 'star', 'Make the offer specific, generous and quiet.', [
      'Takes it immediately and never looks back.|C<45:2 flaw~greed|impatien|addict|reckless:3',
      'Refuses on principle, and regrets it for years.|C>60:2 value~honour|truth|faith|justice:3',
      'Takes it, telling themself it\'s for someone else.|A>50:1 value~family|love:2 flaw~righteous|martyr|dishonest:2',
      'Haggles for a better price.|C>55:1 A<50:2 value~wealth|power:2',
      'Takes it in secret and builds a lie around it.|flaw~dishonest|secre:3 N>55:1',
      'Asks someone they trust what to do.|A>60:2 E>50:1 N>50:1']],
    ['humiliation', 'Is humiliated in front of others', 'users', 'Keep the camera on their face after the laugh.', [
      'Laughs it off, then cries alone in the car.|E>55:1 N>60:2 A>50:1',
      'Makes a cutting joke that turns the room on the other person.|E>60:2 A<45:2 O>55:1',
      'Walks out and cuts off everyone who saw it.|E<45:2 N>60:2 flaw~pride|vanity:3',
      'Plans a public, perfect revenge.|A<40:2 C>60:2 flaw~veng|pride:3',
      'Owns it with grace and wins the room back.|N<40:3 A>55:1 E>55:1',
      'Works obsessively to prove them wrong.|C>60:2 fear~fail|ordinary:3 flaw~perfection|work:2']],
    ['windfall', 'Gets lucky: money, fame, a big break', 'sparkle', 'Good news is a test too. Who calls first?', [
      'Shares it with everyone, generously, maybe too generously.|A>65:3 E>55:1',
      'Tells nobody and keeps living exactly the same way.|E<45:2 C>60:2 flaw~secre:2 fear~poverty|change:2',
      'Spends it fast and loud.|C<45:2 E>60:2 flaw~vanity|reckless|impatien:3',
      'Gets suspicious: what\'s the catch?|N>60:2 O<45:1 flaw~cynic|paranoi:3',
      'Uses it to settle an old score.|A<45:2 flaw~veng:3',
      'Panics that they don\'t deserve it.|N>65:2 fear~found|impostor:3 wound~survived|golden:2']],
    ['love', 'Someone declares their love', 'heart', 'Let the declaration land in the wrong place, at the wrong time.', [
      'Says it back, a little too fast.|E>60:1 A>60:2 N>55:1 flaw~pleas|naiv:2',
      'Makes a joke and changes the subject.|E>50:1 fear~intimacy|commit:3 flaw~commit:3',
      'Runs, literally or emotionally.|fear~intimacy|abandon|commit:3 N>60:2 wound~altar|abandon:2',
      'Asks for time, and really means it.|C>60:2 N<50:1',
      'Uses the confession as power over them.|A<35:3 flaw~manipul:3',
      'Is moved, and admits they\'ve felt it for years.|A>60:1 O>55:1 arc~positive:1']],
    ['accusation', 'Is accused of something, true or not', 'info', 'Let them answer a question nobody asked.', [
      'Denies everything, even the parts that are true.|flaw~dishonest|pride|stubborn:3 N>55:1',
      'Turns the accusation back on the accuser.|A<40:2 E>55:1 flaw~manipul|temper:2',
      'Confesses at once, relieved.|A>60:2 value~truth|faith:3 N>60:1',
      'Goes quiet and gathers evidence to prove their innocence.|C>65:3 N<50:1',
      'Takes the fall to protect someone else.|value~family|loyal|love:3 flaw~martyr:3 wound~blame:2',
      'Leaves town before it gets worse.|N>65:2 fear~found|prison|powerless:2']],
    ['secret', 'Discovers a secret about someone close', 'lock', 'The audience should learn it a beat before, or a beat after, them.', [
      'Keeps it, and it eats them alive.|C>55:1 A>55:1 N>60:2',
      'Tells everyone.|A<40:1 value~truth|justice:3 E>60:1',
      'Quietly keeps it as insurance.|A<40:2 C>55:1 flaw~manipul|secre:3',
      'Confronts the person privately and gives them a chance.|A>55:2 C>55:1 value~loyal|honour:2',
      'Pretends not to know, and watches.|E<45:2 O>55:1 flaw~secre:2',
      'Digs deeper and finds something worse.|O>65:3 flaw~obsess:2']],
    ['order', 'Is given an order they disagree with', 'arrow', 'Put the order in front of witnesses, so the choice is public.', [
      'Obeys to the letter and hates themself for it.|C>65:2 A>55:1 value~order|tradition|loyal:3',
      'Refuses openly, whatever it costs.|A<45:1 value~freedom|justice|truth:3 flaw~stubborn|righteous:2',
      'Says yes, then quietly does the opposite.|O>55:1 C<50:1 flaw~dishonest|secre:2',
      'Obeys, but "improves" it their own way.|O>65:2 C>50:1 flaw~pride|control:2',
      'Asks "why?" until the order falls apart.|O>60:2 N<50:1',
      'Takes it over the boss\'s head.|C>60:2 value~order|justice:2']],
    ['rival', 'A rival succeeds where they failed', 'star', 'Make them watch the rival\'s moment, up close.', [
      'Congratulates them publicly and seethes in private.|A>45:1 N>55:2 flaw~jealous|vanity:3',
      'Doubles down and works twice as hard.|C>65:3 fear~fail|ordinary:2',
      'Sabotages them.|A<35:3 flaw~jealous|veng:3',
      'Gives up and says they never really wanted it.|N>60:1 C<45:2 flaw~cynic|lazi|coward:3',
      'Asks the rival to teach them.|A>60:2 O>60:2 arc~positive:1',
      'Changes direction completely.|O>65:2 fear~ordinary:1']],
    ['plea', 'Someone desperate asks for help', 'bell', 'Make helping cost something the hero wants.', [
      'Drops everything to help, at a cost to themself.|A>65:3 flaw~pleas|martyr:2',
      'Helps, but makes sure they owe them.|A<50:1 C>55:1 value~power|wealth:2 flaw~manipul:2',
      'Refuses: "Not my problem."|A<35:3 flaw~cynic|greed:2',
      'Agrees, panics, and passes it to someone else.|N>60:2 flaw~coward|indecision:3',
      'Helps, but only on their own terms.|C>60:1 flaw~control|pride:3',
      'Sees themself in the person, and is changed by it.|O>55:1 A>55:1 arc~positive:2']]
  ];

  OS.TRAITS = [
    ['O', 'Openness', 'Practical, set in their ways', 'Curious, imaginative, restless'],
    ['C', 'Conscientiousness', 'Spontaneous, messy, late', 'Disciplined, careful, driven'],
    ['E', 'Extraversion', 'Quiet, private, recharges alone', 'Bold, talkative, needs a crowd'],
    ['A', 'Agreeableness', 'Blunt, competitive, suspicious', 'Warm, trusting, avoids conflict'],
    ['N', 'Neuroticism', 'Calm, steady, hard to rattle', 'Anxious, volatile, feels everything']
  ];

  OS.NAMES = {
    first: ['Nora', 'Bernard', 'Lucia', 'Idris', 'Mei', 'Oskar', 'Amara', 'Theo', 'Ines', 'Rafael', 'Greta', 'Kwame', 'Sasha', 'Dmitri', 'Yara', 'Hugo',
      'Priya', 'Elias', 'Marta', 'Jonah', 'Solène', 'Tomas', 'Aiko', 'Malik', 'Freya', 'Mateo', 'Odile', 'Ravi', 'Wren', 'Augustin', 'Zainab', 'Felix',
      'Imogen', 'Kofi', 'Ruth', 'Lior', 'Esme', 'Bastien', 'Noor', 'Caspar', 'Adaeze', 'Ilse', 'Mirela', 'Silas', 'June', 'Vasco', 'Bettina', 'Gus'],
    last: ['Kessel', 'Holm', 'Reyes', 'Okafor', 'Lindqvist', 'Moreau', 'Haddad', 'Novak', 'Varga', 'Castellanos', 'Brandt', 'Achebe', 'Tanaka', 'Petrov',
      'Ozola', 'Fitzgerald', 'Duarte', 'Mensah', 'Rossi', 'Abernathy', 'Kowalski', 'Nakamura', 'Ferreira', 'Halloran', 'Szabo', 'Lefebvre', 'Adeyemi',
      'Marchetti', 'Sorensen', 'Quill', 'Vance', 'Bellweather', 'Hale', 'Darrow', 'Futrell', 'Amsel', 'Iqbal', 'Delacroix', 'Mbeki', 'Grimaldi']
  };

  OS.PROMPTS = [
    'Write a scene where two people argue about a dishwasher, and it\'s really about a death.',
    'Your protagonist lies in the first line they speak. Write the scene.',
    'A character returns something they borrowed twenty years ago.',
    'Write a dinner scene where nobody says what they want, and everyone gets it anyway.',
    'Open on a sound. Don\'t show its source until the last line.',
    'Write a phone call where we only hear one side, and the other side is lying.',
    'Two strangers share an elevator that stops. One of them knows the other.',
    'Write a scene with no dialogue that ends a friendship.',
    'A character has to pack up a parent\'s house in one afternoon.',
    'Somebody receives the wrong letter, and opens it anyway.',
    'Write an interrogation where the suspect is in charge.',
    'Your antagonist does something kind. Write it so we\'re scared.',
    'Start a scene late, mid-argument. End it early, before the answer.',
    'A wedding toast goes off script.',
    'Write the moment your protagonist realises the plan has already failed.',
    'Two characters must share one umbrella. Only one deserves it.',
    'A character practises a confession in the mirror, then does something else.',
    'Write a scene in one location, in real time, with a clock on the wall.',
    'Someone teaches a skill they no longer believe in.',
    'A child asks the question every adult in the room has been avoiding.',
    'The last customer of the night won\'t leave.'
  ];
})();
