export interface SoundSet {
  id: string // kebab-case, e.g. 'u-ou'
  title: string // English, e.g. 'u vs ou'
  sound: string // the sounds in French notation, e.g. 'u · ou'
  /** How to make the sound(s), English, 1–2 concrete sentences (lips/tongue position, English comparison). */
  tip: string
  /** 6–8 short sentences (4–10 words) dense in the sound, easy vocabulary, with English translations. */
  sentences: { fr: string; en: string }[]
}

export const SOUND_SETS: SoundSet[] = [
  {
    id: 'u-ou',
    title: 'u vs ou',
    sound: 'u · ou',
    tip: 'For ou, round your lips tightly and pull your tongue back, as in “food”. For u, keep exactly the same rounded lips but press the tip of your tongue against your bottom teeth, as if you were saying “ee” while whistling.',
    sentences: [
      { fr: "Tu as tout vu ?", en: 'Did you see everything?' },
      { fr: "Vous avez vu la roue du vélo dans la rue ?", en: 'Did you see the bike wheel in the street?' },
      { fr: "Il habite tout au bout de la rue.", en: 'He lives right at the end of the street.' },
      { fr: "Jules joue souvent du tuba.", en: 'Jules often plays the tuba.' },
      { fr: "Tu as bu tout le jus de pomme ?", en: 'Did you drink all the apple juice?' },
      { fr: "Où sont les douze tulipes rouges ?", en: 'Where are the twelve red tulips?' },
      { fr: "Bonjour, vous voulez du sucre ?", en: 'Hello, would you like some sugar?' },
      { fr: "Lucie court tous les jours sur la plage.", en: 'Lucie runs on the beach every day.' },
    ],
  },
  {
    id: 'nasals',
    title: 'Nasal vowels',
    sound: 'an/en · on · in/ain/un',
    tip: "Let the air flow through your nose and mouth at the same time, and don't pronounce the n or m at all. For an/en open your mouth wide as in “father”, for on round your lips into a small “o”, and for in/ain/un spread your lips as in “bat”.",
    sentences: [
      { fr: "Mon enfant mange du pain blanc.", en: 'My child eats white bread.' },
      { fr: "On prend un bon vin blanc ?", en: 'Shall we have a nice white wine?' },
      { fr: "Ils vont au jardin le lundi matin.", en: 'They go to the garden on Monday mornings.' },
      { fr: "Le chien de mon voisin est très content.", en: "My neighbour's dog is very happy." },
      { fr: "Vincent chante une chanson en allemand.", en: 'Vincent is singing a song in German.' },
      { fr: "Nous rentrons demain matin en train.", en: "We're coming back tomorrow morning by train." },
      { fr: "Mon cousin a cinq ans maintenant.", en: 'My cousin is five now.' },
    ],
  },
  {
    id: 'r',
    title: 'The French r',
    sound: 'r',
    tip: 'Keep the tip of your tongue down behind your bottom teeth and raise the back of your tongue towards the spot where you say the g in “go”, letting the air rub through with a soft gargling sound. Never curl or lift the tip of your tongue as you would in English.',
    sentences: [
      { fr: "Robert arrive à Paris ce soir.", en: 'Robert arrives in Paris this evening.' },
      { fr: "Il y a trois restaurants dans ma rue.", en: 'There are three restaurants in my street.' },
      { fr: "Le train pour Rouen part à treize heures.", en: 'The train to Rouen leaves at 1 p.m.' },
      { fr: "Je préfère le fromage frais.", en: 'I prefer fresh cheese.' },
      { fr: "Mon frère travaille en Irlande.", en: 'My brother works in Ireland.' },
      { fr: "Tu as rendez-vous vendredi ?", en: 'Have you got an appointment on Friday?' },
      { fr: "Ce roman raconte une grande histoire d'amour.", en: 'This novel tells a great love story.' },
      { fr: "Il faut rentrer, il est très tard.", en: "We have to go home, it's very late." },
    ],
  },
  {
    id: 'e-accents',
    title: 'é vs è',
    sound: 'é · è/ê/ai',
    tip: 'For é, smile slightly with your mouth almost closed and hold a short, pure sound, like the “ay” in “day” without the glide at the end. For è, ê and ai, drop your jaw a little and relax your lips, as in “bed”.',
    sentences: [
      { fr: "Mon père a préparé le déjeuner.", en: 'My father made lunch.' },
      { fr: "Ma mère aime le café au lait.", en: 'My mother likes coffee with milk.' },
      { fr: "Élise est née en février.", en: 'Élise was born in February.' },
      { fr: "La fenêtre de la chambre est fermée.", en: 'The bedroom window is closed.' },
      { fr: "Je vais téléphoner à mon frère.", en: "I'm going to phone my brother." },
      { fr: "Il a fait très chaud cet été.", en: 'It was very hot this summer.' },
      { fr: "Mes élèves adorent la forêt.", en: 'My pupils love the forest.' },
      { fr: "Tu préfères la neige ou la mer ?", en: 'Do you prefer snow or the sea?' },
    ],
  },
  {
    id: 'eu',
    title: 'eu and œu',
    sound: 'eu · œu',
    tip: 'Round your lips as if to say “o” while your tongue says “é”: that gives the closed eu of deux and bleu. For the eu of peur and sœur, open your mouth a little more, close to the vowel in “her” (without the r) but with rounded lips.',
    sentences: [
      { fr: "J'ai deux sœurs et un neveu.", en: 'I have two sisters and a nephew.' },
      { fr: "Ma sœur a peur du feu.", en: 'My sister is afraid of fire.' },
      { fr: "Il pleut depuis deux heures.", en: "It's been raining for two hours." },
      { fr: "Je veux un œuf et du beurre.", en: 'I want an egg and some butter.' },
      { fr: "Leur fils a les yeux bleus.", en: 'Their son has blue eyes.' },
      { fr: "Le professeur est très heureux.", en: 'The teacher is very happy.' },
      { fr: "On se voit vers neuf heures ?", en: 'Shall we meet around nine?' },
      { fr: "Je peux venir un peu plus tard ?", en: 'Can I come a bit later?' },
    ],
  },
  {
    id: 'liaison',
    title: 'Silent letters & liaison',
    sound: 'les‿amis · petit‿ami',
    tip: 'Most final consonants are silent (petit, grand, vous), except often c, r, f and l, the consonants of “careful”. Before a word starting with a vowel or a silent h, a silent consonant can link up with it: s and x sound like z, d sounds like t, so les amis sounds like “lé-za-mi”.',
    sentences: [
      { fr: "Les enfants sont avec leurs amis.", en: 'The children are with their friends.' },
      { fr: "Vous avez deux heures pour finir.", en: 'You have two hours to finish.' },
      { fr: "Je vous présente mon petit ami, Paul.", en: 'Let me introduce my boyfriend, Paul.' },
      { fr: "Nous allons dormir dans un grand hôtel.", en: "We're going to sleep in a big hotel." },
      { fr: "Ils ont un chien et deux chats.", en: 'They have a dog and two cats.' },
      { fr: "Il est huit heures et demie.", en: "It's half past eight." },
      { fr: "Mon ami habite aux États-Unis.", en: 'My friend lives in the United States.' },
      { fr: "Les petits oiseaux chantent dehors.", en: 'The little birds are singing outside.' },
    ],
  },
  {
    id: 'oi-ille-gn',
    title: 'oi, ille and gn',
    sound: 'oi · ille · gn',
    tip: 'oi sounds like the “wa” in “wacky”, and ille usually sounds like the y in “yes” (fille, famille), except in ville, mille and tranquille. gn sounds like the ny in “canyon”.',
    sentences: [
      { fr: "Ma fille a une voiture noire.", en: 'My daughter has a black car.' },
      { fr: "On part à la montagne ce soir.", en: "We're leaving for the mountains tonight." },
      { fr: "Toute la famille boit du champagne.", en: 'The whole family is drinking champagne.' },
      { fr: "Mon voisin espagnol se réveille tôt.", en: 'My Spanish neighbour wakes up early.' },
      { fr: "Il y a des champignons dans le bois.", en: 'There are mushrooms in the woods.' },
      { fr: "Regarde les feuilles sur le trottoir.", en: 'Look at the leaves on the pavement.' },
      { fr: "Tu as gagné trois billets, bravo !", en: "You've won three tickets, well done!" },
      { fr: "Le soir, ma famille se promène à la campagne.", en: 'In the evening, my family goes for a walk in the countryside.' },
    ],
  },
  {
    id: 'tongue-twisters',
    title: 'Tongue twisters',
    sound: 'r · u · ou · eu · an · in',
    tip: "Say each sentence slowly first, word by word, then speed up little by little while keeping it smooth. Watch your lips in a mirror: they stay rounded for u, ou and eu, and it's your tongue that makes the difference.",
    sentences: [
      { fr: "Il pleut sur la route du retour.", en: "It's raining on the way back." },
      { fr: "Ton oncle arrive vendredi en train.", en: 'Your uncle is arriving on Friday by train.' },
      { fr: "Ma sœur trouve que ce jus est trop sucré.", en: 'My sister thinks this juice is too sweet.' },
      { fr: "Je voudrais une grande tarte aux fruits rouges.", en: "I'd like a large red berry tart." },
      { fr: "Deux cents euros ? C'est un peu cher !", en: "Two hundred euros? That's a bit expensive!" },
      { fr: "Tout le monde a bu du vin rouge.", en: 'Everyone drank red wine.' },
      { fr: "Un écureuil grimpe à l'arbre du jardin.", en: 'A squirrel is climbing the tree in the garden.' },
      { fr: "Heureusement, le serrurier arrive tout de suite.", en: 'Luckily, the locksmith is coming straight away.' },
    ],
  },
]
