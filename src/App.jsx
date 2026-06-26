import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "./App.css";
import penguin from "./assets/penguin.png";

const STORAGE_KEY = "pentomo-save-v4";
const BASE_CAPACITY = 54;
const EXP_PER_LEVEL = 100;
const PITY_MAX = 80;

const species = [
  "コウテイペンギン",
  "オウサマペンギン",
  "アデリーペンギン",
  "ジェンツーペンギン",
  "ヒゲペンギン",
  "ガラパゴスペンギン",
  "ケープペンギン",
  "フンボルトペンギン",
  "マゼランペンギン",
  "フィヨルドランドペンギン",
  "シュレーターペンギン",
  "スネアーズペンギン",
  "マカロニペンギン",
  "ロイヤルペンギン",
  "イワトビペンギン",
  "キガシラペンギン",
  "コガタペンギン",
  "ハネジロペンギン",
];

const tabs = [
  ["home", "ホーム", "home"],
  ["care", "育成", "care"],
  ["list", "一覧", "list"],
  ["gacha", "ガチャ", "gacha"],
  ["book", "図鑑", "book"],
  ["menu", "メニュー", "menu"],
];

const loveThresholds = [10, 25, 45, 70, 100, 135, 180, 240, 320, 420];

const feedItems = {
  normal: { name: "魚のエサ", price: 300, hunger: 15 },
  premium: { name: "高級魚", price: 1500, hunger: 35 },
  special: { name: "特製魚セット", price: 3000, hunger: 60 },
};

const titleCatalog = [
  { id: "keeper", name: "氷海の飼育員", condition: "ゲーム開始時から使える基本称号です。" },
  { id: "fish-catcher", name: "魚キャッチ名人", condition: "魚キャッチで100点を達成すると解放されます。" },
  { id: "friend", name: "ペンとも仲良し隊", condition: "愛情Lv10のペンギンを1匹育てると解放されます。" },
  { id: "collector", name: "図鑑研究員", condition: "ペンギン図鑑を10種類以上発見すると解放されます。" },
  { id: "traveler", name: "南極おみやげ係", condition: "おみやげを50個集めると解放されます。" },
  { id: "master", name: "ペンギンマスター", condition: "ペンギンLv100を1匹達成すると解放されます。" },
];

const outfits = [
  { id: "none", name: "なし", price: 0 },
  { id: "red-scarf", name: "赤マフラー", price: 800 },
  { id: "crown", name: "王冠", price: 1200 },
  { id: "sunglasses", name: "サングラス", price: 1800 },
  { id: "blue-ribbon", name: "青リボン", price: 1600 },
  { id: "sailor", name: "セーラー帽", price: 2200 },
];

const furniture = [
  { id: "soft-bed", name: "ふかふかベッド", price: 1800 },
  { id: "ice-slide", name: "氷のすべり台", price: 3600 },
  { id: "shell-lamp", name: "貝がらランプ", price: 900 },
  { id: "bronze-statue", name: "名前入り銅像家具", price: null },
];

const backgrounds = [
  { id: "near-sea", name: "近所の海", price: 2000 },
  { id: "ice-cave", name: "氷の洞窟", price: 3200 },
  { id: "antarctic-base", name: "南極基地", price: 4200 },
];

const outingPlans = [
  { id: "sea", name: "近所の海", time: "1時間", coins: 80, diamonds: 5 },
  { id: "cave", name: "氷の洞窟", time: "3時間", coins: 160, diamonds: 12 },
  { id: "base", name: "南極基地", time: "5時間", coins: 240, diamonds: 20 },
  { id: "expedition", name: "遠征", time: "12時間", coins: 520, diamonds: 55 },
];

function outingPlanWithDuration(plan) {
  const durations = { sea: 60 * 60 * 1000, cave: 3 * 60 * 60 * 1000, base: 5 * 60 * 60 * 1000, expedition: 12 * 60 * 60 * 1000 };
  return { ...plan, durationMs: durations[plan.id] };
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function usePentomoBgm(enabled, volume) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      audioRef.current?.stop?.();
      audioRef.current = null;
      return undefined;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return undefined;
    const context = new AudioContextClass();
    const master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);
    const notes = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 293.66, 349.23];
    let step = 0;
    let stopped = false;

    const playNote = () => {
      if (stopped) return;
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = notes[step % notes.length];
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.86);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(now);
      oscillator.stop(now + 0.9);
      step += 1;
    };

    const timer = window.setInterval(playNote, 520);
    playNote();
    const resumeAudio = () => {
      if (context.state === "suspended") {
        context.resume().catch(() => {});
      }
    };
    resumeAudio();
    window.addEventListener("pointerdown", resumeAudio);
    audioRef.current = {
      context,
      master,
      stop: () => {
        stopped = true;
        window.clearInterval(timer);
        window.removeEventListener("pointerdown", resumeAudio);
        if (context.state !== "closed") context.close();
      },
    };
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", resumeAudio);
      if (context.state !== "closed") context.close();
      if (audioRef.current?.context === context) audioRef.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    if (audioRef.current?.master) {
      audioRef.current.master.gain.setTargetAtTime((clampRange(volume, 0, 100) / 100) * 0.58, audioRef.current.context.currentTime, 0.06);
    }
  }, [volume, enabled]);
}

function getDailyGiftKey(date = new Date()) {
  const resetDate = new Date(date);
  if (resetDate.getHours() < 6) {
    resetDate.setDate(resetDate.getDate() - 1);
  }
  const year = resetDate.getFullYear();
  const month = String(resetDate.getMonth() + 1).padStart(2, "0");
  const day = String(resetDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function starterPenguin(name = "コウちゃん", speciesId = 0) {
  return {
    id: createId(),
    speciesId,
    speciesName: species[speciesId],
    name,
    level: 1,
    exp: 0,
    hunger: 70,
    mood: 70,
    friendship: 45,
    loveLevel: 1,
    lovePoint: 0,
    stage: "chick",
    favorite: true,
    outfit: "なし",
    obtainedAt: new Date().toISOString(),
    rewards: { evolved: false, lv80: false, lv100: false },
  };
}

function createDefaultGame() {
  const firstPenguin = starterPenguin();
  return {
    tutorialDone: false,
    playerName: "",
    coins: 12000,
    diamonds: 850,
    keeperLevel: 1,
    keeperExp: 0,
    loginDays: 1,
    pity: PITY_MAX,
    noticeCount: 1,
    penguins: [firstPenguin],
    eggs: [{ id: createId(), type: "white", speciesId: 0, source: "tutorial" }],
    activeCareId: firstPenguin.id,
    homeDisplayId: firstPenguin.id,
    profileDisplayId: firstPenguin.id,
    discoveredSpecies: [0],
    souvenirs: 0,
    activeOuting: null,
    capacityBonus: 0,
    inventory: { normal: 5, premium: 1, special: 0 },
    ownedOutfits: ["なし", "赤マフラー"],
    ownedFurniture: ["ふかふかベッド"],
    ownedBackgrounds: ["近所の海"],
    ownedTitles: ["氷海の飼育員"],
    activeTitle: "氷海の飼育員",
    activeFurniture: "ふかふかベッド",
    activeBackground: "近所の海",
    photos: [],
    supportMemo: "",
    achievements: { daily: 20, normal: 8, special: 2 },
    missionClaims: {},
    bgmEnabled: false,
    bgmVolume: 70,
    miniGameExpToday: 0,
    claimedToday: false,
    dailyGiftKey: "",
    lastMessage: "今日もペンギンたちとゆっくり過ごそう。",
  };
}

function loadGame() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.penguins)) return createDefaultGame();
    return normalizeGame({ ...createDefaultGame(), ...saved });
  } catch {
    return createDefaultGame();
  }
}

function normalizeGame(game) {
  const fallback = createDefaultGame();
  const currentGiftKey = getDailyGiftKey();
  const savedGiftKey = game.dailyGiftKey || (game.claimedToday ? currentGiftKey : "");
  const penguins = game.penguins.length ? game.penguins : fallback.penguins;
  const normalizedPenguins = penguins.map((p, index) => ({
    ...starterPenguin(p.name || `ペン${index + 1}`, clampSpecies(p.speciesId)),
    ...p,
    speciesId: clampSpecies(p.speciesId),
    speciesName: species[clampSpecies(p.speciesId)],
    outfit: validText(p.outfit, "なし"),
    rewards: { evolved: false, lv80: false, lv100: false, ...(p.rewards || {}) },
  }));
  const activeId = normalizedPenguins.some((p) => p.id === game.activeCareId) ? game.activeCareId : normalizedPenguins[0].id;
  return {
    ...fallback,
    ...game,
    penguins: normalizedPenguins,
    activeCareId: activeId,
    homeDisplayId: normalizedPenguins.some((p) => p.id === game.homeDisplayId) ? game.homeDisplayId : activeId,
    profileDisplayId: normalizedPenguins.some((p) => p.id === game.profileDisplayId) ? game.profileDisplayId : activeId,
    discoveredSpecies: unique([0, ...(game.discoveredSpecies || [])].map(clampSpecies)),
    inventory: { ...fallback.inventory, ...(game.inventory || {}) },
    ownedOutfits: unique(["なし", ...(game.ownedOutfits || [])].map((name) => validText(name, "なし"))),
    ownedFurniture: unique([...(game.ownedFurniture || fallback.ownedFurniture)].map((name) => validText(name, "ふかふかベッド"))),
    ownedBackgrounds: unique([...(game.ownedBackgrounds || fallback.ownedBackgrounds)].map((name) => validText(name, "近所の海"))),
    ownedTitles: unique([...(game.ownedTitles || fallback.ownedTitles)].map((name) => validText(name, "氷海の飼育員"))),
    activeTitle: validText(game.activeTitle, "氷海の飼育員"),
    capacityBonus: Number.isFinite(game.capacityBonus) ? game.capacityBonus : 0,
    photos: Array.isArray(game.photos) ? game.photos : [],
    supportMemo: validText(game.supportMemo, ""),
    missionClaims: game.missionClaims && typeof game.missionClaims === "object" ? game.missionClaims : {},
    bgmEnabled: Boolean(game.bgmEnabled),
    bgmVolume: clampRange(Number.isFinite(game.bgmVolume) ? game.bgmVolume : 70, 0, 100),
    dailyGiftKey: savedGiftKey,
    claimedToday: savedGiftKey === currentGiftKey ? Boolean(game.claimedToday) : false,
  };
}

function App() {
  const [active, setActive] = useState("home");
  const [game, setGame] = useState(loadGame);
  const [message, setMessage] = useState(game.lastMessage);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialName, setTutorialName] = useState(game.playerName || "ぺんとも");
  const [tutorialPenguinName, setTutorialPenguinName] = useState("コウちゃん");
  const [hatchModal, setHatchModal] = useState(null);
  const [outfitOpen, setOutfitOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...game, lastMessage: message }));
  }, [game, message]);
  usePentomoBgm(game.bgmEnabled, game.bgmVolume);

  const activePenguin = getPenguin(game, game.activeCareId) || game.penguins[0];
  const homePenguin = getPenguin(game, game.homeDisplayId) || activePenguin;
  const profilePenguin = getPenguin(game, game.profileDisplayId) || activePenguin;

  const setPenguin = (id, updater) => {
    setGame((current) => {
      let diamonds = current.diamonds;
      let ownedFurniture = current.ownedFurniture;
      let ownedTitles = current.ownedTitles;
      const penguins = current.penguins.map((p) => {
        if (p.id !== id) return p;
        const patch = typeof updater === "function" ? updater(p) : updater;
        const next = checkMilestones({ ...p, ...patch });
        const awards = milestoneAwards(p, next);
        diamonds += awards.diamonds;
        ownedFurniture = unique([...ownedFurniture, ...awards.furniture]);
        ownedTitles = unique([...ownedTitles, ...awards.titles]);
        return next;
      });
      return { ...current, diamonds, ownedFurniture, ownedTitles, penguins };
    });
  };

  const gainExp = (amount, reason = "EXPを獲得したよ。") => {
    setGame((current) => {
      const next = applyExpToActive(current, current.activeCareId, amount);
      return next;
    });
    setMessage(reason);
  };

  const careAction = (type, feedKey = "normal") => {
    const p = activePenguin;
    if (!p) return;

    if (type === "feed") {
      const feed = feedItems[feedKey];
      if (!feed || game.inventory[feedKey] <= 0) {
        setMessage("エサが足りないよ。ショップで購入しよう。");
        setActive("shop");
        return;
      }
      setGame((current) => ({
        ...(() => {
          const next = applyExpToActive(current, p.id, p.hunger < 95 ? 5 : 0);
          return {
            ...next,
            inventory: { ...next.inventory, [feedKey]: next.inventory[feedKey] - 1 },
            penguins: next.penguins.map((penguinData) =>
              penguinData.id === p.id
                ? { ...penguinData, hunger: clamp(penguinData.hunger + feed.hunger), mood: clamp(penguinData.mood + 2) }
                : penguinData,
            ),
          };
        })(),
      }));
      setMessage(`${feed.name}をあげたよ。満腹度が上がった！`);
      return;
    }

    if (type === "pet") {
      const gain = loveGain(p.friendship);
      setPenguin(p.id, (current) => ({
        mood: clamp(current.mood + 5),
        friendship: clamp(current.friendship + 10),
        lovePoint: current.lovePoint + gain,
        loveLevel: nextLoveLevel(current.lovePoint + gain),
      }));
      gainExp(5, "なでられてごきげん。仲良し度も上がったよ。");
      return;
    }

    if (type === "photo") {
      const photo = {
        id: createId(),
        penguinName: p.name,
        speciesName: p.speciesName,
        outfit: p.outfit,
        background: game.activeBackground,
        date: new Date().toLocaleDateString("ja-JP"),
      };
      setGame((current) => ({
        ...(() => {
          const next = applyExpToActive(current, p.id, 5);
          let diamonds = next.diamonds;
          let ownedFurniture = next.ownedFurniture;
          let ownedTitles = next.ownedTitles;
          const penguins = next.penguins.map((penguinData) => {
            if (penguinData.id !== p.id) return penguinData;
            const updated = checkMilestones({
              ...penguinData,
              friendship: clamp(penguinData.friendship + 5),
              lovePoint: penguinData.lovePoint + 1,
              loveLevel: nextLoveLevel(penguinData.lovePoint + 1),
            });
            const awards = milestoneAwards(p, updated);
            diamonds += awards.diamonds;
            ownedFurniture = unique([...ownedFurniture, ...awards.furniture]);
            ownedTitles = unique([...ownedTitles, ...awards.titles]);
            return updated;
          });
          return {
            ...next,
            diamonds,
            ownedFurniture,
            ownedTitles,
            photos: [photo, ...next.photos].slice(0, 30),
            penguins,
          };
        })(),
      }));
      setMessage("かわいい写真を撮ったよ。アルバムに保存した。");
      return;
    }

    if (type === "clean") {
      setPenguin(p.id, (current) => ({
        mood: clamp(current.mood + 15),
        lovePoint: current.lovePoint + 1,
        loveLevel: nextLoveLevel(current.lovePoint + 1),
      }));
      gainExp(5, "お部屋がぴかぴかになったよ。");
    }
  };

  const addPenguinFromEgg = (egg, name) => {
    const capacity = BASE_CAPACITY + game.capacityBonus;
    if (game.penguins.length >= capacity) {
      setMessage("飼育施設がいっぱいです。ショップで拡張しよう。");
      setHatchModal(null);
      return;
    }
    const speciesId = clampSpecies(egg.speciesId);
    const newPenguin = { ...starterPenguin(name, speciesId), favorite: false };
    setGame((current) => ({
      ...current,
      eggs: current.eggs.filter((item) => item.id !== egg.id),
      penguins: [...current.penguins, newPenguin],
      discoveredSpecies: unique([...current.discoveredSpecies, speciesId]),
    }));
    setHatchModal(null);
    setMessage(`${name}が仲間になったよ。`);
  };

  const finishTutorial = () => {
    const penguinData = starterPenguin(tutorialPenguinName.trim() || "コウちゃん", 0);
    setGame((current) => ({
      ...current,
      tutorialDone: true,
      playerName: tutorialName.trim() || "ぺんとも",
      eggs: [],
      penguins: [penguinData],
      activeCareId: penguinData.id,
      homeDisplayId: penguinData.id,
      profileDisplayId: penguinData.id,
      discoveredSpecies: [0],
    }));
    setMessage(`${penguinData.name}、これからよろしくね。`);
  };

  const context = {
    activePenguin,
    addPenguinFromEgg,
    careAction,
    editOpen,
    game,
    gainExp,
    hatchModal,
    homePenguin,
    message,
    outfitOpen,
    profilePenguin,
    setActive,
    setEditOpen,
    setGame,
    setHatchModal,
    setMessage,
    setOutfitOpen,
    setPenguin,
  };

  return (
    <div className="app">
      <div className="device">
        <div className="deviceCamera" />
        <TopStatus game={game} onProfile={() => setActive("profile")} />
        <main className="viewport">
          {active === "home" && <Home {...context} />}
          {active === "care" && <Care {...context} />}
          {active === "list" && <PenguinList {...context} />}
          {active === "gacha" && <Gacha {...context} />}
          {active === "eggs" && <EggStorage {...context} />}
          {active === "mini" && <MiniGames {...context} />}
          {active === "book" && <Book {...context} />}
          {active === "outing" && <OutingV2 {...context} />}
          {active === "shop" && <Shop {...context} />}
          {active === "profile" && <Profile {...context} />}
          {active === "achieve" && <Achievements {...context} />}
          {active === "missions" && <Missions {...context} />}
          {active === "menu" && <Menu {...context} />}
          {active === "menu-bag" && <MenuBagScreen {...context} />}
          {active === "menu-titles" && <MenuTitlesScreen {...context} />}
          {active === "menu-settings" && <MenuSettingsScreen {...context} />}
          {active === "menu-help" && <MenuHelpScreen {...context} />}
          {active === "menu-contact" && <MenuContactScreen {...context} />}
          {active === "menu-terms" && <MenuTermsScreen {...context} />}
          {active === "menu-link" && <MenuLinkScreen {...context} />}
        </main>
        <BottomTabs active={active} onChange={setActive} />
        {!game.tutorialDone && (
          <Tutorial
            step={tutorialStep}
            setStep={setTutorialStep}
            playerName={tutorialName}
            setPlayerName={setTutorialName}
            penguinName={tutorialPenguinName}
            setPenguinName={setTutorialPenguinName}
            finishTutorial={finishTutorial}
          />
        )}
        {hatchModal && <HatchModal egg={hatchModal} onClose={() => setHatchModal(null)} onHatch={addPenguinFromEgg} />}
        {outfitOpen && <OutfitModal game={game} penguin={activePenguin} setPenguin={setPenguin} onClose={() => setOutfitOpen(false)} />}
        {editOpen && <EditRoomModal game={game} setGame={setGame} onClose={() => setEditOpen(false)} />}
      </div>
    </div>
  );
}

function TopStatus({ game, onProfile }) {
  return (
    <header className="topStatus">
      <button className="playerChip profileButton" onClick={onProfile} aria-label="Profile">
        <img src={penguin} alt="" />
        <div>
          <b>{game.playerName || "ぺんとも"}</b>
          <span>飼育員Lv.{game.keeperLevel}</span>
        </div>
      </button>
      <div className="currencies">
        <Currency type="coin" value={game.coins} />
        <Currency type="diamond" value={game.diamonds} />
      </div>
    </header>
  );
}

function Home({ game, homePenguin, message, setActive, setMessage, setGame }) {
  const [giftKey, setGiftKey] = useState(getDailyGiftKey);
  useEffect(() => {
    const timer = setInterval(() => setGiftKey(getDailyGiftKey()), 30 * 1000);
    return () => clearInterval(timer);
  }, []);
  const giftClaimed = game.claimedToday && game.dailyGiftKey === giftKey;
  const homeMessage = message === "実績を開きました。" ? statusMessage(homePenguin) : message;
  const claimGift = () => {
    const currentGiftKey = getDailyGiftKey();
    if (game.claimedToday && game.dailyGiftKey === currentGiftKey) {
      setMessage("今日のプレゼントは受け取り済みだよ。");
      return;
    }
    setGiftKey(currentGiftKey);
    setGame((current) => ({
      ...current,
      claimedToday: true,
      dailyGiftKey: currentGiftKey,
      coins: current.coins + 300,
      diamonds: current.diamonds + 10,
      inventory: { ...current.inventory, normal: current.inventory.normal + 1 },
    }));
    setMessage("今日のプレゼントを受け取ったよ。魚のエサ、コイン、ダイヤをゲット！");
  };

  return (
    <Screen className="homeScreen">
      <div className="homeHud">
        <div className="levelPanel">
          <b>Lv.{homePenguin.level}</b>
          <Meter value={homePenguin.exp} compact />
          <span>{homePenguin.name} / {homePenguin.speciesName}</span>
        </div>
        <button className="noticeRound" onClick={() => setMessage(statusMessage(homePenguin))} aria-label="様子を見る">
          <HomeIcon name="look" />
          <span>様子</span>
          <i>{game.noticeCount}</i>
        </button>
      </div>
      <SideDock
        items={[
          ["ミッション", "mission", () => setActive("missions")],
          ["ショップ", "shop", () => setActive("shop")],
          [giftClaimed ? "受取済み" : "プレゼント", "gift", claimGift],
        ]}
      />
      <div className="homeScene">
        <div className="shootingStar" />
        <div className="igloo left" />
        <div className="igloo right" />
        <div className="iceberg one" />
        <div className="iceberg two" />
        <HomeWalkingPenguin penguin={homePenguin} />
      </div>
      <Speech>{homeMessage}</Speech>
      <div className="primaryActions">
        <button className="roundAction blue" onClick={() => setActive("mini")}>
          <HomeIcon name="game" />
          <span>ゲーム</span>
        </button>
        <button className="roundAction yellow" onClick={() => setActive("care")}>
          <HomeIcon name="care" />
          <span>育成</span>
        </button>
        <button className="roundAction green" onClick={() => setActive("outing")}>
          <HomeIcon name="outing" />
          <span>おでかけ</span>
        </button>
      </div>
    </Screen>
  );
}

function HomeWalkingPenguin({ penguin: p }) {
  return (
    <div className="riggedPentomo" aria-label={`${p?.name || "ペンギン"}のアニメーション`}>
      <img className="rigPart rigImage" src={penguin} alt={p?.name || ""} draggable="false" />
      <span className="rigShadow" />
      <span className="rigName">{p?.name || "ペンギン"}</span>
    </div>
  );
}

function Care({ activePenguin, careAction, game, setOutfitOpen, setEditOpen }) {
  const [petMode, setPetMode] = useState(false);
  const [petting, setPetting] = useState(false);
  const [petHand, setPetHand] = useState({ x: 190, y: 130 });
  const [cleanMode, setCleanMode] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanTool, setCleanTool] = useState({ x: 190, y: 210 });
  const [photoMode, setPhotoMode] = useState(false);
  const [photoFlash, setPhotoFlash] = useState(false);
  const [photoReview, setPhotoReview] = useState(false);
  const [photoZoom, setPhotoZoom] = useState(1);
  const [photoPan, setPhotoPan] = useState({ x: 0, y: 0 });
  const [photoDragging, setPhotoDragging] = useState(false);
  const [photoDragStart, setPhotoDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });
  const [capturedPhoto, setCapturedPhoto] = useState({ zoom: 1, pan: { x: 0, y: 0 } });
  const displayZoom = photoZoom <= 1 ? photoZoom : 1 + (photoZoom - 1) * 0.42;

  const pointerPosition = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const startPetStroke = (event) => {
    if (photoMode) {
      const position = pointerPosition(event);
      event.currentTarget.setPointerCapture(event.pointerId);
      setPhotoDragging(true);
      setPhotoDragStart({ x: position.x, y: position.y, panX: photoPan.x, panY: photoPan.y });
      return;
    }
    if (!petMode && !cleanMode) return;
    const position = pointerPosition(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (petMode) {
      setPetHand(position);
      setPetting(true);
    }
    if (cleanMode) {
      setCleanTool(position);
      setCleaning(true);
    }
  };

  const dragPetStroke = (event) => {
    if (photoMode) {
      if (!photoDragging) return;
      const position = pointerPosition(event);
      const limitX = photoZoom >= 2 ? 44 : 80;
      const limitY = photoZoom >= 2 ? 54 : 90;
      setPhotoPan({
        x: Math.max(-limitX, Math.min(limitX, photoDragStart.panX + position.x - photoDragStart.x)),
        y: Math.max(-limitY, Math.min(limitY, photoDragStart.panY + position.y - photoDragStart.y)),
      });
      return;
    }
    const position = pointerPosition(event);
    if (petMode && petting) setPetHand(position);
    if (cleanMode && cleaning) setCleanTool(position);
  };

  const finishPetStroke = () => {
    if (photoMode) {
      setPhotoDragging(false);
      return;
    }
    if (petMode) {
      if (petting) careAction("pet");
      setPetting(false);
      setPetMode(false);
    }
    if (cleanMode) {
      if (cleaning) careAction("clean");
      setCleaning(false);
      setCleanMode(false);
    }
  };

  const takePhoto = () => {
    setCapturedPhoto({ zoom: displayZoom, pan: photoPan });
    setPhotoFlash(true);
    careAction("photo");
    setTimeout(() => {
      setPhotoFlash(false);
      setPhotoReview(true);
    }, 760);
  };

  const openPhotoMode = () => {
    setPetMode(false);
    setCleanMode(false);
    setPhotoPan({ x: 0, y: 0 });
    setPhotoZoom(1);
    setPhotoReview(false);
    setPhotoMode(true);
  };

  return (
    <Screen className={`careScreen ${photoMode || photoFlash ? "photoModeScreen" : ""}`}>
      <div className={`careHero ${petMode ? "petMode" : ""} ${petting ? "petting" : ""} ${cleanMode ? "cleanMode" : ""} ${cleaning ? "cleaning" : ""} ${photoMode ? "photoMode" : ""} ${photoFlash ? "photoFlash" : ""}`}>
        <div className="careHeader">
          <div className="avatarBadge">
            <img src={penguin} alt="" />
          </div>
          <div>
            <div className="careNameLine">
              <h1>{activePenguin.name}</h1>
              <span>Lv.{activePenguin.level}</span>
            </div>
            <p>{activePenguin.speciesName} / {activePenguin.stage === "adult" ? "大人" : "ヒナ"}</p>
          </div>
          <button className="circleButton" onClick={() => setEditOpen(true)}><Icon name="edit" /></button>
        </div>
        <div
          className="roomScene"
          onPointerDown={startPetStroke}
          onPointerMove={dragPetStroke}
          onPointerUp={finishPetStroke}
          onPointerCancel={finishPetStroke}
        >
          <div
            className="photoSubject"
            style={{ "--photo-x": `${photoPan.x}px`, "--photo-y": `${photoPan.y}px`, "--photo-zoom": displayZoom }}
          >
            <PenguinFigure penguin={activePenguin} size="large" />
          </div>
          <div className="petModeHint">ペンギンをドラッグしてなでよう</div>
          <div className="cleanModeHint">床をドラッグして掃除しよう</div>
          <svg className="pettingHand" viewBox="0 0 80 80" style={{ left: petHand.x, top: petHand.y }} aria-hidden="true">
            <path className="handShadow" d="M20 36c-5 1-8 6-7 11 2 12 12 24 27 24h6c13 0 22-9 22-22V29c0-4-3-7-7-7-2 0-4 1-5 2v-3c0-4-3-7-7-7-3 0-5 1-6 4-1-3-4-5-7-5-4 0-7 3-7 7v2c-1-2-4-3-6-3-4 0-7 3-7 7v16Z" />
            <path className="handPalm" d="M20 36c-5 1-8 6-7 11 2 12 12 24 27 24h6c13 0 22-9 22-22V29c0-4-3-7-7-7-2 0-4 1-5 2v-3c0-4-3-7-7-7-3 0-5 1-6 4-1-3-4-5-7-5-4 0-7 3-7 7v2c-1-2-4-3-6-3-4 0-7 3-7 7v20l-3-5c-2-4-6-6-10-5Z" />
            <path className="handLines" d="M29 22v23M43 19v25M56 25v23M19 43c7 1 11 7 12 15" />
            <path className="handThumb" d="M18 44c7 0 13 5 16 13" />
          </svg>
          <div className="cleaningBroom" style={{ left: cleanTool.x, top: cleanTool.y }}><span /><b /><em /><i /></div>
          <div className="cameraFrame"><span>PHOTO</span></div>
          <div className="apertureOverlay" />
          {photoMode && <div className="photoHud"><b>{activePenguin.name}</b><span>Lv.{activePenguin.level} / 愛情Lv.{activePenguin.loveLevel}</span></div>}
          {photoReview && (
            <div className="photoReview" onPointerDown={(event) => event.stopPropagation()} onPointerMove={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()}>
              <button className="whiteButton" onClick={() => {
                setPhotoReview(false);
                setPhotoMode(false);
              }}>×</button>
              <button className="retakeButton" onClick={() => setPhotoReview(false)}>撮り直す</button>
              <div className="photoPrint" style={{ "--photo-x": `${capturedPhoto.pan.x}px`, "--photo-y": `${capturedPhoto.pan.y}px`, "--photo-zoom": capturedPhoto.zoom }}>
                <div className="photoPrintScene">
                  <div className="photoPrintSubject">
                    <PenguinFigure penguin={activePenguin} size="large" />
                  </div>
                </div>
                <span>{activePenguin.name} / Lv.{activePenguin.level}</span>
              </div>
            </div>
          )}
          {photoMode && !photoReview && (
            <div className="photoControls" onPointerDown={(event) => event.stopPropagation()} onPointerMove={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()}>
              <button className="whiteButton" onClick={() => setPhotoMode(false)}>×</button>
              <div className="zoomControls">
                {[0.5, 1, 2].map((zoom) => (
                  <button className={photoZoom === zoom ? "active" : ""} key={zoom} onClick={() => setPhotoZoom(zoom)}>{zoom}x</button>
                ))}
              </div>
              {photoZoom >= 2 && (
                <div className="manualZoom">
                  <span>{photoZoom.toFixed(1)}x</span>
                  <input
                    type="range"
                    min="2"
                    max="3"
                    step="0.1"
                    value={photoZoom}
                    onChange={(event) => setPhotoZoom(Number(event.target.value))}
                  />
                </div>
              )}
              <button className="photoShutter" onClick={takePhoto} aria-label="写真を撮る" />
            </div>
          )}
        </div>
      </div>
      <div className="careActions quickCareActions">
        <CareButton
          label="なでる"
          icon="heart"
          className={petMode ? "activeCareTool" : ""}
          onClick={() => {
            setPhotoMode(false);
            setCleanMode(false);
            setPetMode((value) => !value);
          }}
        />
        <CareButton
          label="写真"
          icon="camera"
          className={photoMode ? "activeCareTool" : ""}
          onClick={openPhotoMode}
        />
        <CareButton
          label="掃除"
          icon="broom"
          className={cleanMode ? "activeCareTool" : ""}
          onClick={() => {
            setPhotoMode(false);
            setPetMode(false);
            setCleanMode((value) => !value);
          }}
        />
        <CareButton label="着替え" icon="shirt" onClick={() => setOutfitOpen(true)} />
        <CareButton label="模様替え" icon="edit" onClick={() => setEditOpen(true)} />
      </div>
      <div className="inventoryChips">
        {Object.entries(feedItems).map(([key, item]) => (
          <button className={`feedChip feed-${key}`} key={key} onClick={() => careAction("feed", key)}>
            <FeedIcon type={key} />
            <span>
              <b>{key === "normal" ? "N" : key === "premium" ? "R" : "SR"}</b>
              {item.name}
            </span>
            <em>x{game.inventory[key]}</em>
          </button>
        ))}
      </div>
      <div className="careInfoGrid">
        <Panel className="statPanel">
          <div className="levelLine">
            <b>Lv.{activePenguin.level}</b>
            <span>衣装 {activePenguin.outfit}</span>
          </div>
          <Meter label="EXP" value={activePenguin.exp} />
          <Meter label="満腹度" value={activePenguin.hunger} tone="yellow" />
          <Meter label="機嫌" value={activePenguin.mood} tone="pink" />
          <Meter label="仲良し度" value={activePenguin.friendship} tone="mint" />
          <div className="compactLove">
            <span>愛情Lv.{activePenguin.loveLevel}</span>
            <b>{activePenguin.lovePoint} / {loveThresholds[9]} pt</b>
          </div>
        </Panel>
        <Panel className="lovePanel">
          <div>
            <b>愛情Lv.{activePenguin.loveLevel}</b>
            <span>{activePenguin.lovePoint} pt</span>
          </div>
          <div className="hearts">
            {Array.from({ length: 10 }).map((_, index) => (
              <span className={index < activePenguin.loveLevel ? "filled" : ""} key={index} />
            ))}
          </div>
        </Panel>
      </div>
    </Screen>
  );
}

function PenguinList({ game, setGame, setHatchModal, setActive }) {
  const [tab, setTab] = useState("penguins");
  const [selectedPenguinId, setSelectedPenguinId] = useState("");
  const [sortMode, setSortMode] = useState("book");
  const [sortOpen, setSortOpen] = useState(false);
  const sortOptions = [
    ["book", "図鑑順"],
    ["level", "Lv順"],
    ["love", "愛情順"],
    ["newest", "入手順"],
    ["favorite", "お気に入り優先"],
  ];
  const selectedSortLabel = sortOptions.find(([value]) => value === sortMode)?.[1] || "図鑑順";
  const capacity = BASE_CAPACITY + game.capacityBonus;
  const selectedPenguin = game.penguins.find((p) => p.id === selectedPenguinId);
  const sortedPenguins = [...game.penguins].sort((a, b) => {
    if (sortMode === "level") return b.level - a.level || b.exp - a.exp || a.speciesId - b.speciesId;
    if (sortMode === "love") return b.loveLevel - a.loveLevel || b.lovePoint - a.lovePoint || a.speciesId - b.speciesId;
    if (sortMode === "newest") return new Date(b.obtainedAt || 0).getTime() - new Date(a.obtainedAt || 0).getTime();
    if (sortMode === "favorite") return Number(b.favorite) - Number(a.favorite) || a.speciesId - b.speciesId;
    return a.speciesId - b.speciesId || new Date(a.obtainedAt || 0).getTime() - new Date(b.obtainedAt || 0).getTime();
  });
  const toggleFavorite = (id) => {
    setGame((current) => ({
      ...current,
      penguins: current.penguins.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p)),
    }));
  };
  const setDetailRole = (id, role) => {
    setGame((current) => ({
      ...current,
      homeDisplayId: role === "home" ? id : current.homeDisplayId,
      activeCareId: role === "care" ? id : current.activeCareId,
    }));
  };

  return (
    <Screen className="listScreen">
      <PageHeader title="一覧" sub={`ペンギン ${game.penguins.length} / ${capacity} ・ 卵 ${game.eggs.length}`} />
      <Segmented active={tab} options={{ penguins: "ペンギン", eggs: "卵" }} onChange={setTab} />
      {tab === "penguins" && (
        <>
          <div className="sortBar">
            <div className={`bubbleSort ${sortOpen ? "open" : ""}`}>
              <button className="bubbleSortTrigger" onClick={() => setSortOpen((open) => !open)} type="button">
                <span>ならび</span>
                <b>{selectedSortLabel}</b>
                <i />
              </button>
              {sortOpen && (
                <div className="bubbleSortMenu">
                  {sortOptions.map(([value, label]) => (
                    <button
                      className={sortMode === value ? "active" : ""}
                      key={value}
                      onClick={() => {
                        setSortMode(value);
                        setSortOpen(false);
                      }}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <label className="sortSelectLabel">
              <span>並び替え</span>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value)} aria-label="ペンギンの並び替え">
                <option value="book">図鑑順</option>
                <option value="level">Lv順</option>
                <option value="love">愛情順</option>
                <option value="newest">入手順</option>
                <option value="favorite">お気に入り優先</option>
              </select>
            </label>
          </div>
          <div className="penguinGrid">
            {sortedPenguins.map((p) => (
              <button
                className={`penguinCard ${selectedPenguin?.id === p.id ? "selected" : ""}`}
                key={p.id}
                onClick={() => setSelectedPenguinId((current) => (current === p.id ? "" : p.id))}
                type="button"
              >
                <Rarity index={p.speciesId} />
                <img src={penguin} alt="" />
                <b>{p.name}</b>
                <span>{p.speciesName}<br />Lv.{p.level} / 愛情{p.loveLevel}</span>
              </button>
            ))}
          </div>
          {selectedPenguin && (
            <div className="listDetailOverlay" onClick={() => setSelectedPenguinId("")}>
              <div className="penguinDetailSheet" onClick={(event) => event.stopPropagation()}>
                <button className="detailCloseButton" onClick={() => setSelectedPenguinId("")} aria-label="Close" type="button">×</button>
                <div className="penguinDetailHero">
                  <Rarity index={selectedPenguin.speciesId} />
                  <img src={penguin} alt="" />
                  <div>
                    <h2>{selectedPenguin.name}</h2>
                    <p>{selectedPenguin.speciesName} / {selectedPenguin.stage === "adult" ? "大人" : "ヒナ"}</p>
                  </div>
                </div>
                <div className="detailRoleActions">
                  <button
                    className={`favoriteAction ${selectedPenguin.favorite ? "active" : ""}`}
                    onClick={() => toggleFavorite(selectedPenguin.id)}
                    type="button"
                  >
                    <i className="detailIcon detailIconStar" />
                    <span>{selectedPenguin.favorite ? "お気に入り中" : "お気に入り"}</span>
                  </button>
                  <button
                    className={`homeAction ${game.homeDisplayId === selectedPenguin.id ? "active" : ""}`}
                    onClick={() => setDetailRole(selectedPenguin.id, "home")}
                    type="button"
                  >
                    <i className="detailIcon detailIconHome" />
                    <span>{game.homeDisplayId === selectedPenguin.id ? "ホーム設定中" : "ホームにする"}</span>
                  </button>
                  <button
                    className={`careAction ${game.activeCareId === selectedPenguin.id ? "active" : ""}`}
                    onClick={() => setDetailRole(selectedPenguin.id, "care")}
                    type="button"
                  >
                    <i className="detailIcon detailIconCare" />
                    <span>{game.activeCareId === selectedPenguin.id ? "育成中" : "育成する"}</span>
                  </button>
                </div>
                <div className="penguinDetailStats">
                  <DetailStat label="Lv" value={selectedPenguin.level} max={100} />
                  <DetailStat label="EXP" value={selectedPenguin.exp} max={100} />
                  <DetailStat label="満腹度" value={selectedPenguin.hunger} max={100} />
                  <DetailStat label="機嫌" value={selectedPenguin.mood} max={100} />
                  <DetailStat label="仲良し度" value={selectedPenguin.friendship} max={100} />
                </div>
                <div className="penguinDetailLove">
                  <b>愛情Lv.{selectedPenguin.loveLevel}</b>
                  <span>{selectedPenguin.lovePoint} / {loveThresholds[9]} pt</span>
                </div>
                <div className="hearts">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <span className={index < selectedPenguin.loveLevel ? "filled" : ""} key={index} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {tab === "eggs" && <EggStorage game={game} setHatchModal={setHatchModal} setActive={setActive} embedded />}
    </Screen>
  );
}

function Gacha({ game, setGame, setMessage }) {
  const [results, setResults] = useState([]);
  const [openedResults, setOpenedResults] = useState({});
  const [ratesOpen, setRatesOpen] = useState(false);
  const [gachaAnimating, setGachaAnimating] = useState(false);
  const [gachaCinematic, setGachaCinematic] = useState(null);

  const pull = (count) => {
    if (gachaCinematic) return;
    const cost = count === 10 ? 1000 : 100;
    if (game.diamonds < cost) {
      setMessage("ダイヤが足りません。おでかけや実績で集めよう。");
      return;
    }
    const next = makeGachaEggs(count, game.pity);
    const gotSsr = next.some((item) => item.prizeType === "ssrEgg");
    const bestType = gotSsr ? "rainbow" : next.some((item) => item.type === "gold") ? "gold" : "white";
    const cinematicDuration = count === 10 ? 3800 : 2600;
    setGachaAnimating(false);
    window.setTimeout(() => setGachaAnimating(true), 0);
    window.setTimeout(() => setGachaAnimating(false), 1200);
    setResults([]);
    setOpenedResults({});
    setGachaCinematic({ count, gotSsr, bestType, eggs: next.map((item) => item.type) });
    window.setTimeout(() => {
      setResults(next);
      setOpenedResults({});
    }, cinematicDuration - 350);
    window.setTimeout(() => setGachaCinematic(null), cinematicDuration);
    setGame((current) => ({
      ...current,
      diamonds: current.diamonds - cost,
      pity: gotSsr ? PITY_MAX : Math.max(1, current.pity - count),
      eggs: [
        ...current.eggs,
        ...next.filter((item) => item.prizeType === "ssrEgg").map((item) => ({ id: createId(), type: "rainbow", speciesId: item.speciesId, source: "gacha" })),
      ],
      inventory: addFeedRewards(current.inventory, next),
    }));
    setMessage(gotSsr ? "SSRペンギン卵を入手！卵画面で孵化しよう。" : "ガチャ報酬を受け取ったよ。");
  };

  const openResult = (id) => {
    setOpenedResults((current) => ({ ...current, [id]: true }));
  };

  const openAllResults = () => {
    setOpenedResults((current) => ({
      ...current,
      ...Object.fromEntries(results.filter((result) => !current[result.id]).map((result) => [result.id, true])),
    }));
  };

  const closeResults = () => {
    setResults([]);
    setOpenedResults({});
  };

  const unopenedCount = results.filter((result) => !openedResults[result.id]).length;
  const resultBestType = results.some((result) => result.type === "rainbow") ? "rainbow" : results.some((result) => result.type === "gold") ? "gold" : "white";

  return (
    <Screen className="gachaScreen">
      <PageHeader title="ペンギン卵ガチャ" sub={`SSR確定まであと ${game.pity} 回`} />
      <div className={`gachaVisual ${gachaAnimating ? "playing" : ""}`}>
        <button className="rateHelpButton" onClick={() => setRatesOpen((open) => !open)} type="button" aria-label="排出率">?</button>
        {ratesOpen && (
          <div className="ratePopover">
            <b>排出率</b>
            <span><em>魚のエサ</em><strong>60%</strong></span>
            <span><em>高級魚</em><strong>30%</strong></span>
            <span><em>特製魚セット</em><strong>8%</strong></span>
            <span><em>ペンギン卵</em><strong>2%</strong></span>
          </div>
        )}
        <div className="sparkleCard">
          <div className="gachaRays" />
          <div className="eggPreview">
            <Egg type="white" />
            <Egg type="gold" />
            <Egg type="rainbow" />
          </div>
          <h2>SSRはペンギン卵</h2>
        </div>
      </div>
      <div className="gachaButtons">
        <button className="yellow" onClick={() => pull(1)} disabled={!!gachaCinematic}>1回 100ダイヤ</button>
        <button className="pink" onClick={() => pull(10)} disabled={!!gachaCinematic}>10連 1000ダイヤ</button>
      </div>
      {gachaCinematic && (
        <GachaCinematic3D cinematic={gachaCinematic} />
      )}
      {results.length > 0 && !gachaCinematic && (
        <div className={`gachaResultOverlay result-${resultBestType}`} role="dialog" aria-modal="true" aria-label="ガチャ結果">
          <div className="resultAurora" aria-hidden="true" />
          <div className="gachaResultHeader">
            <div>
              <h2>ガチャ結果</h2>
              <p>{unopenedCount > 0 ? "卵をタップして中身を確認しよう。" : "すべて確認しました。"}</p>
            </div>
            <button
              className="profileCloseButton"
              onClick={closeResults}
              disabled={unopenedCount > 0}
              type="button"
              aria-label="閉じる"
            >
              ×
            </button>
          </div>
          <div className="gachaResultSummary">
            <span>{results.length}個の卵</span>
            <b>{resultBestType === "rainbow" ? "SSRチャンス!" : resultBestType === "gold" ? "いい予感!" : "開封しよう"}</b>
          </div>
          <div className="gachaResultMascot" aria-hidden="true">
            <img src={penguin} alt="" />
            <span>{unopenedCount > 0 ? "どれから開ける？" : "やったね！"}</span>
          </div>
          <div className={`openEggs resultModalEggs ${results.length > 1 ? "ten" : ""} hasResults`}>
            {results.map((result, index) => (
              <button
                className={`openEgg ${result.type} ${openedResults[result.id] ? "opened" : ""}`}
                key={result.id}
                onClick={() => openResult(result.id)}
                style={{ "--delay": `${index * 0.035}s` }}
                type="button"
              >
                <i />
                {openedResults[result.id] ? (
                  <GachaPrizeVisual result={result} />
                ) : (
                  <span>TAP</span>
                )}
              </button>
            ))}
          </div>
          {unopenedCount > 0 && (
            <button className="openAllButton" onClick={openAllResults} type="button">すべて開く 残り{unopenedCount}個</button>
          )}
        </div>
      )}
    </Screen>
  );
}

function GachaCinematic3D({ cinematic }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x9edfff, 7, 15);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    camera.position.set(0, 2.35, 8.4);
    camera.lookAt(0, 0.35, -1.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const iceMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x8ee8ff,
      roughness: 0.18,
      metalness: 0,
      transmission: 0.38,
      transparent: true,
      opacity: 0.72,
      thickness: 0.9,
      clearcoat: 0.75,
      clearcoatRoughness: 0.16,
    });
    const sideIceMaterial = iceMaterial.clone();
    sideIceMaterial.color.setHex(0xbdf5ff);
    sideIceMaterial.opacity = 0.82;
    const snowMaterial = new THREE.MeshStandardMaterial({ color: 0xf7fdff, roughness: 0.82 });
    const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x14253a, roughness: 0.58 });
    const whiteMaterial = new THREE.MeshStandardMaterial({ color: 0xfffbf4, roughness: 0.52 });
    const orangeMaterial = new THREE.MeshStandardMaterial({ color: 0xffac3f, roughness: 0.46 });
    const cheekMaterial = new THREE.MeshStandardMaterial({ color: 0xffadc0, emissive: 0xff6d95, emissiveIntensity: 0.12, roughness: 0.46 });
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x071423, roughness: 0.16 });
    const eyeHighlightMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.22, roughness: 0.08 });
    const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xffd85c, emissive: 0x5c3300, emissiveIntensity: 0.12, roughness: 0.36 });
    const rainbowMaterial = new THREE.MeshStandardMaterial({ color: 0xff91ca, emissive: 0x5adfff, emissiveIntensity: 0.28, roughness: 0.32 });

    scene.add(new THREE.AmbientLight(0xffffff, 1.65));
    const sun = new THREE.DirectionalLight(0xffffff, 2.5);
    sun.position.set(-3.5, 6.2, 5.4);
    scene.add(sun);
    const gateLight = new THREE.PointLight(cinematic.gotSsr ? 0xffd768 : 0xa7efff, cinematic.gotSsr ? 7 : 4.6, 9);
    gateLight.position.set(0, 2.25, -5.15);
    scene.add(gateLight);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 64), snowMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.22;
    scene.add(floor);

    const slidePath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.65, -5.25),
      new THREE.Vector3(0.16, 0.85, -3.5),
      new THREE.Vector3(-0.12, -0.35, -1.5),
      new THREE.Vector3(0.02, -1.25, 1.2),
      new THREE.Vector3(0, -1.58, 3.2),
    ]);

    const slideGroup = new THREE.Group();
    for (let i = 0; i < 22; i += 1) {
      const t = i / 21;
      const point = slidePath.getPoint(t);
      const nextPoint = slidePath.getPoint(Math.min(1, t + 0.035));
      const width = 2.15 + t * 1.05;
      const plate = new THREE.Mesh(new THREE.BoxGeometry(width, 0.11, 0.62), iceMaterial);
      plate.position.copy(point);
      plate.lookAt(nextPoint);
      plate.rotation.x += 0.18;
      slideGroup.add(plate);

      const leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.62), sideIceMaterial);
      const rightRail = leftRail.clone();
      leftRail.position.copy(point).add(new THREE.Vector3(-width / 2, 0.22, 0));
      rightRail.position.copy(point).add(new THREE.Vector3(width / 2, 0.22, 0));
      leftRail.lookAt(nextPoint);
      rightRail.lookAt(nextPoint);
      leftRail.rotation.x += 0.18;
      rightRail.rotation.x += 0.18;
      slideGroup.add(leftRail, rightRail);
    }
    scene.add(slideGroup);

    const arch = new THREE.Group();
    const blockGeometry = new THREE.BoxGeometry(0.56, 0.48, 0.7);
    for (let i = 0; i <= 13; i += 1) {
      const angle = Math.PI - (i / 13) * Math.PI;
      const x = Math.cos(angle) * 1.58;
      const y = Math.sin(angle) * 1.42 + 1.2;
      const block = new THREE.Mesh(blockGeometry, sideIceMaterial);
      block.position.set(x, y, -5.45);
      block.rotation.z = -angle + Math.PI / 2;
      block.rotation.y = (i % 2 ? 0.08 : -0.08);
      arch.add(block);
    }
    for (const x of [-1.78, 1.78]) {
      for (let j = 0; j < 4; j += 1) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.62, 0.78), sideIceMaterial);
        pillar.position.set(x, -0.58 + j * 0.56, -5.48);
        pillar.rotation.z = x < 0 ? -0.05 : 0.05;
        arch.add(pillar);
      }
    }
    scene.add(arch);

    const penguinGroup = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.46, 36, 26), darkMaterial);
    body.scale.set(0.96, 1.05, 0.78);
    body.position.set(0, 0.0, 0.02);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.36, 36, 22), whiteMaterial);
    belly.scale.set(0.92, 0.98, 0.34);
    belly.position.set(0, -0.08, 0.34);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 36, 24), darkMaterial);
    head.scale.set(1.04, 0.98, 0.92);
    head.position.set(0, 0.45, 0.06);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.31, 36, 18), whiteMaterial);
    face.scale.set(1.2, 0.9, 0.36);
    face.position.set(0, 0.45, 0.34);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.16, 20), orangeMaterial);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.4, 0.61);
    penguinGroup.add(body, belly, head, face, beak);
    for (const x of [-0.14, 0.14]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 20, 14), eyeMaterial);
      eye.scale.set(1, 1.12, 0.45);
      eye.position.set(x, 0.51, 0.59);
      const highlight = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), eyeHighlightMaterial);
      highlight.position.set(x - 0.015, 0.535, 0.626);
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 10), cheekMaterial);
      cheek.scale.set(1.25, 0.72, 0.24);
      cheek.position.set(x * 1.62, 0.34, 0.58);
      penguinGroup.add(eye, highlight, cheek);
    }
    for (const x of [-0.42, 0.42]) {
      const flipper = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 12), darkMaterial);
      flipper.scale.set(0.48, 1.55, 0.34);
      flipper.position.set(x, 0.22, 0.04);
      flipper.rotation.z = x < 0 ? 1.05 : -1.05;
      flipper.rotation.x = x < 0 ? -0.18 : 0.18;
      penguinGroup.add(flipper);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.105, 18, 10), orangeMaterial);
      foot.scale.set(1.65, 0.48, 0.9);
      foot.position.set(x * 0.42, -0.43, 0.45);
      foot.rotation.z = x < 0 ? 0.16 : -0.16;
      penguinGroup.add(foot);
    }
    const sled = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.06, 0.64), new THREE.MeshStandardMaterial({ color: 0xe9fbff, roughness: 0.28, metalness: 0.05 }));
    sled.position.set(0, -0.5, 0.05);
    penguinGroup.add(sled);
    scene.add(penguinGroup);

    const eggMaterialFor = (type) => {
      if (type === "rainbow") return rainbowMaterial;
      if (type === "gold") return goldMaterial;
      return whiteMaterial;
    };
    const eggGroups = cinematic.eggs.map((type, index) => {
      const group = new THREE.Group();
      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 20), eggMaterialFor(type));
      egg.scale.set(0.78, 1.16, 0.78);
      group.add(egg);
      const glow = new THREE.PointLight(type === "rainbow" ? 0xff9ddb : type === "gold" ? 0xffd34e : 0xcff8ff, type === "white" ? 0.8 : 1.35, 2.4);
      glow.position.set(0, 0.15, 0);
      group.add(glow);
      group.userData.delay = 1.0 + index * (cinematic.count > 1 ? 0.13 : 0.02);
      group.visible = false;
      scene.add(group);
      return group;
    });

    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 130;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = Math.random() * 6 - 1.4;
      positions[i * 3 + 2] = Math.random() * 9 - 5.8;
    }
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.75 }),
    );
    scene.add(particles);

    const sparkleGeometry = new THREE.BufferGeometry();
    const sparkleCount = cinematic.gotSsr ? 36 : 20;
    const sparklePositions = new Float32Array(sparkleCount * 3);
    for (let i = 0; i < sparkleCount; i += 1) {
      sparklePositions[i * 3] = (Math.random() - 0.5) * 4.6;
      sparklePositions[i * 3 + 1] = Math.random() * 3.4 - 0.4;
      sparklePositions[i * 3 + 2] = Math.random() * 5.5 - 4.6;
    }
    sparkleGeometry.setAttribute("position", new THREE.BufferAttribute(sparklePositions, 3));
    scene.add(new THREE.Points(sparkleGeometry, new THREE.PointsMaterial({ color: cinematic.gotSsr ? 0xffe272 : 0xffffff, size: 0.09, transparent: true, opacity: 0.95 })));

    const ease = (value) => 1 - Math.pow(1 - Math.min(1, Math.max(0, value)), 3);
    const clock = new THREE.Clock();
    let frameId = 0;

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const slideT = ease(elapsed / 1.55);
      const point = slidePath.getPoint(Math.min(0.92, slideT * 0.92));
      const tangent = slidePath.getTangent(Math.min(0.95, slideT * 0.92));
      penguinGroup.position.copy(point).add(new THREE.Vector3(0, 0.38, 0.12));
      penguinGroup.rotation.y = Math.sin(elapsed * 5) * 0.1;
      penguinGroup.rotation.x = -0.18 + tangent.y * 0.55;
      penguinGroup.rotation.z = Math.sin(elapsed * 8) * 0.08;
      penguinGroup.scale.setScalar(0.78 + slideT * 0.24);
      if (elapsed > 1.85) penguinGroup.visible = false;

      eggGroups.forEach((group, index) => {
        const localT = ease((elapsed - group.userData.delay) / 1.05);
        group.visible = localT > 0 && localT < 1;
        if (!group.visible) return;
        const eggPoint = slidePath.getPoint(Math.min(1, localT));
        const spread = cinematic.count > 1 ? ((index % 5) - 2) * 0.16 : 0;
        group.position.copy(eggPoint).add(new THREE.Vector3(spread, 0.45 + localT * 0.1, 0.08));
        group.rotation.x += 0.08;
        group.rotation.y += 0.12;
        group.scale.setScalar(0.72 + localT * 0.55);
      });

      slideGroup.rotation.z = Math.sin(elapsed * 1.7) * 0.006;
      arch.rotation.y = Math.sin(elapsed * 0.9) * 0.025;
      gateLight.intensity = (cinematic.gotSsr ? 6.8 : 4.4) + Math.sin(elapsed * 8) * 0.9;
      particles.position.y = -((elapsed * 0.42) % 1);
      camera.position.x = Math.sin(elapsed * 0.45) * 0.12;
      camera.lookAt(0, 0.26, -1.8);

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [cinematic]);

  return (
    <div className={`gachaCinematic gachaCinematic3d ${cinematic.gotSsr ? "ssr" : ""}`} style={{ "--cinematic-duration": `${cinematic.count === 10 ? 3.8 : 2.6}s` }}>
      <div className="gacha3dCanvas" ref={mountRef} />
      <div className="gacha3dRareText" aria-hidden="true">{cinematic.gotSsr ? "レア!" : "ガチャ!"}</div>
      <div className="gacha3dText">
        <b>{cinematic.count === 10 ? "10連ガチャ" : "ガチャ開始"}</b>
        <span>{cinematic.gotSsr ? "氷のゲートが黄金に輝いた！" : "氷の滑り台から卵がすべる！"}</span>
      </div>
    </div>
  );
}

function EggStorage({ game, setHatchModal, setActive, embedded = false }) {
  const [eggSortMode, setEggSortMode] = useState("book");
  const [eggSortOpen, setEggSortOpen] = useState(false);
  const eggSortOptions = [
    ["book", "図鑑順"],
    ["newest", "入手順"],
  ];
  const selectedEggSortLabel = eggSortOptions.find(([value]) => value === eggSortMode)?.[1] || "図鑑順";
  const sortedEggs = game.eggs
    .map((egg, index) => ({ ...egg, storageIndex: index }))
    .sort((a, b) => {
      if (eggSortMode === "book") return a.speciesId - b.speciesId || a.storageIndex - b.storageIndex;
      return b.storageIndex - a.storageIndex;
    });
  const content = (
    <>
      {!embedded && <PageHeader title="卵保管庫" sub={`${game.eggs.length} / 999`} />}
      {game.eggs.length > 0 && (
        <div className="sortBar eggSortBar">
          <div className={`bubbleSort ${eggSortOpen ? "open" : ""}`}>
            <button className="bubbleSortTrigger" onClick={() => setEggSortOpen((open) => !open)} type="button">
              <b>{selectedEggSortLabel}</b>
              <i />
            </button>
            {eggSortOpen && (
              <div className="bubbleSortMenu">
                {eggSortOptions.map(([value, label]) => (
                  <button
                    className={eggSortMode === value ? "active" : ""}
                    key={value}
                    onClick={() => {
                      setEggSortMode(value);
                      setEggSortOpen(false);
                    }}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="eggStorageGrid">
        {sortedEggs.map((egg) => (
          <Panel className="storedEgg" key={egg.id}>
            <Egg type={egg.type} small />
            <span className={`eggRank ${egg.type}`}>{egg.type === "rainbow" ? "SSR" : egg.type === "gold" ? "SR" : "N"}</span>
            <b>{species[clampSpecies(egg.speciesId)]}</b>
            <button onClick={() => setHatchModal(egg)}>孵化</button>
          </Panel>
        ))}
      </div>
      {game.eggs.length === 0 && (
        <Panel className="storageNote">
          <p>卵はありません。ガチャでSSR卵を入手できます。</p>
          <button onClick={() => setActive("gacha")}>ガチャへ</button>
        </Panel>
      )}
    </>
  );
  if (embedded) return <div className="embeddedEggStorage">{content}</div>;
  return (
    <Screen className="eggScreen">
      {content}
    </Screen>
  );
}

function MiniGames({ game, setGame, gainExp, setMessage }) {
  const [mode, setMode] = useState("select");
  const [intro, setIntro] = useState(null);
  const chooseMode = (nextMode) => {
    if (nextMode === "select") {
      setIntro(null);
      setMode("select");
      return;
    }
    setIntro(nextMode);
    setMode("intro");
  };
  const startIntroGame = () => {
    if (intro) setMode(intro);
  };
  return (
    <Screen className="miniScreen">
      <PageHeader title="ミニゲーム" sub="3種類すべて遊べます" />
      <Segmented active={mode === "intro" ? intro : mode} options={{ select: "選択", fish: "魚キャッチ", slide: "氷スライド", memory: "記憶ゲーム" }} onChange={chooseMode} />
      {mode === "select" && (
        <>
          <div className="miniHero">
            <span>遊んで育成素材とEXPを集めよう</span>
            <div className="floes"><i /><i /><i /><i /></div>
            <PenguinFigure penguin={getPenguin(game, game.activeCareId)} size="mini" />
          </div>
          <div className="miniCards">
            <Panel className="miniCard"><h2>魚キャッチ</h2><p>泳ぐ魚を10回タップしてスコアを伸ばす。</p><button onClick={() => chooseMode("fish")}>遊ぶ</button></Panel>
            <Panel className="miniCard"><h2>氷スライド</h2><p>矢印でペンギンをゴールまで滑らせる。</p><button onClick={() => chooseMode("slide")}>遊ぶ</button></Panel>
            <Panel className="miniCard"><h2>記憶ゲーム</h2><p>光った順番を覚えて同じ順に押す。</p><button onClick={() => chooseMode("memory")}>遊ぶ</button></Panel>
          </div>
        </>
      )}
      {mode === "intro" && <MiniGameIntro type={intro} onBack={() => chooseMode("select")} onStart={startIntroGame} />}
      {mode === "fish" && <FishCatchV2 setGame={setGame} gainExp={gainExp} setMessage={setMessage} />}
      {mode === "slide" && <IceSlideV2 setGame={setGame} gainExp={gainExp} setMessage={setMessage} />}
      {mode === "memory" && <MemoryGameV2 setGame={setGame} gainExp={gainExp} />}
    </Screen>
  );
}

function MiniGameIntro({ type, onBack, onStart }) {
  const data = {
    fish: { title: "魚キャッチ", text: "光った魚を追いかけよう。氷は減点、連続成功でコンボ加点。", icon: "fish" },
    slide: { title: "氷スライド", text: "岩と穴を避けて、1マスずつ湖底のゴールへ進もう。", icon: "slide" },
    memory: { title: "記憶ゲーム", text: "色の順番を覚えて、カウント後に同じ順番で押そう。", icon: "memory" },
  }[type] || { title: "ミニゲーム", text: "準備してから始めよう。", icon: "fish" };

  return (
    <Panel className={`miniIntro miniIntro-${data.icon}`}>
      <div className="miniIntroArt">
        <span className="introIce one" />
        <span className="introIce two" />
        <span className="introFish" />
        <span className="introGoal">GOAL</span>
        <PenguinFigure size="mini" />
      </div>
      <h2>{data.title}</h2>
      <p>{data.text}</p>
      <div className="modalActions">
        <button className="whiteButton" onClick={onBack}>選択へ戻る</button>
        <button className="yellow" onClick={onStart}>スタート</button>
      </div>
    </Panel>
  );
}

// eslint-disable-next-line no-unused-vars
function FishCatch({ setGame, gainExp, setMessage }) {
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [claimed, setClaimed] = useState(false);
  const finished = moves >= 10;
  const reward = score >= 100 ? 500 : score >= 80 ? 340 : score >= 60 ? 180 : score >= 40 ? 120 : score >= 20 ? 60 : 0;
  const fish = [10, 15, 8, 12, 20];

  const catchFish = (points) => {
    if (finished) return;
    setScore((value) => value + points);
    setMoves((value) => value + 1);
  };

  const claim = () => {
    if (!finished || claimed) return;
    setGame((current) => ({ ...current, coins: current.coins + reward }));
    gainExp(10, `魚キャッチ成功！コイン${reward}とEXPを獲得したよ。`);
    setClaimed(true);
  };

  return (
    <Panel className="fishGame">
      <div className="fishScore"><b>{score}点</b><span>{moves}/10</span></div>
      <div className="fishPond">
        {fish.map((points, index) => (
          <button className={`fishTarget fish-${index}`} key={index} onClick={() => catchFish(points)}>
            +{points}
          </button>
        ))}
      </div>
      <p>報酬: コイン +{reward}</p>
      <button className={finished ? "yellow" : "whiteButton"} disabled={!finished || claimed} onClick={claim}>
        {claimed ? "受け取り済み" : finished ? "報酬を受け取る" : "魚を10回キャッチ"}
      </button>
      <button className="whiteButton" onClick={() => { setScore(0); setMoves(0); setClaimed(false); setMessage("魚キャッチをやり直すよ。"); }}>リトライ</button>
    </Panel>
  );
}

// eslint-disable-next-line no-unused-vars
function IceSlide({ setGame, gainExp, setMessage }) {
  const start = { x: 0, y: 0 };
  const goal = { x: 3, y: 3 };
  const holes = ["1-1", "2-2"];
  const [pos, setPos] = useState(start);
  const [moves, setMoves] = useState(0);
  const [claimed, setClaimed] = useState(false);
  const won = pos.x === goal.x && pos.y === goal.y;

  const move = (dx, dy) => {
    if (won) return;
    const next = { x: clampRange(pos.x + dx, 0, 3), y: clampRange(pos.y + dy, 0, 3) };
    if (holes.includes(`${next.x}-${next.y}`)) {
      setPos(start);
      setMoves((value) => value + 1);
      setMessage("穴をよけてもう一度。スタートに戻ったよ。");
      return;
    }
    setPos(next);
    setMoves((value) => value + 1);
  };

  const claim = () => {
    if (!won || claimed) return;
    const reward = Math.max(120, 500 - moves * 25);
    setGame((current) => ({ ...current, coins: current.coins + reward, inventory: { ...current.inventory, normal: current.inventory.normal + 1 } }));
    gainExp(10, `氷スライドクリア！コイン${reward}と魚のエサを獲得したよ。`);
    setClaimed(true);
  };

  return (
    <Panel className="slideGame">
      <div className="fishScore"><b>氷スライド</b><span>{moves}手</span></div>
      <div className="slideBoard">
        {Array.from({ length: 16 }).map((_, index) => {
          const x = index % 4;
          const y = Math.floor(index / 4);
          const key = `${x}-${y}`;
          return (
            <div className={`slideCell ${holes.includes(key) ? "hole" : ""} ${goal.x === x && goal.y === y ? "goal" : ""}`} key={key}>
              {pos.x === x && pos.y === y && <PenguinFigure size="collection" />}
              {goal.x === x && goal.y === y && "GOAL"}
            </div>
          );
        })}
      </div>
      <div className="directionPad">
        <button onClick={() => move(0, -1)}>↑</button>
        <button onClick={() => move(-1, 0)}>←</button>
        <button onClick={() => move(1, 0)}>→</button>
        <button onClick={() => move(0, 1)}>↓</button>
      </div>
      <button className={won ? "yellow" : "whiteButton"} disabled={!won || claimed} onClick={claim}>{claimed ? "受け取り済み" : won ? "報酬を受け取る" : "ゴールを目指そう"}</button>
      <button className="whiteButton" onClick={() => { setPos(start); setMoves(0); setClaimed(false); }}>リトライ</button>
    </Panel>
  );
}

// eslint-disable-next-line no-unused-vars
function MemoryGame({ setGame, gainExp, setMessage }) {
  const colors = ["青", "黄", "桃", "緑"];
  const [sequence, setSequence] = useState([0, 2, 1]);
  const [input, setInput] = useState([]);
  const [round, setRound] = useState(1);
  const [claimed, setClaimed] = useState(false);
  const success = input.length === sequence.length && input.every((value, index) => value === sequence[index]);
  const failed = input.some((value, index) => value !== sequence[index]);

  const press = (index) => {
    if (success || failed) return;
    setInput((values) => [...values, index]);
  };

  const next = () => {
    const nextValue = Math.floor(Math.random() * colors.length);
    setSequence((values) => [...values, nextValue]);
    setInput([]);
    setRound((value) => value + 1);
    setClaimed(false);
  };

  const claim = () => {
    if (!success || claimed) return;
    const reward = 120 + round * 80;
    setGame((current) => ({ ...current, coins: current.coins + reward, inventory: { ...current.inventory, premium: current.inventory.premium + (round >= 3 ? 1 : 0) } }));
    gainExp(10, `記憶ゲーム成功！コイン${reward}を獲得したよ。`);
    setClaimed(true);
  };

  return (
    <Panel className="memoryGame">
      <div className="fishScore"><b>ラウンド {round}</b><span>{input.length}/{sequence.length}</span></div>
      <div className="memorySequence">
        {sequence.map((value, index) => <span className={`memoryDot dot-${value}`} key={`${value}-${index}`}>{colors[value]}</span>)}
      </div>
      <div className="memoryButtons">
        {colors.map((label, index) => <button className={`memoryButton dot-${index}`} key={label} onClick={() => press(index)}>{label}</button>)}
      </div>
      {failed && <p>順番が違ったよ。リトライしてね。</p>}
      {success && <p>成功！報酬を受け取るか、次のラウンドへ進めます。</p>}
      <button className={success ? "yellow" : "whiteButton"} disabled={!success || claimed} onClick={claim}>{claimed ? "受け取り済み" : "報酬を受け取る"}</button>
      <div className="gachaButtons">
        <button className="whiteButton" onClick={() => { setInput([]); setClaimed(false); setMessage("記憶ゲームをやり直すよ。"); }}>リトライ</button>
        <button disabled={!success} onClick={next}>次のラウンド</button>
      </div>
    </Panel>
  );
}

// eslint-disable-next-line no-unused-vars
function EnhancedFishCatch({ setGame, gainExp, setMessage }) {
  const makeTarget = () => ({
    slot: Math.floor(Math.random() * 9),
    points: [8, 10, 12, 15, 20][Math.floor(Math.random() * 5)],
    danger: Math.random() < 0.26,
  });
  const [score, setScore] = useState(0);
  const [catches, setCatches] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(12);
  const [target, setTarget] = useState(makeTarget);
  const [claimed, setClaimed] = useState(false);
  const finished = timeLeft <= 0;
  const rankBonus = score >= 180 ? 260 : score >= 130 ? 180 : score >= 90 ? 100 : 40;
  const reward = Math.max(80, score * 3 + rankBonus);

  useEffect(() => {
    if (finished) return undefined;
    const timer = setTimeout(() => setTimeLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [finished, timeLeft]);

  useEffect(() => {
    if (finished || claimed) return undefined;
    const timer = setTimeout(() => setTarget(makeTarget()), target.danger ? 900 : 1250);
    return () => clearTimeout(timer);
  }, [claimed, finished, target]);

  const tapSlot = (slot) => {
    if (finished || slot !== target.slot) return;
    if (target.danger) {
      setScore((value) => Math.max(0, value - 18));
      setCombo(0);
      setMessage("氷を叩いた！魚だけを狙おう。");
    } else {
      const nextCombo = combo + 1;
      setScore((value) => value + target.points + nextCombo * 2);
      setCombo(nextCombo);
      setCatches((value) => value + 1);
    }
    setTarget(makeTarget());
  };

  const claim = () => {
    if (!finished || claimed) return;
    setGame((current) => ({ ...current, coins: current.coins + reward }));
    gainExp(12, `魚キャッチ終了！コイン${reward}とEXPを獲得したよ。`);
    setClaimed(true);
  };

  return (
    <Panel className="fishGame">
      <div className="fishScore"><b>{score}点</b><span>残り{timeLeft}秒 / {catches}匹</span></div>
      <p>ルール: 光った魚だけを素早くタップ。氷を叩くと減点、連続成功でコンボ加点。</p>
      <div className="fishPond arcadePond">
        {Array.from({ length: 9 }).map((_, slot) => (
          <button
            className={`fishSlot ${slot === target.slot ? (target.danger ? "danger" : "active") : ""}`}
            key={slot}
            onClick={() => tapSlot(slot)}
          >
            {slot === target.slot ? (target.danger ? "ICE" : `+${target.points}`) : ""}
          </button>
        ))}
      </div>
      <div className="miniRuleLine"><span>コンボ {combo}</span><span>報酬 コイン+{reward}</span></div>
      <button className={finished ? "yellow" : "whiteButton"} disabled={!finished || claimed} onClick={claim}>
        {claimed ? "受け取り済み" : finished ? "報酬を受け取る" : "制限時間内に魚を追おう"}
      </button>
    </Panel>
  );
}

// eslint-disable-next-line no-unused-vars
function EnhancedIceSlide({ setGame, gainExp, setMessage }) {
  const courses = [
    { start: { x: 0, y: 0 }, goal: { x: 4, y: 4 }, rocks: ["2-0", "2-1", "1-3", "3-3"], holes: ["0-3", "4-1"], par: 8 },
    { start: { x: 4, y: 0 }, goal: { x: 0, y: 4 }, rocks: ["1-0", "3-1", "1-2", "3-3", "2-4"], holes: ["2-1", "4-3"], par: 9 },
    { start: { x: 0, y: 4 }, goal: { x: 4, y: 0 }, rocks: ["1-1", "2-1", "3-2", "1-3", "3-4"], holes: ["0-2", "2-3"], par: 10 },
  ];
  const [courseIndex, setCourseIndex] = useState(0);
  const course = courses[courseIndex % courses.length];
  const [pos, setPos] = useState(course.start);
  const [moves, setMoves] = useState(0);
  const [claimed, setClaimed] = useState(false);
  const won = pos.x === course.goal.x && pos.y === course.goal.y;

  const loadCourse = (nextIndex) => {
    const nextCourse = courses[nextIndex % courses.length];
    setCourseIndex(nextIndex);
    setPos(nextCourse.start);
    setMoves(0);
    setClaimed(false);
  };

  const move = (dx, dy) => {
    if (won) return;
    let next = { ...pos };
    let slipped = false;
    while (true) {
      const candidate = { x: next.x + dx, y: next.y + dy };
      const key = `${candidate.x}-${candidate.y}`;
      if (candidate.x < 0 || candidate.x > 4 || candidate.y < 0 || candidate.y > 4 || course.rocks.includes(key)) break;
      next = candidate;
      slipped = true;
      if (course.holes.includes(key)) {
        setPos(course.start);
        setMoves((value) => value + 1);
        setMessage("割れた氷に落ちた！スタート地点へ戻ったよ。");
        return;
      }
      if (candidate.x === course.goal.x && candidate.y === course.goal.y) break;
    }
    if (!slipped) return;
    setPos(next);
    setMoves((value) => value + 1);
  };

  const claim = () => {
    if (!won || claimed) return;
    const reward = Math.max(160, 620 - Math.max(0, moves - course.par) * 45);
    setGame((current) => ({ ...current, coins: current.coins + reward, inventory: { ...current.inventory, normal: current.inventory.normal + 1 } }));
    gainExp(12, `氷スライドクリア！コイン${reward}と魚のエサを獲得したよ。`);
    setClaimed(true);
  };

  return (
    <Panel className="slideGame">
      <div className="fishScore"><b>氷スライド コース{courseIndex + 1}</b><span>{moves}手 / 目標{course.par}手</span></div>
      <p>ルール: 一度滑ると岩か端まで止まれません。穴を避けてゴールへ。</p>
      <div className="slideBoard hardBoard">
        {Array.from({ length: 25 }).map((_, index) => {
          const x = index % 5;
          const y = Math.floor(index / 5);
          const key = `${x}-${y}`;
          return (
            <div className={`slideCell ${course.rocks.includes(key) ? "rock" : ""} ${course.holes.includes(key) ? "hole" : ""} ${course.goal.x === x && course.goal.y === y ? "goal" : ""}`} key={key}>
              {pos.x === x && pos.y === y && <PenguinFigure size="collection" />}
              {course.goal.x === x && course.goal.y === y && "GOAL"}
            </div>
          );
        })}
      </div>
      <div className="directionPad">
        <button onClick={() => move(0, -1)}>↑</button>
        <button onClick={() => move(-1, 0)}>←</button>
        <button onClick={() => move(1, 0)}>→</button>
        <button onClick={() => move(0, 1)}>↓</button>
      </div>
      <button className={won ? "yellow" : "whiteButton"} disabled={!won || claimed} onClick={claim}>{claimed ? "受け取り済み" : won ? "報酬を受け取る" : "ルートを読んで滑ろう"}</button>
      <button disabled={!claimed} onClick={() => loadCourse(courseIndex + 1)}>次の挑戦</button>
    </Panel>
  );
}

// eslint-disable-next-line no-unused-vars
function EnhancedMemoryGame({ setGame, gainExp }) {
  const colors = ["青", "桃", "黄", "緑"];
  const makeSequence = (length) => Array.from({ length }, () => Math.floor(Math.random() * colors.length));
  const [round, setRound] = useState(1);
  const [sequence, setSequence] = useState(() => makeSequence(4));
  const [input, setInput] = useState([]);
  const [phase, setPhase] = useState("preview");
  const [timeLeft, setTimeLeft] = useState(6);
  const [claimed, setClaimed] = useState(false);
  const success = input.length === sequence.length && input.every((value, index) => value === sequence[index]);
  const failed = timeLeft <= 0 || input.some((value, index) => value !== sequence[index]);

  useEffect(() => {
    const preview = setTimeout(() => setPhase("input"), Math.max(1200, 2600 - round * 180));
    return () => clearTimeout(preview);
  }, [round, sequence]);

  useEffect(() => {
    if (phase !== "input" || success || failed) return undefined;
    const timer = setTimeout(() => setTimeLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [failed, phase, success, timeLeft]);

  const press = (index) => {
    if (phase !== "input" || success || failed) return;
    setInput((values) => [...values, index]);
  };

  const next = () => {
    const nextRound = failed ? 1 : round + 1;
    setRound(nextRound);
    setSequence(makeSequence(Math.min(8, 3 + nextRound)));
    setInput([]);
    setPhase("preview");
    setTimeLeft(6);
    setClaimed(false);
  };

  const claim = () => {
    if (!success || claimed) return;
    const reward = 160 + round * 100 + timeLeft * 20;
    setGame((current) => ({ ...current, coins: current.coins + reward, inventory: { ...current.inventory, premium: current.inventory.premium + (round >= 3 ? 1 : 0) } }));
    gainExp(12, `記憶ゲーム成功！コイン${reward}を獲得したよ。`);
    setClaimed(true);
  };

  return (
    <Panel className="memoryGame">
      <div className="fishScore"><b>ラウンド {round}</b><span>{phase === "preview" ? "覚える時間" : `残り${timeLeft}秒`}</span></div>
      <p>ルール: 最初に光る順番を覚えて、表示が消えたら制限時間内に同じ順番で押す。</p>
      <div className="memorySequence">
        {sequence.map((value, index) => <span className={`memoryDot dot-${value} ${phase !== "preview" ? "hiddenDot" : ""}`} key={`${value}-${index}`}>{phase === "preview" ? colors[value] : "?"}</span>)}
      </div>
      <div className="memoryButtons">
        {colors.map((label, index) => <button className={`memoryButton dot-${index}`} key={label} onClick={() => press(index)}>{label}</button>)}
      </div>
      <div className="miniRuleLine"><span>入力 {input.length}/{sequence.length}</span><span>{failed ? "失敗" : success ? "成功" : "挑戦中"}</span></div>
      {success && <button className="yellow" disabled={claimed} onClick={claim}>{claimed ? "受け取り済み" : "報酬を受け取る"}</button>}
      <button disabled={phase === "preview" || (!success && !failed)} onClick={next}>{failed ? "新しい挑戦" : "次のラウンド"}</button>
    </Panel>
  );
}

function FishCatchV2({ setGame, gainExp, setMessage }) {
  const makeTarget = () => ({
    slot: Math.floor(Math.random() * 9),
    points: [8, 10, 12, 15, 20][Math.floor(Math.random() * 5)],
    danger: Math.random() < 0.25,
  });
  const [score, setScore] = useState(0);
  const [catches, setCatches] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(12);
  const [target, setTarget] = useState(makeTarget);
  const [claimed, setClaimed] = useState(false);
  const finished = timeLeft <= 0;
  const reward = Math.max(80, score * 3 + (score >= 150 ? 240 : score >= 100 ? 150 : 60));

  useEffect(() => {
    if (finished) return undefined;
    const timer = setTimeout(() => setTimeLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [finished, timeLeft]);

  useEffect(() => {
    if (finished || claimed) return undefined;
    const timer = setTimeout(() => setTarget(makeTarget()), target.danger ? 900 : 1250);
    return () => clearTimeout(timer);
  }, [claimed, finished, target]);

  const startNextRun = () => {
    setScore(0);
    setCatches(0);
    setCombo(0);
    setTimeLeft(12);
    setTarget(makeTarget());
    setClaimed(false);
  };

  const tapSlot = (slot) => {
    if (finished || slot !== target.slot) return;
    if (target.danger) {
      setScore((value) => Math.max(0, value - 18));
      setCombo(0);
      setMessage("氷を叩いた！魚だけを狙おう。");
    } else {
      const nextCombo = combo + 1;
      setScore((value) => value + target.points + nextCombo * 2);
      setCombo(nextCombo);
      setCatches((value) => value + 1);
    }
    setTarget(makeTarget());
  };

  const claim = () => {
    if (!finished || claimed) return;
    setGame((current) => ({ ...current, coins: current.coins + reward }));
    gainExp(12, `魚キャッチ終了！コイン${reward}とEXPを獲得したよ。`);
    setClaimed(true);
  };

  return (
    <Panel className="fishGame">
      <div className="fishScore"><b>{score}点</b><span>残り{timeLeft}秒 / {catches}匹</span></div>
      <p>ルール: 光った魚だけを素早くタップ。氷を叩くと減点、連続成功でコンボ加点。</p>
      <div className="fishPond arcadePond">
        {Array.from({ length: 9 }).map((_, slot) => (
          <button
            className={`fishSlot ${slot === target.slot ? (target.danger ? "danger" : "active") : ""}`}
            key={slot}
            onClick={() => tapSlot(slot)}
          >
            {slot === target.slot ? (target.danger ? "ICE" : `+${target.points}`) : ""}
          </button>
        ))}
      </div>
      <div className="miniRuleLine"><span>コンボ {combo}</span><span>報酬 コイン+{reward}</span></div>
      {!claimed && (
        <button className={finished ? "yellow" : "whiteButton"} disabled={!finished} onClick={claim}>
          {finished ? "報酬を受け取る" : "制限時間内に魚を追おう"}
        </button>
      )}
      {claimed && <button onClick={startNextRun}>次の挑戦</button>}
    </Panel>
  );
}

function IceSlideV2({ setGame, gainExp, setMessage }) {
  const courses = [
    { start: { x: 0, y: 0 }, goal: { x: 4, y: 4 }, rocks: ["1-2", "2-2", "3-2", "1-4", "3-3"], holes: ["0-3", "2-1", "3-4"], par: 8 },
    { start: { x: 4, y: 0 }, goal: { x: 0, y: 4 }, rocks: ["3-0", "1-1", "3-2", "2-3", "4-3"], holes: ["0-1", "1-4", "3-4"], par: 9 },
    { start: { x: 0, y: 4 }, goal: { x: 4, y: 0 }, rocks: ["1-3", "0-2", "2-2", "3-1", "1-1"], holes: ["0-3", "3-4", "4-3"], par: 8 },
    { start: { x: 2, y: 4 }, goal: { x: 4, y: 0 }, rocks: ["0-3", "3-0", "2-3", "0-0", "0-4"], holes: ["4-4", "3-4", "2-0"], par: 8 },
    { start: { x: 4, y: 4 }, goal: { x: 0, y: 0 }, rocks: ["2-2", "4-0", "3-0", "3-3", "2-3"], holes: ["3-4", "2-0", "4-1"], par: 8 },
    { start: { x: 0, y: 2 }, goal: { x: 4, y: 2 }, rocks: ["2-2", "3-3", "1-4", "1-2", "2-1"], holes: ["4-4", "3-4", "0-4"], par: 8 },
    { start: { x: 3, y: 4 }, goal: { x: 0, y: 1 }, rocks: ["1-0", "0-2", "2-2", "2-3", "0-0"], holes: ["3-1", "2-4", "3-2"], par: 10 },
    { start: { x: 1, y: 4 }, goal: { x: 3, y: 0 }, rocks: ["4-4", "4-3", "3-1", "1-3", "3-4"], holes: ["0-4", "4-2", "2-1"], par: 8 },
    { start: { x: 0, y: 0 }, goal: { x: 2, y: 4 }, rocks: ["4-2", "4-1", "0-2", "2-1", "0-4"], holes: ["1-2", "4-4", "0-1"], par: 8 },
    { start: { x: 4, y: 1 }, goal: { x: 0, y: 3 }, rocks: ["3-2", "1-2", "3-4", "4-2", "0-0"], holes: ["2-1", "4-4", "2-3"], par: 8 },
  ];
  const [courseIndex, setCourseIndex] = useState(0);
  const course = courses[courseIndex % courses.length];
  const [pos, setPos] = useState(course.start);
  const [moves, setMoves] = useState(0);
  const [claimed, setClaimed] = useState(false);
  const won = pos.x === course.goal.x && pos.y === course.goal.y;

  const loadCourse = (nextIndex) => {
    const nextCourse = courses[nextIndex % courses.length];
    setCourseIndex(nextIndex);
    setPos(nextCourse.start);
    setMoves(0);
    setClaimed(false);
  };

  const move = (dx, dy) => {
    if (won) return;
    const next = { x: pos.x + dx, y: pos.y + dy };
    const key = `${next.x}-${next.y}`;
    if (next.x < 0 || next.x > 4 || next.y < 0 || next.y > 4 || course.rocks.includes(key)) {
      setMessage("岩か湖底の端で進めないよ。別ルートを試そう。");
      return;
    }
    setMoves((value) => value + 1);
    if (course.holes.includes(key)) {
      setPos(course.start);
      setMessage("割れた氷に落ちた！スタート地点へ戻ったよ。");
      return;
    }
    setPos(next);
  };

  const claim = () => {
    if (!won || claimed) return;
    const reward = Math.max(160, 620 - Math.max(0, moves - course.par) * 35);
    setGame((current) => ({ ...current, coins: current.coins + reward, inventory: { ...current.inventory, normal: current.inventory.normal + 1 } }));
    gainExp(12, `氷スライドクリア！コイン${reward}と魚のエサを獲得したよ。`);
    setClaimed(true);
  };

  return (
    <Panel className="slideGame">
      <div className="fishScore"><b>氷スライド コース{courseIndex + 1}</b><span>{moves}手 / 目標{course.par}手</span></div>
      <p>ルール: 1回押すと1マス移動。岩と穴を避けて、湖底のゴールへ。</p>
      <div className="slideBoard hardBoard">
        {Array.from({ length: 25 }).map((_, index) => {
          const x = index % 5;
          const y = Math.floor(index / 5);
          const key = `${x}-${y}`;
          return (
            <div className={`slideCell ${course.rocks.includes(key) ? "rock" : ""} ${course.holes.includes(key) ? "hole" : ""} ${course.goal.x === x && course.goal.y === y ? "goal" : ""}`} key={key}>
              {pos.x === x && pos.y === y && <PenguinFigure size="collection" />}
              {course.goal.x === x && course.goal.y === y && "GOAL"}
            </div>
          );
        })}
      </div>
      <div className="directionPad">
        <button onClick={() => move(0, -1)}>↑</button>
        <button onClick={() => move(-1, 0)}>←</button>
        <button onClick={() => move(1, 0)}>→</button>
        <button onClick={() => move(0, 1)}>↓</button>
      </div>
      <button className={won ? "yellow" : "whiteButton"} disabled={!won || claimed} onClick={claim}>{claimed ? "受け取り済み" : won ? "報酬を受け取る" : "1マスずつ進もう"}</button>
      <button disabled={!claimed} onClick={() => loadCourse(courseIndex + 1)}>次のコース</button>
    </Panel>
  );
}

function MemoryGameV2({ setGame, gainExp }) {
  const colors = ["青", "黄", "桃", "緑"];
  const makeSequence = (length) => Array.from({ length }, () => Math.floor(Math.random() * colors.length));
  const [round, setRound] = useState(1);
  const [sequence, setSequence] = useState(() => makeSequence(4));
  const [input, setInput] = useState([]);
  const [phase, setPhase] = useState("preview");
  const [countdown, setCountdown] = useState(4);
  const [timeLeft, setTimeLeft] = useState(6);
  const [claimed, setClaimed] = useState(false);
  const success = input.length === sequence.length && input.every((value, index) => value === sequence[index]);
  const failed = timeLeft <= 0 || input.some((value, index) => value !== sequence[index]);

  useEffect(() => {
    if (phase !== "preview") return undefined;
    const timer = setTimeout(() => {
      if (countdown <= 1) setPhase("input");
      else setCountdown((value) => value - 1);
    }, 1100);
    return () => clearTimeout(timer);
  }, [countdown, phase]);

  useEffect(() => {
    if (phase !== "input" || success || failed) return undefined;
    const timer = setTimeout(() => setTimeLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [failed, phase, success, timeLeft]);

  const press = (index) => {
    if (phase !== "input" || success || failed) return;
    setInput((values) => [...values, index]);
  };

  const next = () => {
    const nextRound = failed ? 1 : round + 1;
    setRound(nextRound);
    setSequence(makeSequence(Math.min(8, 3 + nextRound)));
    setInput([]);
    setPhase("preview");
    setCountdown(4);
    setTimeLeft(6);
    setClaimed(false);
  };

  const claim = () => {
    if (!success || claimed) return;
    const reward = 160 + round * 100 + timeLeft * 20;
    setGame((current) => ({ ...current, coins: current.coins + reward, inventory: { ...current.inventory, premium: current.inventory.premium + (round >= 3 ? 1 : 0) } }));
    gainExp(12, `記憶ゲーム成功！コイン${reward}を獲得したよ。`);
    setClaimed(true);
  };

  return (
    <Panel className="memoryGame">
      <div className="fishScore"><b>ラウンド {round}</b><span>{phase === "preview" ? "覚える時間" : `残り${timeLeft}秒`}</span></div>
      <p>ルール: 最初に光る順番を覚えて、表示が消えたら制限時間内に同じ順番で押す。</p>
      <div className="memorySequence">
        {sequence.map((value, index) => <span className={`memoryDot dot-${value} ${phase !== "preview" ? "hiddenDot" : ""}`} key={`${value}-${index}`}>{phase === "preview" ? colors[value] : "?"}</span>)}
      </div>
      <div className="memoryCountdown">{phase === "preview" ? `覚えてください ${countdown}` : "スタート！"}</div>
      <div className="memoryButtons">
        {colors.map((label, index) => <button className={`memoryButton dot-${index}`} key={label} onClick={() => press(index)}>{label}</button>)}
      </div>
      <div className="memoryInputTrail">
        {input.length === 0 ? <span>まだ入力していません</span> : input.map((value, index) => <b className={`dot-${value}`} key={`${value}-${index}`}>{colors[value]}</b>)}
      </div>
      {(success || failed) && <div className={`memoryResult ${success ? "success" : "failed"}`}>{success ? "成功！" : "失敗..."}</div>}
      <div className="miniRuleLine"><span>入力 {input.length}/{sequence.length}</span><span>{failed ? "失敗" : success ? "成功" : "挑戦中"}</span></div>
      {success && <button className="yellow" disabled={claimed} onClick={claim}>{claimed ? "受け取り済み" : "報酬を受け取る"}</button>}
      <button disabled={phase === "preview" || (!success && !failed) || (success && !claimed)} onClick={next}>{failed ? "新しい挑戦" : "次の挑戦"}</button>
    </Panel>
  );
}

function Book({ game }) {
  const [mode, setMode] = useState("penguin");
  return (
    <Screen className="bookScreen">
      <Segmented active={mode} options={{ penguin: "ペンギン図鑑", souvenir: "おみやげ図鑑", collection: "コレクション", photo: "写真" }} onChange={setMode} />
      {mode === "penguin" && (
        <>
          <PageHeader title="ペンギン図鑑" sub={`${game.discoveredSpecies.length} / 18 種類`} />
          <div className="bookGrid">
            {species.map((name, index) => {
              const found = game.discoveredSpecies.includes(index);
              return (
                <article className={`bookCard ${found ? "" : "locked secret"}`} key={name}>
                  {found ? (
                    <img src={penguin} alt="" />
                  ) : (
                    <div className="secretPenguin" aria-hidden="true">
                      <span className="secretMark markA">?</span>
                      <span className="secretMark markB">?</span>
                      <img src={penguin} alt="" />
                    </div>
                  )}
                  <b>{found ? name : "？？？"}</b>
                  <span>{found ? "発見済み" : "未発見"}</span>
                </article>
              );
            })}
          </div>
        </>
      )}
      {mode === "souvenir" && <CollectionPanel title="おみやげ図鑑" value={`${game.souvenirs} / 150`} text="おでかけでおみやげを集めよう。" />}
      {mode === "collection" && (
        <div className="collectionList">
          <CollectionPanel title="衣装" value={`${game.ownedOutfits.length} / ${outfits.length}`} text="ショップで購入して着替えに使えます。" />
          <CollectionPanel title="家具" value={`${game.ownedFurniture.length} / ${furniture.length}`} text="模様替えで育成部屋に配置できます。" />
          <CollectionPanel title="背景" value={`${game.ownedBackgrounds.length} / ${backgrounds.length}`} text="ホームと写真の背景として使えます。" />
        </div>
      )}
      {mode === "photo" && (
        <div className="collectionList">
          {game.photos.length === 0 && <CollectionPanel title="写真アルバム" value="0 / 30" text="育成画面で写真を撮ると保存されます。" />}
          {game.photos.map((photo) => <CollectionPanel key={photo.id} title={photo.penguinName} value={photo.date} text={`${photo.speciesName} / ${photo.outfit} / ${photo.background}`} />)}
        </div>
      )}
    </Screen>
  );
}

// eslint-disable-next-line no-unused-vars
function Outing({ setGame, gainExp, setMessage }) {
  const goOut = (plan) => {
    setGame((current) => ({
      ...current,
      coins: current.coins + plan.coins,
      diamonds: current.diamonds + plan.diamonds,
      souvenirs: current.souvenirs + 1,
    }));
    gainExp(10, `${plan.name}から帰ってきたよ。`);
    setMessage(`おみやげ、コイン${plan.coins}、ダイヤ${plan.diamonds}を受け取ったよ。`);
  };

  return (
    <Screen className="outingScreen">
      <PageHeader title="おでかけ" sub="既存報酬量を維持" />
      <div className="outingHero">
        <PenguinFigure size="outing" />
      </div>
      <div className="outingCards">
        {outingPlans.map((plan) => (
          <Panel className="outingCard" key={plan.id}>
            <div>
              <h2>{plan.name}</h2>
              <p>{plan.time} / コイン{plan.coins} / ダイヤ{plan.diamonds} / EXP / おみやげ</p>
            </div>
            <button onClick={() => goOut(plan)}>出発</button>
          </Panel>
        ))}
      </div>
    </Screen>
  );
}

function OutingV2({ game, setActive, setGame, gainExp, setMessage }) {
  // eslint-disable-next-line react-hooks/purity
  const [now, setNow] = useState(Date.now());
  const activeOuting = game.activeOuting;
  const activePlan = activeOuting ? outingPlanWithDuration(outingPlans.find((plan) => plan.id === activeOuting.planId) || outingPlans[0]) : null;
  const remainingMs = activeOuting ? Math.max(0, activeOuting.endAt - now) : 0;
  const completed = Boolean(activeOuting && remainingMs <= 0);

  useEffect(() => {
    if (!activeOuting || completed) return undefined;
    const timer = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(timer);
  }, [activeOuting, completed, now]);

  const startOuting = (rawPlan) => {
    if (activeOuting) {
      setMessage("すでにおでかけ中です。帰ってくるまで待とう。");
      return;
    }
    const plan = outingPlanWithDuration(rawPlan);
    // eslint-disable-next-line react-hooks/purity
    const startedAt = Date.now();
    setGame((current) => ({ ...current, activeOuting: { planId: plan.id, startedAt, endAt: startedAt + plan.durationMs } }));
    setMessage(`${plan.name}へ出発したよ。${plan.time}後に帰ってきます。`);
    setNow(startedAt);
  };

  const claimOuting = () => {
    if (!activePlan || !completed) return;
    setGame((current) => ({
      ...current,
      activeOuting: null,
      coins: current.coins + activePlan.coins,
      diamonds: current.diamonds + activePlan.diamonds,
      souvenirs: current.souvenirs + 1,
    }));
    gainExp(10, `${activePlan.name}から帰ってきたよ。`);
    setMessage(`おみやげ、コイン${activePlan.coins}、ダイヤ${activePlan.diamonds}を受け取ったよ。`);
  };

  return (
    <Screen className="outingScreen">
      <PageHeader title="おでかけ" sub={activeOuting ? "帰還待ち" : "既存報酬量を維持"} />
      <button className="profileCloseButton" onClick={() => setActive("home")} aria-label="Close">×</button>
      <div className="outingHero">
        <PenguinFigure size="outing" />
        {activeOuting && (
          <Panel className="outingProgress">
            <b>{activePlan.name}</b>
            <span>{completed ? "帰ってきました" : `残り ${formatDuration(remainingMs)}`}</span>
            <button className={completed ? "yellow" : "whiteButton"} disabled={!completed} onClick={claimOuting}>
              {completed ? "報酬を受け取る" : "おでかけ中"}
            </button>
          </Panel>
        )}
      </div>
      <div className="outingCards">
        {outingPlans.map((rawPlan) => {
          const plan = outingPlanWithDuration(rawPlan);
          return (
            <Panel className="outingCard" key={plan.id}>
              <div>
                <h2>{plan.name}</h2>
                <p>{plan.time} / コイン{plan.coins} / ダイヤ{plan.diamonds} / EXP / おみやげ</p>
              </div>
              <button disabled={Boolean(activeOuting)} onClick={() => startOuting(plan)}>出発</button>
            </Panel>
          );
        })}
      </div>
    </Screen>
  );
}

function Shop({ game, setGame, setMessage }) {
  const [tab, setTab] = useState("feed");
  const capacity = BASE_CAPACITY + game.capacityBonus;

  const buyFeed = (key) => {
    const item = feedItems[key];
    if (!spendCoins(game, setGame, item.price, setMessage)) return;
    setGame((current) => ({ ...current, inventory: { ...current.inventory, [key]: current.inventory[key] + 1 } }));
    setMessage(`${item.name}を購入したよ。`);
  };

  const buyCollection = (kind, item) => {
    const field = kind === "outfit" ? "ownedOutfits" : kind === "furniture" ? "ownedFurniture" : "ownedBackgrounds";
    if (game[field].includes(item.name)) {
      setMessage("すでに持っています。");
      return;
    }
    if (!spendCoins(game, setGame, item.price, setMessage)) return;
    setGame((current) => ({ ...current, [field]: unique([...current[field], item.name]) }));
    setMessage(`${item.name}を購入したよ。`);
  };

  const buyExpand = () => {
    if (!spendCoins(game, setGame, 5000, setMessage)) return;
    setGame((current) => ({ ...current, capacityBonus: current.capacityBonus + 10 }));
    setMessage("飼育施設を+10枠拡張したよ。");
  };

  return (
    <Screen className="shopScreen">
      <PageHeader title="ショップ" sub="エサ・衣装・家具・背景・拡張" />
      <Segmented active={tab} options={{ feed: "エサ", outfit: "衣装", furniture: "家具", background: "背景", expand: "拡張" }} onChange={setTab} />
      <Panel className="recommendPanel">
        <div>
          <span>所持コイン {game.coins.toLocaleString()}</span>
          <h2>育成に使うものを購入</h2>
          <p>買ったエサは育成画面で使えます。衣装と家具は編集画面で反映できます。</p>
        </div>
        <PenguinFigure size="shop" />
      </Panel>
      <div className="shopItems">
        {tab === "feed" && Object.entries(feedItems).map(([key, item]) => (
          <Panel className="shopItem" key={key}>
            <div className="itemGem">F</div>
            <div><b>{item.name}</b><p>満腹度 +{item.hunger} / 所持 {game.inventory[key]}</p></div>
            <strong>{item.price.toLocaleString()}<small>コイン</small></strong>
            <button onClick={() => buyFeed(key)}>購入</button>
          </Panel>
        ))}
        {tab === "outfit" && outfits.slice(1).map((item) => (
          <ShopCollectionItem key={item.id} item={item} owned={game.ownedOutfits.includes(item.name)} onBuy={() => buyCollection("outfit", item)} />
        ))}
        {tab === "furniture" && furniture.filter((item) => item.price !== null).map((item) => (
          <ShopCollectionItem key={item.id} item={item} owned={game.ownedFurniture.includes(item.name)} onBuy={() => buyCollection("furniture", item)} />
        ))}
        {tab === "background" && backgrounds.map((item) => (
          <ShopCollectionItem key={item.id} item={item} owned={game.ownedBackgrounds.includes(item.name)} onBuy={() => buyCollection("background", item)} />
        ))}
        {tab === "expand" && (
          <Panel className="shopItem">
            <div className="itemGem">+</div>
            <div><b>飼育施設拡張 +10枠</b><p>現在 {game.penguins.length} / {capacity}</p></div>
            <strong>5,000<small>コイン</small></strong>
            <button onClick={buyExpand}>購入</button>
          </Panel>
        )}
      </div>
    </Screen>
  );
}

function ShopCollectionItem({ item, owned, onBuy }) {
  return (
    <Panel className="shopItem">
      <div className="itemGem">C</div>
      <div><b>{item.name}</b><p>{owned ? "所持済み" : "購入すると編集で使えます"}</p></div>
      <strong>{item.price.toLocaleString()}<small>コイン</small></strong>
      <button className={owned ? "whiteButton" : ""} disabled={owned} onClick={onBuy}>{owned ? "所持中" : "購入"}</button>
    </Panel>
  );
}

function Profile({ game, profilePenguin, setActive }) {
  const capacity = BASE_CAPACITY + game.capacityBonus;
  const rows = [
    ["称号", game.activeTitle || game.ownedTitles[0] || "氷海の飼育員"],
    ["飼育員Lv", game.keeperLevel],
    ["ログイン日数", `${game.loginDays}日`],
    ["Lv100達成数", game.penguins.filter((p) => p.level >= 100).length],
    ["所有ペンギン数", `${game.penguins.length} / ${capacity}`],
    ["図鑑達成率", `${Math.round((game.discoveredSpecies.length / 18) * 100)}%`],
    ["おみやげ", `${game.souvenirs} / 150`],
  ];
  return (
    <Screen className="profileScreen">
      <PageHeader title="プロフィール" sub={game.playerName || "ぺんとも"} />
      <button className="profileCloseButton" onClick={() => setActive("home")} aria-label="Close">×</button>
      <Panel className="profileTop">
        <PenguinFigure penguin={profilePenguin} size="profile" />
        <div><h1>{profilePenguin.name}</h1><p>{profilePenguin.speciesName} / Lv.{profilePenguin.level} / 愛情Lv.{profilePenguin.loveLevel}</p></div>
      </Panel>
      <div className="profileRows">
        {rows.map(([label, value]) => <Panel className="profileRow" key={label}><span>{label}</span><b>{value}</b></Panel>)}
      </div>
    </Screen>
  );
}

function Achievements({ game, setGame, setMessage, setActive }) {
  const [tab, setTab] = useState("daily");
  const claimAll = () => {
    setGame((current) => ({ ...current, diamonds: current.diamonds + 20, coins: current.coins + 500 }));
    setMessage("実績報酬を受け取ったよ。");
  };
  return (
    <Screen className="achieveScreen menuSubScreen">
      <PageHeader title="ミッション" sub="デイリー / ノーマル / スペシャル" />
      <button className="profileCloseButton" onClick={() => setActive("home")} aria-label="戻る" type="button">×</button>
      <Segmented active={tab} options={{ daily: "デイリー", normal: "ノーマル", special: "スペシャル" }} onChange={setTab} />
      <Panel className="taskPanel">
        <Task title="ログインしよう" reward="ダイヤ x10" done />
        <Task title="ペンギンを5回お世話しよう" reward="ダイヤ x10" progress="5 / 5" done />
        <Task title="魚キャッチで100点" reward="称号" progress={`${game.achievements[tab]} / 100`} />
        <button className="yellow" onClick={claimAll}>まとめて受け取る</button>
      </Panel>
    </Screen>
  );
}

function Missions({ game, setGame, setMessage, setActive }) {
  const [tab, setTab] = useState("daily");
  const missions = missionList(game)[tab];
  const claimMission = (mission) => {
    if (!mission.done || game.missionClaims?.[mission.claimKey]) return;
    setGame((current) => ({
      ...current,
      coins: current.coins + mission.reward.coins,
      diamonds: current.diamonds + mission.reward.diamonds,
      inventory: {
        ...current.inventory,
        normal: current.inventory.normal + mission.reward.feed,
      },
      missionClaims: { ...(current.missionClaims || {}), [mission.claimKey]: true },
    }));
    setMessage(`${mission.title}のミッション報酬を受け取ったよ。`);
  };

  return (
    <Screen className="missionScreen menuSubScreen">
      <PageHeader title="ミッション" sub="デイリー / ウィークリー / マンスリー" />
      <button className="profileCloseButton" onClick={() => setActive("home")} aria-label="戻る" type="button">×</button>
      <Segmented active={tab} options={{ daily: "デイリー", weekly: "ウィークリー", monthly: "マンスリー" }} onChange={setTab} />
      <Panel className="missionPanel">
        {missions.map((mission) => {
          const claimed = Boolean(game.missionClaims?.[mission.claimKey]);
          return (
            <div className={`missionItem ${mission.done ? "done" : ""} ${claimed ? "claimed" : ""}`} key={mission.id}>
              <div>
                <b>{mission.title}</b>
                <p>{mission.progress}</p>
              </div>
              <span>コイン{mission.reward.coins} / ダイヤ{mission.reward.diamonds}{mission.reward.feed ? ` / エサ${mission.reward.feed}` : ""}</span>
              <button
                className={mission.done && !claimed ? "yellow" : "whiteButton"}
                disabled={!mission.done || claimed}
                onClick={() => claimMission(mission)}
                type="button"
              >
                {claimed ? "受取済み" : mission.done ? "受け取る" : "進行中"}
              </button>
            </div>
          );
        })}
      </Panel>
    </Screen>
  );
}

function Menu({ setActive, setMessage }) {
  const items = [
    ["持ち物", "bag", "menu-bag", "エサ・卵・おみやげを確認"],
    ["称号", "star", "menu-titles", "称号の確認と変更"],
    ["設定", "gear", "menu-settings", "保存状態や通知の確認"],
    ["ヘルプ", "help", "menu-help", "遊び方と困った時の説明"],
    ["お問い合わせ", "mail", "menu-contact", "後で送信対応予定"],
    ["利用規約", "doc", "menu-terms", "それっぽい規約"],
    ["データ連携", "link", "menu-link", "後で連携対応予定"],
  ];
  return (
    <Screen className="menuScreen">
      <PageHeader title="メニュー" sub="必要な項目を選んで開きます" />
      <div className="menuGrid">
        {items.map(([label, icon, route, text]) => (
          <button
            className="menuButton menuNavButton"
            key={label}
            onClick={() => {
              setMessage(`${label}を開きました。`);
              setActive(route);
            }}
            type="button"
          >
            <Icon name={icon} /><span>{label}</span>
            <small>{text}</small>
          </button>
        ))}
      </div>
    </Screen>
  );
}

function MenuPageShell({ title, sub, setActive, children, className = "" }) {
  return (
    <Screen className={`menuScreen menuSubScreen ${className}`}>
      <PageHeader title={title} sub={sub} />
      <button className="profileCloseButton" onClick={() => setActive("menu")} aria-label="戻る" type="button">×</button>
      {children}
    </Screen>
  );
}

function MenuBagScreen({ game, setActive }) {
  const feedRows = Object.entries(feedItems).map(([key, item]) => ({ key, item, count: game.inventory[key] || 0 }));
  const capacity = BASE_CAPACITY + game.capacityBonus;
  return (
    <MenuPageShell title="持ち物" sub="エサ・卵・おみやげを確認" setActive={setActive}>
      <Panel className="menuDetailPanel">
        <div className="menuSummaryGrid">
          <div><b>{game.coins.toLocaleString()}</b><span>コイン</span></div>
          <div><b>{game.diamonds.toLocaleString()}</b><span>ダイヤ</span></div>
          <div><b>{game.penguins.length} / {capacity}</b><span>ペンギン</span></div>
          <div><b>{game.eggs.length}</b><span>卵</span></div>
        </div>
        <div className="menuInventoryGrid">
          {feedRows.map(({ key, item, count }) => (
            <div className="menuInventoryItem" key={key}>
              <FeedIcon type={key} />
              <div>
                <b>{item.name}</b>
                <span>所持 {count}個 / 満腹度 +{item.hunger}</span>
              </div>
            </div>
          ))}
          <div className="menuInventoryItem">
            <Egg type="rainbow" small />
            <div>
              <b>ペンギン卵</b>
              <span>保管中 {game.eggs.length}個</span>
            </div>
          </div>
          <div className="menuInventoryItem">
            <Icon name="gift" />
            <div>
              <b>おみやげ</b>
              <span>{game.souvenirs} / 150</span>
            </div>
          </div>
        </div>
        <div className="menuActionRow">
          <button onClick={() => setActive("shop")} type="button">ショップへ</button>
          <button className="whiteButton" onClick={() => setActive("list")} type="button">一覧へ</button>
          <button className="whiteButton" onClick={() => setActive("book")} type="button">図鑑へ</button>
        </div>
      </Panel>
    </MenuPageShell>
  );
}

function MenuTitlesScreen({ game, setGame, setMessage, setActive }) {
  const entries = titleEntries(game);
  const [selectedId, setSelectedId] = useState(entries[0]?.id || "");
  const selected = entries.find((entry) => entry.id === selectedId) || entries[0];
  const setActiveTitle = (titleName) => {
    setGame((current) => ({ ...current, activeTitle: titleName }));
    setMessage(`${titleName}を表示称号にしました。`);
  };

  return (
    <MenuPageShell title="称号" sub="解放条件を確認して、プロフィール表示を変更" setActive={setActive} className="titleScreen">
      <Panel className="activeTitleCard">
        <Icon name="star" />
        <div><span>プロフィール表示中</span><b>{game.activeTitle || game.ownedTitles[0] || "未設定"}</b></div>
      </Panel>
      <div className="titleCardGrid">
        {entries.map((entry) => (
          <button
            className={`titleCard ${entry.unlocked ? "unlocked" : "locked"} ${selected?.id === entry.id ? "selected" : ""}`}
            key={entry.id}
            onClick={() => setSelectedId(entry.id)}
            type="button"
          >
            <span>{entry.unlocked ? "称号" : "???"}</span>
            <b>{entry.unlocked ? entry.name : "？？？"}</b>
            <small>{entry.unlocked ? "解放済み" : "未解放"}</small>
          </button>
        ))}
      </div>
      {selected && (
        <Panel className={`titleDetailPanel ${selected.unlocked ? "" : "locked"}`}>
          <div>
            <span>{selected.unlocked ? "称号詳細" : "未解放称号"}</span>
            <h2>{selected.unlocked ? selected.name : "？？？"}</h2>
            <p>{selected.condition}</p>
          </div>
          {selected.unlocked ? (
            <button className="yellow" onClick={() => setActiveTitle(selected.name)} disabled={game.activeTitle === selected.name} type="button">
              {game.activeTitle === selected.name ? "設定中" : "この称号にする"}
            </button>
          ) : (
            <button className="whiteButton" disabled type="button">条件達成で解放</button>
          )}
        </Panel>
      )}
    </MenuPageShell>
  );
}

function MenuSettingsScreen({ game, setGame, setMessage, setActive }) {
  const resetNotice = () => {
    setGame((current) => ({ ...current, noticeCount: 0 }));
    setMessage("通知を確認済みにしました。");
  };
  const setBgmEnabled = (enabled) => {
    setGame((current) => ({ ...current, bgmEnabled: enabled, bgmVolume: enabled && current.bgmVolume === 0 ? 70 : current.bgmVolume }));
    setMessage(enabled ? "BGMを再生しました。" : "BGMを停止しました。");
  };
  const setBgmVolume = (value) => {
    const nextVolume = clampRange(Number(value), 0, 100);
    setGame((current) => ({ ...current, bgmVolume: nextVolume, bgmEnabled: nextVolume > 0 }));
  };

  return (
    <MenuPageShell title="設定" sub="保存状態や通知を確認" setActive={setActive}>
      <Panel className="menuDetailPanel">
        <div className="settingStatusGrid">
          <div><span>保存方式</span><b>端末保存</b></div>
          <div><span>通知</span><b>{game.noticeCount > 0 ? `${game.noticeCount}件` : "なし"}</b></div>
          <div><span>毎日更新</span><b>朝6時</b></div>
          <div><span>写真</span><b>{game.photos.length} / 30</b></div>
        </div>
        <div className="bgmSettingPanel">
          <div>
            <b>BGM</b>
            <span>{game.bgmEnabled ? "再生中" : "停止中"} / 音量 {game.bgmVolume}</span>
          </div>
          <button className={game.bgmEnabled ? "yellow" : "whiteButton"} onClick={() => setBgmEnabled(!game.bgmEnabled)} type="button">
            {game.bgmEnabled ? "ON" : "OFF"}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={game.bgmVolume}
            onChange={(event) => setBgmVolume(event.target.value)}
            aria-label="BGM音量"
          />
        </div>
        <div className="settingList">
          <button className="whiteButton" onClick={resetNotice} type="button">通知バッジを消す</button>
          <button className="whiteButton" onClick={() => setMessage("セーブデータはこの端末に保存されています。")} type="button">保存状態を確認</button>
          <button className="whiteButton" onClick={() => setActive("profile")} type="button">プロフィールへ</button>
        </div>
      </Panel>
    </MenuPageShell>
  );
}

function MenuHelpScreen({ setGame, setMessage, setActive }) {
  const [debugPassword, setDebugPassword] = useState("");
  const addDebugDiamonds = () => {
    if (debugPassword !== "penguin") {
      setMessage("パスワードが違います。");
      return;
    }
    setGame((current) => ({ ...current, diamonds: current.diamonds + 100000 }));
    setDebugPassword("");
    setMessage("確認用ダイヤを100000追加しました。");
  };

  return (
    <MenuPageShell title="ヘルプ" sub="遊び方と困った時の確認" setActive={setActive}>
      <div className="helpCardGrid full">
        <div><b>育成の基本</b><span>餌で満腹度、なでるで機嫌、掃除で部屋の状態、写真で思い出を残せます。育成画面のペンギンを直接操作する遊びもあります。</span></div>
        <div><b>愛情Lv</b><span>愛情Lvは最大10です。進化にはペンギンLv65と愛情Lv6が必要です。</span></div>
        <div><b>ガチャ</b><span>単発は100ダイヤ、10連は1000ダイヤです。SSR卵の確率は2%、80連でSSR卵が確定します。</span></div>
        <div><b>卵と孵化</b><span>ガチャで入手した卵は一覧の卵タブに入ります。孵化すると新しいペンギンが仲間になります。</span></div>
        <div><b>おでかけ</b><span>おでかけは実時間で進みます。1時間、3時間、5時間、12時間の行き先があります。</span></div>
        <div><b>ミニゲーム</b><span>魚キャッチ、氷スライド、記憶ゲームで報酬を獲得できます。報酬は受け取ってから次へ進みます。</span></div>
        <div><b>データ保存</b><span>データはブラウザのlocalStorageに保存されます。ブラウザのデータ削除や別端末では引き継がれない場合があります。</span></div>
        <div><b>スマホで遊ぶ</b><span>VercelのURLをSafariで開き、共有からホーム画面に追加するとアプリ風に起動できます。</span></div>
      </div>
      <Panel className="helpPanel">
        <div className="menuSectionTitle"><h2>確認用</h2></div>
        <p>ガチャ演出確認用の隠し機能です。パスワードを入力するとダイヤを追加できます。</p>
        <div className="debugDiamondBox">
          <input type="password" value={debugPassword} onChange={(event) => setDebugPassword(event.target.value)} placeholder="確認用パスワード" />
          <button className="yellow" onClick={addDebugDiamonds}>ダイヤ100000</button>
        </div>
      </Panel>
    </MenuPageShell>
  );
}

function MenuContactScreen({ game, setGame, setMessage, setActive }) {
  const [contactDraft, setContactDraft] = useState(game.supportMemo || "");
  const saveContactMemo = () => {
    setGame((current) => ({ ...current, supportMemo: contactDraft.trim() }));
    setMessage("問い合わせメモを保存しました。");
  };

  return (
    <MenuPageShell title="お問い合わせ" sub="送信機能は後で実装予定" setActive={setActive}>
      <Panel className="menuDetailPanel">
          <p>改善したい点や不具合メモをここに残せます。提出前の確認メモにも使えます。</p>
          <textarea className="menuTextarea" value={contactDraft} onChange={(event) => setContactDraft(event.target.value)} placeholder="例: ガチャ結果の表示をもっと見やすくしたい" />
          <button className="yellow" onClick={saveContactMemo} type="button">メモを保存</button>
      </Panel>
    </MenuPageShell>
  );
}

function MenuTermsScreen({ setActive }) {
  return (
    <MenuPageShell title="利用規約" sub="それっぽい長めの規約" setActive={setActive}>
      <Panel className="menuDetailPanel">
        <div className="termsList">
          <div><b>第1条 利用目的</b><span>ペンともは、ペンギンとのふれあい、育成、収集、ガチャ、ミニゲームなどを楽しむためのゲームです。本サービスは学習および制作物として提供され、利用者は本規約に同意したうえで遊ぶものとします。</span></div>
          <div><b>第2条 セーブデータ</b><span>ゲームの進行状況、所持ペンギン、卵、アイテム、称号、写真、各種設定などは、利用中のブラウザ内に保存されます。端末変更、ブラウザ変更、キャッシュ削除、プライベートブラウズ利用などにより、データが表示されなくなる場合があります。</span></div>
          <div><b>第3条 ゲーム内アイテム</b><span>コイン、ダイヤ、エサ、卵、家具、衣装、背景、おみやげ、称号などはゲーム内でのみ使用できる仮想アイテムです。現実の金銭、物品、権利その他の価値と交換することはできません。</span></div>
          <div><b>第4条 ガチャ</b><span>ガチャには排出率が設定されています。結果は抽選により決定され、必ず希望する報酬が得られるとは限りません。ただし、ゲーム内仕様としてSSR卵の天井が設定されている場合は、その仕様に従います。</span></div>
          <div><b>第5条 禁止事項</b><span>不正な改造、意図しない操作、データの破損を目的とした行為、他者の端末やアカウントへの迷惑行為、ゲームの雰囲気を大きく損なう行為はしないでください。</span></div>
          <div><b>第6条 仕様変更</b><span>ゲーム内容、画面表示、報酬、演出、機能、バランスなどは、改善のため予告なく変更される場合があります。変更後も、なるべく既存データに影響が出ないよう配慮します。</span></div>
          <div><b>第7条 免責</b><span>本ゲームの利用により発生したデータ消失、表示不具合、通信環境による問題、端末依存の動作差などについて、制作者は可能な範囲で改善に努めますが、完全な保証は行いません。</span></div>
          <div><b>第8条 お問い合わせ</b><span>不具合や改善要望はお問い合わせ画面に記録できます。実際に制作者へ送信する機能は、今後必要に応じて追加される予定です。</span></div>
        </div>
      </Panel>
    </MenuPageShell>
  );
}

function MenuLinkScreen({ setActive }) {
  return (
    <MenuPageShell title="データ連携" sub="お問い合わせ機能と一緒に後で対応予定" setActive={setActive}>
      <Panel className="menuDetailPanel">
        <p>データ連携は、実際にお問い合わせを送れる仕組みを作る時に一緒に整えます。今はこの端末のブラウザに自動保存されています。</p>
        <div className="termsList">
          <div><b>現在の保存</b><span>localStorageに自動保存されています。</span></div>
          <div><b>今後の予定</b><span>別端末への引き継ぎ、問い合わせ送信、バックアップコードなどをまとめて検討します。</span></div>
        </div>
      </Panel>
    </MenuPageShell>
  );
}

function Tutorial({ step, setStep, playerName, setPlayerName, penguinName, setPenguinName, finishTutorial }) {
  const pages = [
    ["ようこそ", "まずはプレイヤー名を入力してください。"],
    ["卵を受け取ろう", "コウテイペンギンの卵を受け取りました。"],
    ["孵化", "卵が光って、ヒナが生まれます。"],
    ["名前をつけよう", "この子の名前を決めてください。"],
    ["確認", "この名前でゲームを始めます。"],
  ];
  return (
    <div className="modalOverlay">
      <div className="tutorialCard">
        <h2>{pages[step][0]}</h2>
        <p>{pages[step][1]}</p>
        <div className="tutorialVisual">
          {step < 2 ? <Egg type="white" /> : <PenguinFigure size="book" />}
        </div>
        {step === 0 && <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="プレイヤー名" />}
        {step === 3 && <input value={penguinName} onChange={(e) => setPenguinName(e.target.value)} placeholder="ペンギンの名前" />}
        {step === 4 && <Panel className="confirmBox"><b>{penguinName}</b><p>あとから変更できません。</p></Panel>}
        <div className="modalActions">
          {step > 0 && <button className="whiteButton" onClick={() => setStep(step - 1)}>戻る</button>}
          {step < 4 ? <button onClick={() => setStep(step + 1)}>次へ</button> : <button className="yellow" onClick={finishTutorial}>ゲームへ</button>}
        </div>
      </div>
    </div>
  );
}

function HatchModal({ egg, onClose, onHatch }) {
  const [name, setName] = useState(`${species[clampSpecies(egg.speciesId)].slice(0, 3)}ちゃん`);
  return (
    <div className="modalOverlay">
      <div className="tutorialCard">
        <h2>卵を孵化する</h2>
        <p>名前は一度決めると変更できません。</p>
        <div className="tutorialVisual"><Egg type={egg.type} /></div>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <div className="modalActions">
          <button className="whiteButton" onClick={onClose}>キャンセル</button>
          <button className="yellow" onClick={() => onHatch(egg, name.trim() || "ペンギン")}>孵化する</button>
        </div>
      </div>
    </div>
  );
}

function OutfitModal({ game, penguin, setPenguin, onClose }) {
  return (
    <div className="modalOverlay">
      <div className="tutorialCard">
        <h2>着替え</h2>
        <p>選んだ衣装は育成中ペンギンに保存されます。</p>
        <div className="choiceGrid">
          {game.ownedOutfits.map((name) => (
            <button className={penguin.outfit === name ? "yellow" : "whiteButton"} key={name} onClick={() => setPenguin(penguin.id, { outfit: name })}>{name}</button>
          ))}
        </div>
        <button onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}

function EditRoomModal({ game, setGame, onClose }) {
  const setActive = (field, value) => setGame((current) => ({ ...current, [field]: value }));
  return (
    <div className="modalOverlay">
      <div className="tutorialCard">
        <h2>模様替え</h2>
        <p>家具と背景を選ぶとホームや写真の設定に反映されます。</p>
        <b>家具</b>
        <div className="choiceGrid">
          {game.ownedFurniture.map((name) => <button className={game.activeFurniture === name ? "yellow" : "whiteButton"} key={name} onClick={() => setActive("activeFurniture", name)}>{name}</button>)}
        </div>
        <b>背景</b>
        <div className="choiceGrid">
          {game.ownedBackgrounds.map((name) => <button className={game.activeBackground === name ? "yellow" : "whiteButton"} key={name} onClick={() => setActive("activeBackground", name)}>{name}</button>)}
        </div>
        <button onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}

function Screen({ className, children }) {
  return <section className={`screen ${className}`}>{children}</section>;
}

function PageHeader({ title, sub }) {
  return <div className="pageHeader"><h1>{title}</h1><span>{sub}</span></div>;
}

function Panel({ children, className = "" }) {
  return <div className={`panel ${className}`}>{children}</div>;
}

function DetailStat({ label, value, max }) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="detailStat">
      <div>
        <b>{label}</b>
        <span>{value} / {max}</span>
      </div>
      <i style={{ "--value": `${percent}%` }} />
    </div>
  );
}

function Currency({ type, value }) {
  return <span className={`currency ${type}`}><i />{value.toLocaleString()}</span>;
}

function PenguinFigure({ penguin: p, size = "medium" }) {
  return (
    <div className={`penguinFigure ${size} outfit-${slug(p?.outfit || "なし")}`}>
      <div className="shadow" />
      <img src={penguin} alt="ペンギン" draggable="false" />
    </div>
  );
}

function Speech({ children }) {
  return <div className="speechBubble"><span />{children}</div>;
}

function Meter({ label, value, tone = "blue", compact = false }) {
  return (
    <div className={`meter ${compact ? "compact" : ""}`}>
      {label && <div className="meterTop"><span>{label}</span><b>{value} / 100</b></div>}
      <div className="meterTrack"><i className={tone} style={{ width: `${clamp(value)}%` }} /></div>
    </div>
  );
}

function SideDock({ items }) {
  return <div className="sideDock">{items.map(([label, icon, onClick]) => <button key={label} onClick={onClick}><HomeIcon name={icon} /><span>{label}</span></button>)}</div>;
}

function CareButton({ label, icon, className = "", ...buttonProps }) {
  return <button className={`careButton ${className}`} {...buttonProps}><CareIcon name={icon} /><span>{label}</span></button>;
}

function FeedIcon({ type }) {
  return (
    <i className={`feedIcon feedIcon-${type}`} aria-hidden="true">
      <span />
      {type !== "normal" && <span />}
      {type === "special" && <span />}
    </i>
  );
}

function Segmented({ active, options, onChange }) {
  return <div className="segmented">{Object.entries(options).map(([key, label]) => <button className={active === key ? "active" : ""} key={key} onClick={() => onChange(key)}>{label}</button>)}</div>;
}

function BottomTabs({ active, onChange }) {
  return (
    <nav className="bottomTabs">
      {tabs.map(([id, label, icon]) => (
        <button className={active === id || (id === "menu" && active.startsWith("menu-")) || (id === "home" && active === "missions") ? "active" : ""} key={id} onClick={() => onChange(id)}>
          <Icon name={icon} /><span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function Icon({ name }) {
  return <i className={`icon icon-${name}`} aria-hidden="true" />;
}

function HomeIcon({ name }) {
  const icons = {
    game: (
      <>
        <path d="M7 13.5C7 9.9 9.7 8 13 8h14c3.3 0 6 1.9 6 5.5v6.2c0 3.5-2.4 5.8-5.3 5.8-1.8 0-3.1-.8-4.2-2.2h-7c-1.1 1.4-2.4 2.2-4.2 2.2-2.9 0-5.3-2.3-5.3-5.8v-6.2Z" fill="#fff" />
        <path d="M14 13v8M10 17h8" stroke="#4aa8ec" strokeWidth="3" strokeLinecap="round" />
        <circle cx="25" cy="15" r="2.4" fill="#4aa8ec" />
        <circle cx="29" cy="19" r="2.4" fill="#4aa8ec" />
      </>
    ),
    care: (
      <>
        <path d="M4 18c4-7 16.2-7.8 24.2-2.1L35 11v14l-6.8-4.9C20.2 25.8 8 25 4 18Z" fill="#6c4a14" />
        <circle cx="13" cy="17" r="2.2" fill="#fff0a2" />
      </>
    ),
    outing: (
      <>
        <path d="M7 21h24c-1.1 4.2-4.1 6.3-9.1 6.3h-5.8C11.1 27.3 8.1 25.2 7 21Z" fill="#fff" />
        <path d="M18 7v13h12L18 7Z" fill="#fff" />
        <path d="M17 7v13" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      </>
    ),
    shop: (
      <>
        <path d="M9 14h22v15H9V14Z" rx="4" fill="#2f729b" />
        <path d="M14 15v-3.2C14 8.6 16.5 6 20 6s6 2.6 6 5.8V15" fill="none" stroke="#2f729b" strokeWidth="3" strokeLinecap="round" />
      </>
    ),
    gift: (
      <>
        <path d="M8 14h24v5H8v-5ZM10 19h20v12H10V19Z" fill="#2f729b" />
        <path d="M20 14v17M8 19h24" stroke="#eaf8ff" strokeWidth="3" />
        <path d="M20 13c-5-6-10-2-8 1 2.1 2.9 6.5 1.2 8-1Zm0 0c5-6 10-2 8 1-2.1 2.9-6.5 1.2-8-1Z" fill="none" stroke="#2f729b" strokeWidth="2.4" strokeLinecap="round" />
      </>
    ),
    mission: (
      <>
        <path d="M11 7h18c1.7 0 3 1.3 3 3v20H8V10c0-1.7 1.3-3 3-3Z" fill="#2f729b" />
        <path d="M14 14h12M14 20h9M14 26h6" stroke="#eaf8ff" strokeWidth="2.7" strokeLinecap="round" />
        <path d="M27 23l2.2 2.2L34 19" fill="none" stroke="#eaf8ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    look: (
      <>
        <path d="M4 18s5.5-8 16-8 16 8 16 8-5.5 8-16 8S4 18 4 18Z" fill="#2f729b" />
        <circle cx="20" cy="18" r="5" fill="#eaf8ff" />
        <circle cx="20" cy="18" r="2.4" fill="#2f729b" />
      </>
    ),
  };

  return (
    <svg className={`homeIcon homeIcon-${name}`} viewBox="0 0 40 36" aria-hidden="true" focusable="false">
      {icons[name] || icons.look}
    </svg>
  );
}

function CareIcon({ name }) {
  const icons = {
    heart: (
      <path d="M20 31C11 23 6 18 6 12c0-4 3-7 7-7 3 0 6 2 7 5 1-3 4-5 7-5 4 0 7 3 7 7 0 6-5 11-14 19Z" />
    ),
    camera: (
      <>
        <path d="M8 13h6l2-4h8l2 4h6v18H8V13Z" />
        <circle cx="20" cy="22" r="6" fill="#fff" />
        <circle cx="20" cy="22" r="3.5" />
      </>
    ),
    broom: (
      <>
        <path d="M23 6l3 2-9 16-3-2 9-16Z" />
        <path d="M11 22h12l3 9H8l3-9Z" />
        <path d="M12 26h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    shirt: (
      <path d="M13 8l4 3h6l4-3 6 6-4 5-3-2v15H14V17l-3 2-4-5 6-6Z" />
    ),
    edit: (
      <>
        <path d="M9 13l11-6 11 6v15H9V13Z" />
        <path d="M15 19h10M15 24h10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  };

  return (
    <svg className={`careIcon careIcon-${name}`} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      {icons[name] || icons.heart}
    </svg>
  );
}

function Egg({ type, small = false }) {
  return <div className={`egg ${type} ${small ? "small" : ""}`} />;
}

function GachaPrizeVisual({ result }) {
  if (result.prizeType === "ssrEgg") {
    return (
      <span className="gachaPrizeVisual eggPrize">
        <Egg type="rainbow" small />
        <b>ペンギン卵</b>
        <small>{result.reward}</small>
      </span>
    );
  }
  return (
    <span className={`gachaPrizeVisual feedPrize feedPrize-${result.feedKey}`}>
      <FeedIcon type={result.feedKey} />
      <b>{result.reward}</b>
      <small>+1</small>
    </span>
  );
}

function Rarity({ index }) {
  const rarity = index < 2 ? "SSR" : index < 5 ? "SR" : index < 10 ? "R" : "N";
  return <span className={`rarity ${rarity.toLowerCase()}`}>{rarity}</span>;
}

function CollectionPanel({ title, value, text }) {
  return <Panel className="collectionPanel"><PenguinFigure size="collection" /><div><h2>{title}</h2><b>{value}</b><p>{text}</p></div></Panel>;
}

function Task({ title, reward, progress, done = false }) {
  return <div className="task"><div><b>{title}</b>{progress && <p>{progress}</p>}</div><span>{reward}</span><button className={done ? "yellow" : "whiteButton"}>{done ? "受け取る" : "進行中"}</button></div>;
}

function getPenguin(game, id) {
  return game.penguins.find((p) => p.id === id);
}

function applyExp(penguinData, amount) {
  let exp = penguinData.exp + amount;
  let level = penguinData.level;
  while (exp >= EXP_PER_LEVEL && level < 100) {
    exp -= EXP_PER_LEVEL;
    level += 1;
  }
  if (level >= 100) exp = 0;
  const canEvolve = level >= 65 && penguinData.loveLevel >= 6;
  return checkMilestones({ ...penguinData, exp, level, stage: canEvolve ? "adult" : penguinData.stage });
}

function checkMilestones(p) {
  const stage = p.level >= 65 && p.loveLevel >= 6 ? "adult" : p.stage;
  return {
    ...p,
    stage,
    rewards: {
      evolved: stage === "adult" || p.rewards?.evolved || false,
      lv80: p.level >= 80 || p.rewards?.lv80 || false,
      lv100: p.level >= 100 || p.rewards?.lv100 || false,
    },
  };
}

function applyExpToActive(current, id, amount) {
  let diamonds = current.diamonds;
  let ownedFurniture = current.ownedFurniture;
  let ownedTitles = current.ownedTitles;
  const penguins = current.penguins.map((p) => {
    if (p.id !== id) return p;
    const next = applyExp(p, amount);
    const awards = milestoneAwards(p, next);
    diamonds += awards.diamonds;
    ownedFurniture = unique([...ownedFurniture, ...awards.furniture]);
    ownedTitles = unique([...ownedTitles, ...awards.titles]);
    return next;
  });
  const keeperExp = current.keeperExp + amount;
  return { ...current, diamonds, ownedFurniture, ownedTitles, penguins, keeperExp, keeperLevel: keeperLevelFromExp(keeperExp) };
}

function milestoneAwards(before, after) {
  const beforeRewards = before.rewards || {};
  const awards = { diamonds: 0, furniture: [], titles: [] };
  if (after.stage === "adult" && !beforeRewards.evolved) awards.diamonds += 100;
  if (after.level >= 80 && !beforeRewards.lv80) awards.furniture.push(`${after.name}の銅像`);
  if (after.level >= 100 && !beforeRewards.lv100) awards.titles.push(`${after.name}と歩む者`);
  return awards;
}

function makeGachaEggs(count, pity) {
  let gotSsr = false;
  return Array.from({ length: count }, (_, index) => {
    const forceSsr = pity - index <= 1 && !gotSsr;
    const roll = Math.random() * 100;
    if (forceSsr || roll < 2) {
      gotSsr = true;
      const speciesId = Math.floor(Math.random() * species.length);
      return { id: createId(), type: "rainbow", reward: `${species[speciesId]}の卵`, prizeType: "ssrEgg", speciesId };
    }
    if (roll < 10) return { id: createId(), type: "gold", reward: "特製魚セット", prizeType: "feed", feedKey: "special" };
    if (roll < 40) return { id: createId(), type: "white", reward: "高級魚", prizeType: "feed", feedKey: "premium" };
    return { id: createId(), type: "white", reward: "魚のエサ", prizeType: "feed", feedKey: "normal" };
  });
}

function addFeedRewards(inventory, rewards) {
  return rewards.reduce((next, reward) => {
    if (reward.prizeType !== "feed") return next;
    return { ...next, [reward.feedKey]: next[reward.feedKey] + 1 };
  }, inventory);
}

function titleEntries(game) {
  const unlockedByCondition = (title) => {
    if (game.ownedTitles.includes(title.name)) return true;
    if (title.id === "keeper") return true;
    if (title.id === "fish-catcher") return Math.max(...Object.values(game.achievements || {})) >= 100;
    if (title.id === "friend") return game.penguins.some((p) => p.loveLevel >= 10);
    if (title.id === "collector") return game.discoveredSpecies.length >= 10;
    if (title.id === "traveler") return game.souvenirs >= 50;
    if (title.id === "master") return game.penguins.some((p) => p.level >= 100);
    return false;
  };
  const base = titleCatalog.map((title) => ({ ...title, unlocked: unlockedByCondition(title) }));
  const extra = game.ownedTitles
    .filter((titleName) => !base.some((entry) => entry.name === titleName))
    .map((titleName, index) => ({
      id: `owned-${index}-${titleName}`,
      name: titleName,
      condition: "ペンギンの成長やイベントで獲得した特別称号です。",
      unlocked: true,
    }));
  return [...base, ...extra];
}

function missionList(game) {
  const dailyKey = getDailyGiftKey();
  const weekKey = getWeekKey();
  const monthKey = getMonthKey();
  const bestMini = Math.max(...Object.values(game.achievements || {}));
  const adultCount = game.penguins.filter((p) => p.stage === "adult").length;
  const highLoveCount = game.penguins.filter((p) => p.loveLevel >= 6).length;
  const maxLevel = Math.max(...game.penguins.map((p) => p.level));
  const make = (period, key, id, title, done, progress, reward) => ({
    id,
    title,
    done,
    progress,
    reward,
    claimKey: `${period}:${key}:${id}`,
  });

  return {
    daily: [
      make("daily", dailyKey, "login", "今日ログインする", true, "1 / 1", { coins: 120, diamonds: 5, feed: 1 }),
      make("daily", dailyKey, "gift", "今日のプレゼントを受け取る", game.claimedToday && game.dailyGiftKey === dailyKey, `${game.claimedToday && game.dailyGiftKey === dailyKey ? 1 : 0} / 1`, { coins: 180, diamonds: 5, feed: 1 }),
      make("daily", dailyKey, "care", "育成中のペンギンを確認する", Boolean(game.activeCareId), "1 / 1", { coins: 100, diamonds: 3, feed: 0 }),
    ],
    weekly: [
      make("weekly", weekKey, "penguins3", "ペンギンを3匹以上仲間にする", game.penguins.length >= 3, `${Math.min(game.penguins.length, 3)} / 3`, { coins: 700, diamonds: 20, feed: 2 }),
      make("weekly", weekKey, "mini100", "ミニゲームで100点を目指す", bestMini >= 100, `${Math.min(bestMini, 100)} / 100`, { coins: 600, diamonds: 25, feed: 1 }),
      make("weekly", weekKey, "love6", "愛情Lv6のペンギンを育てる", highLoveCount >= 1, `${Math.min(highLoveCount, 1)} / 1`, { coins: 800, diamonds: 30, feed: 2 }),
    ],
    monthly: [
      make("monthly", monthKey, "book10", "図鑑を10種類発見する", game.discoveredSpecies.length >= 10, `${Math.min(game.discoveredSpecies.length, 10)} / 10`, { coins: 2200, diamonds: 80, feed: 4 }),
      make("monthly", monthKey, "adult", "大人ペンギンを1匹育てる", adultCount >= 1, `${Math.min(adultCount, 1)} / 1`, { coins: 2500, diamonds: 100, feed: 3 }),
      make("monthly", monthKey, "lv65", "ペンギンLv65を達成する", maxLevel >= 65, `Lv.${Math.min(maxLevel, 65)} / 65`, { coins: 3000, diamonds: 120, feed: 5 }),
    ],
  };
}

function getWeekKey(date = new Date()) {
  const resetDate = new Date(date);
  if (resetDate.getHours() < 6) resetDate.setDate(resetDate.getDate() - 1);
  const firstDay = new Date(resetDate.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((resetDate - firstDay) / 86400000) + 1;
  return `${resetDate.getFullYear()}-W${Math.ceil(dayOfYear / 7)}`;
}

function getMonthKey(date = new Date()) {
  const resetDate = new Date(date);
  if (resetDate.getHours() < 6) resetDate.setDate(resetDate.getDate() - 1);
  return `${resetDate.getFullYear()}-${String(resetDate.getMonth() + 1).padStart(2, "0")}`;
}

function nextLoveLevel(point) {
  return loveThresholds.reduce((level, need, index) => (point >= need ? index + 1 : level), 1);
}

function loveGain(friendship) {
  if (friendship >= 80) return 2;
  if (friendship >= 40) return 1;
  return 0;
}

function keeperLevelFromExp(exp) {
  return Math.min(999, Math.max(1, Math.floor(exp / 120) + 1));
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function statusMessage(p) {
  if (p.hunger < 30) return "おなかがすいたみたい。ごはんをあげよう。";
  if (p.mood < 30) return "少しさみしそう。なでたり写真を撮ったりしよう。";
  if (p.stage === "adult") return "大人のペンギンに進化したよ。頼もしいね。";
  return "元気いっぱい。今日は何をして遊ぶ？";
}

function spendCoins(game, setGame, price, setMessage) {
  if (game.coins < price) {
    setMessage("コインが足りません。ミニゲームやおでかけで集めよう。");
    return false;
  }
  setGame((current) => ({ ...current, coins: current.coins - price }));
  return true;
}

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function clampRange(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampSpecies(value) {
  const numeric = Number.isFinite(value) ? value : Number(value);
  return clampRange(Number.isFinite(numeric) ? numeric : 0, 0, species.length - 1);
}

function unique(values) {
  return [...new Set(values)];
}

function validText(value, fallback) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function slug(value) {
  return value.replace(/\s/g, "-");
}

export default App;
