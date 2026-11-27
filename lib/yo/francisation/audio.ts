// Recorded stock synthetic voices. Provenance and transcript review:
// docs/product/yopratiqo-francisation-audio-provenance.json
export type FrancisationClip = {
  id: string;
  speaker: string;
  text: string;
  src: string;
  durationSeconds: number;
};

export const atelierClips: FrancisationClip[] = [
  {
    id: "atelier-1",
    speaker: "À l’accueil",
    text: "Bonjour ! Vous venez pour l’atelier de cuisine ? À quel nom est la réservation ?",
    src: "/audio/yo/francisation/50b0250dd64c664b4ed0d62683c2459b3130e4199f13a9b9e7d647baaf3d1320.mp3",
    durationSeconds: 3.6,
  },
  {
    id: "atelier-2",
    speaker: "Camille",
    text: "Bonjour ! C’est au nom de Camille Leduc.",
    src: "/audio/yo/francisation/4661076086f9c037db9d39535ee705f1c06139def707cfac139e2b1766445c86.mp3",
    durationSeconds: 2.64,
  },
  {
    id: "atelier-3",
    speaker: "À l’accueil",
    text: "Merci. Pour vous joindre, j’ai le 418 555-0116. C’est bien ça ?",
    src: "/audio/yo/francisation/4a822e3c3c08c22dae93db4602c732a33518ad5c8b51a4ff221bb3dde81550f5.mp3",
    durationSeconds: 9.2,
  },
  {
    id: "atelier-4",
    speaker: "Camille",
    text: "Presque ! C’est le 418 555-0161. Les deux derniers chiffres sont six, un.",
    src: "/audio/yo/francisation/048977af9eb5ada2b815f1c070e34aedb4f4523ceea0a527f72f49f3f5af3c78.mp3",
    durationSeconds: 11.52,
  },
  {
    id: "atelier-5",
    speaker: "À l’accueil",
    text: "Six, un. Voilà, c’est corrigé !",
    src: "/audio/yo/francisation/8fc12789edd4586dde34f2097fcd715704702e3315f80dc5305f408d573ca5b7.mp3",
    durationSeconds: 2.64,
  },
];

export const libraryClips: FrancisationClip[] = [
  {
    id: "bibliotheque-1",
    speaker: "À l’accueil",
    text: "J’ai noté sam.ray@example.org. Est-ce exact ?",
    src: "/audio/yo/francisation/52e32517136f9665888448145eb0cc24d10dfed8e9bd4917138315e58180fb16.mp3",
    durationSeconds: 12.16,
  },
  {
    id: "bibliotheque-2",
    speaker: "Sam",
    text: "Sam Roy. Mon courriel est sam.roy@example.org. On vérifie ensemble ?",
    src: "/audio/yo/francisation/4bb7323fac22782b0218b812831e8d9dbac509816dbb7ae5abc9bbae4034d263.mp3",
    durationSeconds: 14.88,
  },
];
