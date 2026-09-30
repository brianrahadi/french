import type { Level } from './types'

export interface ReaderTextDef {
  id: string // kebab-case, prefixed with the level, e.g. 'a1-ma-famille'
  level: Level // 'A1' | 'A2' | 'B1' | 'B2'
  title: string // French title
  titleEn: string // English title
  topic: string // short English topic label, e.g. 'Family', 'Travel', 'Work'
  paragraphs: { fr: string; en: string }[] // French paragraph + natural English translation
}

export const BUILTIN_TEXTS: ReaderTextDef[] = [
  // ── A1
  {
    id: 'a1-ma-famille',
    level: 'A1',
    title: 'Ma famille',
    titleEn: 'My family',
    topic: 'Family',
    paragraphs: [
      {
        fr: "Bonjour ! Je m'appelle Léa et j'ai vingt-huit ans. J'habite à Nantes, dans l'ouest de la France. Je suis infirmière dans un grand hôpital.",
        en: "Hello! My name is Léa and I'm twenty-eight. I live in Nantes, in the west of France. I'm a nurse in a big hospital.",
      },
      {
        fr: "Ma famille n'est pas très grande. Mon père s'appelle Michel. Il est boulanger et il se lève très tôt le matin. Ma mère s'appelle Catherine. Elle est à la retraite et elle adore son jardin.",
        en: "My family isn't very big. My father is called Michel. He's a baker and he gets up very early in the morning. My mother is called Catherine. She's retired and she loves her garden.",
      },
      {
        fr: "J'ai un frère et une sœur. Mon frère, Thomas, a trente-deux ans. Il est marié et il a deux enfants, une fille et un garçon. Ma sœur, Camille, est étudiante à Paris. Elle a vingt ans.",
        en: "I have a brother and a sister. My brother, Thomas, is thirty-two. He's married and he has two children, a girl and a boy. My sister, Camille, is a student in Paris. She's twenty.",
      },
      {
        fr: "Le dimanche, nous mangeons souvent ensemble chez mes parents. Ma mère fait un gâteau au chocolat et les enfants adorent ça. C'est ma journée préférée !",
        en: "On Sundays, we often eat together at my parents' house. My mother makes a chocolate cake and the children love it. It's my favourite day!",
      },
    ],
  },
  {
    id: 'a1-la-journee-de-karim',
    level: 'A1',
    title: 'La journée de Karim',
    titleEn: "Karim's day",
    topic: 'Daily life',
    paragraphs: [
      {
        fr: "Karim habite à Lille avec son chat, Biscuit. Il a trente-cinq ans et il travaille dans une banque. Le matin, il se réveille à sept heures. Il prend une douche et il boit un café.",
        en: "Karim lives in Lille with his cat, Biscuit. He's thirty-five and he works in a bank. In the morning, he wakes up at seven o'clock. He has a shower and drinks a coffee.",
      },
      {
        fr: "Il ne prend pas la voiture pour aller au travail. Il va au bureau à pied, parce que c'est à dix minutes de chez lui.",
        en: "He doesn't take the car to get to work. He walks to the office, because it's ten minutes from his home.",
      },
      {
        fr: "À midi, il mange un sandwich avec ses collègues dans un parc. L'après-midi, il a souvent des réunions. Il n'aime pas beaucoup les réunions : elles sont longues !",
        en: "At lunchtime, he eats a sandwich with his colleagues in a park. In the afternoon, he often has meetings. He doesn't like meetings much: they're long!",
      },
      {
        fr: "Le soir, Karim rentre à la maison vers six heures. Il fait la cuisine, il lit un livre ou il regarde une série. Biscuit dort à côté de lui. À onze heures, tout le monde est au lit.",
        en: "In the evening, Karim gets home at about six. He cooks, reads a book or watches a series. Biscuit sleeps next to him. At eleven o'clock, everyone is in bed.",
      },
    ],
  },
  {
    id: 'a1-le-marche-du-samedi',
    level: 'A1',
    title: 'Le marché du samedi',
    titleEn: 'The Saturday market',
    topic: 'Shopping',
    paragraphs: [
      {
        fr: "C'est samedi matin. Il fait beau et Sophie va au marché avec son fils, Hugo. Hugo a six ans. Il porte le grand panier bleu.",
        en: "It's Saturday morning. The weather is lovely and Sophie is going to the market with her son, Hugo. Hugo is six. He's carrying the big blue basket.",
      },
      {
        fr: "Le marché est sur la place, devant l'église. Sophie achète des tomates, des carottes et une salade. Les légumes sont frais et pas très chers.",
        en: 'The market is on the square, in front of the church. Sophie buys tomatoes, carrots and a lettuce. The vegetables are fresh and not very expensive.',
      },
      {
        fr: "Ensuite, ils vont chez le fromager. Sophie demande un morceau de comté. Le vendeur est gentil : il donne un petit morceau de fromage à Hugo. « C'est très bon ! » dit Hugo.",
        en: "Next, they go to the cheese stall. Sophie asks for a piece of Comté. The stallholder is kind: he gives Hugo a little piece of cheese. 'It's really good!' says Hugo.",
      },
      {
        fr: "Pour finir, Hugo veut des fraises. Sophie regarde dans son porte-monnaie : elle a encore cinq euros. « D'accord, mais tu portes le panier jusqu'à la maison ! » Hugo est content, mais maintenant, le panier est très lourd.",
        en: "Finally, Hugo wants some strawberries. Sophie looks in her purse: she still has five euros. 'All right, but you carry the basket all the way home!' Hugo is happy, but now the basket is very heavy.",
      },
    ],
  },

  // ── A2
  {
    id: 'a2-un-week-end-a-lyon',
    level: 'A2',
    title: 'Un week-end à Lyon',
    titleEn: 'A weekend in Lyon',
    topic: 'Travel',
    paragraphs: [
      {
        fr: "Le mois dernier, je suis allée à Lyon avec mon amie Inès. Nous avons pris le train à Paris le vendredi soir, et deux heures plus tard, nous étions déjà à la gare de la Part-Dieu. Il faisait froid, mais la ville était magnifique avec toutes ses lumières.",
        en: 'Last month, I went to Lyon with my friend Inès. We caught the train in Paris on the Friday evening, and two hours later we were already at Part-Dieu station. It was cold, but the city looked magnificent with all its lights.',
      },
      {
        fr: "Le samedi matin, nous avons visité le Vieux Lyon. Les rues étaient étroites et très anciennes. Ensuite, nous sommes montées à pied jusqu'à la basilique de Fourvière. C'était difficile, mais la vue sur la ville était incroyable !",
        en: 'On the Saturday morning, we visited Vieux Lyon, the old town. The streets were narrow and very old. Then we walked up to the Fourvière basilica. It was hard going, but the view over the city was incredible!',
      },
      {
        fr: "Le soir, nous avons dîné dans un bouchon, un petit restaurant typique de Lyon. J'ai goûté les quenelles, une spécialité de la région. Inès a pris une salade lyonnaise, plus légère que mon plat. Le serveur était très sympa et il nous a conseillé un bon vin rouge.",
        en: "In the evening, we had dinner in a bouchon, a small traditional Lyon restaurant. I tried quenelles, a local speciality. Inès had a Lyonnaise salad, which was lighter than my dish. The waiter was really friendly and he recommended a good red wine to us.",
      },
      {
        fr: "Le dimanche, il a plu toute la journée, alors nous sommes allées au musée des Confluences. Le soir, dans le train, j'étais fatiguée mais très contente. Je vais sûrement revenir à Lyon au printemps !",
        en: "On the Sunday it rained all day, so we went to the Musée des Confluences. That evening, on the train, I was tired but very happy. I'm definitely going to come back to Lyon in the spring!",
      },
    ],
  },
  {
    id: 'a2-bienvenue-dans-la-coloc',
    level: 'A2',
    title: 'Bienvenue dans la coloc !',
    titleEn: 'Welcome to the flat-share!',
    topic: 'Home',
    paragraphs: [
      {
        fr: "En septembre, Mathis a quitté la maison de ses parents pour commencer ses études à Bordeaux. Il ne connaissait personne dans la ville, alors il a cherché une colocation sur Internet. Après deux semaines de recherches, il a trouvé une chambre dans un grand appartement, près de la gare.",
        en: "In September, Mathis left his parents' house to start university in Bordeaux. He didn't know anyone in the city, so he looked for a flat-share online. After two weeks of searching, he found a room in a big flat near the station.",
      },
      {
        fr: "Ses trois colocataires l'ont accueilli avec un gâteau et beaucoup de questions. Chloé est étudiante en médecine et Samir travaille dans une librairie. Anna, elle, vient d'Allemagne, mais son français est meilleur que l'anglais de Mathis !",
        en: "His three flatmates welcomed him with a cake and lots of questions. Chloé is a medical student and Samir works in a bookshop. As for Anna, she's from Germany, but her French is better than Mathis's English!",
      },
      {
        fr: "Les premiers jours n'ont pas toujours été faciles. Mathis ne savait pas cuisiner et il laissait souvent sa vaisselle dans l'évier. Un soir, Chloé lui a montré un tableau sur le frigo : c'était le planning des tâches ménagères. Mathis a compris le message.",
        en: "The first few days weren't always easy. Mathis couldn't cook and he often left his dirty dishes in the sink. One evening, Chloé showed him a chart on the fridge: it was the housework rota. Mathis got the message.",
      },
      {
        fr: "Aujourd'hui, tout va mieux. Le dimanche, les quatre colocataires préparent un grand repas ensemble, et Samir va bientôt apprendre à Mathis à faire un vrai couscous. Pour Mathis, la colocation, c'est un peu comme une deuxième famille.",
        en: 'Now things are much better. On Sundays, the four flatmates cook a big meal together, and Samir is soon going to teach Mathis how to make a proper couscous. For Mathis, the flat-share is a bit like a second family.',
      },
    ],
  },
  {
    id: 'a2-mon-premier-jour',
    level: 'A2',
    title: 'Mon premier jour',
    titleEn: 'My first day',
    topic: 'Work',
    paragraphs: [
      {
        fr: "Lundi dernier, j'ai commencé mon nouveau travail dans une agence de voyages, à Marseille. Je me suis réveillé à six heures parce que j'étais très stressé. J'ai mis ma plus belle chemise et je suis parti de bonne heure pour ne pas être en retard.",
        en: "Last Monday, I started my new job at a travel agency in Marseille. I woke up at six because I was really nervous. I put on my best shirt and left early so I wouldn't be late.",
      },
      {
        fr: "Quand je suis arrivé, la directrice m'a présenté à toute l'équipe. Il y avait six personnes, et tout le monde était souriant. Ma collègue Nadia m'a montré mon bureau et elle m'a expliqué le logiciel de réservation. C'était plus compliqué que dans mon ancien travail, mais Nadia était très patiente.",
        en: 'When I arrived, the manager introduced me to the whole team. There were six people, and everyone was smiling. My colleague Nadia showed me my desk and explained the booking software to me. It was more complicated than at my old job, but Nadia was very patient.',
      },
      {
        fr: "À midi, nous avons mangé ensemble sur une terrasse près du Vieux-Port. Mes collègues m'ont posé beaucoup de questions sur ma vie et sur mes voyages. L'après-midi, j'ai répondu à mes premiers clients au téléphone. J'ai fait une petite erreur de date, mais personne ne s'est fâché.",
        en: 'At lunchtime, we ate together on a terrace near the Old Port. My colleagues asked me lots of questions about my life and my travels. In the afternoon, I answered my first customers on the phone. I made a small mistake with a date, but nobody got cross.',
      },
      {
        fr: "Le soir, j'ai appelé ma mère pour tout lui raconter. Je suis sûr que je vais bien m'entendre avec cette équipe. Demain, je vais organiser le voyage de mon premier client : une semaine en Grèce. Je suis un peu jaloux !",
        en: "In the evening, I rang my mum to tell her all about it. I'm sure I'm going to get on well with this team. Tomorrow, I'm going to organise my first customer's trip: a week in Greece. I'm a bit jealous!",
      },
    ],
  },

  // ── B1
  {
    id: 'b1-le-teletravail',
    level: 'B1',
    title: 'Le télétravail : liberté ou piège ?',
    titleEn: 'Remote work: freedom or trap?',
    topic: 'Work',
    paragraphs: [
      {
        fr: "Depuis quelques années, le télétravail fait partie de la vie de millions de Français. Ce qui était autrefois un privilège rare est devenu une habitude pour beaucoup de salariés, qui travaillent désormais de chez eux un ou deux jours par semaine. Mais cette nouvelle organisation est-elle vraiment un progrès ?",
        en: 'For a few years now, remote work has been part of life for millions of French people. What was once a rare privilege has become a habit for many employees, who now work from home one or two days a week. But is this new way of working really progress?',
      },
      {
        fr: "Pour ses défenseurs, les avantages sont évidents. On ne perd plus de temps dans les transports, ce dont les habitants des grandes villes se plaignent depuis toujours. On peut organiser sa journée plus librement, et beaucoup de parents apprécient de pouvoir aller chercher leurs enfants à l'école. Certains disent même qu'ils se concentrent mieux dans le calme de leur salon qu'au milieu d'un open space bruyant.",
        en: 'For its supporters, the advantages are obvious. You no longer waste time commuting, something city dwellers have always complained about. You can organise your day more freely, and many parents appreciate being able to pick their children up from school. Some even say they concentrate better in the peace and quiet of their living room than in the middle of a noisy open-plan office.',
      },
      {
        fr: "Cependant, le télétravail a aussi ses inconvénients. L'isolement pèse sur certains salariés, qui ne voient plus leurs collègues que sur un écran. D'autres ont du mal à séparer vie professionnelle et vie privée : quand le bureau est dans la chambre, il est difficile d'en sortir vraiment le soir. Selon les psychologues, il est essentiel que chacun se fixe des horaires précis et qu'il fasse de vraies pauses.",
        en: "However, remote work also has its drawbacks. Isolation weighs on some employees, who now only see their colleagues on a screen. Others find it hard to separate their work and private lives: when the office is in the bedroom, it's difficult to truly leave it behind in the evening. According to psychologists, it's essential that everyone sets fixed hours and takes proper breaks.",
      },
      {
        fr: "Alors, faut-il choisir ? Pas forcément. La plupart des spécialistes pensent que la meilleure solution serait un équilibre entre les deux : quelques jours à la maison pour se concentrer, et quelques jours au bureau pour garder le lien avec l'équipe. Le bureau de demain ne sera peut-être plus un lieu où l'on va par obligation, mais un endroit où l'on se retrouve. On y irait moins souvent, mais avec plus de plaisir.",
        en: 'So do we have to choose? Not necessarily. Most experts think the best solution would be a balance between the two: a few days at home to concentrate, and a few days at the office to stay connected with the team. The office of the future may no longer be a place we go to out of obligation, but somewhere we get together. We would go there less often, but with more pleasure.',
      },
    ],
  },
  {
    id: 'b1-le-clafoutis-de-ma-grand-mere',
    level: 'B1',
    title: 'Le clafoutis de ma grand-mère',
    titleEn: "My grandmother's clafoutis",
    topic: 'Food',
    paragraphs: [
      {
        fr: "Quand j'étais petit, je passais tous mes étés chez ma grand-mère, dans un village du Limousin. Sa maison avait un grand jardin où poussait un vieux cerisier. En juin, les branches étaient si chargées de fruits qu'il fallait les soutenir avec des morceaux de bois.",
        en: "When I was little, I spent every summer at my grandmother's, in a village in the Limousin. Her house had a big garden where an old cherry tree grew. In June, the branches were so laden with fruit that they had to be propped up with pieces of wood.",
      },
      {
        fr: "Chaque année, c'était le même rituel. Ma grand-mère me donnait un panier et me demandait d'aller cueillir les cerises. J'en mangeais évidemment la moitié en chemin ! Ensuite, elle préparait son fameux clafoutis, dont elle ne donnait jamais la recette exacte. « Il faut que tu regardes et que tu retiennes », disait-elle simplement.",
        en: "Every year it was the same ritual. My grandmother would hand me a basket and ask me to go and pick the cherries. Naturally, I ate half of them on the way! Then she would make her famous clafoutis, whose exact recipe she never gave away. 'You have to watch and remember,' she would simply say.",
      },
      {
        fr: "Le secret, je l'ai compris plus tard, c'était de ne pas enlever les noyaux. Selon elle, ils donnaient au gâteau un léger goût d'amande. Elle mélangeait les œufs, le sucre, la farine et le lait sans jamais rien peser, puis elle versait la pâte sur les cerises. Toute la maison sentait bon pendant la cuisson.",
        en: 'The secret, as I realised later, was not to remove the stones. According to her, they gave the cake a slight taste of almond. She would mix the eggs, sugar, flour and milk without ever weighing anything, then pour the batter over the cherries. The whole house smelled wonderful while it was baking.',
      },
      {
        fr: "Ma grand-mère nous a quittés il y a dix ans. Une autre famille vit maintenant dans sa maison, et je n'y suis jamais retourné. Mais chaque été, je fais encore son clafoutis, qui n'est jamais tout à fait aussi bon que le sien. J'aimerais que mes enfants s'en souviennent un jour, comme je m'en souviens aujourd'hui. Si je pouvais leur transmettre une seule chose, ce serait sans doute ça : le goût des cerises et des souvenirs partagés.",
        en: "My grandmother passed away ten years ago. Another family lives in her house now, and I've never been back. But every summer I still make her clafoutis, which is never quite as good as hers. I'd love my children to remember it one day, the way I remember it now. If I could pass on just one thing to them, it would probably be that: the taste of cherries and of shared memories.",
      },
    ],
  },

  // ── B2
  {
    id: 'b2-l-attention-en-miettes',
    level: 'B2',
    title: "L'attention en miettes",
    titleEn: 'Attention in pieces',
    topic: 'Technology',
    paragraphs: [
      {
        fr: "Il suffit de s'asseoir dans un train ou une salle d'attente pour le constater : la plupart des gens ont les yeux rivés sur leur téléphone. En quelques années à peine, les réseaux sociaux se sont imposés comme l'un des principaux passe-temps de notre époque. Pourtant, bien qu'ils aient été conçus pour nous rapprocher, ils sont de plus en plus souvent accusés de nous rendre distraits, voire anxieux.",
        en: 'You only have to sit on a train or in a waiting room to see it: most people have their eyes glued to their phones. In barely a few years, social media has become one of the main pastimes of our age. And yet, although these networks were designed to bring us closer together, they are more and more often accused of making us distracted, or even anxious.',
      },
      {
        fr: "Le problème ne vient pas seulement du temps que nous y passons, mais de la manière dont ces applications sont construites. Notifications, défilement infini, vidéos qui s'enchaînent automatiquement : tout est pensé pour retenir l'utilisateur le plus longtemps possible. Plusieurs anciens cadres de la Silicon Valley l'ont d'ailleurs reconnu publiquement, et certains ont avoué qu'ils avaient limité l'accès de leurs propres enfants à ces outils bien avant que le grand public ne s'en inquiète.",
        en: "The problem isn't just the time we spend on them, but the way these apps are built. Notifications, infinite scrolling, videos that play one after another automatically: everything is designed to keep the user there as long as possible. Several former Silicon Valley executives have in fact admitted as much publicly, and some have confessed that they had restricted their own children's access to these tools long before the general public began to worry about it.",
      },
      {
        fr: "Les conséquences sur notre concentration font l'objet de nombreuses études. Certains chercheurs estiment qu'en passant sans cesse d'une tâche à l'autre, nous perdons la capacité de nous plonger longuement dans un livre ou une réflexion. D'autres se montrent plus prudents et rappellent que chaque nouvelle technologie, de l'imprimerie à la télévision, a d'abord été accusée d'abîmer les esprits. Néanmoins, peu d'entre eux contestent que nos habitudes aient profondément changé.",
        en: "The effects on our concentration are the subject of numerous studies. Some researchers believe that by constantly switching from one task to another, we are losing the ability to immerse ourselves for any length of time in a book or a line of thought. Others are more cautious, pointing out that every new technology, from the printing press to television, was first accused of damaging people's minds. Nevertheless, few of them dispute that our habits have changed profoundly.",
      },
      {
        fr: "Face à ce constat, quelques-uns font le choix radical de la déconnexion, en supprimant leurs comptes ou en revenant à un vieux téléphone à touches. Pour la plupart d'entre nous, la solution est sans doute plus modeste : désactiver les notifications, laisser son téléphone dans une autre pièce pendant les repas, réapprendre à s'ennuyer. Car les meilleures idées naissent souvent de ces moments de vide que nous avons pris l'habitude de combler sans réfléchir.",
        en: 'Faced with this, a few people make the radical choice to disconnect, deleting their accounts or going back to an old keypad phone. For most of us, the solution is probably more modest: turning off notifications, leaving our phone in another room during meals, learning how to be bored again. Because the best ideas often spring from those empty moments that we have got into the habit of filling without thinking.',
      },
    ],
  },
  {
    id: 'b2-la-musique-des-accents',
    level: 'B2',
    title: 'La musique des accents',
    titleEn: 'The music of accents',
    topic: 'Language',
    paragraphs: [
      {
        fr: "« Vous avez un accent ! » Combien de Toulousains, de Marseillais ou de Lillois ont entendu cette remarque en s'installant à Paris ? Derrière la plaisanterie se cache une idée tenace : il existerait un français « neutre », sans accent, qui serait parlé dans la capitale et dans les journaux télévisés. Or, pour les linguistes, cette idée ne résiste pas à l'analyse : tout le monde a un accent, y compris les Parisiens.",
        en: "'You've got an accent!' How many people from Toulouse, Marseille or Lille have heard that remark on moving to Paris? Behind the joke lies a stubborn idea: that there is supposedly a 'neutral' French, with no accent, spoken in the capital and on the TV news. Yet for linguists, this idea doesn't stand up to scrutiny: everyone has an accent, Parisians included.",
      },
      {
        fr: "Pendant longtemps, cependant, les accents régionaux ont été considérés comme un défaut à corriger. À la fin du dix-neuvième siècle, l'école républicaine s'est donné pour mission d'unifier la langue du pays, et les élèves surpris à parler breton, occitan ou alsacien en classe étaient parfois punis. Bien que ces langues n'aient pas complètement disparu, elles ont largement cédé la place au français en quelques générations. Elles lui ont néanmoins laissé une musique, un vocabulaire et des intonations qu'on entend encore aujourd'hui.",
        en: "For a long time, however, regional accents were seen as a flaw to be corrected. At the end of the nineteenth century, the Republic's schools set themselves the task of unifying the country's language, and pupils caught speaking Breton, Occitan or Alsatian in class were sometimes punished. Although these languages have not completely disappeared, they largely gave way to French within a few generations. Even so, they left behind a music, words and intonations that can still be heard in French today.",
      },
      {
        fr: "Ces dernières années, le débat a été relancé. Des personnalités politiques et des journalistes ont raconté qu'on s'était moqué d'eux, voire qu'on les avait écartés de certains postes, à cause de leur façon de parler. Les députés ont même adopté en première lecture une proposition de loi visant à sanctionner les discriminations liées à l'accent, un phénomène que certains linguistes appellent la « glottophobie ».",
        en: "In recent years, the debate has been reignited. Politicians and journalists have described being mocked, or even passed over for certain jobs, because of the way they speak. Members of parliament even passed, at first reading, a bill aimed at penalising discrimination based on accent, a phenomenon some linguists call 'glottophobia'.",
      },
      {
        fr: "Aujourd'hui, le regard sur les accents semble évoluer. Certains présentateurs de télévision assument fièrement leurs origines, et de nombreux humoristes jouent avec les accents plutôt que de s'en moquer. Un paradoxe demeure pourtant : on trouve l'accent du Sud chaleureux et l'accent québécois charmant, mais on hésite encore à confier le journal télévisé à quelqu'un qui parle avec un fort accent marseillais. Au fond, la vraie question n'est peut-être pas de savoir si l'on a un accent, mais de savoir qui décide lesquels sont acceptables.",
        en: 'Today, attitudes towards accents seem to be changing. Some television presenters proudly embrace their roots, and many comedians play with accents rather than making fun of them. Yet a paradox remains: people find the southern accent warm and the Québécois accent charming, but they still hesitate to entrust the TV news to someone with a strong Marseille accent. Ultimately, the real question may not be whether you have an accent, but who decides which ones are acceptable.',
      },
    ],
  },
]

export const TEXT_BY_ID: Record<string, ReaderTextDef> = Object.fromEntries(BUILTIN_TEXTS.map((t) => [t.id, t]))
