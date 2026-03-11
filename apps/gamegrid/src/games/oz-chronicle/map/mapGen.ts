import { createSeededRng } from '../rng';

export type MapNodeType = 'story' | 'minigame' | 'reward';
export type PackId = 'pack1' | 'pack2' | 'pack3' | 'pack4' | 'pack5' | 'pack6' | 'pack7' | 'pack8' | 'pack9';

export type OzMiniGameId =
  | 'cyclone-escape'
  | 'cornfield-rescue'
  | 'silver-slippers-dash'
  | 'oil-and-joints'
  | 'courage-trial'
  | 'forest-crossing'
  | 'kalidah-chase'
  | 'poppy-drift-rescue'
  | 'spectacle-fastening'
  | 'audience-perception'
  | 'shadow-of-the-west'
  | 'western-hold-escape'
  | 'dousing-the-shadow'
  | 'balloon-rigging';

export interface OzMapNode {
  id: string;
  label: string;
  type: MapNodeType;
  chapterId: string;
  packId: PackId;
  miniGameId?: OzMiniGameId;
  next: string[];
}

export interface OzMap {
  nodes: OzMapNode[];
  startNodeId: string;
}

function branch(mainNode: string, sideNode: string, preferSide: boolean): string[] {
  return preferSide ? [sideNode, mainNode] : [mainNode, sideNode];
}

function pack1Nodes(orchardFirst: boolean): OzMapNode[] {
  return [
    { id: 'arrival-cyclone', label: 'Cyclone Landing', type: 'minigame', packId: 'pack1', chapterId: 'arrival-munchkins', miniGameId: 'cyclone-escape', next: ['munchkin-greeting'] },
    { id: 'munchkin-greeting', label: 'Munchkin Greeting', type: 'story', packId: 'pack1', chapterId: 'arrival-munchkins', next: ['east-road-marks'] },
    { id: 'east-road-marks', label: 'Silver Slippers Oath', type: 'reward', packId: 'pack1', chapterId: 'arrival-munchkins', next: ['cornfield-rescue'] },
    { id: 'cornfield-rescue', label: 'Scarecrow Pole', type: 'minigame', packId: 'pack1', chapterId: 'meet-scarecrow', miniGameId: 'cornfield-rescue', next: ['scarecrow-pledge'] },
    { id: 'scarecrow-pledge', label: 'Scarecrow Joins', type: 'story', packId: 'pack1', chapterId: 'meet-scarecrow', next: ['waymarker-sprint'] },
    {
      id: 'waymarker-sprint',
      label: 'Road Marker Sprint',
      type: 'minigame',
      packId: 'pack1',
      chapterId: 'roadside-incidents',
      miniGameId: 'silver-slippers-dash',
      next: branch('tin-forest-edge', 'apple-grove', orchardFirst)
    },
    { id: 'apple-grove', label: 'Apple Grove Argument', type: 'story', packId: 'pack1', chapterId: 'roadside-incidents', next: ['rest-sketch', 'tin-forest-edge'] },
    { id: 'rest-sketch', label: 'Field Sketch Stop', type: 'reward', packId: 'pack1', chapterId: 'roadside-incidents', next: ['tin-forest-edge'] },
    { id: 'tin-forest-edge', label: 'Quiet Wood', type: 'story', packId: 'pack1', chapterId: 'meet-tin-woodman', next: ['oil-and-joints'] }
  ];
}

function pack2Nodes(detourFirst: boolean): OzMapNode[] {
  return [
    { id: 'oil-and-joints', label: 'Oil and Joints', type: 'minigame', packId: 'pack2', chapterId: 'meet-tin-woodman', miniGameId: 'oil-and-joints', next: ['tin-joins'] },
    { id: 'tin-joins', label: 'Tin Woodman Joins', type: 'story', packId: 'pack2', chapterId: 'meet-tin-woodman', next: ['lion-clearing'] },
    { id: 'lion-clearing', label: 'Forest Clearing', type: 'story', packId: 'pack2', chapterId: 'meet-cowardly-lion', next: ['courage-trial'] },
    { id: 'courage-trial', label: 'Courage Trial', type: 'minigame', packId: 'pack2', chapterId: 'meet-cowardly-lion', miniGameId: 'courage-trial', next: ['lion-joins'] },
    { id: 'lion-joins', label: 'Lion Joins', type: 'story', packId: 'pack2', chapterId: 'meet-cowardly-lion', next: ['forest-crossing'] },
    {
      id: 'forest-crossing',
      label: 'Forest Crossing',
      type: 'minigame',
      packId: 'pack2',
      chapterId: 'forest-road',
      miniGameId: 'forest-crossing',
      next: branch('forest-trail-signs', 'woodland-detour', detourFirst)
    },
    { id: 'woodland-detour', label: 'Woodland Detour', type: 'reward', packId: 'pack2', chapterId: 'forest-road', next: ['forest-trail-signs'] },
    { id: 'forest-trail-signs', label: 'Trail Signs', type: 'story', packId: 'pack2', chapterId: 'forest-road', next: ['city-outlook-prelude'] },
    { id: 'city-outlook-prelude', label: 'First City Glimmer', type: 'reward', packId: 'pack2', chapterId: 'outlook-to-city', next: ['kalidah-ridge'] }
  ];
}

function pack3Nodes(miceFirst: boolean): OzMapNode[] {
  return [
    { id: 'kalidah-ridge', label: 'Ridge of Footprints', type: 'story', packId: 'pack3', chapterId: 'kalidah-encounter', next: ['kalidah-chase'] },
    {
      id: 'kalidah-chase',
      label: 'Kalidah Chase',
      type: 'minigame',
      packId: 'pack3',
      chapterId: 'kalidah-encounter',
      miniGameId: 'kalidah-chase',
      next: ['kalidah-aftermath']
    },
    { id: 'kalidah-aftermath', label: 'Broken Trunk Escape', type: 'story', packId: 'pack3', chapterId: 'kalidah-encounter', next: ['poppy-threshold'] },
    { id: 'poppy-threshold', label: 'Poppy Field Edge', type: 'story', packId: 'pack3', chapterId: 'poppy-field', next: ['poppy-drift-rescue'] },
    {
      id: 'poppy-drift-rescue',
      label: 'Poppy Drift Rescue',
      type: 'minigame',
      packId: 'pack3',
      chapterId: 'poppy-field',
      miniGameId: 'poppy-drift-rescue',
      next: branch('field-mice-council', 'poppy-bypass-sketch', miceFirst)
    },
    { id: 'poppy-bypass-sketch', label: 'Windbreak Sketch', type: 'reward', packId: 'pack3', chapterId: 'poppy-field', next: ['field-mice-council'] },
    { id: 'field-mice-council', label: 'Field Mice Council', type: 'story', packId: 'pack3', chapterId: 'field-mice-rescue', next: ['mice-rescue-line'] },
    { id: 'mice-rescue-line', label: 'Harness Line', type: 'minigame', packId: 'pack3', chapterId: 'field-mice-rescue', miniGameId: 'poppy-drift-rescue', next: ['lion-awakens'] },
    { id: 'lion-awakens', label: 'Lion Awakens', type: 'story', packId: 'pack3', chapterId: 'field-mice-rescue', next: ['city-outlook'] },
    { id: 'city-outlook', label: 'Emerald Outlook', type: 'story', packId: 'pack3', chapterId: 'outlook-to-city', next: ['city-approach'] },
    {
      id: 'city-approach',
      label: 'Road Toward the City',
      type: 'story',
      packId: 'pack3',
      chapterId: 'outlook-to-city',
      next: ['city-approach-lanterns']
    }
  ];
}

function pack4Nodes(cityStopFirst: boolean): OzMapNode[] {
  return [
    {
      id: 'city-approach-lanterns',
      label: 'Road to the Gate',
      type: 'story',
      packId: 'pack4',
      chapterId: 'emerald-city-approach',
      next: ['city-approach-incident']
    },
    {
      id: 'city-approach-incident',
      label: 'Gate Road Incident',
      type: 'reward',
      packId: 'pack4',
      chapterId: 'emerald-city-approach',
      next: ['gate-guardian-hail']
    },
    {
      id: 'gate-guardian-hail',
      label: 'Guardian Admission',
      type: 'story',
      packId: 'pack4',
      chapterId: 'guardian-of-gates',
      next: ['spectacle-fastening']
    },
    {
      id: 'spectacle-fastening',
      label: 'Spectacle Fastening',
      type: 'minigame',
      packId: 'pack4',
      chapterId: 'emerald-city-entry',
      miniGameId: 'spectacle-fastening',
      next: ['emerald-entry-courtyard']
    },
    {
      id: 'emerald-entry-courtyard',
      label: 'City Entry',
      type: 'story',
      packId: 'pack4',
      chapterId: 'emerald-city-entry',
      next: ['city-choose-destination']
    },
    {
      id: 'city-choose-destination',
      label: 'Choose a City Stop',
      type: 'story',
      packId: 'pack4',
      chapterId: 'emerald-city-explore',
      next: cityStopFirst
        ? ['emerald-city-inn-stop', 'emerald-city-streets-stop', 'palace-approach-watch']
        : ['palace-approach-watch', 'emerald-city-streets-stop', 'emerald-city-inn-stop']
    },
    {
      id: 'emerald-city-inn-stop',
      label: 'Inn Waystop',
      type: 'reward',
      packId: 'pack4',
      chapterId: 'emerald-city-explore',
      next: ['palace-approach-watch']
    },
    {
      id: 'emerald-city-streets-stop',
      label: 'Street Walk',
      type: 'reward',
      packId: 'pack4',
      chapterId: 'emerald-city-explore',
      next: ['palace-approach-watch']
    },
    {
      id: 'palace-approach-watch',
      label: 'Palace Approach',
      type: 'story',
      packId: 'pack4',
      chapterId: 'wizard-audience-setup',
      next: ['wizard-appointment-ledger']
    },
    {
      id: 'wizard-appointment-ledger',
      label: 'Audience Appointment',
      type: 'story',
      packId: 'pack4',
      chapterId: 'wizard-audience-setup',
      next: ['palace-waiting-hall']
    }
  ];
}

function pack5Nodes(archivesFirst: boolean): OzMapNode[] {
  return [
    {
      id: 'palace-waiting-hall',
      label: 'Hall of Audience',
      type: 'story',
      packId: 'pack5',
      chapterId: 'palace-waiting-protocol',
      next: ['audience-perception']
    },
    {
      id: 'audience-perception',
      label: 'Audience Perception',
      type: 'minigame',
      packId: 'pack5',
      chapterId: 'wizard-first-audience',
      miniGameId: 'audience-perception',
      next: ['wizard-first-audience-dorothy']
    },
    {
      id: 'wizard-first-audience-dorothy',
      label: "Dorothy's Audience",
      type: 'story',
      packId: 'pack5',
      chapterId: 'wizard-first-audience',
      next: ['wizard-first-audience-scarecrow']
    },
    {
      id: 'wizard-first-audience-scarecrow',
      label: "Scarecrow's Audience",
      type: 'story',
      packId: 'pack5',
      chapterId: 'wizard-first-audience',
      next: ['wizard-first-audience-tin']
    },
    {
      id: 'wizard-first-audience-tin',
      label: "Tin Woodman's Audience",
      type: 'story',
      packId: 'pack5',
      chapterId: 'wizard-first-audience',
      next: ['wizard-first-audience-lion']
    },
    {
      id: 'wizard-first-audience-lion',
      label: "Lion's Audience",
      type: 'story',
      packId: 'pack5',
      chapterId: 'wizard-first-audience',
      next: ['four-requests-ledger']
    },
    {
      id: 'four-requests-ledger',
      label: 'Four Requests',
      type: 'reward',
      packId: 'pack5',
      chapterId: 'wizard-first-audience',
      next: ['wizard-condition-declared']
    },
    {
      id: 'wizard-condition-declared',
      label: "Wizard's Condition",
      type: 'story',
      packId: 'pack5',
      chapterId: 'westward-mission-setup',
      next: archivesFirst
        ? ['palace-archives-stop', 'westward-oath']
        : ['westward-oath', 'palace-archives-stop']
    },
    {
      id: 'palace-archives-stop',
      label: 'Audience Records',
      type: 'reward',
      packId: 'pack5',
      chapterId: 'westward-mission-setup',
      next: ['westward-oath']
    },
    {
      id: 'westward-oath',
      label: 'Westward Oath',
      type: 'story',
      packId: 'pack5',
      chapterId: 'westward-mission-setup',
      next: ['pack6-route-token']
    },
    {
      id: 'pack6-route-token',
      label: 'Quest Card Issued',
      type: 'story',
      packId: 'pack5',
      chapterId: 'westward-mission-setup',
      next: ['westward-roadhead']
    }
  ];
}

function pack6Nodes(hiddenFirst: boolean): OzMapNode[] {
  return [
    {
      id: 'westward-roadhead',
      label: 'Westward Roadhead',
      type: 'story',
      packId: 'pack6',
      chapterId: 'westward-departure',
      next: ['quest-card-route']
    },
    {
      id: 'quest-card-route',
      label: 'Quest Card Route',
      type: 'reward',
      packId: 'pack6',
      chapterId: 'westward-departure',
      next: ['companion-vows']
    },
    {
      id: 'companion-vows',
      label: 'Companion Vows',
      type: 'story',
      packId: 'pack6',
      chapterId: 'westward-departure',
      next: ['western-boundary']
    },
    {
      id: 'western-boundary',
      label: 'Winkie Boundary',
      type: 'story',
      packId: 'pack6',
      chapterId: 'winkie-country',
      next: hiddenFirst ? ['hidden-hollow-side', 'winkie-hillside'] : ['winkie-hillside', 'hidden-hollow-side']
    },
    {
      id: 'hidden-hollow-side',
      label: 'Hidden Hollow',
      type: 'reward',
      packId: 'pack6',
      chapterId: 'winkie-hidden-hollow',
      next: ['winkie-hillside']
    },
    {
      id: 'winkie-hillside',
      label: 'Winkie Hills',
      type: 'story',
      packId: 'pack6',
      chapterId: 'winkie-country',
      next: ['shadow-sign']
    },
    {
      id: 'shadow-sign',
      label: 'Watching Sign',
      type: 'story',
      packId: 'pack6',
      chapterId: 'witch-interference-early',
      next: ['shadow-of-the-west']
    },
    {
      id: 'shadow-of-the-west',
      label: 'Shadow of the West',
      type: 'minigame',
      packId: 'pack6',
      chapterId: 'witch-interference-early',
      miniGameId: 'shadow-of-the-west',
      next: ['scout-whistles']
    },
    {
      id: 'scout-whistles',
      label: 'Scout Whistles',
      type: 'story',
      packId: 'pack6',
      chapterId: 'witch-interference-early',
      next: ['ruined-waymarker']
    },
    {
      id: 'ruined-waymarker',
      label: 'Ruined Waymarker',
      type: 'reward',
      packId: 'pack6',
      chapterId: 'witch-interference-early',
      next: ['iron-bell-gulch']
    },
    {
      id: 'iron-bell-gulch',
      label: 'Iron-Bell Gulch',
      type: 'story',
      packId: 'pack6',
      chapterId: 'westward-cliffhanger',
      next: ['labor-rumor']
    },
    {
      id: 'labor-rumor',
      label: 'Forced Labor Rumor',
      type: 'story',
      packId: 'pack6',
      chapterId: 'westward-cliffhanger',
      next: ['western-castle-glimpse']
    },
    {
      id: 'western-castle-glimpse',
      label: 'Western Castle Glimpse',
      type: 'story',
      packId: 'pack6',
      chapterId: 'westward-cliffhanger',
      next: ['capture-shadow']
    }
  ];
}

function pack7Nodes(quietFirst: boolean): OzMapNode[] {
  return [
    {
      id: 'capture-shadow',
      label: 'Capture in the West',
      type: 'story',
      packId: 'pack7',
      chapterId: 'west-capture',
      next: ['western-hold-entry']
    },
    {
      id: 'western-hold-entry',
      label: 'Western Hold',
      type: 'story',
      packId: 'pack7',
      chapterId: 'west-capture',
      next: ['golden-cap-taken']
    },
    {
      id: 'golden-cap-taken',
      label: 'Golden Cap',
      type: 'reward',
      packId: 'pack7',
      chapterId: 'golden-cap-discovery',
      next: ['cap-command-ledger']
    },
    {
      id: 'cap-command-ledger',
      label: 'Command Ledger',
      type: 'story',
      packId: 'pack7',
      chapterId: 'golden-cap-discovery',
      next: ['winkie-duty-line']
    },
    {
      id: 'winkie-duty-line',
      label: 'Winkie Duties',
      type: 'story',
      packId: 'pack7',
      chapterId: 'winkie-workdays',
      next: quietFirst ? ['quiet-plan-side', 'workyard-gate'] : ['workyard-gate', 'quiet-plan-side']
    },
    {
      id: 'quiet-plan-side',
      label: 'Quiet Plan',
      type: 'reward',
      packId: 'pack7',
      chapterId: 'winkie-workdays',
      next: ['workyard-gate']
    },
    {
      id: 'workyard-gate',
      label: 'Workyard Gate',
      type: 'story',
      packId: 'pack7',
      chapterId: 'winkie-workdays',
      next: ['companions-attempt']
    },
    {
      id: 'companions-attempt',
      label: 'Companions Attempt Rescue',
      type: 'story',
      packId: 'pack7',
      chapterId: 'companion-rescue-chain',
      next: ['monkey-command-aid']
    },
    {
      id: 'monkey-command-aid',
      label: 'Command: Aid Rescue',
      type: 'story',
      packId: 'pack7',
      chapterId: 'companion-rescue-chain',
      next: ['western-latch-tokens']
    },
    {
      id: 'western-latch-tokens',
      label: 'Latch and Tokens',
      type: 'reward',
      packId: 'pack7',
      chapterId: 'companion-rescue-chain',
      next: ['western-hold-escape']
    },
    {
      id: 'western-hold-escape',
      label: 'Western Hold Escape',
      type: 'minigame',
      packId: 'pack7',
      chapterId: 'companion-rescue-chain',
      miniGameId: 'western-hold-escape',
      next: ['corridor-break']
    },
    {
      id: 'corridor-break',
      label: 'Narrow Corridor',
      type: 'story',
      packId: 'pack7',
      chapterId: 'companion-rescue-chain',
      next: ['command-carry-companions']
    },
    {
      id: 'command-carry-companions',
      label: 'Command: Carry Companions',
      type: 'story',
      packId: 'pack7',
      chapterId: 'companion-rescue-chain',
      next: ['hands-unbound']
    },
    {
      id: 'hands-unbound',
      label: 'Hands Unbound',
      type: 'reward',
      packId: 'pack7',
      chapterId: 'pack7-cliffhanger',
      next: ['western-confrontation-near']
    },
    {
      id: 'western-confrontation-near',
      label: 'Confrontation Near',
      type: 'story',
      packId: 'pack7',
      chapterId: 'pack7-cliffhanger',
      next: ['return-vow']
    },
    {
      id: 'return-vow',
      label: 'Vow to Return Home',
      type: 'story',
      packId: 'pack7',
      chapterId: 'pack7-cliffhanger',
      next: ['western-reckoning']
    }
  ];
}

function pack8Nodes(roadFirst: boolean): OzMapNode[] {
  return [
    {
      id: 'western-reckoning',
      label: 'Western Reckoning',
      type: 'story',
      packId: 'pack8',
      chapterId: 'western-reckoning-setup',
      next: ['water-basin-ready']
    },
    {
      id: 'water-basin-ready',
      label: 'Water Basin Ready',
      type: 'reward',
      packId: 'pack8',
      chapterId: 'western-reckoning-setup',
      next: ['dousing-the-shadow']
    },
    {
      id: 'dousing-the-shadow',
      label: 'Dousing the Shadow',
      type: 'minigame',
      packId: 'pack8',
      chapterId: 'water-defeat-moment',
      miniGameId: 'dousing-the-shadow',
      next: ['west-shadow-falls']
    },
    {
      id: 'west-shadow-falls',
      label: 'Western Shadow Falls',
      type: 'story',
      packId: 'pack8',
      chapterId: 'water-defeat-moment',
      next: ['winkie-thanks']
    },
    {
      id: 'winkie-thanks',
      label: 'Winkie Gratitude',
      type: 'story',
      packId: 'pack8',
      chapterId: 'winkie-liberation-aftermath',
      next: roadFirst ? ['road-back-east-side', 'western-liberation-banner'] : ['western-liberation-banner', 'road-back-east-side']
    },
    {
      id: 'road-back-east-side',
      label: 'Road Back East',
      type: 'reward',
      packId: 'pack8',
      chapterId: 'winkie-liberation-aftermath',
      next: ['western-liberation-banner']
    },
    {
      id: 'western-liberation-banner',
      label: 'Western Liberation',
      type: 'story',
      packId: 'pack8',
      chapterId: 'winkie-liberation-aftermath',
      next: ['cap-remaining-ledger']
    },
    {
      id: 'cap-remaining-ledger',
      label: 'Cap Ledger',
      type: 'story',
      packId: 'pack8',
      chapterId: 'golden-cap-continuity',
      next: ['return-objective']
    },
    {
      id: 'return-objective',
      label: 'Return Objective',
      type: 'story',
      packId: 'pack8',
      chapterId: 'return-to-emerald-setup',
      next: ['silver-road-turning']
    },
    {
      id: 'silver-road-turning',
      label: 'Silver Road Turning',
      type: 'reward',
      packId: 'pack8',
      chapterId: 'return-to-emerald-setup',
      next: ['emerald-return-start']
    },
    {
      id: 'emerald-return-start',
      label: 'Road to Emerald City',
      type: 'story',
      packId: 'pack8',
      chapterId: 'return-to-emerald-setup',
      next: ['emerald-return-gates']
    }
  ];
}

function pack9Nodes(serviceFirst: boolean): OzMapNode[] {
  return [
    {
      id: 'emerald-return-gates',
      label: 'Back to the Green City',
      type: 'story',
      packId: 'pack9',
      chapterId: 'emerald-return-arrival',
      next: ['gate-spectacles-renewed']
    },
    {
      id: 'gate-spectacles-renewed',
      label: 'Spectacles Renewed',
      type: 'reward',
      packId: 'pack9',
      chapterId: 'emerald-return-arrival',
      next: ['palace-return-ledger']
    },
    {
      id: 'palace-return-ledger',
      label: 'Return Ledger',
      type: 'story',
      packId: 'pack9',
      chapterId: 'emerald-return-arrival',
      next: ['wizard-private-chamber']
    },
    {
      id: 'wizard-private-chamber',
      label: 'Quiet Chamber',
      type: 'story',
      packId: 'pack9',
      chapterId: 'wizard-revelation-resolution',
      next: ['truth-of-the-wizard']
    },
    {
      id: 'truth-of-the-wizard',
      label: 'Humbug Revealed',
      type: 'story',
      packId: 'pack9',
      chapterId: 'wizard-revelation-resolution',
      next: ['gift-ledger']
    },
    {
      id: 'gift-ledger',
      label: 'Gift Ledger',
      type: 'reward',
      packId: 'pack9',
      chapterId: 'companion-gifts-ceremony',
      next: serviceFirst ? ['city-service-side', 'scarecrow-gift'] : ['scarecrow-gift', 'city-service-side']
    },
    {
      id: 'city-service-side',
      label: 'City Service Hall',
      type: 'reward',
      packId: 'pack9',
      chapterId: 'companion-gifts-ceremony',
      next: ['scarecrow-gift']
    },
    {
      id: 'scarecrow-gift',
      label: 'Gift: Brains',
      type: 'story',
      packId: 'pack9',
      chapterId: 'companion-gifts-ceremony',
      next: ['tin-gift']
    },
    {
      id: 'tin-gift',
      label: 'Gift: Heart',
      type: 'story',
      packId: 'pack9',
      chapterId: 'companion-gifts-ceremony',
      next: ['lion-gift']
    },
    {
      id: 'lion-gift',
      label: 'Gift: Courage',
      type: 'story',
      packId: 'pack9',
      chapterId: 'companion-gifts-ceremony',
      next: ['balloon-yard-prep']
    },
    {
      id: 'balloon-yard-prep',
      label: 'Balloon Yard',
      type: 'story',
      packId: 'pack9',
      chapterId: 'balloon-departure-attempt',
      next: ['balloon-rigging']
    },
    {
      id: 'balloon-rigging',
      label: 'Balloon Rigging',
      type: 'minigame',
      packId: 'pack9',
      chapterId: 'balloon-departure-attempt',
      miniGameId: 'balloon-rigging',
      next: ['launch-tower-call']
    },
    {
      id: 'launch-tower-call',
      label: 'Launch Call',
      type: 'story',
      packId: 'pack9',
      chapterId: 'balloon-departure-attempt',
      next: ['departure-mishap']
    },
    {
      id: 'departure-mishap',
      label: 'Departure Missed',
      type: 'story',
      packId: 'pack9',
      chapterId: 'balloon-mishap-aftermath',
      next: ['find-another-way']
    },
    {
      id: 'find-another-way',
      label: 'Find Another Way Home',
      type: 'story',
      packId: 'pack9',
      chapterId: 'balloon-mishap-aftermath',
      next: []
    }
  ];
}

function getPackIdsForProgress(packProgression: number): PackId[] {
  if (packProgression <= 1) return ['pack1'];
  if (packProgression === 2) return ['pack1', 'pack2'];
  if (packProgression === 3) return ['pack1', 'pack2', 'pack3'];
  if (packProgression === 4) return ['pack1', 'pack2', 'pack3', 'pack4'];
  if (packProgression === 5) return ['pack1', 'pack2', 'pack3', 'pack4', 'pack5'];
  if (packProgression === 6) return ['pack1', 'pack2', 'pack3', 'pack4', 'pack5', 'pack6'];
  if (packProgression === 7) return ['pack1', 'pack2', 'pack3', 'pack4', 'pack5', 'pack6', 'pack7'];
  if (packProgression === 8) return ['pack1', 'pack2', 'pack3', 'pack4', 'pack5', 'pack6', 'pack7', 'pack8'];
  return ['pack1', 'pack2', 'pack3', 'pack4', 'pack5', 'pack6', 'pack7', 'pack8', 'pack9'];
}

export function generateOzChapterMap(seed: number, packProgression = 3): OzMap {
  const rng = createSeededRng((seed ^ 0xa11ce ^ (packProgression * 0x9e3779b1)) >>> 0);

  const orchardFirst = rng.next() > 0.5;
  const detourFirst = rng.next() > 0.5;
  const miceFirst = rng.next() > 0.5;
  const cityStopFirst = rng.next() > 0.5;
  const archivesFirst = rng.next() > 0.5;
  const hiddenFirst = rng.next() > 0.5;
  const quietFirst = rng.next() > 0.5;
  const roadFirst = rng.next() > 0.5;
  const serviceFirst = rng.next() > 0.5;

  const allNodes: OzMapNode[] = [
    ...pack1Nodes(orchardFirst),
    ...pack2Nodes(detourFirst),
    ...pack3Nodes(miceFirst),
    ...pack4Nodes(cityStopFirst),
    ...pack5Nodes(archivesFirst),
    ...pack6Nodes(hiddenFirst),
    ...pack7Nodes(quietFirst),
    ...pack8Nodes(roadFirst),
    ...pack9Nodes(serviceFirst)
  ];
  const allowedPacks = new Set(getPackIdsForProgress(packProgression));
  const filtered = allNodes.filter((node) => allowedPacks.has(node.packId));
  const ids = new Set(filtered.map((node) => node.id));
  const nodes = filtered.map((node) => ({
    ...node,
    next: node.next.filter((nextId) => ids.has(nextId))
  }));

  return {
    nodes,
    startNodeId: 'arrival-cyclone'
  };
}

export function getMapNode(map: OzMap, nodeId: string): OzMapNode {
  const found = map.nodes.find((node) => node.id === nodeId);
  if (!found) {
    throw new Error(`Unknown map node: ${nodeId}`);
  }
  return found;
}
