/* ================= 매칭 알고리즘 ================= */
import { LEVEL_ORDER } from './utils';
import { playerById } from './selectors';

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
  // 모임 밖 사람(외부)은 앱에 없어서 계산에서 빠진다. 한쪽 팀에 우리 사람이 없으면 급수 차이는 따지지 않는다.
  const levelDiff = teamA.length && teamB.length
    ? Math.round(Math.abs(avgLevel(state, teamA) - avgLevel(state, teamB)) * 4) / 4
    : 0;
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

// 경기 만들기 창의 ✨ 추천: 이미 고른 사람과 '외부' 칸은 그대로 두고 빈 칸을 채울 조합들을 좋은 순서로 돌려준다.
// (✨를 다시 누르면 다음 조합을 보여준다.) 경기 수가 적은 사람 10명 안에서 고르고,
// 종목이 맞고(남복·여복·혼복, 단식은 같은 성별) → 경기 수가 적고 → 급수가 고르고 파트너·상대가 덜 겹치는 순서.
// 사람이 모자라면 빈 배열.
export function rankFills(state, selection, pool) {
  const size = selection.length;
  const fixed = selection.filter(id => id && playerById(state, id));
  const need = selection.filter(id => !id).length;
  if (need === 0) return [];
  const candidates = pool.filter(p => !fixed.includes(p.id))
    .sort((a, b) => a.totalGames - b.totalGames || Math.random() - 0.5)
    .slice(0, Math.max(10, need));
  if (candidates.length < need) return [];

  return combinations(candidates.map(p => p.id), need)
    .map(combo => ({ ...rateGroup(state, fixed.concat(combo), size), combo }))
    .sort((a, b) => (betterGroup(a, b) ? -1 : betterGroup(b, a) ? 1 : 0))
    .map(r => r.combo);
}

export function recommendFill(state, selection, pool) {
  return rankFills(state, selection, pool)[0] || null;
}

function rateGroup(state, ids, size) {
  const genderOf = id => playerById(state, id).gender;
  const games = ids.reduce((s, id) => s + playerById(state, id).totalGames, 0);
  if (size === 2) {
    if (ids.length < 2) return { typeOk: true, games, score: scoreSplit(state, ids, []) };
    return { typeOk: genderOf(ids[0]) === genderOf(ids[1]), games, score: scoreSplit(state, [ids[0]], [ids[1]]) };
  }
  if (ids.length < 4) return { typeOk: true, games, score: scoreSplit(state, ids.slice(0, 2), ids.slice(2)) };
  const males = ids.filter(id => genderOf(id) === 'M');
  const females = ids.filter(id => genderOf(id) === 'F');
  const typeOk = males.length !== 1 && males.length !== 3;
  const splits = males.length === 2 ? mixedSplits(males, females) : teamSplits(ids);
  let score = null;
  for (const sp of splits) {
    const sc = scoreSplit(state, sp.teamA, sp.teamB);
    if (!score || betterScore(sc, score)) score = sc;
  }
  return { typeOk, games, score };
}

function betterGroup(a, b) {
  if (a.typeOk !== b.typeOk) return a.typeOk;
  if (a.games !== b.games) return a.games < b.games;
  return betterScore(a.score, b.score);
}
