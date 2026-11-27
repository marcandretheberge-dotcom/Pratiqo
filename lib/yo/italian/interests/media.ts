/** Original illustrated videos using the exact authored first-lesson readings. */
export interface ItalianInterestVideo { src: string; captions: string; poster: string }
const videos: Readonly<Record<string, ItalianInterestVideo>> = {
  "it-interest-v1-u01-music-l1": {"src": "/video/yo/italian-interests/v1/it-interest-v1-u01-music-l1.mp4", "captions": "/video/yo/italian-interests/v1/it-interest-v1-u01-music-l1.it.vtt", "poster": "/video/yo/italian-interests/v1/it-interest-v1-u01-music-l1.webp"},
  "it-interest-v1-u01-art-l1": {"src": "/video/yo/italian-interests/v1/it-interest-v1-u01-art-l1.mp4", "captions": "/video/yo/italian-interests/v1/it-interest-v1-u01-art-l1.it.vtt", "poster": "/video/yo/italian-interests/v1/it-interest-v1-u01-art-l1.webp"},
  "it-interest-v1-u01-history-l1": {"src": "/video/yo/italian-interests/v1/it-interest-v1-u01-history-l1.mp4", "captions": "/video/yo/italian-interests/v1/it-interest-v1-u01-history-l1.it.vtt", "poster": "/video/yo/italian-interests/v1/it-interest-v1-u01-history-l1.webp"},
  "it-interest-v1-u01-sport-l1": {"src": "/video/yo/italian-interests/v1/it-interest-v1-u01-sport-l1.mp4", "captions": "/video/yo/italian-interests/v1/it-interest-v1-u01-sport-l1.it.vtt", "poster": "/video/yo/italian-interests/v1/it-interest-v1-u01-sport-l1.webp"},
  "it-interest-v1-u01-food-l1": {"src": "/video/yo/italian-interests/v1/it-interest-v1-u01-food-l1.mp4", "captions": "/video/yo/italian-interests/v1/it-interest-v1-u01-food-l1.it.vtt", "poster": "/video/yo/italian-interests/v1/it-interest-v1-u01-food-l1.webp"},
  "it-interest-v1-u01-nature-l1": {"src": "/video/yo/italian-interests/v1/it-interest-v1-u01-nature-l1.mp4", "captions": "/video/yo/italian-interests/v1/it-interest-v1-u01-nature-l1.it.vtt", "poster": "/video/yo/italian-interests/v1/it-interest-v1-u01-nature-l1.webp"},
};
export function italianInterestVideo(lessonId: string): ItalianInterestVideo | undefined {
  return Object.hasOwn(videos, lessonId) ? videos[lessonId] : undefined;
}
