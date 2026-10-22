/* ================= 매칭 알고리즘 ================= */
import { LEVEL_ORDER } from './utils';
import { playerById, availablePlayers } from './selectors';

function combinations(arr, k) {
  const results = [];
  function helper(start, combo) {
    if (combo.length === k) { results.push(combo.slice()); return; }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  }
  helper(0, []);
  return results;
}

function teamSplits(fourGeneric) {
  // 4명을 2대2로 나누는 3가지 방법
  const [a, b, c, d] = fourGeneric;
  return [
    { teamA: [a, b], teamB: [c, d] },
    { teamA: [a, c], teamB: [b, d] },
    { teamA: [a, d], teamB: [b, c] },
  ];
}

function mixedSplits(males, females) {
  // 혼합복식: 팀은 반드시 남1+여1
  const [m1, m2] = males;
  const [f1, f2] = females;
  return [
    { teamA: [m1, f1], teamB: [m2, f2] },
    { teamA: [m1, f2], teamB: [m2, f1] },
  ];
}

// 오늘 경기 결과를 반영한 실력 보정치 (-1 ~ +1 급수).
// 경기당 평균 점수 차 10점을 1급수으로 보고, 점수 없이 승패만 있으면 ±5점으로 친다.
// 경기 수가 적을 때는 우연일 수 있어 보정을 약하게 (1경기 25%, 3경기 50%, 9경기 75%).
export function formAdjust(state, id) {
  let sum = 0, n = 0;
  for (const g of state.games) {
    if (g.status !== 'done') continue;
    const side = g.teamA.includes(id) ? 'A' : g.teamB.includes(id) ? 'B' : null;
    if (!side) continue;
    let margin;
    if (g.scoreA != null && g.scoreB != null) margin = side === 'A' ? g.scoreA - g.scoreB : g.scoreB - g.scoreA;
    else if (g.winner) margin = g.winner === side ? 5 : -5;
    else continue;
    sum += margin; n++;
  }
  if (!n) return 0;
  return Math.max(-1, Math.min(1, sum / n / 10)) * n / (n + 3);
}

function avgLevel(state, ids) {
  const sum = ids.reduce((s, id) => s + LEVEL_ORDER[playerById(state, id).level] + formAdjust(state, id), 0);
  return sum / ids.length;
}

function pastPartnerCount(state, id1, id2) {
  let c = 0;
  for (const g of state.games) {
    if (g.status !== 'done') continue;
    if ((g.teamA.includes(id1) && g.teamA.includes(id2)) ||
        (g.teamB.includes(id1) && g.teamB.includes(id2))) c++;
  }
  return c;
}

function pastOpponentCount(state, id1, id2) {
  let c = 0;
  for (const g of state.games) {
    if (g.status !== 'done') continue;
    const aHas1 = g.teamA.includes(id1), bHas1 = g.teamB.includes(id1);
    const aHas2 = g.teamA.includes(id2), bHas2 = g.teamB.includes(id2);
    if ((aHas1 && bHas2) || (bHas1 && aHas2)) c++;
  }
  return c;
}

export function scoreSplit(state, teamA, teamB) {
  // 0.25 단위로 반올림해서, 실력 차이가 비슷하면 파트너/상대 중복을 기준으로 고르게 한다.
  const levelDiff = Math.round(Math.abs(avgLevel(state, teamA) - avgLevel(state, teamB)) * 4) / 4;
  const partnerRepeat = pastPartnerCount(state, teamA[0], teamA[1]) + pastPartnerCount(state, teamB[0], teamB[1]);
  let opponentRepeat = 0;
  for (const x of teamA) for (const y of teamB) opponentRepeat += pastOpponentCount(state, x, y);
  return { levelDiff, partnerRepeat, opponentRepeat };
}

function betterScore(s1, s2) {
  // 우선순위: 급수차이 > 파트너중복 > 상대중복 (경기횟수균형은 후보풀 선정단계에서 이미 반영)
  if (s1.levelDiff !== s2.levelDiff) return s1.levelDiff < s2.levelDiff;
  if (s1.partnerRepeat !== s2.partnerRepeat) return s1.partnerRepeat < s2.partnerRepeat;
  return s1.opponentRepeat < s2.opponentRepeat;
}

export function starsFor(score) {
  // 점수가 낮을수록(반복/차이 적을수록) 좋은 매칭 -> 별점 환산
  const gameBalance = 5; // 후보풀 선정 단계에서 이미 최우선 보장
  const level = score.levelDiff <= 0.5 ? 5 : score.levelDiff <= 1 ? 4 : score.levelDiff <= 1.5 ? 3 : score.levelDiff <= 2 ? 2 : 1;
  const partner = score.partnerRepeat === 0 ? 5 : score.partnerRepeat === 1 ? 3 : 1;
  const opponent = score.opponentRepeat === 0 ? 5 : score.opponentRepeat <= 1 ? 4 : score.opponentRepeat <= 2 ? 3 : 2;
  return { gameBalance, level, partner, opponent };
}

function pickTierCandidates(pool, neededCount) {
  // 경기 수가 적은 사람을 우선 후보로. 부족하면 tier(허용폭)를 넓혀감.
  if (pool.length === 0) return [];
  const sorted = pool.slice().sort((a, b) => a.totalGames - b.totalGames || Math.random() - 0.5);
  let slack = 0;
  const minGames = sorted[0].totalGames;
  while (true) {
    const tier = sorted.filter(p => p.totalGames <= minGames + slack);
    if (tier.length >= neededCount || tier.length === sorted.length) {
      return tier.slice(0, Math.max(neededCount + 4, tier.length > 10 ? 10 : tier.length));
    }
    slack++;
  }
}

function chooseCourtGameType(remainingMales, remainingFemales) {
  // 종목(남복/여복/혼복)을 사람이 미리 정하지 않고, 남아있는 인원 상황에 맞춰 자동으로 결정한다.
  // 경기 수가 가장 적은 사람들을 최대한 우선 기용할 수 있는 조합을 고른다.
  const byGames = (a, b) => a.totalGames - b.totalGames || Math.random() - 0.5;
  const sortedM = remainingMales.slice().sort(byGames);
  const sortedF = remainingFemales.slice().sort(byGames);
  const sum = arr => arr.reduce((s, p) => s + p.totalGames, 0);

  const candidates = [];
  if (sortedM.length >= 4) candidates.push({ type: '남자복식', cost: sum(sortedM.slice(0, 4)) });
  if (sortedF.length >= 4) candidates.push({ type: '여자복식', cost: sum(sortedF.slice(0, 4)) });
  if (sortedM.length >= 2 && sortedF.length >= 2) candidates.push({ type: '혼합복식', cost: sum(sortedM.slice(0, 2)) + sum(sortedF.slice(0, 2)) });
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.cost - b.cost || Math.random() - 0.5);
  return candidates[0].type;
}

export function generateRecommendations(state) {
  const courts = state.settings.courts;
  const eligible = availablePlayers(state);

  let remainingMales = eligible.filter(p => p.gender === 'M');
  let remainingFemales = eligible.filter(p => p.gender === 'F');

  const assignments = [];
  let shortfall = '';

  for (const court of courts) {
    const gameType = chooseCourtGameType(remainingMales, remainingFemales);
    if (!gameType) {
      shortfall = `현재 참여 가능 인원으로는 ${assignments.length}개 코트만 구성할 수 있습니다. (요청: ${courts.length}개)`;
      break;
    }

    let best = null;
    const consider = split => {
      const score = scoreSplit(state, split.teamA, split.teamB);
      if (!best || betterScore(score, best.score)) best = { ...split, score };
    };

    if (gameType === '남자복식' || gameType === '여자복식') {
      const pool = gameType === '남자복식' ? remainingMales : remainingFemales;
      const tier = pickTierCandidates(pool, 4);
      for (const combo of combinations(tier.map(p => p.id), 4)) {
        teamSplits(combo).forEach(consider);
      }
    } else {
      const mCombos = combinations(pickTierCandidates(remainingMales, 2).map(p => p.id), 2);
      const fCombos = combinations(pickTierCandidates(remainingFemales, 2).map(p => p.id), 2);
      for (const mc of mCombos) {
        for (const fc of fCombos) mixedSplits(mc, fc).forEach(consider);
      }
    }

    if (!best) break;
    const used = best.teamA.concat(best.teamB);
    remainingMales = remainingMales.filter(p => !used.includes(p.id));
    remainingFemales = remainingFemales.filter(p => !used.includes(p.id));
    assignments.push({ court, teamA: best.teamA, teamB: best.teamB, score: best.score, gameType });
  }

  return { assignments, shortfall };
}
