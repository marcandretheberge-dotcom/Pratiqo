/**
 * Audio plan for Japanese foundations: fixed recordings to generate with
 * OpenAI and publish to the existing yopratiqo-audio bucket. This registry
 * alone does not establish that any object has been generated or uploaded;
 * the generation/verification report records actual publication status.
 *
 * This compact, static registry deliberately imports neither the full course
 * nor its translations/stroke geometry. Both the offline generator and the
 * browser player use it. It contains no credentials or runtime API calls.
 *
 * A recording is shared only when the authored Japanese reading is identical
 * (including hiragana/katakana pairs). を/ヲ use the modern particle reading お;
 * は/ハ and へ/ヘ in the kana lab retain ha and he. Whole-word readings remain
 * contextual: 四時 is よじ, 家 is いえ, 来ます is きます, etc.
 *
 * Slugs are pinned, ASCII-only romanization + 12 hex digits from the UTF-8
 * SHA-256 of the authored reading (terminal 。 removed for deduplication).
 * Keep an existing path immutable. A revised recording gets a new version or
 * slug; a change to visible lesson text must update this registry and tests.
 */
import type { YoAudioItem } from "./audioManifest.types-internal";

export const JAPANESE_FOUNDATION_AUDIO_VERSION = "v1" as const;
export const JAPANESE_FOUNDATION_AUDIO_MODULE_ID = "japanese-foundations" as const;

type Recording = readonly [
  slug: string,
  type: "word" | "sentence",
  text: string,
  reading: string,
  romanization: string,
  aliases?: readonly string[],
];

// Pinned course phrases and contextual words, followed by the basic kana.
const recordings: readonly Recording[] = [
  ["konnichiwa-aya-desu-5dba65dd4118", "sentence", "こんにちは。アヤです。", "こんにちは。あやです。", "Konnichiwa. Aya desu."],
  ["hajimemashite-arekkusu-desu-1b8db15bd1d9", "sentence", "はじめまして。アレックスです。", "はじめまして。あれっくすです。", "Hajimemashite. Arekkusu desu."],
  ["gakusei-desu-ka-ac8b285360ed", "sentence", "学生ですか。", "がくせいですか。", "Gakusei desu ka."],
  ["hai-gakusei-desu-yoroshiku-onegaishimasu-4fb674aba7a7", "sentence", "はい、学生です。よろしくお願いします。", "はい、がくせいです。よろしくおねがいします。", "Hai, gakusei desu. Yoroshiku onegaishimasu."],
  ["konnichiwa-125aeadf27b0", "word", "こんにちは", "こんにちは", "konnichiwa", ["こんにちは。"]],
  ["hajimemashite-1a7b00c2059a", "word", "はじめまして", "はじめまして", "hajimemashite"],
  ["namae-d8d3e6f210e2", "word", "名前", "なまえ", "namae"],
  ["watashi-53f24f734e70", "word", "私", "わたし", "watashi"],
  ["gakusei-6ecb93a8793f", "word", "学生", "がくせい", "gakusei"],
  ["nihongo-519f9962f040", "word", "日本語", "にほんご", "nihongo"],
  ["hai-8f90d85ec13a", "word", "はい", "はい", "hai"],
  ["iie-48ef2b674823", "word", "いいえ", "いいえ", "iie"],
  ["watashi-wa-arekkusu-desu-f20dfa8143d4", "sentence", "私はアレックスです。", "わたしはあれっくすです。", "Watashi wa Arekkusu desu."],
  ["aya-san-wa-gakusei-desu-ka-c8c87596109a", "sentence", "アヤさんは学生ですか。", "あやさんはがくせいですか。", "Aya-san wa gakusei desu ka."],
  ["hajimemashite-aya-desu-46c6ceaceecf", "sentence", "はじめまして。アヤです。", "はじめまして。あやです。", "Hajimemashite. Aya desu."],
  ["yoroshiku-onegaishimasu-1ed1bd2cc6ce", "sentence", "よろしくお願いします。", "よろしくおねがいします。", "Yoroshiku onegaishimasu."],
  ["arekkusu-desu-gakusei-desu-d3b1c717ab8b", "sentence", "アレックスです。学生です。", "あれっくすです。がくせいです。", "Arekkusu desu. Gakusei desu."],
  ["jugyo-wa-nanji-kara-desu-ka-06c4bbbcad14", "sentence", "授業は何時からですか。", "じゅぎょうはなんじからですか。", "Jugyō wa nanji kara desu ka."],
  ["sanji-kara-desu-a3bd8924588e", "sentence", "三時からです。", "さんじからです。", "Sanji kara desu."],
  ["nanji-made-desu-ka-e8334336a388", "sentence", "何時までですか。", "なんじまでですか。", "Nanji made desu ka."],
  ["yoji-made-desu-88241da19bb5", "sentence", "四時までです。", "よじまでです。", "Yoji made desu."],
  ["ichiji-018b51feb169", "word", "一時", "いちじ", "ichiji"],
  ["niji-162a9d585660", "word", "二時", "にじ", "niji"],
  ["sanji-d92dacd0fe64", "word", "三時", "さんじ", "sanji"],
  ["yoji-9ed1380030c9", "word", "四時", "よじ", "yoji"],
  ["goji-aca1e8b036f2", "word", "五時", "ごじ", "goji"],
  ["jugyo-9502d1e5046c", "word", "授業", "じゅぎょう", "jugyō"],
  ["kyoshitsu-02cf51ac5e88", "word", "教室", "きょうしつ", "kyōshitsu"],
  ["ima-91f3baf763cd", "word", "今", "いま", "ima"],
  ["ima-yoji-desu-6c67e4f4666d", "sentence", "今、四時です。", "いま、よじです。", "Ima, yoji desu."],
  ["jugyo-wa-sanji-kara-yoji-made-desu-ad62b35cef8a", "sentence", "授業は三時から四時までです。", "じゅぎょうはさんじからよじまでです。", "Jugyō wa sanji kara yoji made desu."],
  ["jugyo-wa-goji-made-desu-e7452c4e1a36", "sentence", "授業は五時までです。", "じゅぎょうはごじまでです。", "Jugyō wa goji made desu."],
  ["ima-niji-desu-0726b0d76b2b", "sentence", "今、二時です。", "いま、にじです。", "Ima, niji desu."],
  ["jugyo-wa-ichiji-kara-sanji-made-desu-257274ebc2f1", "sentence", "授業は一時から三時までです。", "じゅぎょうはいちじからさんじまでです。", "Jugyō wa ichiji kara sanji made desu."],
  ["nanji-kara-ga-ii-desu-ka-eb63bc3ff63f", "sentence", "何時からがいいですか。", "なんじからがいいですか。", "Nanji kara ga ii desu ka."],
  ["sanji-kara-yoji-made-desu-ne-773d24365f45", "sentence", "三時から四時までですね。", "さんじからよじまでですね。", "Sanji kara yoji made desu ne."],
  ["jugyo-wa-niji-kara-yoji-made-desu-1cd1a57f8c1f", "sentence", "授業は二時から四時までです。", "じゅぎょうはにじからよじまでです。", "Jugyō wa niji kara yoji made desu."],
  ["sumimasen-toshokan-wa-doko-desu-ka-15ca8e691326", "sentence", "すみません。図書館はどこですか。", "すみません。としょかんはどこですか。", "Sumimasen. Toshokan wa doko desu ka."],
  ["toshokan-wa-migi-ni-arimasu-7b92902a72cb", "sentence", "図書館は右にあります。", "としょかんはみぎにあります。", "Toshokan wa migi ni arimasu."],
  ["sensei-wa-toshokan-ni-imasu-ka-d208a0142191", "sentence", "先生は図書館にいますか。", "せんせいはとしょかんにいますか。", "Sensei wa toshokan ni imasu ka."],
  ["hai-toshokan-ni-imasu-f065cda4615c", "sentence", "はい、図書館にいます。", "はい、としょかんにいます。", "Hai, toshokan ni imasu."],
  ["toshokan-82991e5bf61b", "word", "図書館", "としょかん", "toshokan"],
  ["eki-c02bb5c1eec5", "word", "駅", "えき", "eki"],
  ["migi-e7c11911d1b4", "word", "右", "みぎ", "migi"],
  ["hidari-fce6964ad287", "word", "左", "ひだり", "hidari"],
  ["ue-ac56868522bb", "word", "上", "うえ", "ue"],
  ["shita-67c01fb5650e", "word", "下", "した", "shita"],
  ["naka-f928a1d8b511", "word", "中", "なか", "naka"],
  ["koko-ff267cf7f05c", "word", "ここ", "ここ", "koko"],
  ["sensei-wa-toshokan-ni-imasu-32ea7c7b7bc5", "sentence", "先生は図書館にいます。", "せんせいはとしょかんにいます。", "Sensei wa toshokan ni imasu."],
  ["koko-wa-toshokan-desu-fbca6429d502", "sentence", "ここは図書館です。", "ここはとしょかんです。", "Koko wa toshokan desu."],
  ["eki-wa-hidari-ni-arimasu-585052665285", "sentence", "駅は左にあります。", "えきはひだりにあります。", "Eki wa hidari ni arimasu."],
  ["migi-ni-arimasu-084637499c26", "sentence", "右にあります。", "みぎにあります。", "Migi ni arimasu."],
  ["toshokan-wa-migi-ni-arimasu-sensei-wa-toshokan-ni-imasu-f823a66bb2ac", "sentence", "図書館は右にあります。先生は図書館にいます。", "としょかんはみぎにあります。せんせいはとしょかんにいます。", "Toshokan wa migi ni arimasu. Sensei wa toshokan ni imasu."],
  ["sumimasen-ocha-o-kudasai-79a71643869d", "sentence", "すみません。お茶をください。", "すみません。おちゃをください。", "Sumimasen. Ocha o kudasai."],
  ["hai-ocha-wa-hyakuen-desu-23bccbfe989a", "sentence", "はい。お茶は百円です。", "はい。おちゃはひゃくえんです。", "Hai. Ocha wa hyakuen desu."],
  ["gohan-mo-onegaishimasu-01a5ef27bebf", "sentence", "ご飯もお願いします。", "ごはんもおねがいします。", "Gohan mo onegaishimasu."],
  ["hai-zenbu-de-sanbyakuen-desu-3660c8e9e64c", "sentence", "はい。全部で三百円です。", "はい。ぜんぶでさんびゃくえんです。", "Hai. Zenbu de sanbyakuen desu."],
  ["ocha-b1a50b20d27b", "word", "お茶", "おちゃ", "ocha"],
  ["mizu-986430368256", "word", "水", "みず", "mizu"],
  ["gohan-569cd1b8b499", "word", "ご飯", "ごはん", "gohan"],
  ["kohi-3118c7e596ae", "word", "コーヒー", "こーひー", "kōhī"],
  ["tabemasu-1a593dff4eea", "word", "食べます", "たべます", "tabemasu"],
  ["nomimasu-ac20f2e20807", "word", "飲みます", "のみます", "nomimasu"],
  ["hyakuen-5a0a22a5fcda", "word", "百円", "ひゃくえん", "hyakuen"],
  ["kudasai-54065d292cb7", "word", "ください", "ください", "kudasai"],
  ["ocha-o-kudasai-0169746d53fc", "sentence", "お茶をください。", "おちゃをください。", "Ocha o kudasai."],
  ["kohi-wa-nomimasen-8b3b1f7c1ab0", "sentence", "コーヒーは飲みません。", "こーひーはのみません。", "Kōhī wa nomimasen."],
  ["ocha-wa-nihyakuen-desu-513e25a309d3", "sentence", "お茶は二百円です。", "おちゃはにひゃくえんです。", "Ocha wa nihyakuen desu."],
  ["mizu-o-kudasai-5e9e4bee268a", "sentence", "水をください。", "みずをください。", "Mizu o kudasai."],
  ["gohan-o-tabemasu-c0105611082f", "sentence", "ご飯を食べます。", "ごはんをたべます。", "Gohan o tabemasu."],
  ["irasshaimase-91427722fc2a", "sentence", "いらっしゃいませ。", "いらっしゃいませ。", "Irasshaimase."],
  ["gohan-mo-tabemasu-ka-bd5fde382cd5", "sentence", "ご飯も食べますか。", "ごはんもたべますか。", "Gohan mo tabemasu ka."],
  ["zenbu-de-sanbyakuen-desu-1564eeb2b4e4", "sentence", "全部で三百円です。", "ぜんぶでさんびゃくえんです。", "Zenbu de sanbyakuen desu."],
  ["ocha-o-kudasai-gohan-o-tabemasu-710df52e55f4", "sentence", "お茶をください。ご飯を食べます。", "おちゃをください。ごはんをたべます。", "Ocha o kudasai. Gohan o tabemasu."],
  ["kinyobi-ni-issho-ni-ocha-o-nomimasen-ka-556d622aab1e", "sentence", "金曜日に一緒にお茶を飲みませんか。", "きんようびにいっしょにおちゃをのみませんか。", "Kinyōbi ni issho ni ocha o nomimasen ka."],
  ["ii-desu-ne-nanji-desu-ka-d41ca710f54c", "sentence", "いいですね。何時ですか。", "いいですね。なんじですか。", "Ii desu ne. Nanji desu ka."],
  ["sanji-wa-do-desu-ka-2f29d45c8d10", "sentence", "三時はどうですか。", "さんじはどうですか。", "Sanji wa dō desu ka."],
  ["hai-kinyobi-no-sanji-desu-ne-cb981a7cd416", "sentence", "はい。金曜日の三時ですね。", "はい。きんようびのさんじですね。", "Hai. Kinyōbi no sanji desu ne."],
  ["getsuyobi-37111e13b8a3", "word", "月曜日", "げつようび", "getsuyōbi"],
  ["kayobi-878b801b0ee3", "word", "火曜日", "かようび", "kayōbi"],
  ["suiyobi-210b4954ff2b", "word", "水曜日", "すいようび", "suiyōbi"],
  ["mokuyobi-2111c40d65f7", "word", "木曜日", "もくようび", "mokuyōbi"],
  ["kinyobi-18a2c92fd893", "word", "金曜日", "きんようび", "kinyōbi"],
  ["kyo-131fb267428c", "word", "今日", "きょう", "kyō"],
  ["ashita-6fdd239788da", "word", "明日", "あした", "ashita"],
  ["issho-ni-c5d33de6b976", "word", "一緒に", "いっしょに", "issho ni"],
  ["issho-ni-ocha-o-nomimasen-ka-da95fc924653", "sentence", "一緒にお茶を飲みませんか。", "いっしょにおちゃをのみませんか。", "Issho ni ocha o nomimasen ka."],
  ["kinyobi-ni-aimasen-ka-af3ee2e2705d", "sentence", "金曜日に会いませんか。", "きんようびにあいませんか。", "Kinyōbi ni aimasen ka."],
  ["kinyobi-no-sanji-ni-aimasho-b94db4750f6a", "sentence", "金曜日の三時に会いましょう。", "きんようびのさんじにあいましょう。", "Kinyōbi no sanji ni aimashō."],
  ["nanji-ga-ii-desu-ka-103245161deb", "sentence", "何時がいいですか。", "なんじがいいですか。", "Nanji ga ii desu ka."],
  ["dewa-kinyobi-no-sanji-desu-ne-3b65ea7b66dc", "sentence", "では、金曜日の三時ですね。", "では、きんようびのさんじですね。", "Dewa, kinyōbi no sanji desu ne."],
  ["kayobi-ni-aimasen-ka-niji-wa-do-desu-ka-d091c61ccb9a", "sentence", "火曜日に会いませんか。二時はどうですか。", "かようびにあいませんか。にじはどうですか。", "Kayōbi ni aimasen ka. Niji wa dō desu ka."],
  ["daigaku-no-gakusei-desu-ka-8b368a3db098", "sentence", "大学の学生ですか。", "だいがくのがくせいですか。", "Daigaku no gakusei desu ka."],
  ["hai-daigaku-no-gakusei-desu-be72bf83ddcc", "sentence", "はい、大学の学生です。", "はい、だいがくのがくせいです。", "Hai, daigaku no gakusei desu."],
  ["ongaku-ga-suki-desu-ka-693db2ab58ed", "sentence", "音楽が好きですか。", "おんがくがすきですか。", "Ongaku ga suki desu ka."],
  ["hai-ongaku-ga-suki-desu-hon-mo-suki-desu-6c91899aa17e", "sentence", "はい、音楽が好きです。本も好きです。", "はい、おんがくがすきです。ほんもすきです。", "Hai, ongaku ga suki desu. Hon mo suki desu."],
  ["tomodachi-e3610f8de2ae", "word", "友だち", "ともだち", "tomodachi"],
  ["ie-cef7e4b1dd35", "word", "家", "いえ", "ie"],
  ["daigaku-2148b00750d7", "word", "大学", "だいがく", "daigaku"],
  ["sensei-dacf3872be30", "word", "先生", "せんせい", "sensei"],
  ["hon-d2815033823e", "word", "本", "ほん", "hon"],
  ["ongaku-c415d124f5a7", "word", "音楽", "おんがく", "ongaku"],
  ["suki-dd063bab0dde", "word", "好き", "すき", "suki"],
  ["kore-wa-aya-san-no-hon-desu-87dcad030013", "sentence", "これはアヤさんの本です。", "これはあやさんのほんです。", "Kore wa Aya-san no hon desu."],
  ["watashi-wa-ongaku-ga-suki-desu-5e6c2244dabb", "sentence", "私は音楽が好きです。", "わたしはおんがくがすきです。", "Watashi wa ongaku ga suki desu."],
  ["aya-san-wa-ongaku-ga-suki-desu-656a51c46e70", "sentence", "アヤさんは音楽が好きです。", "あやさんはおんがくがすきです。", "Aya-san wa ongaku ga suki desu."],
  ["aya-san-no-hon-desu-1abb18fc2f3a", "sentence", "アヤさんの本です。", "あやさんのほんです。", "Aya-san no hon desu."],
  ["kore-wa-dare-no-hon-desu-ka-b5071e56b4a8", "sentence", "これは誰の本ですか。", "これはだれのほんですか。", "Kore wa dare no hon desu ka."],
  ["aya-san-wa-tomodachi-desu-daigaku-no-gakusei-desu-ongaku-ga-suki-7f27213a4392", "sentence", "アヤさんは友だちです。大学の学生です。音楽が好きです。", "あやさんはともだちです。だいがくのがくせいです。おんがくがすきです。", "Aya-san wa tomodachi desu. Daigaku no gakusei desu. Ongaku ga suki desu."],
  ["sumimasen-deguchi-wa-doko-desu-ka-931baa38c4f6", "sentence", "すみません。出口はどこですか。", "すみません。でぐちはどこですか。", "Sumimasen. Deguchi wa doko desu ka."],
  ["deguchi-wa-migi-desu-9b510c688d21", "sentence", "出口は右です。", "でぐちはみぎです。", "Deguchi wa migi desu."],
  ["sumimasen-mo-ichido-onegaishimasu-c846f94128b4", "sentence", "すみません。もう一度お願いします。", "すみません。もういちどおねがいします。", "Sumimasen. Mō ichido onegaishimasu."],
  ["migi-desu-7fc9d9b30203", "sentence", "右です。", "みぎです。", "Migi desu."],
  ["migi-desu-ne-arigato-gozaimasu-001b6cbc035f", "sentence", "右ですね。ありがとうございます。", "みぎですね。ありがとうございます。", "Migi desu ne. Arigatō gozaimasu."],
  ["mo-ichido-a058ebb9403a", "word", "もう一度", "もういちど", "mō ichido"],
  ["yukkuri-da12b4a6e0d9", "word", "ゆっくり", "ゆっくり", "yukkuri"],
  ["wakarimasen-c8533c0af774", "word", "分かりません", "わかりません", "wakarimasen"],
  ["iriguchi-cf53e6f339e0", "word", "入口", "いりぐち", "iriguchi"],
  ["deguchi-0f4e0483b154", "word", "出口", "でぐち", "deguchi"],
  ["densha-e79bee27152b", "word", "電車", "でんしゃ", "densha"],
  ["ekiin-d3b74757a073", "word", "駅員", "えきいん", "ekiin"],
  ["kippu-f71997d91d96", "word", "切符", "きっぷ", "kippu"],
  ["sumimasen-yukkuri-onegaishimasu-d6bd78bfd4b8", "sentence", "すみません。ゆっくりお願いします。", "すみません。ゆっくりおねがいします。", "Sumimasen. Yukkuri onegaishimasu."],
  ["deguchi-wa-migi-desu-ne-c821448c717c", "sentence", "出口は右ですね。", "でぐちはみぎですね。", "Deguchi wa migi desu ne."],
  ["deguchi-wa-doko-desu-ka-4d49d06fbe96", "sentence", "出口はどこですか。", "でぐちはどこですか。", "Deguchi wa doko desu ka."],
  ["deguchi-wa-doko-desu-ka-mo-ichido-onegaishimasu-047e418954ea", "sentence", "出口はどこですか。もう一度お願いします。", "でぐちはどこですか。もういちどおねがいします。", "Deguchi wa doko desu ka. Mō ichido onegaishimasu."],
  ["kino-nani-o-shimashita-ka-3b819df753c4", "sentence", "きのう、何をしましたか。", "きのう、なにをしましたか。", "Kinō, nani o shimashita ka."],
  ["toshokan-ni-ikimashita-e2a92bc53d6d", "sentence", "図書館に行きました。", "としょかんにいきました。", "Toshokan ni ikimashita."],
  ["hon-o-yomimashita-ka-4ca4aefe75dc", "sentence", "本を読みましたか。", "ほんをよみましたか。", "Hon o yomimashita ka."],
  ["hai-nihongo-no-hon-o-yomimashita-2321c6d3b056", "sentence", "はい、日本語の本を読みました。", "はい、にほんごのほんをよみました。", "Hai, nihongo no hon o yomimashita."],
  ["kohi-o-nomimashita-ka-86696c906528", "sentence", "コーヒーを飲みましたか。", "こーひーをのみましたか。", "Kōhī o nomimashita ka."],
  ["iie-nomimasen-deshita-12f1d2e9fe6f", "sentence", "いいえ、飲みませんでした。", "いいえ、のみませんでした。", "Iie, nomimasen deshita."],
  ["kino-dee6c8c29344", "word", "きのう", "きのう", "kinō"],
  ["ikimashita-95359c4a74c2", "word", "行きました", "いきました", "ikimashita"],
  ["kimashita-ddca06b4b43d", "word", "来ました", "きました", "kimashita"],
  ["mimashita-5ec858d29406", "word", "見ました", "みました", "mimashita"],
  ["yomimashita-e80326807718", "word", "読みました", "よみました", "yomimashita"],
  ["kakimashita-4c15e88d753a", "word", "書きました", "かきました", "kakimashita"],
  ["sorekara-f791d1edc8db", "word", "それから", "それから", "sorekara"],
  ["shashin-df30c30e910f", "word", "写真", "しゃしん", "shashin"],
  ["kino-hon-o-yomimashita-e574d8683bc8", "sentence", "きのう、本を読みました。", "きのう、ほんをよみました。", "Kinō, hon o yomimashita."],
  ["kohi-wa-nomimasen-deshita-4f6ed4bb6429", "sentence", "コーヒーは飲みませんでした。", "こーひーはのみませんでした。", "Kōhī wa nomimasen deshita."],
  ["kino-toshokan-ni-ikimashita-sorekara-ocha-o-nomimashita-9a3d244adf7d", "sentence", "きのう、図書館に行きました。それから、お茶を飲みました。", "きのう、としょかんにいきました。それから、おちゃをのみました。", "Kinō, toshokan ni ikimashita. Sorekara, ocha o nomimashita."],
  ["kino-kohi-wa-nomimasen-deshita-e9926120e335", "sentence", "きのう、コーヒーは飲みませんでした。", "きのう、こーひーはのみませんでした。", "Kinō, kōhī wa nomimasen deshita."],
  ["kino-toshokan-ni-ikimashita-hon-o-yomimashita-kohi-wa-nomimasen-d-0b56eaeea7a8", "sentence", "きのう、図書館に行きました。本を読みました。コーヒーは飲みませんでした。", "きのう、としょかんにいきました。ほんをよみました。こーひーはのみませんでした。", "Kinō, toshokan ni ikimashita. Hon o yomimashita. Kōhī wa nomimasen deshita."],
  ["kohi-o-kudasai-24d9312d8599", "sentence", "コーヒーをください。", "こーひーをください。", "Kōhī o kudasai."],
  ["kayobi-no-niji-ni-aimasen-ka-a51c94150d0d", "sentence", "火曜日の二時に会いませんか。", "かようびのにじにあいませんか。", "Kayōbi no niji ni aimasen ka."],
  ["ren-san-wa-hon-ga-suki-desu-47b113d0c496", "sentence", "レンさんは本が好きです。", "れんさんはほんがすきです。", "Ren-san wa hon ga suki desu."],
  ["hito-fb8e646fc262", "word", "人", "ひと", "hito"],
  ["nichiyobi-c09ffe1b0785", "word", "日曜日", "にちようび", "nichiyōbi"],
  ["kome-2067e7db73a5", "word", "米", "こめ", "kome"],
  ["en-c41917af7e10", "word", "円", "えん", "en"],
  ["ki-614459aa7586", "word", "木", "き", "ki", ["き", "キ"]],
  ["gakko-95ec5cbb2da5", "word", "学校", "がっこう", "gakkō"],
  ["kuchi-4163cc5b5ea8", "word", "口", "くち", "kuchi"],
  ["kuruma-f5398bea4c34", "word", "車", "くるま", "kuruma"],
  ["yomimasu-b4b8a8108efa", "word", "読みます", "よみます", "yomimasu"],
  ["kakimasu-6e6b6201a7ae", "word", "書きます", "かきます", "kakimasu"],
  ["ikimasu-5ef364e3cb28", "word", "行きます", "いきます", "ikimasu"],
  ["kimasu-1a83da1400fe", "word", "来ます", "きます", "kimasu"],
  ["mimasu-fe5ec8f4935f", "word", "見ます", "みます", "mimasu"],
  ["a-dc5a4d3d82f7", "word", "あ", "あ", "a", ["ア"]],
  ["i-4c6ff2461396", "word", "い", "い", "i", ["イ"]],
  ["u-8a0179143e31", "word", "う", "う", "u", ["ウ"]],
  ["e-3b0a65000129", "word", "え", "え", "e", ["エ"]],
  ["o-762c1a1a5714", "word", "お", "お", "o", ["オ", "を", "ヲ"]],
  ["ka-f500b3b07ce5", "word", "か", "か", "ka", ["カ"]],
  ["ku-10c477b2569a", "word", "く", "く", "ku", ["ク"]],
  ["ke-81744914c053", "word", "け", "け", "ke", ["ケ"]],
  ["ko-083ed6fbedae", "word", "こ", "こ", "ko", ["コ"]],
  ["sa-598e6dcaa541", "word", "さ", "さ", "sa", ["サ"]],
  ["shi-1bb602cd1cb0", "word", "し", "し", "shi", ["シ"]],
  ["su-a4a4c9f8a8ed", "word", "す", "す", "su", ["ス"]],
  ["se-910204a13a70", "word", "せ", "せ", "se", ["セ"]],
  ["so-b6059c658b2c", "word", "そ", "そ", "so", ["ソ"]],
  ["ta-4cef96814184", "word", "た", "た", "ta", ["タ"]],
  ["chi-2bcee2b46631", "word", "ち", "ち", "chi", ["チ"]],
  ["tsu-82cb12703e4a", "word", "つ", "つ", "tsu", ["ツ"]],
  ["te-afafbae591c1", "word", "て", "て", "te", ["テ"]],
  ["to-427566260604", "word", "と", "と", "to", ["ト"]],
  ["na-30decdf42745", "word", "な", "な", "na", ["ナ"]],
  ["ni-5f945f18ef58", "word", "に", "に", "ni", ["ニ"]],
  ["nu-01954929e88c", "word", "ぬ", "ぬ", "nu", ["ヌ"]],
  ["ne-9e228bcc5ed4", "word", "ね", "ね", "ne", ["ネ"]],
  ["no-3b2e79bc7193", "word", "の", "の", "no", ["ノ"]],
  ["ha-de77c92e7000", "word", "は", "は", "ha", ["ハ"]],
  ["hi-ac2c2fe2a77e", "word", "ひ", "ひ", "hi", ["ヒ"]],
  ["fu-0e2c91a393ea", "word", "ふ", "ふ", "fu", ["フ"]],
  ["he-58c25b81f1d2", "word", "へ", "へ", "he", ["ヘ"]],
  ["ho-5a742a1142b8", "word", "ほ", "ほ", "ho", ["ホ"]],
  ["ma-f044d12b2a9f", "word", "ま", "ま", "ma", ["マ"]],
  ["mi-71541c68c80f", "word", "み", "み", "mi", ["ミ"]],
  ["mu-cad4655b0efc", "word", "む", "む", "mu", ["ム"]],
  ["me-1d37bdf9abb0", "word", "め", "め", "me", ["メ"]],
  ["mo-06ccdf06d752", "word", "も", "も", "mo", ["モ"]],
  ["ya-6a8f5a639349", "word", "や", "や", "ya", ["ヤ"]],
  ["yu-0026f00eafdf", "word", "ゆ", "ゆ", "yu", ["ユ"]],
  ["yo-7a0a3e30c7c4", "word", "よ", "よ", "yo", ["ヨ"]],
  ["ra-08f1c786678c", "word", "ら", "ら", "ra", ["ラ"]],
  ["ri-1828fe931380", "word", "り", "り", "ri", ["リ"]],
  ["ru-1ed061f00fb6", "word", "る", "る", "ru", ["ル"]],
  ["re-653c7a8efdbb", "word", "れ", "れ", "re", ["レ"]],
  ["ro-88a9f6609db8", "word", "ろ", "ろ", "ro", ["ロ"]],
  ["wa-f466e5f29654", "word", "わ", "わ", "wa", ["ワ"]],
  ["n-3bad3747efd8", "word", "ん", "ん", "n", ["ン"]],

];

const instructions = "Speak in clear, friendly standard Japanese for beginner learners. Use a natural, measured pace and accurate Japanese mora timing. Read the supplied input exactly once. Do not add a greeting, translation, explanation, example, or a second repetition. Use natural Japanese intonation, not an English accent or exaggerated acting.";

function pronunciationHint(reading: string, romanization: string): string {
  const guide = `The intended Japanese reading is ${reading}. Pronunciation guide: ${romanization}. This is guidance only; do not read the guide aloud.`;
  if (/^[ぁ-ゖ]$/u.test(reading)) {
    const specific = reading === "は" ? " Pronounce ha, not the topic-particle reading wa." :
      reading === "へ" ? " Pronounce he, not the direction-particle reading e." :
      reading === "ん" ? " Produce only the Japanese moraic nasal ん, without adding a vowel or saying an English letter name." : "";
    return `${guide} This is one isolated Japanese kana sound. Produce that single sound once, without expanding it into a word or sentence.${specific}`;
  }
  return guide;
}

/** Unique physical recordings; aliases do not generate duplicate MP3s. */
export const japaneseFoundationAudio: readonly YoAudioItem[] = recordings.map(
  ([slug, type, text, reading, romanization]) => ({
    id: `ja-jpf-${JAPANESE_FOUNDATION_AUDIO_VERSION}-${slug}`,
    targetLanguage: "ja",
    moduleId: JAPANESE_FOUNDATION_AUDIO_MODULE_ID,
    lessonId: JAPANESE_FOUNDATION_AUDIO_VERSION,
    type,
    text,
    // Kana input prevents an isolated kanji from taking an unrelated reading.
    // Sentences retain their natural orthography and receive a full reading guide.
    spokenText: type === "word" ? reading : text,
    pronunciationHint: pronunciationHint(reading, romanization),
    ttsInstructions: instructions,
    accentProfile: "japanese_standard",
    storagePath: `yo/ja/${JAPANESE_FOUNDATION_AUDIO_MODULE_ID}/${JAPANESE_FOUNDATION_AUDIO_VERSION}/japanese-standard/${type}/${slug}.mp3`,
  }),
);

const byText = new Map<string, YoAudioItem>();
const lookupKey = (text: string) => text.normalize("NFC").trim();
recordings.forEach((recording, index) => {
  for (const text of [recording[2], ...(recording[5] ?? [])]) {
    const key = lookupKey(text);
    if (byText.has(key)) throw new Error(`Duplicate Japanese foundation audio alias: ${text}`);
    byText.set(key, japaneseFoundationAudio[index]);
  }
});

/** Exact fixed-content lookup only. Unknown/free-form text never triggers TTS. */
export function getJapaneseFoundationAudioItem(text: string): YoAudioItem | undefined {
  return byText.get(lookupKey(text));
}
