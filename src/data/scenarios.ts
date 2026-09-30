import type { Level } from './types'

export type ScenarioIcon =
  | 'coffee' | 'croissant' | 'map' | 'hotel' | 'stethoscope' | 'shopping' | 'phone' | 'briefcase'
  | 'home' | 'train' | 'party' | 'package' | 'utensils' | 'handshake' | 'newspaper' | 'plane' | 'user' | 'ticket'

export interface Scenario {
  id: string // short kebab-case, unique, e.g. 'cafe'
  level: Level // 'A1' | 'A2' | 'B1' | 'B2'
  title: string // English title, e.g. 'Ordering at a café'
  titleFr: string // e.g. 'Au café'
  icon: ScenarioIcon
  /** Shown to the learner: where they are, who they talk to, what's going on (English, 1–2 sentences, second person). */
  setting: string
  /** Instructions for the AI (English, 2–4 sentences): who it plays, personality, facts it knows (prices, times, availability, a small complication to make it interesting). */
  aiRole: string
  aiName: string // first name of the character the AI plays
  /** The AI's first line, in French, level-appropriate, ending with a question or prompt. */
  opening: string
  openingEn: string // English translation of the opening
  /** 2–4 concrete things the learner should achieve, English, imperative ("Order a hot drink and something to eat"). */
  goals: { id: string; text: string }[] // ids short kebab-case, unique within the scenario
  /** 4–6 useful phrases for the learner (French + English), at the scenario's level. */
  phrases: { fr: string; en: string }[]
  /** Ids of grammar lessons the scenario naturally practises (1–3, from the list below). */
  lessons: string[]
}

export const SCENARIOS: Scenario[] = [
  // ── A1
  {
    id: 'cafe',
    level: 'A1',
    title: 'Ordering at a café',
    titleFr: "Au café",
    icon: 'coffee',
    setting: "You're sitting on the terrace of a small café in Lyon. The waiter comes over to take your order.",
    aiRole:
      "You play Julien, a friendly but busy waiter at a café in Lyon. Menu: espresso €1.80, café crème €3.20, hot chocolate €3.80, fresh orange juice €4.50, croissant €1.50, pain au chocolat €1.70, ham-and-butter baguette sandwich €5.50; payment by card or cash. Complication: there are no croissants left this morning, so suggest a pain au chocolat instead, and when the learner asks for the bill, say the total slowly and clearly. Keep every reply to one or two very short sentences in simple A1 French, and use vous.",
    aiName: 'Julien',
    opening: "Bonjour ! Qu'est-ce que vous prenez ?",
    openingEn: 'Hello! What would you like?',
    goals: [
      { id: 'order-drink', text: 'Order a hot drink' },
      { id: 'order-food', text: 'Order something to eat' },
      { id: 'pay', text: 'Ask for the bill and understand the total' },
    ],
    phrases: [
      { fr: "Je voudrais un café crème, s'il vous plaît.", en: "I'd like a coffee with milk, please." },
      { fr: "Vous avez des croissants ?", en: 'Do you have any croissants?' },
      { fr: "Pour moi, un chocolat chaud.", en: 'A hot chocolate for me.' },
      { fr: "Non merci, c'est tout.", en: "No thanks, that's all." },
      { fr: "L'addition, s'il vous plaît.", en: 'The bill, please.' },
      { fr: "Je peux payer par carte ?", en: 'Can I pay by card?' },
    ],
    lessons: ['partitive', 'questions'],
  },
  {
    id: 'bakery',
    level: 'A1',
    title: 'Buying bread and pastries',
    titleFr: "À la boulangerie",
    icon: 'croissant',
    setting: "It's Saturday morning and you're at your local bakery. You need bread for lunch and something sweet to share with friends.",
    aiRole:
      "You play Martine, a cheerful baker who loves chatting with her customers. Prices: baguette €1.20, baguette tradition €1.40, country loaf €3.50, croissant €1.30, pain au chocolat €1.40, chocolate or coffee éclair €2.80, apple tart €3 a slice; payment by card or cash. Complication: the tradition baguettes are coming out of the oven in five minutes, so ask whether the learner wants to wait or take an ordinary baguette. Keep every reply to one or two very short sentences in simple A1 French, and use vous.",
    aiName: 'Martine',
    opening: "Bonjour ! Qu'est-ce que je vous donne aujourd'hui ?",
    openingEn: 'Hello! What can I get you today?',
    goals: [
      { id: 'bread', text: 'Buy some bread' },
      { id: 'treats', text: 'Buy two different pastries or cakes' },
      { id: 'price', text: 'Ask how much it costs and pay' },
    ],
    phrases: [
      { fr: "Une baguette tradition, s'il vous plaît.", en: 'A traditional baguette, please.' },
      { fr: "Je voudrais deux pains au chocolat.", en: "I'd like two pains au chocolat." },
      { fr: "Qu'est-ce que c'est, ça ?", en: "What's that?" },
      { fr: "Je prends aussi une part de tarte.", en: "I'll also have a slice of tart." },
      { fr: "Ça fait combien ?", en: 'How much is that?' },
      { fr: "C'est tout, merci.", en: "That's all, thank you." },
    ],
    lessons: ['articles', 'partitive', 'questions'],
  },
  {
    id: 'directions',
    level: 'A1',
    title: 'Asking for directions',
    titleFr: "Demander son chemin",
    icon: 'map',
    setting: 'You are in the centre of Bordeaux and need to post a parcel. You stop a friendly local in the street to ask the way to the post office.',
    aiRole:
      "You play Karim, a friendly local walking his dog in the centre of Bordeaux. The post office is ten minutes away on foot: straight on, then the second street on the left, next to a bakery and opposite a church; the nearest pharmacy is on the right, just after the traffic lights. Complication: it's 12:10 on a Saturday and the post office closes at 12:30, so the learner should hurry or come back on Monday. Keep every reply to one or two very short sentences in simple A1 French with words like à droite, à gauche and tout droit, use vous, and repeat slowly if asked.",
    aiName: 'Karim',
    opening: "Oui, bonjour ! Je peux vous aider ?",
    openingEn: 'Yes, hello! Can I help you?',
    goals: [
      { id: 'way', text: 'Ask how to get to the post office' },
      { id: 'distance', text: "Find out if it's far" },
      { id: 'pharmacy', text: "Ask whether there's a pharmacy nearby" },
      { id: 'check', text: "Repeat the directions to check you've understood" },
    ],
    phrases: [
      { fr: "Excusez-moi, où est la poste, s'il vous plaît ?", en: 'Excuse me, where is the post office, please?' },
      { fr: "C'est loin d'ici ?", en: 'Is it far from here?' },
      { fr: "Il y a une pharmacie près d'ici ?", en: 'Is there a pharmacy near here?' },
      { fr: "Je vais tout droit, puis à gauche ?", en: 'I go straight on, then left?' },
      { fr: "Vous pouvez parler plus lentement, s'il vous plaît ?", en: 'Can you speak more slowly, please?' },
      { fr: "Merci beaucoup, bonne journée !", en: 'Thank you very much, have a nice day!' },
    ],
    lessons: ['questions', 'places'],
  },
  {
    id: 'neighbour',
    level: 'A1',
    title: 'Meeting your new neighbour',
    titleFr: "Entre voisins",
    icon: 'user',
    setting: "You've just moved into a flat in Nantes. On the landing, you meet the woman who lives across the hall.",
    aiRole:
      "You play Sophie, a warm, chatty neighbour in her forties who has lived in the building for twelve years; she's a nurse, has a teenage son and a cat called Pistache. Useful facts she can share: the bins go out on Tuesday evenings, the best bakery is on the corner, and there's a market on the square on Sunday mornings. Complication: the lift has been out of order since Monday, which she mentions with a sigh. Ask the learner simple questions (name, where they're from, job, family), keep every reply to one or two very short sentences in simple A1 French, and use vous.",
    aiName: 'Sophie',
    opening: "Bonjour ! Je m'appelle Sophie, j'habite en face. Et vous, comment vous vous appelez ?",
    openingEn: "Hello! My name's Sophie, I live across the hall. And you, what's your name?",
    goals: [
      { id: 'introduce', text: "Say your name, where you're from and what you do" },
      { id: 'ask', text: 'Ask Sophie two questions about her life' },
      { id: 'area', text: 'Find out one useful thing about the building or the neighbourhood' },
    ],
    phrases: [
      { fr: "Enchanté(e) ! Je m'appelle…", en: 'Nice to meet you! My name is…' },
      { fr: "Je suis anglais(e), je viens de Londres.", en: "I'm English, I'm from London." },
      { fr: "Je travaille dans une banque.", en: 'I work in a bank.' },
      { fr: "Qu'est-ce que vous faites dans la vie ?", en: 'What do you do for a living?' },
      { fr: "Vous habitez ici depuis longtemps ?", en: 'Have you lived here for a long time?' },
      { fr: "Il y a un marché dans le quartier ?", en: 'Is there a market in the neighbourhood?' },
    ],
    lessons: ['etre-avoir', 'er-verbs', 'questions'],
  },

  // ── A2
  {
    id: 'hotel',
    level: 'A2',
    title: 'Checking into a hotel',
    titleFr: "L'arrivée à l'hôtel",
    icon: 'hotel',
    setting: "After a long journey, you arrive at a small hotel in Nice at 1 p.m. You've booked a room for three nights.",
    aiRole:
      "You play Thomas, a polite and slightly apologetic receptionist at the Hôtel Les Mimosas in Nice; it's 1 p.m. and the learner has booked a double room with a sea view for three nights at €95 a night. Breakfast isn't included: it costs €12 per person and is served from 7:00 to 10:30 in the garden. Complication: check-in is from 3 p.m. and the room isn't ready yet, so you can keep their luggage and offer a free drink on the terrace, or give them a room without a sea view straight away for €80 a night. Keep replies short (two or three sentences) in simple A2 French, and use vous.",
    aiName: 'Thomas',
    opening: "Bonjour et bienvenue à l'hôtel Les Mimosas ! Vous avez une réservation ?",
    openingEn: 'Hello and welcome to the Hôtel Les Mimosas! Do you have a reservation?',
    goals: [
      { id: 'check-in', text: 'Give your name and confirm your booking' },
      { id: 'room', text: "Find a solution because your room isn't ready" },
      { id: 'breakfast', text: 'Ask about breakfast times and the price' },
    ],
    phrases: [
      { fr: "J'ai réservé une chambre au nom de…", en: "I've booked a room under the name…" },
      { fr: "La chambre n'est pas encore prête ?", en: "The room isn't ready yet?" },
      { fr: "Est-ce que je peux laisser mes bagages ici ?", en: 'Can I leave my luggage here?' },
      { fr: "Vous n'avez pas une autre chambre libre ?", en: "Don't you have another room free?" },
      { fr: "Le petit-déjeuner est servi à quelle heure ?", en: 'What time is breakfast served?' },
      { fr: "Je vais revenir vers quinze heures.", en: "I'll come back around 3 p.m." },
    ],
    lessons: ['passe-compose-avoir', 'near-future', 'irregular-present'],
  },
  {
    id: 'doctor',
    level: 'A2',
    title: "At the doctor's",
    titleFr: "Chez le médecin",
    icon: 'stethoscope',
    setting: "You've been feeling unwell for a few days, so you've made an appointment with a GP in Toulouse. You're now sitting in the consulting room.",
    aiRole:
      "You play Dr Nathalie Moreau, a calm and kind GP in Toulouse. Ask about the symptoms, when they started, and whether the learner has a temperature or takes any medicine; then diagnose a bad cold or mild flu and prescribe rest, paracetamol three times a day for five days and plenty of fluids, and offer a sick note for two days. Complication: before writing the prescription, check for allergies, and at the end say the consultation costs €30 and ask for their carte Vitale (if they don't have one, give them a form to claim a refund later). Keep replies short (two or three sentences) in simple A2 French, and use vous.",
    aiName: 'Nathalie',
    opening: "Bonjour, asseyez-vous. Alors, qu'est-ce qui ne va pas ?",
    openingEn: "Hello, have a seat. So, what's the matter?",
    goals: [
      { id: 'symptoms', text: 'Describe at least two symptoms' },
      { id: 'since', text: 'Say when the symptoms started' },
      { id: 'treatment', text: 'Understand the treatment and ask one question about it' },
    ],
    phrases: [
      { fr: "J'ai mal à la tête et à la gorge.", en: "I've got a headache and a sore throat." },
      { fr: "Ça a commencé lundi soir.", en: 'It started on Monday evening.' },
      { fr: "J'ai de la fièvre depuis hier.", en: "I've had a temperature since yesterday." },
      { fr: "Je me sens très fatigué(e).", en: 'I feel very tired.' },
      { fr: "Je ne suis allergique à rien.", en: "I'm not allergic to anything." },
      { fr: "Je dois prendre ces comprimés combien de fois par jour ?", en: 'How many times a day do I have to take these tablets?' },
    ],
    lessons: ['passe-compose-avoir', 'reflexive'],
  },
  {
    id: 'restaurant-booking',
    level: 'A2',
    title: 'Booking a table by phone',
    titleFr: "Réserver une table",
    icon: 'phone',
    setting: 'You want to take some friends out for dinner on Saturday evening. You phone a popular bistro in Paris to book a table.',
    aiRole:
      "You play Camille, who answers the phone at Le Bistrot du Marché, a popular bistro in Paris open Tuesday to Saturday (12:00–14:30 and 19:00–23:00). Complication: Saturday at 8 p.m. is fully booked, so offer 7 p.m. or 9:30 p.m. instead, or a table on the terrace at 8 p.m. if the weather is fine. You need the number of people, a name and a phone number; the set menu costs €34, there's always one vegetarian dish, and tables are only held for fifteen minutes. Keep replies short (two or three sentences) in simple A2 French, and use vous.",
    aiName: 'Camille',
    opening: "Le Bistrot du Marché, bonjour ! Qu'est-ce que je peux faire pour vous ?",
    openingEn: 'Le Bistrot du Marché, hello! What can I do for you?',
    goals: [
      { id: 'book', text: 'Book a table for Saturday evening' },
      { id: 'time', text: 'Agree on another time or option, as 8 p.m. is full' },
      { id: 'details', text: 'Give your name, the number of people and your phone number' },
      { id: 'menu', text: 'Ask one question about the menu' },
    ],
    phrases: [
      { fr: "Je voudrais réserver une table pour samedi soir.", en: "I'd like to book a table for Saturday evening." },
      { fr: "On va être quatre.", en: "There'll be four of us." },
      { fr: "Vers vingt heures, c'est possible ?", en: 'Around 8 p.m., is that possible?' },
      { fr: "Vingt et une heures trente, ça me va.", en: '9.30 p.m. is fine for me.' },
      { fr: "Vous avez un plat végétarien ?", en: 'Do you have a vegetarian dish?' },
      { fr: "C'est au nom de…", en: "It's under the name…" },
    ],
    lessons: ['near-future', 'irregular-present'],
  },
  {
    id: 'holiday',
    level: 'A2',
    title: 'Talking about your holiday',
    titleFr: "Retour de vacances",
    icon: 'plane',
    setting: "It's early September and you're having a coffee with your French friend Léa. She wants to hear all about your summer holiday.",
    aiRole:
      "You play Léa, a curious, enthusiastic friend who has just come back from a week's camping in Brittany, where it rained almost every day (tell this with humour if asked). Ask the learner where they went, who with, how they travelled, what they did and ate, what the weather was like and whether they'd recommend it, reacting naturally with follow-up questions. Keep replies short (two or three sentences) in simple A2 French, use tu, and model the passé composé and the imparfait.",
    aiName: 'Léa',
    opening: "Alors, raconte ! Où est-ce que tu as passé tes vacances cet été ?",
    openingEn: 'So, tell me everything! Where did you spend your holiday this summer?',
    goals: [
      { id: 'where', text: 'Say where you went and who with' },
      { id: 'activities', text: 'Describe three things you did' },
      { id: 'weather', text: 'Say what the weather was like' },
      { id: 'ask-back', text: 'Ask Léa about her holiday' },
    ],
    phrases: [
      { fr: "Je suis allé(e) en Italie avec des amis.", en: 'I went to Italy with some friends.' },
      { fr: "On a pris le train jusqu'à Rome.", en: 'We took the train to Rome.' },
      { fr: "Il faisait beau et très chaud.", en: 'The weather was lovely and very hot.' },
      { fr: "On a visité des musées et on a beaucoup mangé !", en: 'We visited museums and ate a lot!' },
      { fr: "C'était génial, je te le conseille !", en: 'It was great, I recommend it!' },
      { fr: "Et toi, tu as passé de bonnes vacances ?", en: 'And you, did you have a good holiday?' },
    ],
    lessons: ['passe-compose-avoir', 'passe-compose-etre', 'imparfait'],
  },

  // ── B1
  {
    id: 'job-interview',
    level: 'B1',
    title: 'A job interview',
    titleFr: "L'entretien d'embauche",
    icon: 'briefcase',
    setting: "You've applied for a part-time job at a café-bookshop in Montpellier. The manager is interviewing you at a quiet table at the back.",
    aiRole:
      "You play Olivier, the manager of La Page Blanche, a café-bookshop in Montpellier; you're friendly but professional and use vous. The job is 20 hours a week, mostly weekends plus two evenings, at €12.50 an hour gross, serving in the café and helping in the bookshop, starting in two weeks. Ask about experience, motivation, languages, availability and how they'd handle a difficult customer; complication: you really need someone on Sunday mornings, so press the learner on this and accept a reasonable compromise. At the end, invite them to ask questions, and keep replies fairly short (two to four sentences) in natural B1 French.",
    aiName: 'Olivier',
    opening: "Bonjour, installez-vous. Pour commencer, pourriez-vous vous présenter en quelques mots ?",
    openingEn: 'Hello, take a seat. To begin with, could you introduce yourself in a few words?',
    goals: [
      { id: 'present', text: 'Present your experience and qualities' },
      { id: 'motivation', text: 'Explain why you want this job' },
      { id: 'availability', text: 'Discuss your availability, including Sunday mornings' },
      { id: 'questions', text: 'Ask two questions about the job' },
    ],
    phrases: [
      { fr: "J'ai travaillé deux ans dans un restaurant à Londres.", en: 'I worked in a restaurant in London for two years.' },
      { fr: "Je suis quelqu'un de sérieux et d'organisé.", en: "I'm a reliable, organised person." },
      { fr: "Ce poste m'intéresse parce que j'adore le contact avec les clients.", en: 'This job interests me because I love dealing with customers.' },
      { fr: "Je suis disponible le week-end, sauf le dimanche matin.", en: "I'm available at weekends, except on Sunday mornings." },
      { fr: "Si besoin, je pourrais m'arranger.", en: 'If need be, I could make arrangements.' },
      { fr: "Quels seraient mes horaires exactement ?", en: 'What exactly would my hours be?' },
    ],
    lessons: ['pc-vs-imparfait', 'conditionnel'],
  },
  {
    id: 'flat-visit',
    level: 'B1',
    title: 'Viewing a flat to rent',
    titleFr: "La visite d'un appartement",
    icon: 'home',
    setting: "You're looking for a flat to rent in Lille. The landlord is showing you round a one-bedroom flat near the city centre.",
    aiRole:
      "You play Gérard, a talkative retired landlord showing his 45 m² one-bedroom flat near the centre of Lille: rent €720 a month plus €60 service charges (water and building upkeep, not heating), a deposit of one month's rent, available on the 1st of next month, fitted kitchen with a washing machine, small south-facing balcony, ten minutes' walk from the metro. Complication: it's on the fourth floor with no lift and the electric heating is expensive in winter; you'd rather not have pets but can be persuaded. You ask for three recent payslips or a guarantor. Keep replies fairly short (two to four sentences) in natural B1 French, and use vous.",
    aiName: 'Gérard',
    opening: "Bonjour, entrez, je vous en prie ! Voici le séjour : il est lumineux, vous ne trouvez pas ?",
    openingEn: "Hello, come in, please! Here's the living room: it's bright, don't you think?",
    goals: [
      { id: 'cost', text: 'Find out the total monthly cost, including charges' },
      { id: 'practical', text: 'Ask about at least two practical details (heating, transport, lift, appliances)' },
      { id: 'documents', text: 'Find out what documents the landlord needs' },
      { id: 'decide', text: "Say whether you're interested and when you could move in" },
    ],
    phrases: [
      { fr: "Le loyer, c'est charges comprises ?", en: 'Does the rent include service charges?' },
      { fr: "Qu'est-ce qui est inclus dans les charges ?", en: "What's included in the service charges?" },
      { fr: "Le chauffage, il est électrique ou au gaz ?", en: 'Is the heating electric or gas?' },
      { fr: "C'est exactement le genre d'appartement que je cherche.", en: "It's exactly the kind of flat I'm looking for." },
      { fr: "Quels documents est-ce qu'il vous faut ?", en: 'Which documents do you need?' },
      { fr: "Il me plaît beaucoup, mais j'aimerais y réfléchir.", en: "I really like it, but I'd like to think about it." },
    ],
    lessons: ['y-en', 'relative-pronouns', 'conditionnel'],
  },
  {
    id: 'faulty-product',
    level: 'B1',
    title: 'Returning a faulty product',
    titleFr: "Au service client",
    icon: 'shopping',
    setting: "A week ago you bought wireless earbuds in an electronics shop in Strasbourg, and one of them has stopped working. You still have the receipt, but you've thrown away the box.",
    aiRole:
      "You play Nadia, a polite customer service assistant in an electronics shop in Strasbourg. The learner bought wireless earbuds for €89 eight days ago; the shop's rules say refunds are only possible within fourteen days with the receipt and the original box, otherwise you can offer an exchange, a credit note (un avoir) or a repair under the two-year warranty (about three weeks). Complication: the learner no longer has the box, so first say a refund isn't possible; if they argue well, offer an exchange, but that model is out of stock until Friday. Stick to the rules at first, and keep replies fairly short (two to four sentences) in natural B1 French, using vous.",
    aiName: 'Nadia',
    opening: "Bonjour, bienvenue au service client. Qu'est-ce qui vous amène ?",
    openingEn: 'Hello, welcome to customer service. What brings you here?',
    goals: [
      { id: 'explain', text: "Explain what you bought, when, and what's wrong with it" },
      { id: 'refund', text: 'Ask for a refund' },
      { id: 'solution', text: 'Negotiate an acceptable alternative (exchange, repair or credit note)' },
    ],
    phrases: [
      { fr: "J'ai acheté ces écouteurs ici la semaine dernière.", en: 'I bought these earbuds here last week.' },
      { fr: "L'écouteur gauche ne marche plus depuis deux jours.", en: "The left earbud hasn't worked for two days." },
      { fr: "J'ai toujours le ticket de caisse, mais je n'ai plus la boîte.", en: 'I still have the receipt, but I no longer have the box.' },
      { fr: "Je voudrais être remboursé(e), s'il vous plaît.", en: "I'd like a refund, please." },
      { fr: "Est-ce que vous pourriez me les échanger ?", en: 'Could you exchange them for me?' },
      { fr: "Ce n'est pas ma faute s'ils ne marchent plus.", en: "It's not my fault they don't work any more." },
    ],
    lessons: ['double-pronouns', 'conditionnel', 'pc-vs-imparfait'],
  },
  {
    id: 'weekend-plans',
    level: 'B1',
    title: 'Making weekend plans',
    titleFr: "Des projets pour le week-end",
    icon: 'ticket',
    setting: "It's Thursday evening and you're chatting with your French friend Hugo about what to do together this weekend, but your tastes are quite different.",
    aiRole:
      "You play Hugo, a good friend who loves the outdoors and hates crowds: you'd like to go hiking on Saturday (leaving at 8 a.m., back around 5 p.m.) or cycling along the river. Other options in town: a new photography exhibition at the museum (€12, open until 7 p.m.), a jazz concert on Saturday night (€25, only a few tickets left) and a flea market on Sunday morning. Complication: rain is forecast for Sunday afternoon, and you're busy on Saturday evening because of your sister's birthday dinner. Keep replies fairly short (two to four sentences) in natural, informal B1 French with tu, and accept a compromise if the learner makes a good case.",
    aiName: 'Hugo',
    opening: "Salut ! Alors, qu'est-ce qu'on fait ce week-end ? Moi, j'ai vraiment envie de faire une randonnée, ça te dit ?",
    openingEn: 'Hi! So, what shall we do this weekend? I really feel like going hiking, how does that sound?',
    goals: [
      { id: 'suggest', text: 'Suggest at least two activities' },
      { id: 'disagree', text: "Politely turn down one of Hugo's ideas and explain why" },
      { id: 'plan', text: 'Agree on a plan with a day, a time and a meeting place' },
    ],
    phrases: [
      { fr: "Ça te dirait d'aller voir l'exposition au musée ?", en: 'How about going to see the exhibition at the museum?' },
      { fr: "Et si on allait au concert samedi soir ?", en: 'What if we went to the concert on Saturday night?' },
      { fr: "Franchement, je préférerais faire quelque chose de plus tranquille.", en: "Honestly, I'd rather do something quieter." },
      { fr: "S'il pleut dimanche, on pourrait aller au cinéma.", en: 'If it rains on Sunday, we could go to the cinema.' },
      { fr: "D'accord, à condition de ne pas partir trop tôt !", en: "OK, as long as we don't leave too early!" },
      { fr: "On se retrouve où et à quelle heure ?", en: 'Where and what time shall we meet?' },
    ],
    lessons: ['conditionnel', 'futur-simple'],
  },

  // ── B2
  {
    id: 'negotiation',
    level: 'B2',
    title: 'Negotiating a second-hand purchase',
    titleFr: "Négocier le prix",
    icon: 'handshake',
    setting: "You've found a solid oak dining table with six chairs on a classifieds website. You've gone to the seller's house near Rennes to see it, and you'd like to pay less than the asking price.",
    aiRole:
      "You play Philippe, a friendly but shrewd seller in his fifties who is moving abroad in two weeks and is selling a solid oak dining table with six chairs, advertised at €450 (bought new for €1,400 eight years ago). Complication: one chair has a wobbly leg and there's a scratch on the tabletop, which you only admit if the learner asks or points it out. You won't go below €330, you prefer cash or an instant bank transfer, and you can deliver on Saturday for an extra €40; your moving deadline is a weakness the learner can exploit. Keep replies concise (two to four sentences) in natural, idiomatic B2 French, and use vous.",
    aiName: 'Philippe',
    opening: "Bonjour, entrez ! La table est juste là, dans la salle à manger. Comme vous pouvez le constater, elle est en excellent état. Qu'est-ce que vous en pensez ?",
    openingEn: "Hello, come in! The table's just here, in the dining room. As you can see, it's in excellent condition. What do you think of it?",
    goals: [
      { id: 'inspect', text: "Ask about the furniture's history and condition" },
      { id: 'flaws', text: 'Point out the defects to justify a lower price' },
      { id: 'deal', text: 'Make a counter-offer and agree on a price' },
      { id: 'logistics', text: 'Arrange payment and delivery or collection' },
    ],
    phrases: [
      { fr: "Vous l'avez depuis combien de temps ?", en: 'How long have you had it?' },
      { fr: "J'ai remarqué que l'une des chaises était un peu bancale.", en: 'I noticed that one of the chairs was a bit wobbly.' },
      { fr: "Compte tenu de la rayure, votre prix me paraît un peu élevé.", en: 'Given the scratch, your price seems a little high to me.' },
      { fr: "Je serais prêt(e) à vous en donner trois cents euros.", en: "I'd be willing to give you three hundred euros for it." },
      { fr: "Si vous me la livrez, je veux bien monter à trois cent cinquante.", en: "If you deliver it, I'm happy to go up to three hundred and fifty." },
      { fr: "Bon, coupons la poire en deux.", en: "All right, let's split the difference." },
    ],
    lessons: ['conditionnel', 'y-en', 'connectors'],
  },
  {
    id: 'remote-work-debate',
    level: 'B2',
    title: 'Debating remote work',
    titleFr: "Pour ou contre le télétravail ?",
    icon: 'newspaper',
    setting: "You're having dinner at a French friend's flat in Paris, and the conversation turns to remote work. Is working from home the future, or is the office still essential?",
    aiRole:
      "You play Élodie, a sharp, good-humoured friend who works in HR for a large company in Paris and is sceptical about full-time remote work. Your arguments: it isolates people, blurs the line between work and private life, and makes it harder to train young employees; but you admit you love your two days a week at home and not having to commute on those days. Don't give in easily, but concede good points, push the learner to back up their views with examples, and use tu. Keep replies to two or three sentences in natural, idiomatic B2 French, using the subjunctive where it fits (je doute que, bien que, il faut que).",
    aiName: 'Élodie',
    opening: "Franchement, je ne suis pas convaincue que le télétravail à cent pour cent soit une bonne idée. Et toi, tu en penses quoi ?",
    openingEn: "Honestly, I'm not convinced that working from home full-time is a good idea. What do you think?",
    goals: [
      { id: 'opinion', text: 'Give your opinion and back it up with at least two arguments' },
      { id: 'concede', text: "Acknowledge one of Élodie's points while keeping your position" },
      { id: 'example', text: 'Support your view with a concrete example' },
      { id: 'common-ground', text: 'Find some common ground to wrap up the discussion' },
    ],
    phrases: [
      { fr: "Je trouve que le télétravail permet de mieux concilier vie pro et vie perso.", en: 'I think remote work makes it easier to balance work and private life.' },
      { fr: "Je doute que les gens soient moins productifs chez eux.", en: 'I doubt people are less productive at home.' },
      { fr: "Il est vrai que certains se sentent isolés, mais…", en: "It's true that some people feel isolated, but…" },
      { fr: "Bien que ce soit pratique, ça ne convient pas à tout le monde.", en: "Although it's convenient, it doesn't suit everyone." },
      { fr: "À mon avis, tout dépend du métier qu'on exerce.", en: 'In my view, it all depends on the job you do.' },
      { fr: "Sur ce point, je suis tout à fait d'accord avec toi.", en: 'On that point, I completely agree with you.' },
    ],
    lessons: ['subjonctif-vs-indicatif', 'subjonctif', 'connectors'],
  },
  {
    id: 'train-complaint',
    level: 'B2',
    title: 'Complaining about a late train',
    titleFr: "Réclamation au guichet",
    icon: 'train',
    setting: "Your high-speed train from Marseille to Paris arrived almost three hours late and you missed an important appointment. You're at the customer service desk at the Gare de Lyon to make a formal complaint.",
    aiRole:
      "You play Stéphane, a polite, formal and slightly weary agent at the railway company's customer service desk at the Gare de Lyon in Paris. The learner's train from Marseille arrived 2 hours 40 minutes late because of a signalling failure; the ticket cost €96, and delays of over two hours entitle passengers to a 50% refund, claimed online within sixty days and paid within thirty days by bank transfer or voucher. Complication: you can't pay anything at the desk and the company doesn't normally cover indirect costs such as a taxi or a missed appointment, although you can issue a delay certificate and a complaint reference number. Keep replies concise (two to four sentences) in formal B2 French, using vous.",
    aiName: 'Stéphane',
    opening: "Bonjour, je vous écoute. En quoi puis-je vous aider ?",
    openingEn: 'Hello, go ahead. How can I help you?',
    goals: [
      { id: 'explain', text: 'Explain formally what happened and how it affected you' },
      { id: 'compensation', text: "Find out what compensation you're entitled to and how to claim it" },
      { id: 'costs', text: 'Argue for the reimbursement of an extra cost, such as a taxi' },
      { id: 'proof', text: 'Obtain a delay certificate or a complaint reference number' },
    ],
    phrases: [
      { fr: "Je souhaiterais déposer une réclamation.", en: "I'd like to make a formal complaint." },
      { fr: "Le train est arrivé avec près de trois heures de retard, si bien que j'ai manqué un rendez-vous important.", en: 'The train arrived nearly three hours late, so I missed an important appointment.' },
      { fr: "Il est inadmissible qu'aucune information n'ait été donnée aux voyageurs.", en: "It's unacceptable that no information was given to passengers." },
      { fr: "J'ai dû prendre un taxi à mes frais.", en: 'I had to take a taxi at my own expense.' },
      { fr: "Pourriez-vous me remettre une attestation de retard ?", en: 'Could you give me a certificate confirming the delay?' },
      { fr: "Dans quel délai serai-je remboursé(e) ?", en: 'How long will it take for me to be refunded?' },
    ],
    lessons: ['passive', 'connectors', 'subjonctif-vs-indicatif'],
  },
  {
    id: 'explaining-work',
    level: 'B2',
    title: 'Explaining your work',
    titleFr: "Parler de son travail",
    icon: 'utensils',
    setting: "You've recently joined a company in Grenoble. At lunch in the staff canteen, a curious colleague from the accounts department asks you what you actually do.",
    aiRole:
      "You play Mathieu, an accountant who has worked at the company in Grenoble for fifteen years; you're genuinely curious but know nothing about the learner's field. Ask about their role, a typical day, the purpose of their current project and a difficulty they've faced, and whenever they use jargon or stay vague, ask for clarification (Concrètement, ça veut dire quoi ?). Complication: halfway through, mention that your team is worried the project will change the way they work, and ask the learner to reassure you. Keep replies short (two or three sentences) in natural, idiomatic B2 French, and use tu, as colleagues often do.",
    aiName: 'Mathieu',
    opening: "Salut ! Il paraît que tu viens de rejoindre l'équipe projet. Concrètement, tu fais quoi ?",
    openingEn: "Hi! I hear you've just joined the project team. So what exactly do you do?",
    goals: [
      { id: 'role', text: 'Explain your role and describe a typical day' },
      { id: 'project', text: 'Explain the purpose of your project in simple terms' },
      { id: 'challenge', text: 'Talk about a difficulty you faced and how you dealt with it' },
      { id: 'reassure', text: 'Reassure Mathieu about the impact of the project on his team' },
    ],
    phrases: [
      { fr: "En gros, mon rôle consiste à…", en: 'Basically, my job is to…' },
      { fr: "Le projet sur lequel je travaille vise à…", en: "The project I'm working on aims to…" },
      { fr: "Pour faire simple, on essaie de…", en: "To put it simply, we're trying to…" },
      { fr: "Au début, nous avions sous-estimé la charge de travail.", en: 'At the start, we had underestimated the workload.' },
      { fr: "En travaillant en équipe, on a fini par trouver une solution.", en: 'By working as a team, we eventually found a solution.' },
      { fr: "Ne t'inquiète pas, ça ne changera pas grand-chose pour ton équipe.", en: "Don't worry, it won't change much for your team." },
    ],
    lessons: ['lequel', 'gerondif', 'plus-que-parfait'],
  },
]

export const SCENARIO_BY_ID: Record<string, Scenario> = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]))
