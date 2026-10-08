/* Per-route document titles and meta descriptions for the hash-routed site (G43).
   One map, applied on every navigation by the go() wrapper in premium.js. Titles that premium.js already used are kept word for word.
   Descriptions say only what is true today: planned things are called planned, and the preview pages say they are previews.
   Routes that already carry their own description (window.FFWholeChild.meta) keep it. */
(function () {
  const SITE = 'Futures Friends';
  // route: [title, description]. Title is shown as "<title> | Futures Friends" (home keeps the static page title).
  const R = {
    home: ['Futures Friends', 'Futures Friends: a character-led early learning program for child care centers, home daycares and families, ages 2 to 5. Home of Booker, Lumi, Zuri and Bop.'],
    centers: ['For centers and programs', 'Futures Friends for child care centers, home daycares, churches, pre-K partners and employers: programs, rooms, curriculum, training, pricing and a demo.'],
    'book-demo': ['Book a demo', 'Book a demo of Futures Friends and talk through a membership for your center, home daycare, church or program.'],
    'kids-shop': ['Kids\' Shop', 'A small Kids\' Shop for families: a friend poster, a plush friend and a small carpet. Ordering opens soon; nothing is charged here.'],
    'sign-in': ['Sign in', 'Sign in to the Futures Friends Family Portal, Teacher Portal, a center sign-in page or the Academy. Previews with demo accounts.'],
    impact: ['Impact and research', 'Why ages 2 to 5 matter, the published research on early learning, and what Futures Friends plans to measure.'],
    readiness: ['School Readiness', 'How the Futures Friends learning loop, teacher observation and family activities support school readiness for children ages 2 to 5.'],
    curriculum: ['Curriculum by age', 'A planned year of twelve monthly units and 48 theme weeks for twos, threes and pre-K. Units 1 to 4 are written day by day (draft); Units 5 to 12 are outlined.'],
    options: ['Program Options', 'Compare Futures Friends program options for child care centers, home daycares, pre-K partners, faith-based centers, employers and families.'],
    'for-centers': ['For Child Care Centers: what a licensed center gets', 'What a licensed Futures Friends center gets: media, curriculum, environment, family tools, training and optional merchandise. Talk to us about licensing.'],
    'for-home': ['Home Daycares', 'A one-room, mixed-age Futures Friends program sized for licensed home daycare providers.'],
    'for-prek': ['Pre-K and Head Start Partners', 'Futures Friends readiness units being mapped to the Missouri Early Learning Standards and the Head Start framework, with family engagement tools.'],
    'for-faith': ['Faith-Based Centers', 'An early learning program built around kindness, courage and helping others, with room for each church’s own prayers, songs and traditions.'],
    'for-employers': ['Employer Child Care', 'A branded Futures Friends program for on-site and partner child care for working families.'],
    'for-families': ['Families at Home', 'Take-home activities, books and a weekly question for families, with or without a Futures Friends program nearby.'],
    include: ['Futures Include', 'Lesson adaptations and inclusion supports for children with disabilities and developmental delays, plus early intervention guidance for families.'],
    hub: ['Futures Hub', 'The Futures Hub for directors, classrooms and families: Today checklist, lunch planner, ratio checks and family updates. Built, not yet live; shown with sample data.'],
    app: ['Get the App', 'The Futures Hub is a web app: use it in any browser on a classroom tablet, a director’s computer or a family’s phone, and add it to your home screen.'],
    'family-guide': ['Family App guide', 'A step-by-step tour of what families can see and do in the Futures Friends Family App.'],
    'signin-family': ['Family Sign-In', 'Family sign-in for the Futures Friends Family App.'],
    'signin-teacher': ['Teacher Sign-In', 'Teacher sign-in for the Futures Hub classroom tools.'],
    'account': ['Account and Security', 'Change your Futures Hub password, two-step verification and classroom tablet PIN.'],
    'reset-password': ['Reset Your Password', 'Get a one-time email link to choose a new Futures Hub password.'],
    training: ['Planned training and certification', 'A proposed seven-credential educator pathway and module catalog. Approval and eligible training hours have not been verified.'],
    summit: ['Proposed educator summit', 'A proposed two-day educator summit in Kansas City. Dates, venues and eligible training hours are not confirmed.'],
    support: ['Support and FAQ', 'Help with the Futures Hub, short tutorials and answers for directors, teachers and families.'],
    contact: ['Contact and support', 'Contact Futures Friends by phone, email or form. Futures Learning Center, 3625 S Blue Ridge Blvd, Independence, Missouri.'],
    quote: ['Request a quote', 'Send your rooms, ages and enrollment and we will price a Futures Friends startup package for you.'],
    friends: ['Booker Lumi Zuri Bop and storybooks', 'Meet Booker, Lumi, Zuri and Bop, and the storybooks and episodes now in development.'],
    rainbow: ['Eat the Rainbow recipes', 'The Eat the Rainbow cookbook and menu planner: 36 recipes in three levels, designed around the CACFP meal pattern.'],
    store: ['Futures Store', 'The Futures Store: a family shop and Classroom Branding Kits for centers, home daycares and churches. Ordering opens soon.'],
    'shop-families': ['Family shop', 'Tees, a library book tote, posters and, later, storybooks and plush with Booker, Lumi, Zuri and Bop. Ordering opens soon.'],
    'shop-programs': ['Classroom Branding Kits and program supplies', 'Home, Classroom and Center branding kits, zone signs, posters and carpets at member prices. Send a list as a quote request.'],
    'room-kit': ['Learning Zones Kit: carpets, fences and friend zones for your room', 'Turn one room into five Futures Friends zones: carpets, low see-through fences, signs, a transition cue and floor plans for homes, centers and churches.'],
    'founding-partners': ['Become a Founding Partner: 90-day pilot', 'A 90-day pilot for 5 to 10 Kansas City area programs: home providers, centers and church preschools. Proposed terms, set in a written agreement.'],
    membership: ['Monthly Membership: what arrives every month', 'What a Futures Friends membership delivers each month and who helps you use it, with what is ready now, launching with the pilot or planned.'],
    'brand-kit': ['Partner brand kit', 'Make your "featuring Futures Friends" lockup, read the usage rules and see which kit pieces are ready.'],
    'room-planner': ['Room Planner: lay out your Learning Zones room to scale', 'Enter your room’s measurements, place doors and each friend’s zone, and check space per child, exits and sightlines. Save, print or send for a quote.'],
    corners: ['Name your corners: the learning zone guide', 'Booker\'s Reading Area, Lumi\'s Calm Corner, Zuri\'s Discovery Zone, Bop\'s Movement Zone and the Eat the Rainbow wall: what goes in each.'],
    'store-request': ['Store request', 'Send your Futures Store list as a quote request or join the family shop list. Nothing is charged and no order is placed online.'],
    funding: ['Funding Help', 'Guides to CACFP, child care subsidy, grants and tax credits, with optional done-for-you help.'],
    pricing: ['Pricing', 'Published startup packages and monthly fees for home daycares and child care centers, plus training and seasonal add-ons.'],
    why: ['Why Futures Friends', 'How Futures Friends differs from video-first online curricula: made for ages 2 to 5, led by the teacher, hands-on.'],
    news: ['Newsroom', 'News from Futures Friends and Futures Learning Center.'],
    blog: ['Blog for Educators', 'Plain guides for child care classrooms on screen time, ratios, choking-safe snacks and CACFP.'],
    post: ['Blog article', 'A practical guide for child care classrooms from the Futures Friends team.'],
    events: ['Events', 'Family events and Discovery Day at Futures Friends programs.'],
    privacy: ['Privacy policy', 'Futures Friends privacy policy. Sample policy for this preview site; final policies will be reviewed by counsel before launch.'],
    'child-privacy': ['Child privacy', 'How Futures Friends handles children’s information. Sample policy for this preview site; final policies will be reviewed by counsel before launch.'],
    terms: ['Terms', 'Futures Friends terms. Sample policy for this preview site; final terms will be reviewed by counsel before launch.'],
    accessibility: ['Accessibility', 'Futures Friends accessibility goals: WCAG 2.2 Level AA across this site and the Futures Hub.'],
    portal: ['Teacher Portal', 'The Futures Hub teacher portal: classroom day, attendance, meals, milestones and messages. Sample local preview.'],
    'family-portal': ['Family Portal', 'The Futures Hub family portal: today at Futures, meals, milestones and messages. Sample local preview.'],
    academy: ['Training Academy', 'A preview of the Futures Friends Training Academy with sample lessons and knowledge checks. No professional credential or approved training hours are issued.'],
    watch: ['Watch episodes', 'The planned Futures Friends micro-series: 3 to 6 minute episodes watched together with a teacher. No episode is finished yet; the welcome video plays here.'],
    talk: ['Talk about it cards', 'Printable talk-about-it cards for every planned Futures Friends episode: three questions, a feeling word and one thing to try at home.'],
    enroll: ['Visit Futures Learning Center', 'Futures Learning Center in Independence, Missouri: tours, online applications, tuition and a day in the life for children ages 2 to 5.'],
    jobs: ['Careers and open positions', 'Teaching, kitchen and leadership roles at Futures Friends centers. Apply online.'],
    job: ['Job opening', 'Position details and application for a Futures Friends opening.'],
    'whole-child': ['The Whole-Child Day: learning, meals, movement, Quiet Time', 'One day, planned on purpose: learning, meals, movement, Quiet Time and a question at pickup, led by Booker, Lumi, Zuri and Bop. Evidence-informed routines families can see.'],
    'teacher-standard': ['Our Teacher Standard: training, background checks and mastery', 'What every teacher must meet before working alone with children in Kansas and Missouri, how our training goes further, and where our courses stand today.'],
    'unit-1': ['Unit 1 at a glance: the first month, in summary', 'The first Futures Friends unit in summary: four weeks, 20 teaching days and 161 activities for ages 2 to 5, plus one sample day. Full plans for licensed centers.'],
    'train-your-staff': ['Train your staff with us', 'The Futures Friends course method for child care centers and home daycares: scenario mastery, time tracking and director checklists. In development, not open yet.'],
    'this-week': ['This week with Booker, Lumi, Zuri and Bop: for enrolled families', 'The week\'s friend, theme and value. Families enrolled at Futures Learning Center get the week\'s activities and family cards from their child\'s classroom.'],
    'at-home': ['Futures at Home: free family library', 'Free storybooks to read together, activities by age, printables and a weekly plan from Booker, Lumi, Zuri and Bop. No account, nothing to buy.'],
    'story-time': ['Story Time: read-along storybooks', 'Read five Futures Friends storybooks free, page by page, with a question, a word and a move or breath to share on every page.'],
    activities: ['Things to do at home, by age', 'Short activities for babies to pre-K from things you have at home, with steps, what to notice and easier or harder versions.'],
    printables: ['Printables for families', 'Free PDFs: picture schedule, rainbow tracker, calm-down and move cards, reading log, sticker chart and certificates. Some in Spanish.'],
    'see-how': ['See how: picture guides for routines', 'Everyday routines in pictures, one step at a time: calm breathing, brave reading, brushing teeth, movement breaks and bedtime.'],
    'family-videos': ['Watch together: family videos', 'Short videos with Booker, Lumi, Zuri and Bop to watch together: the welcome video, Bop\'s movement breaks and a calm minute, and how to keep screen time small.'],
    'my-week': ['My Week: plan, stickers and certificates', 'A free weekly plan for your child\'s age that changes every Monday, a sticker chart and printable certificates. Saved only on your device.'],
    'bop-at-home': ['Bop at Home: free family movement, Move Your Body Grow Your Mind', 'Free family movement activities from Bop: no equipment, every one with an adapted version. Join the weekly Bop at Home challenge. Move Your Body, Grow Your Mind.'],
    learn: ['Futures Friends Academy', 'Futures Friends Academy: courses and training records for teachers and directors.'],
    'learn-course': ['Course | Futures Friends Academy', 'A Futures Friends Academy course.'],
    'learn-cert': ['Certificate | Futures Friends Academy', 'A Futures Friends Academy certificate.'],
    verify: ['Verify a certificate | Futures Friends Academy', 'Check a Futures Friends Academy certificate code.'],
    'learn-team': ['Team training | Futures Friends Academy', 'Futures Friends Academy team training records for directors.'],
    'learn-author': ['Course authoring | Futures Friends Academy', 'Futures Friends Academy course authoring tools.'],
    'learn-approve': ['Content approval | Futures Friends Academy', 'Futures Friends Academy content approval for reviewers.'],
    'start-center': ['Start your center', 'Set up a demo Futures Hub center for a child care program or church preschool, with its own name, color, sign-in page, staff and families.'],
    'enroll-link': ['Enrollment form', 'The enrollment form a center sends to a family in the Futures Hub demo: child, contacts, a short staff alert and the health-forms promise. Demo only, nothing is sent.'],
    timeclock: ['Time clock', 'Staff clock in and out and see their own hours in the Futures Hub demo.'],
    c: ['Center sign-in', 'The sign-in page of one center in the Futures Hub demo: staff and families of that center sign in here.'],
    'not-found': ['Page not found', 'This page is not on the Futures Friends site. Try the home page, the whole-child day, Bop at Home or contact us.']
  };
  const trim = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };
  let first = null;                                                                       // the static title and description in index.html

  function lookup(route, arg) {
    const r = R[route] || [String(route || 'home').replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()), ''];
    let title = r[0], desc = r[1];
    if (route === 'post') {
      const posts = typeof POSTS !== 'undefined' ? POSTS : null, p = Array.isArray(posts) && posts.find(x => x.id === arg);   // POSTS is views.js's top-level const
      if (p) { title = p.t; desc = trim(p.b[0], 155); }
    } else if (route === 'academy' && arg) {
      const mods = (window.FF && window.FF.modules) || [], m = mods.find(x => x.code === arg);
      if (m) { title = m.code + ' ' + m.title + ' | Training Academy'; desc = 'Sample lesson preview: ' + m.title + '. No professional credential or approved training hours are issued.'; }
    }
    return { title: route === 'home' && first ? first.title : (title.indexOf('|') > -1 || title === SITE ? title : title + ' | ' + SITE), description: desc };
  }

  function describe(route, arg) {
    const meta = document.querySelector('meta[name="description"]');
    if (!first) first = { title: document.title, description: meta ? meta.getAttribute('content') || '' : '' };
    const m = lookup(route, arg), wc = window.FFWholeChild && window.FFWholeChild.meta;
    if (meta) meta.setAttribute('content', (wc && wc[route]) || (route === 'home' ? first.description : m.description) || first.description);
    return m;
  }
  // Called by the go() wrapper in premium.js on every navigation; describe() is also what the render hook in whole-child.js calls
  // after an asynchronous re-render, so a late hook can never put the home description back on another route.
  function apply(route, arg) {
    const m = describe(route, arg);
    document.title = m.title;
    return m;
  }

  const api = { ROUTES: R, lookup, describe, apply };
  if (typeof window !== 'undefined') window.FFRouteMeta = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
