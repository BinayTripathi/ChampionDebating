/*
 * Motions for the "Motion of the week" card on the home page.
 *
 * The card shows one motion per week, in order, starting again from the top
 * after the last one. Weeks change on Monday, Sydney time.
 *
 * To add a motion, copy one block below and edit the text. Keep:
 * - motion: what follows "This house would", ending with a full stop.
 * - argument: one or two sentences for that side.
 * - tip: one short line of coaching advice for that side.
 * Adding or removing a motion changes which one shows this week.
 */
window.MOTIONS_OF_THE_WEEK = [
  {
    motion: 'ban homework in primary schools.',
    for: {
      argument: 'Young children have few free hours. Every one spent on worksheets is an hour not spent playing, reading for fun or sleeping, and those build learning too.',
      tip: 'Lead with what children lose, not with what homework fails to give.',
    },
    against: {
      argument: 'Homework teaches habits that class time can’t: planning, working alone and asking for help. Ban it, and children first meet those skills in high school, when the stakes are higher.',
      tip: 'Don’t defend all homework. Defend the right kind: short, purposeful and age-appropriate.',
    },
  },
  {
    motion: 'ban smartphones for under-14s.',
    for: {
      argument: 'Childhood is when we learn focus, friendship and how to be bored. Phones compete with all three. Waiting until 14 lets those habits form first.',
      tip: 'Make it about what children gain, not about what phones do wrong.',
    },
    against: {
      argument: 'Phones keep children safe, connected and organised. A ban doesn’t teach responsible use; it just delays the lesson until teenagers have less supervision.',
      tip: 'Offer an alternative, such as limits and education, so you aren’t defending a free-for-all.',
    },
  },
  {
    motion: 'lower the voting age to 16.',
    for: {
      argument: 'Sixteen-year-olds can work, pay tax and learn to drive. Decisions on climate, housing and education shape their lives the longest, so they deserve a say.',
      tip: 'Anchor your case in fairness: who lives with the consequences?',
    },
    against: {
      argument: 'Voting is about judgement as well as stake. Most 16-year-olds are still at school and shaped by parents and teachers, so the vote would amplify other people’s voices.',
      tip: 'Concede that teenagers care. Argue that a line must be drawn somewhere, then defend 18.',
    },
  },
  {
    motion: 'make coding compulsory in primary school.',
    for: {
      argument: 'Coding teaches logic, persistence and problem solving, which every child needs whatever job they choose. Starting young makes it as normal as reading.',
      tip: 'Sell the thinking skills, not the jobs.',
    },
    against: {
      argument: 'The primary timetable is already full. Every hour of coding comes out of reading, maths, art or play, and the basics matter more at seven than any one technology.',
      tip: 'Make the other side name exactly what gets cut.',
    },
  },
  {
    motion: 'replace school uniforms with free dress.',
    for: {
      argument: 'What we wear is part of who we are. Free dress lets students express themselves, and families no longer buy a second wardrobe just for school.',
      tip: 'A short personal example lands well here. Use one.',
    },
    against: {
      argument: 'Uniforms take clothes off the list of things to compete over. Free dress makes brands and cost visible, and that lands hardest on families with less.',
      tip: 'Focus on who is hurt by the change, not on tradition.',
    },
  },
  {
    motion: 'introduce a four-day school week.',
    for: {
      argument: 'A longer weekend gives students time to rest, follow their interests and recharge, so the four school days become more focused.',
      tip: 'Show how the remaining days get better, not just how the week gets shorter.',
    },
    against: {
      argument: 'The fifth day doesn’t disappear. Working parents still need childcare, and the learning gets squeezed into longer, more tiring days.',
      tip: 'Follow the consequences: where does Friday’s learning go?',
    },
  },
  {
    motion: 'stop keeping score in junior sport.',
    for: {
      argument: 'Young children play to have fun and learn skills. Taking scores away removes the pressure and keeps more children playing for longer.',
      tip: 'Define “junior” early so the debate doesn’t drift to teenagers.',
    },
    against: {
      argument: 'Children keep score anyway. Learning to win and lose gracefully is one of sport’s best lessons, and it is easier to learn young.',
      tip: 'Turn their point around: the pressure comes from adults, not from scores.',
    },
  },
  {
    motion: 'let AI mark school exams.',
    for: {
      argument: 'AI marks consistently, instantly and without getting tired, which frees teachers to spend their time teaching instead of grading.',
      tip: 'Propose safeguards up front, such as a teacher reviewing every appeal.',
    },
    against: {
      argument: 'Marking is judgement, not just checking. An original answer that breaks the pattern deserves a human reader, especially when a student’s future depends on it.',
      tip: 'Give a concrete example of an answer a machine might misjudge.',
    },
  },
  {
    motion: 'ban single-use plastics outright.',
    for: {
      argument: 'Single-use plastic is made to be thrown away within minutes, yet it lasts for generations. Alternatives exist, and only a ban makes everyone switch.',
      tip: 'Deal with the exceptions, like medical supplies, before they can derail you.',
    },
    against: {
      argument: 'An outright ban hits those who rely on plastics most, like hospitals and people with disabilities, while taxes and better recycling can cut waste without the harm.',
      tip: 'Agree on the goal, then attack the method.',
    },
  },
  {
    motion: 'pay students for good grades.',
    for: {
      argument: 'Adults are paid for their work. A reward can motivate students who can’t yet see why school matters, and good habits stay once they form.',
      tip: 'Focus on the students who are switched off today.',
    },
    against: {
      argument: 'Paying for grades teaches students to learn for money instead of curiosity, and it rewards those who are already ahead.',
      tip: 'Ask what happens when the money stops.',
    },
  },
  {
    motion: 'require every student to learn a second language.',
    for: {
      argument: 'A second language opens doors to people, cultures and careers, and children pick up languages more naturally than adults do.',
      tip: 'Paint a picture of what the student can do that they couldn’t before.',
    },
    against: {
      argument: 'Translation technology improves every year. Compulsory hours would be better spent on subjects students choose and will actually use.',
      tip: 'Don’t attack languages. Attack compulsion.',
    },
  },
  {
    motion: 'ban zoos.',
    for: {
      argument: 'Animals that roam huge distances in the wild can’t live full lives in an enclosure, however good it is. Conservation can happen in protected habitats instead.',
      tip: 'Separate sanctuaries from zoos to keep your case tight.',
    },
    against: {
      argument: 'Good zoos fund conservation, breed endangered species and inspire children to care about animals they might never otherwise see.',
      tip: 'Defend the best zoos, not the worst ones.',
    },
  },
  {
    motion: 'abolish compulsory voting.',
    for: {
      argument: 'A vote should be a free choice, and choosing not to vote is a choice too. Forcing people to the ballot box fills it with votes cast without thought.',
      tip: 'Frame it as a question of freedom, not of turnout.',
    },
    against: {
      argument: 'Compulsory voting means governments answer to everyone, not just to the groups most likely to turn up, and it keeps the loudest voices from dominating.',
      tip: 'Show who stops being heard if voting becomes optional.',
    },
  },
  {
    motion: 'ban junk food advertising aimed at children.',
    for: {
      argument: 'Young children struggle to tell an advertisement from entertainment. Protecting them from marketing designed to shape their habits is a basic duty.',
      tip: 'Keep the focus on children, not on adults’ freedom to advertise.',
    },
    against: {
      argument: 'Parents, not advertisers, decide what children eat. A ban treats families as if they can’t say no, and it won’t change what goes on the table.',
      tip: 'Point to what actually changes eating habits, and show a ban isn’t it.',
    },
  },
  {
    motion: 'replace textbooks with tablets.',
    for: {
      argument: 'One tablet holds every book, updates instantly and lets students learn at their own pace with interactive tools.',
      tip: 'Show a single lesson that works better on a tablet.',
    },
    against: {
      argument: 'Screens bring distraction into every lesson, and many students still read more deeply on paper. Technology should support books, not replace them.',
      tip: 'Accept tablets as a tool. Oppose them as a replacement.',
    },
  },
  {
    motion: 'replace final exams with coursework.',
    for: {
      argument: 'Exams reward cramming and nerves on a single day. Coursework shows what students can do over time, which is how real work happens.',
      tip: 'Describe the student an exam lets down.',
    },
    against: {
      argument: 'Exams are fair because everyone faces the same task under the same conditions. Coursework is far easier to get outside help with.',
      tip: 'Make fairness your clash, and keep returning to it.',
    },
  },
];
